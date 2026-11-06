const path = require('node:path');
const fs = require('node:fs');
const bcrypt = require('bcryptjs');

// Database connection string detection from environment variables
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

let db = null;
const isPostgres = !!DATABASE_URL;

function convertPlaceholders(sql) {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => '$' + (paramIndex++));
}

// Generate simple UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Normalize to Title Case
function normalizeTitleCase(str) {
  if (!str) return '';
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

if (isPostgres) {
  console.log('[DB] Connecting to PostgreSQL (Neon Cloud Database)...');
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  db = {
    isPostgres: true,
    async get(sql, params = []) {
      const res = await pool.query(convertPlaceholders(sql), params);
      return res.rows[0] || null;
    },
    async all(sql, params = []) {
      const res = await pool.query(convertPlaceholders(sql), params);
      return res.rows;
    },
    async run(sql, params = []) {
      const res = await pool.query(convertPlaceholders(sql), params);
      return { rowCount: res.rowCount };
    },
    prepare(sql) {
      return {
        get: (...params) => this.get(sql, params),
        all: (...params) => this.all(sql, params),
        run: (...params) => this.run(sql, params)
      };
    }
  };
} else {
  console.log('[DB] Connecting to local SQLite database...');
  const { DatabaseSync } = require('node:sqlite');
  const DATA_DIR = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const DB_PATH = path.join(DATA_DIR, 'church_reports.db');
  const sqliteDb = new DatabaseSync(DB_PATH);

  // Initialize SQLite tables
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS zones (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS churches (
      id TEXT PRIMARY KEY,
      zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(zone_id, name)
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email_or_phone TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('church_rep', 'district_admin')),
      church_id TEXT REFERENCES churches(id) ON DELETE SET NULL,
      zone_id TEXT REFERENCES zones(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS weekly_reports (
      id TEXT PRIMARY KEY,
      church_id TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
      zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
      submitted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      report_year INTEGER NOT NULL,
      report_month INTEGER NOT NULL,
      week_number INTEGER NOT NULL,
      sunday_school INTEGER DEFAULT 0,
      worship_attendance INTEGER DEFAULT 0,
      bible_study INTEGER DEFAULT 0,
      prayer_meeting INTEGER DEFAULT 0,
      visitors INTEGER DEFAULT 0,
      children_count INTEGER DEFAULT 0,
      cadets_count INTEGER DEFAULT 0,
      cupbearers_count INTEGER DEFAULT 0,
      torchbearers_count INTEGER DEFAULT 0,
      candlelighters_count INTEGER DEFAULT 0,
      teachers_count INTEGER DEFAULT 0,
      bible_club_teachers INTEGER DEFAULT 0,
      bible_club_children INTEGER DEFAULT 0,
      salvations INTEGER DEFAULT 0,
      holy_ghost_baptisms INTEGER DEFAULT 0,
      healings INTEGER DEFAULT 0,
      special_programme TEXT DEFAULT '',
      forthcoming_programme TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(church_id, report_year, report_month, week_number)
    );
  `);

  // Migrate existing SQLite columns safely
  const newCols = [
    'ALTER TABLE weekly_reports ADD COLUMN worship_attendance INTEGER DEFAULT 0;',
    'ALTER TABLE weekly_reports ADD COLUMN cupbearers_count INTEGER DEFAULT 0;',
    'ALTER TABLE weekly_reports ADD COLUMN bible_club_teachers INTEGER DEFAULT 0;',
    'ALTER TABLE weekly_reports ADD COLUMN bible_club_children INTEGER DEFAULT 0;',
    'ALTER TABLE weekly_reports ADD COLUMN special_programme TEXT DEFAULT "";',
    'ALTER TABLE weekly_reports ADD COLUMN forthcoming_programme TEXT DEFAULT "";'
  ];
  for (const colSql of newCols) {
    try {
      sqliteDb.exec(colSql);
    } catch {
      // Column already exists
    }
  }
  try {
    sqliteDb.exec('UPDATE weekly_reports SET cupbearers_count = torchbearers_count WHERE cupbearers_count = 0 AND torchbearers_count > 0;');
  } catch {}

  db = {
    isPostgres: false,
    async get(sql, params = []) {
      return sqliteDb.prepare(sql).get(...params) || null;
    },
    async all(sql, params = []) {
      return sqliteDb.prepare(sql).all(...params);
    },
    async run(sql, params = []) {
      return sqliteDb.prepare(sql).run(...params);
    },
    prepare(sql) {
      return {
        get: (...params) => this.get(sql, params),
        all: (...params) => this.all(sql, params),
        run: (...params) => this.run(sql, params)
      };
    }
  };
}

module.exports = {
  db,
  normalizeTitleCase,
  generateUUID,
  isPostgres
};
