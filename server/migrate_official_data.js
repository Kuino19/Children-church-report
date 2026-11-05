const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path = require('node:path');

const DB_PATH = path.join(__dirname, '..', 'data', 'church_reports.db');
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA foreign_keys = OFF;');

// Clear existing test data
db.exec('DELETE FROM weekly_reports;');
db.exec("DELETE FROM users WHERE role != 'district_admin';");
db.exec('DELETE FROM churches;');
db.exec('DELETE FROM zones;');

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const officialStructure = [
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

const insertZoneStmt = db.prepare('INSERT INTO zones (id, name) VALUES (?, ?)');
const insertChurchStmt = db.prepare('INSERT INTO churches (id, zone_id, name) VALUES (?, ?, ?)');
const churchMap = {};

for (const z of officialStructure) {
  const zoneId = generateUUID();
  insertZoneStmt.run(zoneId, z.name);
  for (const c of z.churches) {
    const churchId = generateUUID();
    insertChurchStmt.run(churchId, zoneId, c);
    churchMap[c] = { churchId, zoneId };
  }
}

// Update Admin display name
db.prepare('UPDATE users SET full_name = ? WHERE email_or_phone = ?').run(
  'Pastor Emmanuel (District Coordinator - Foursquare Idimu Missionary District)',
  'admin@district.church'
);

// Create Demo Rep for Idimu ZHQ
const zhqInfo = churchMap['Idimu ZHQ'];
const repId = generateUUID();
const repPasswordHash = bcrypt.hashSync('reppassword123', 10);
db.prepare(`
  INSERT INTO users (id, full_name, email_or_phone, password_hash, role, church_id, zone_id)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`).run(repId, 'Brother Joshua (ZHQ Rep)', 'rep@idimuzhq.church', repPasswordHash, 'church_rep', zhqInfo.churchId, zhqInfo.zoneId);

// Seed sample weekly reports for current month
const now = new Date();
const year = now.getFullYear();
const month = now.getMonth() + 1;

const insertReportStmt = db.prepare(`
  INSERT INTO weekly_reports (
    id, church_id, zone_id, submitted_by, report_year, report_month, week_number,
    sunday_school, bible_study, prayer_meeting, visitors,
    children_count, cadets_count, torchbearers_count, candlelighters_count, teachers_count,
    salvations, holy_ghost_baptisms, healings
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Sample 1: Idimu ZHQ (Weeks 1, 2, 3)
insertReportStmt.run(generateUUID(), zhqInfo.churchId, zhqInfo.zoneId, repId, year, month, 1, 140, 95, 60, 18, 55, 25, 20, 15, 8, 4, 2, 3);
insertReportStmt.run(generateUUID(), zhqInfo.churchId, zhqInfo.zoneId, repId, year, month, 2, 145, 90, 65, 12, 58, 26, 22, 14, 8, 2, 1, 1);
insertReportStmt.run(generateUUID(), zhqInfo.churchId, zhqInfo.zoneId, repId, year, month, 3, 150, 102, 70, 20, 60, 28, 24, 16, 9, 5, 3, 2);

// Sample 2: FGC Unity (Week 1)
const unityInfo = churchMap['FGC Unity'];
insertReportStmt.run(generateUUID(), unityInfo.churchId, unityInfo.zoneId, repId, year, month, 1, 95, 60, 45, 8, 38, 18, 14, 10, 6, 2, 1, 0);

// Sample 3: National Temple (Orisumbare) (Weeks 1, 2)
const templeInfo = churchMap['National Temple'];
insertReportStmt.run(generateUUID(), templeInfo.churchId, templeInfo.zoneId, repId, year, month, 1, 220, 130, 85, 30, 85, 40, 32, 25, 14, 6, 4, 5);
insertReportStmt.run(generateUUID(), templeInfo.churchId, templeInfo.zoneId, repId, year, month, 2, 235, 140, 90, 28, 90, 42, 35, 28, 14, 7, 5, 4);

db.exec('PRAGMA foreign_keys = ON;');
console.log('Successfully migrated database with official Foursquare Idimu Missionary District zones & churches!');
