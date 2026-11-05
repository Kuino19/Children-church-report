const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const bcrypt = require('bcryptjs');

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'church_reports.db');
const db = new DatabaseSync(DB_PATH);

// Helper: Normalize to Title Case and remove extra spaces
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

// Generate simple UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Initialize tables
function initDB() {
  db.exec('PRAGMA foreign_keys = ON;');

  // 1. Zones
  db.exec(`
    CREATE TABLE IF NOT EXISTS zones (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Churches
  db.exec(`
    CREATE TABLE IF NOT EXISTS churches (
      id TEXT PRIMARY KEY,
      zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(zone_id, name)
    );
  `);

  // 3. Users / Profiles
  db.exec(`
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
  `);

  // 4. Weekly Reports
  db.exec(`
    CREATE TABLE IF NOT EXISTS weekly_reports (
      id TEXT PRIMARY KEY,
      church_id TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
      zone_id TEXT NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
      submitted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      report_year INTEGER NOT NULL,
      report_month INTEGER NOT NULL,
      week_number INTEGER NOT NULL CHECK(week_number BETWEEN 1 AND 5),
      
      -- Category 1: Service Attendance
      sunday_school INTEGER NOT NULL DEFAULT 0,
      bible_study INTEGER NOT NULL DEFAULT 0,
      prayer_meeting INTEGER NOT NULL DEFAULT 0,
      visitors INTEGER NOT NULL DEFAULT 0,
      
      -- Category 2: Demographics & Workforce
      children_count INTEGER NOT NULL DEFAULT 0,
      cadets_count INTEGER NOT NULL DEFAULT 0,
      torchbearers_count INTEGER NOT NULL DEFAULT 0,
      candlelighters_count INTEGER NOT NULL DEFAULT 0,
      teachers_count INTEGER NOT NULL DEFAULT 0,
      
      -- Category 3: Spiritual Report
      salvations INTEGER NOT NULL DEFAULT 0,
      holy_ghost_baptisms INTEGER NOT NULL DEFAULT 0,
      healings INTEGER NOT NULL DEFAULT 0,
      
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(church_id, report_year, report_month, week_number)
    );
  `);

  seedInitialData();
}

// Seed initial default zones, churches, admin, and sample records if empty
function seedInitialData() {
  const zoneCount = db.prepare('SELECT COUNT(*) as count FROM zones').get().count;
  if (zoneCount > 0) return; // already seeded

  console.log('[DB] Seeding official Foursquare Idimu Missionary District Zones and Churches...');

  const initialZones = [
    {
      name: 'Idimu',
      churches: [
        'FGC Unity',
        'Isheri',
        'Awesome Solution Egan',
        'Idimu ZHQ',
        'Ikotun',
        'Idowu-Egba',
        'Ajegunle'
      ]
    },
    {
      name: 'Orisumbare',
      churches: [
        'National Temple'
      ]
    }
  ];

  const churchMap = {};
  const insertZoneStmt = db.prepare('INSERT INTO zones (id, name) VALUES (?, ?)');
  const insertChurchStmt = db.prepare('INSERT INTO churches (id, zone_id, name) VALUES (?, ?, ?)');

  for (const z of initialZones) {
    const zoneId = generateUUID();
    insertZoneStmt.run(zoneId, z.name);
    for (const c of z.churches) {
      const churchId = generateUUID();
      insertChurchStmt.run(churchId, zoneId, c);
      churchMap[c] = { churchId, zoneId };
    }
  }

  // Create default District Admin
  const adminId = generateUUID();
  const adminPasswordHash = bcrypt.hashSync('adminpassword123', 10);
  db.prepare(`
    INSERT INTO users (id, full_name, email_or_phone, password_hash, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(adminId, 'Pastor Emmanuel (District Coordinator - Foursquare Idimu Missionary District)', 'admin@district.church', adminPasswordHash, 'district_admin');

  // Create sample Church Rep for Idimu ZHQ
  const zhqInfo = churchMap['Idimu ZHQ'];
  const repId = generateUUID();
  const repPasswordHash = bcrypt.hashSync('reppassword123', 10);
  db.prepare(`
    INSERT INTO users (id, full_name, email_or_phone, password_hash, role, church_id, zone_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(repId, 'Brother Joshua (ZHQ Rep)', 'rep@idimuzhq.church', repPasswordHash, 'church_rep', zhqInfo.churchId, zhqInfo.zoneId);

  // Seed sample submissions for Grace Sanctuary & Victory Tabernacle for current date
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  const insertReportStmt = db.prepare(`
    INSERT INTO weekly_reports (
      id, church_id, zone_id, submitted_by, report_year, report_month, week_number,
      sunday_school, bible_study, prayer_meeting, visitors,
      children_count, cadets_count, torchbearers_count, candlelighters_count, teachers_count,
      salvations, holy_ghost_baptisms, healings
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Grace Sanctuary - Week 1 & 2
  insertReportStmt.run(
    generateUUID(), graceInfo.churchId, graceInfo.zoneId, repId, year, month, 1,
    85, 42, 38, 7,
    32, 14, 18, 12, 6,
    3, 2, 1
  );
  insertReportStmt.run(
    generateUUID(), graceInfo.churchId, graceInfo.zoneId, repId, year, month, 2,
    92, 45, 40, 11,
    35, 14, 19, 12, 6,
    4, 3, 2
  );

  // Victory Tabernacle (Zone 2) - Week 1
  const victoryInfo = churchMap['Victory Tabernacle'];
  if (victoryInfo) {
    insertReportStmt.run(
      generateUUID(), victoryInfo.churchId, victoryInfo.zoneId, adminId, year, month, 1,
      110, 60, 52, 15,
      45, 20, 22, 18, 8,
      5, 4, 3
    );
  }

  console.log('[DB] Seeding completed successfully.');
}

initDB();

module.exports = {
  db,
  normalizeTitleCase,
  generateUUID
};
