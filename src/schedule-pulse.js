// Schedule Pulse Check to run daily at 7 AM
// Uses node-cron or system cron for scheduling

const cronConfig = {
  name: "Daily Pulse Check",
  schedule: "0 7 * * *",  // 7:00 AM every day (cron syntax)
  timezone: "America/Chicago",
  command: "node src/pulse-check/pulse.js",
  timeout: 120  // seconds
};

console.log('Pulse Check Scheduling Options:');
console.log('');
console.log('Option 1: Use node-cron (recommended for this project)');
console.log('  npm install node-cron');
console.log('  Then add to your server.js or a standalone scheduler script.');
console.log('');
console.log('Option 2: Use system cron');
console.log(`  crontab -e`);
console.log(`  ${cronConfig.schedule} cd /path/to/blue-collar-claw && node src/pulse-check/pulse.js`);
console.log('');
console.log('Option 3: Run manually');
console.log('  node src/pulse-check/pulse.js');
console.log('');
console.log('This will:');
console.log('- Run every day at 7:00 AM Central');
console.log('- Execute pulse check');
console.log('- Send results via your configured notification channels (Telegram, Email, SMS)');
console.log('');
console.log('Test it first:');
console.log('  node src/pulse-check/pulse.js --dry-run');

module.exports = cronConfig;
