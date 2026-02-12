# 🦞 Pulse Check

**One message. Everything you need. Nothing you don't.**

A daily briefing skill for OpenClaw that compiles weather, calendar, unreplied messages, finances, project status, and AI-prioritized tasks into a single morning message.

## Quick Start

```bash
# Set your weather API key (free at openweathermap.org)
# Add to your .env file:
# OPENWEATHER_API_KEY=your_key_here

# Edit your config
nano src/pulse-check/pulse-config.json

# Test it
node src/pulse-check/pulse.js --dry-run
```

## Configuration

Edit `pulse-config.json`:

- `schedule` — When to send (24hr format, e.g. "6:30")
- `timezone` — Your timezone
- `weather_location` — City for weather
- `sections` — Toggle any section on/off
- `project_tags` — Keywords for your active projects
- `priority_contacts` — People whose messages get flagged first
- `construction_mode` — Enables outdoor work alerts (heat, cold, wind, rain)
- `delivery_channel` — Where to send (telegram, whatsapp, discord, etc.)

## Commands

| Say this to your Claw | What happens |
|---|---|
| "pulse" or "pulse check" | Full briefing, right now |
| "pulse weather" | Just the weather section |
| "pulse [project-name]" | Deep dive on one project |
| "pulse off" | Skip tomorrow's briefing |
| "pulse at 8" | One-time reschedule |

## How It Works

Pulse Check is a SKILL.md that teaches your OpenClaw agent how to compile briefings. The `pulse.js` script handles weather (the only external API call). Everything else — calendar, messages, finances, projects, priorities — is synthesized by your LLM using OpenClaw's existing tool access.

This means:
- **No data leaves your machine** (except the weather API call)
- **It gets smarter over time** as it learns your patterns
- **It works with whatever you have connected** — no extra setup beyond what OpenClaw already has

## Construction Mode

When `construction_mode: true`, Pulse Check adds:
- 🌧️ Rain alerts with timing (schedule pours accordingly)
- 🔴 Heat alerts when temps exceed your threshold
- 🔵 Cold alerts for freeze risk
- 💨 Wind alerts for crane/ladder safety
- 🌅 Sunrise/sunset for daylight work planning

## File Structure

```
pulse-check/
├── SKILL.md           # OpenClaw skill definition
├── pulse-config.json  # Your personal config
├── pulse.js           # Main script
└── README.md          # This file
```

## License

MIT — do whatever you want with it.
