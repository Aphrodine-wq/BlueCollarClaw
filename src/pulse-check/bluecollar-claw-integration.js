// BlueCollarClaw Integration for Pulse Check
// Adds contractor-specific briefing data

const createDatabase = require('../db-factory');

async function getBlueCollarClawStatus() {
  const db = createDatabase();

  await new Promise(resolve => setTimeout(resolve, 200)); // Wait for DB init

  const parts = [];

  // Get today's bookings
  const today = new Date().toISOString().split('T')[0];

  const todaysBookings = await new Promise((resolve) => {
    db.db.all(
      `SELECT b.*, c.name as sub_name 
       FROM bookings b 
       JOIN contractors c ON b.sub_id = c.id
       WHERE b.start_date <= ? AND b.end_date >= ? AND b.status = 'confirmed'`,
      [today, today],
      (err, rows) => resolve(rows || [])
    );
  });

  if (todaysBookings.length > 0) {
    parts.push(`📦 **JOBS TODAY (${todaysBookings.length})**`);
    todaysBookings.forEach(b => {
      parts.push(`   • ${b.trade} with ${b.sub_name} at ${b.location}`);
    });
  }

  // Get pending offers
  const pendingOffers = await new Promise((resolve) => {
    db.db.get(
      `SELECT COUNT(*) as count FROM offers WHERE status = 'pending'`,
      (err, row) => resolve(row?.count || 0)
    );
  });

  if (pendingOffers > 0) {
    parts.push(`\n💼 **${pendingOffers} NEW OFFER${pendingOffers > 1 ? 'S' : ''}** — Check dashboard`);
  }

  // Get active job requests
  const activeRequests = await new Promise((resolve) => {
    db.db.all(
      `SELECT * FROM job_requests WHERE status = 'open' ORDER BY created_at DESC LIMIT 3`,
      (err, rows) => resolve(rows || [])
    );
  });

  if (activeRequests.length > 0) {
    parts.push(`\n📋 **ACTIVE REQUESTS (${activeRequests.length})**`);
    activeRequests.forEach(r => {
      parts.push(`   • ${r.trade} needed ${r.start_date} ($${r.min_rate}-${r.max_rate}/hr)`);
    });
  }

  // Get this week's stats
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const weekStats = await new Promise((resolve) => {
    db.db.get(
      `SELECT COUNT(*) as count FROM bookings WHERE created_at >= ?`,
      [weekStart.toISOString()],
      (err, row) => resolve(row?.count || 0)
    );
  });

  if (weekStats > 0) {
    parts.push(`\n📊 **THIS WEEK:** ${weekStats} booking${weekStats > 1 ? 's' : ''} completed`);
  }

  db.close();

  if (parts.length === 0) {
    return '🤝 **BlueCollarClaw:** All quiet. No active jobs or offers.';
  }

  return `🤝 **BlueCollarClaw UPDATE**\n${parts.join('\n')}`;
}

module.exports = { getBlueCollarClawStatus };
