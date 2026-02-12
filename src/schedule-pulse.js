// Schedule Pulse Check to run daily at 7 AM via OpenClaw Cron

const cronConfig = {
  name: "Daily Pulse Check",
  schedule: {
    kind: "cron",
    expr: "0 7 * * *",  // 7:00 AM every day
    tz: "America/Chicago"
  },
  payload: {
    kind: "agentTurn",
    message: "Run my pulse check and send the full briefing",
    timeoutSeconds: 120
  },
  delivery: {
    mode: "announce",
    bestEffort: true
  },
  sessionTarget: "isolated",
  enabled: true
};

console.log('Add this to OpenClaw using the cron tool:');
console.log(JSON.stringify(cronConfig, null, 2));

// Or run directly with OpenClaw tool
const instructions = `
To schedule this with OpenClaw, use:

cron add --job '${JSON.stringify(cronConfig)}'

OR use the cron tool from your agent session:

{
  "action": "add",
  "job": ${JSON.stringify(cronConfig, null, 2)}
}

This will:
- Run every day at 7:00 AM Central
- Execute pulse check in isolated session
- Send results to your Telegram
- Auto-announce completion

Test it first:
  node src/pulse-check/pulse.js --dry-run
`;

console.log(instructions);
