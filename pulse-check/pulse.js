#!/usr/bin/env node

/**
 * Pulse Check — OpenClaw Daily Briefing Skill
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

// ClawShake integration
let clawshakeIntegration;
try {
  clawshakeIntegration = require('./clawshake-integration');
} catch (err) {
  // Not in ClawShake context, skip integration
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
// Calendar Module (stub — integrates with OpenClaw's calendar tools)
// ─────────────────────────────────────────────
async function getCalendar() {
  // In production, this calls OpenClaw's gog (Google) or apple-calendar tool
  // For now, returns a placeholder that OpenClaw's LLM will populate
  return `📅 [CALENDAR_PLACEHOLDER — OpenClaw populates from connected calendar]`;
}

// ─────────────────────────────────────────────
// Unreplied Messages Module (stub)
// ─────────────────────────────────────────────
async function getUnreplied() {
  // OpenClaw's message history is accessible via its internal APIs
  // This stub shows the format — the LLM fills it using channel access
  return `📩 [UNREPLIED_PLACEHOLDER — OpenClaw scans connected channels]`;
}

// ─────────────────────────────────────────────
// Money Module (stub)
// ─────────────────────────────────────────────
async function getMoney() {
  return `💰 [MONEY_PLACEHOLDER — OpenClaw pulls from connected financial tools]`;
}

// ─────────────────────────────────────────────
// Projects Module (stub)
// ─────────────────────────────────────────────
async function getProjects() {
  const tags = config.project_tags;
  if (tags.length === 0) return '🏗️ No projects configured. Add tags to pulse-config.json.';
  return `🏗️ [PROJECTS_PLACEHOLDER — OpenClaw scans messages for: ${tags.join(', ')}]`;
}

// ─────────────────────────────────────────────
// Priorities Module (stub — AI-generated)
// ─────────────────────────────────────────────
async function getPriorities() {
  return `🎯 [PRIORITIES_PLACEHOLDER — OpenClaw LLM synthesizes top 3 from above sections]`;
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
// ClawShake Module
// ─────────────────────────────────────────────
async function getClawShake() {
  if (!clawshakeIntegration) return null;
  try {
    return await clawshakeIntegration.getClawShakeStatus();
  } catch (err) {
    return `⚠️ ClawShake data unavailable: ${err.message}`;
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
    
    // ClawShake integration (if available)
    const clawshakeData = await getClawShake();
    if (clawshakeData) parts.push(clawshakeData);
    
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
  clawshake: getClawShake,
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
    // In production, this sends via OpenClaw's channel system
    // For now, output to stdout (OpenClaw captures and routes it)
    console.log(pulse);
  }
}

main().catch(err => {
  console.error('Pulse Check error:', err);
  process.exit(1);
});
