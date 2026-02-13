/**
 * Database Factory — returns the correct database adapter
 * based on environment variables (Postgres for production, SQLite for dev).
 *
 * Usage:
 *   const createDatabase = require('./db-factory');
 *   const db = createDatabase();
 */

function createDatabase() {
    if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
        const PostgresDatabase = require('./database-postgres');
        return new PostgresDatabase();
    } else {
        const Database = require('./database');
        return new Database();
    }
}

module.exports = createDatabase;
