'use strict';

const Database = require('better-sqlite3');
const path = require('path');

let db = null;

/**
 * Initialize the database. Creates tables if they don't exist.
 * @param {string} userDataPath - Electron app.getPath('userData')
 */
function initDatabase(userDataPath) {
    try {
        const dbPath = path.join(userDataPath, 'cognitionx.db');
        db = new Database(dbPath);

        // Enable WAL mode for better concurrent performance
        db.pragma('journal_mode = WAL');

        // Create tables
        db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_text TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        total_focus_seconds INTEGER DEFAULT 0,
        credits_earned INTEGER DEFAULT 0,
        interventions_count INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        timestamp INTEGER NOT NULL,
        activity_type TEXT,
        app_name TEXT,
        relevance_score INTEGER,
        confidence INTEGER,
        intervention_level INTEGER DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );

      CREATE TABLE IF NOT EXISTS credits_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        reason TEXT,
        balance_after INTEGER
      );
    `);

        console.log('[database] Initialized at', dbPath);
    } catch (err) {
        console.error('[database] initDatabase failed:', err.message);
    }
}

/**
 * Create a new session and return its ID.
 * @param {string} taskText - The declared focus task
 * @returns {number|null} Session ID or null on error
 */
function createSession(taskText) {
    try {
        const stmt = db.prepare(
            'INSERT INTO sessions (task_text, started_at) VALUES (?, ?)'
        );
        const result = stmt.run(taskText, Date.now());
        console.log('[database] Created session', result.lastInsertRowid);
        return Number(result.lastInsertRowid);
    } catch (err) {
        console.error('[database] createSession failed:', err.message);
        return null;
    }
}

/**
 * End a session with summary data.
 * @param {number} sessionId
 * @param {{focusSeconds: number, creditsEarned: number, interventionsCount: number}} summary
 */
function endSession(sessionId, summary) {
    try {
        const stmt = db.prepare(`
      UPDATE sessions
      SET ended_at = ?,
          total_focus_seconds = ?,
          credits_earned = ?,
          interventions_count = ?
      WHERE id = ?
    `);
        stmt.run(
            Date.now(),
            summary.focusSeconds || 0,
            summary.creditsEarned || 0,
            summary.interventionsCount || 0,
            sessionId
        );
        console.log('[database] Ended session', sessionId);
    } catch (err) {
        console.error('[database] endSession failed:', err.message);
    }
}

/**
 * Log an activity entry for a session.
 * @param {number} sessionId
 * @param {object} activityData
 */
function logActivity(sessionId, activityData) {
    try {
        const stmt = db.prepare(`
      INSERT INTO activity_log
        (session_id, timestamp, activity_type, app_name, relevance_score, confidence, intervention_level)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(
            sessionId,
            activityData.timestamp || Date.now(),
            activityData.activity_type || null,
            activityData.app_name || null,
            activityData.relevance_score || 0,
            activityData.confidence || 0,
            activityData.intervention_level || 0
        );
    } catch (err) {
        console.error('[database] logActivity failed:', err.message);
    }
}

/**
 * Get the current credits balance (sum of all amounts in the ledger).
 * @returns {number}
 */
function getCreditsBalance() {
    try {
        const row = db.prepare(
            'SELECT COALESCE(SUM(amount), 0) AS balance FROM credits_ledger'
        ).get();
        return row.balance;
    } catch (err) {
        console.error('[database] getCreditsBalance failed:', err.message);
        return 0;
    }
}

/**
 * Add or deduct credits.
 * @param {number} amount - Positive to earn, negative to spend
 * @param {string} reason - Why credits were mutated
 * @returns {number} New balance after mutation
 */
function mutateCredits(amount, reason) {
    try {
        const currentBalance = getCreditsBalance();
        const newBalance = currentBalance + amount;

        const stmt = db.prepare(`
      INSERT INTO credits_ledger (timestamp, amount, reason, balance_after)
      VALUES (?, ?, ?, ?)
    `);
        stmt.run(Date.now(), amount, reason, newBalance);

        return newBalance;
    } catch (err) {
        console.error('[database] mutateCredits failed:', err.message);
        return getCreditsBalance();
    }
}

/**
 * Get recent sessions.
 * @param {number} limit - Max number of sessions to return
 * @returns {Array}
 */
function getRecentSessions(limit = 10) {
    try {
        const stmt = db.prepare(
            'SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?'
        );
        return stmt.all(limit);
    } catch (err) {
        console.error('[database] getRecentSessions failed:', err.message);
        return [];
    }
}

/**
 * Get all activity log entries for a specific session.
 * @param {number} sessionId
 * @returns {Array}
 */
function getSessionActivities(sessionId) {
    try {
        const stmt = db.prepare(
            'SELECT * FROM activity_log WHERE session_id = ? ORDER BY timestamp ASC'
        );
        return stmt.all(sessionId);
    } catch (err) {
        console.error('[database] getSessionActivities failed:', err.message);
        return [];
    }
}

/**
 * Close the database connection.
 */
function closeDatabase() {
    try {
        if (db) {
            db.close();
            db = null;
            console.log('[database] Connection closed');
        }
    } catch (err) {
        console.error('[database] closeDatabase failed:', err.message);
    }
}

module.exports = {
    initDatabase,
    createSession,
    endSession,
    logActivity,
    getCreditsBalance,
    mutateCredits,
    getRecentSessions,
    getSessionActivities,
    closeDatabase,
};
