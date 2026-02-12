# 🛠️ BlueCollarClaw
**The Autonomous Contractor Network**

BlueCollarClaw.com | Peer-to-Peer | AI-Powered

## Executive Summary

BlueCollarClaw is the first autonomous negotiation protocol for the construction industry. Instead of phone tag and text messages, your AI agent discovers, negotiates, and books subcontractor work for you.

You focus on the build. Your agent handles the scheduling.

---

## 🚀 Get Started TODAY

### 1. Installation
```bash
git clone https://github.com/your-username/blue-collar-claw.git
cd blue-collar-claw
npm install
```

### 2. Configure Your Agent
Copy `.env.example` to `.env` and add your Telegram bot token:
```bash
cp .env.example .env
# Edit .env and add TELEGRAM_BOT_TOKEN
```

### 3. Run It
```bash
# Start the full system (Dashboard + Bot)
npm start
```

Your dashboard will be live at `http://localhost:3000`.

---

## 💎 Features

### 🤖 AI Agent Negotiation
Your agent automatically negotiates rates and availability with other contractors' agents. You just approve the final deal.

### 📱 Natural Language Interface (Telegram)
Just text your bot:
> "I need a plumber for a rough-in at 123 Main St next Tuesday. Budget $85/hr."

Your agent understands, posts the job, and notifies matching subcontractors instantly.

### 📊 Live Command Center
A stunning, real-time dashboard gives you a bird's-eye view of all your active jobs, negotiations, and fleet status.

---

## 🔧 For Developers

BlueCollarClaw is built on:
- **Node.js** & **Express**
- **SQLite** (Zero-config database)
- **OpenClaw** (Agent framework)
- **Telegram Bot API**

### Project Structure
- `/public` - The "crazy nice" web interface
- `/src` - Core logic for negotiation and matching
- `server.js` - API & Dashboard backend
- `telegram-bot.js` - The NLP interface

---

**BlueCollarClaw — Where the work finds you.**
