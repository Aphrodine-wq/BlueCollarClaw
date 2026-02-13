#!/usr/bin/env node

/**
 * Pulse Check — BlueCollarClaw Daily Briefing
 * 
 * Compiles weather, calendar, unreplied messages, finances,
 * project status, and AI-prioritized tasks into one message.
 * 
 * Usage:
 *   node pulse.js                  # Full briefing
 *   node pulse.js --section weather # Single section
 *   node pulse.js --project oak-st  # Project deep-dive
 *   node pulse.js --dry-run         # Preview without sending
 */

const fs = require('fs');
const path = require('path');

// BlueCollarClaw integration
let BlueCollarClawIntegration;
try {
  BlueCollarClawIntegration = require('./bluecollar-claw-integration');
} catch (err) {
  // Not in BlueCollarClaw context, skip integration
}

// GitHub integration
let githubModule;
try {
  githubModule = require('./github-module');
} catch (err) {
  console.warn('GitHub module not available:', err.message);
}

// Motivation module
let motivationModule;
try {
  motivationModule = require('./motivation-module');
} catch (err) {
  console.warn('Motivation module not available:', err.message);
}

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────
const CONFIG_PATH = path.join(__dirname, 'pulse-config.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

// ─────────────────────────────────────────────
// Weather Module
// ─────────────────────────────────────────────
async function getWeather() {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return '⚠️ Weather unavailable (set OPENWEATHER_API_KEY)';

  try {
    const loc = encodeURIComponent(config.weather_location);
    const units = config.weather_units || 'imperial';
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${loc}&units=${units}&appid=${apiKey}`
    );
    if (!res.ok) throw new Error(`API ${res.status} ${res.statusText}`);
    const data = await res.json();

    const temp = Math.round(data.main.temp);
    const feels = Math.round(data.main.feels_like);
    const desc = data.weather[0].description;
    const wind = Math.round(data.wind.speed);
    const humidity = data.main.humidity;

    const unitLabel = units === 'imperial' ? '°F' : '°C';
    const windLabel = units === 'imperial' ? 'mph' : 'm/s';

    let line = `☀️ ${config.weather_location} — ${temp}${unitLabel} (feels ${feels}${unitLabel}), ${desc}. Wind ${wind}${windLabel}.`;

    // Construction-specific alerts
    if (config.construction_mode && config.outdoor_work_alerts) {
      const alerts = [];
      const thresholds = config.outdoor_work_alerts;

      if (temp >= (thresholds.heat_threshold_f || 95))
        alerts.push('🔴 HEAT ALERT — schedule breaks, hydrate crews');
      if (temp <= (thresholds.cold_threshold_f || 32))
        alerts.push('🔵 COLD ALERT — watch for ice, protect materials');
      if (wind >= (thresholds.wind_threshold_mph || 20))
        alerts.push('💨 HIGH WIND — no crane/ladder work recommended');

      if (alerts.length > 0) {
        line += '\n' + alerts.join('\n');
      }
    }

    // Get forecast for rain check
    const foreRes = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${loc}&units=${units}&appid=${apiKey}&cnt=8`
    );
    const foreData = await foreRes.json();

    const rainHours = foreData.list.filter(h =>
      h.weather.some(w => w.main === 'Rain' || w.main === 'Thunderstorm')
    );

    if (rainHours.length > 0) {
      const firstRain = new Date(rainHours[0].dt * 1000);
      const timeStr = firstRain.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      line += `\n🌧️ Rain expected around ${timeStr} — plan outdoor work accordingly.`;
    } else {
      line += '\n✅ No rain in forecast today.';
    }

    // Sunrise/sunset
    const sunrise = new Date(data.sys.sunrise * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const sunset = new Date(data.sys.sunset * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    line += `\n🌅 Sunrise ${sunrise} / Sunset ${sunset}`;

    return line;
  } catch (err) {
    return `⚠️ Weather error: ${err.message}`;
  }
}

// ─────────────────────────────────────────────
// Calendar Module (stub — integrates with Google Calendar or other calendar APIs)
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// Database Helper
// ─────────────────────────────────────────────
const Database = require('../database');

async function withDb(callback) {
  try {
    const db = new Database();
    await new Promise(resolve => setTimeout(resolve, 200)); // Wait for init
    try {
      return await callback(db);
    } finally {
      db.close();
    }
  } catch (err) {
    // console.error('DB Access Error:', err); // Uncomment for debugging
    return `ℹ️ Database unavailable (${err.message}). Run 'node src/easy-setup.js' to configure.`;
  }
}

// ─────────────────────────────────────────────
// Calendar Module
// ─────────────────────────────────────────────
async function getCalendar() {
  // Try Google Calendar first if configured
  try {
    const { CalendarIntegration } = require('../calendar');
    const cal = new CalendarIntegration();
    if (fs.existsSync('./google-credentials.json')) {
      // TODO: Implement token loading/refresh flow here
      // For now, fall through to DB calendar
    }
  } catch (err) {
    // Ignore integration errors
  }

  // Fallback to BlueCollarClaw Bookings
  return withDb(async (db) => {
    const today = new Date().toISOString().split('T')[0];
    const bookings = await new Promise(resolve => {
      db.db.all(
        `SELECT b.*, c.name as sub_name 
         FROM bookings b 
         JOIN contractors c ON b.sub_id = c.id
         WHERE b.start_date <= ? AND b.end_date >= ? AND b.status = 'confirmed'`,
        [today, today],
        (err, rows) => resolve(rows || [])
      );
    });

    if (bookings.length === 0) return '📅 No bookings scheduled for today.';

    const lines = bookings.map(b =>
      `• ${b.trade} at ${b.location} with ${b.sub_name} ($${b.rate}/hr)`
    );
    return `📅 **TODAY'S SCHEDULE:**\n${lines.join('\n')}`;
  });
}

// ─────────────────────────────────────────────
// Unreplied Messages Module
// ─────────────────────────────────────────────
async function getUnreplied() {
  return withDb(async (db) => {
    // Check pending incoming offers (where we are the generic contractor/requester)
    // For this MVP, we assume "unreplied" means offers waiting for our response
    const pendingOffers = await new Promise(resolve => {
      db.db.all(
        `SELECT o.*, r.trade 
         FROM offers o
         JOIN job_requests r ON o.request_id = r.id
         WHERE o.status = 'pending'
         ORDER BY o.created_at ASC
         LIMIT 5`,
        (err, rows) => resolve(rows || [])
      );
    });

    if (pendingOffers.length === 0) return '📩 All caught up! No pending offers needing response.';

    const lines = pendingOffers.map(o => {
      const ageHours = Math.round((Date.now() - (o.created_at * 1000) || Date.now()) / 3600000);
      return `• Offer for ${o.trade}: $${o.rate}/hr (received ${ageHours}h ago)`;
    });

    return `📩 **ACTION NEEDED (${pendingOffers.length}):**\n${lines.join('\n')}`;
  });
}

// ─────────────────────────────────────────────
// Money Module
// ─────────────────────────────────────────────
async function getMoney() {
  return withDb(async (db) => {
    // Calculate potential earnings from active bookings (as Sub) and spend (as GC)
    // Identifying "us" relies on knowing our contractor ID. 
    // Pulse script runs outside generic agent context, so we'll just sum ALL confirmed bookings for now.

    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).toISOString();

    const weekStats = await new Promise(resolve => {
      db.db.all(
        `SELECT rate, start_date, end_date FROM bookings 
         WHERE status = 'confirmed' AND start_date >= ?`,
        [startOfWeek],
        (err, rows) => resolve(rows || [])
      );
    });

    let totalVolume = 0;
    weekStats.forEach(b => {
      // Rough estimate: 8 hours/day
      const days = (new Date(b.end_date) - new Date(b.start_date)) / (1000 * 60 * 60 * 24) + 1;
      totalVolume += b.rate * 8 * days;
    });

    if (totalVolume === 0) return '💰 No financial activity tracked this week.';

    return `💰 **PROJECT VOLUME (This Week):** ~$${totalVolume.toLocaleString()} (est. based on active bookings)`;
  });
}

// ─────────────────────────────────────────────
// Projects Module
// ─────────────────────────────────────────────
async function getProjects() {
  return withDb(async (db) => {
    const activeRequests = await new Promise(resolve => {
      db.db.all(
        `SELECT trade, location, created_at FROM job_requests 
         WHERE status = 'open' 
         ORDER BY created_at DESC 
         LIMIT 5`,
        (err, rows) => resolve(rows || [])
      );
    });

    if (activeRequests.length === 0) return '🏗️ No active job requests open.';

    const lines = activeRequests.map(r => {
      const daysOpen = Math.floor((Date.now() - (r.created_at * 1000)) / (1000 * 60 * 60 * 24));
      return `• ${r.trade} @ ${r.location} (Open ${daysOpen}d)`;
    });

    return `🏗️ **OPEN PROJECTS:**\n${lines.join('\n')}`;
  });
}

// ─────────────────────────────────────────────
// Priorities Module
// ─────────────────────────────────────────────
async function getPriorities() {
  // Simple heuristic-based priorities since we don't have a full LLM here
  return withDb(async (db) => {
    const priorities = [];

    // 1. Pending offers check
    const pendingCount = await new Promise(resolve => {
      db.db.get("SELECT COUNT(*) as c FROM offers WHERE status = 'pending'", (err, row) => resolve(row?.c || 0));
    });
    if (pendingCount > 0) priorities.push(`Review ${pendingCount} pending offers before they expire.`);

    // 2. Immediate bookings check
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const nextJobs = await new Promise(resolve => {
      db.db.get(
        "SELECT COUNT(*) as c FROM bookings WHERE start_date = ?",
        [dateStr],
        (err, row) => resolve(row?.c || 0)
      );
    });
    if (nextJobs > 0) priorities.push(`Prep for ${nextJobs} jobs starting tomorrow.`);

    // 3. Stale requests
    const staleCount = await new Promise(resolve => {
      db.db.get(
        "SELECT COUNT(*) as c FROM job_requests WHERE status = 'open' AND created_at <strftime('%s', 'now', '-3 days')",
        (err, row) => resolve(row?.c || 0)
      );
    });
    if (staleCount > 0) priorities.push(`Close or repost ${staleCount} stale job requests.`);

    if (priorities.length === 0) return '🎯 **TODAY\'S FOCUS:** Clear schedule. Look for new opportunities.';

    return `🎯 **TOP PRIORITIES:**\n${priorities.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;
  });
}

// ─────────────────────────────────────────────
// GitHub Module
// ─────────────────────────────────────────────
async function getGitHub() {
  if (!githubModule) return null;
  try {
    return await githubModule.getGitHubAnalysis();
  } catch (err) {
    return `⚠️ GitHub analysis failed: ${err.message}`;
  }
}

// ─────────────────────────────────────────────
// Motivation Module
// ─────────────────────────────────────────────
function getMotivationMessage() {
  if (!motivationModule) return null;
  try {
    const motivation = motivationModule.getMotivation();
    const wisdom = motivationModule.getWeeklyWisdom();
    return wisdom ? `${motivation}${wisdom}` : motivation;
  } catch (err) {
    return null;
  }
}

// ─────────────────────────────────────────────
// BlueCollarClaw Module
// ─────────────────────────────────────────────
async function getBlueCollarClaw() {
  if (!BlueCollarClawIntegration) return null;
  try {
    return await BlueCollarClawIntegration.getBlueCollarClawStatus();
  } catch (err) {
    return `⚠️ BlueCollarClaw data unavailable: ${err.message}`;
  }
}

// ─────────────────────────────────────────────
// Greeting
// ─────────────────────────────────────────────
function getGreeting() {
  const greetings = [
    "Go get it. 🦞",
    "Make it happen. 🦞",
    "Time to build. 🦞",
    "Let's eat. 🦞",
    "Run it up. 🦞",
    "Ship it. 🦞",
    "Today's the day. 🦞",
    "No days off. 🦞",
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}

// ─────────────────────────────────────────────
// Main Compiler
// ─────────────────────────────────────────────
async function compilePulse(options = {}) {
  const sections = config.sections;
  const parts = [];
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  parts.push(`── PULSE CHECK ── ${dayName}, ${dateStr} ──\n`);

  // Run enabled sections
  if (options.section) {
    // Single section mode
    const fn = sectionMap[options.section];
    if (fn) parts.push(await fn());
    else parts.push(`Unknown section: ${options.section}`);
  } else {
    // Full pulse
    if (sections.weather) parts.push(await getWeather());
    if (sections.calendar) parts.push(await getCalendar());

    // GitHub analysis
    if (sections.github) {
      const githubData = await getGitHub();
      if (githubData) parts.push(githubData);
    }

    // (BlueCollarClaw integration removed - data now integrated into specific sections like Calendar, Money, Projects)

    if (sections.unreplied) parts.push(await getUnreplied());
    if (sections.money) parts.push(await getMoney());
    if (sections.projects) parts.push(await getProjects());
    if (sections.priorities) parts.push(await getPriorities());

    // Motivation (always last, before greeting)
    if (sections.motivation) {
      const motivation = getMotivationMessage();
      if (motivation) parts.push(motivation);
    }
  }

  parts.push(`\n${getGreeting()}`);

  return parts.join('\n\n');
}

const sectionMap = {
  weather: getWeather,
  calendar: getCalendar,
  github: getGitHub,
  BlueCollarClaw: getBlueCollarClaw,
  unreplied: getUnreplied,
  money: getMoney,
  projects: getProjects,
  priorities: getPriorities,
  motivation: () => Promise.resolve(getMotivationMessage()),
};

// ─────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--section' && args[i + 1]) options.section = args[++i];
    if (args[i] === '--project' && args[i + 1]) options.project = args[++i];
    if (args[i] === '--dry-run') options.dryRun = true;
  }

  const pulse = await compilePulse(options);

  if (options.dryRun) {
    console.log('=== DRY RUN (not sending) ===\n');
    console.log(pulse);
  } else {
    // In production, this sends via Telegram, Email, or SMS
    // For now, output to stdout
    console.log(pulse);
  }
}

main().catch(err => {
  console.error('Pulse Check error:', err);
  process.exit(1);
});
