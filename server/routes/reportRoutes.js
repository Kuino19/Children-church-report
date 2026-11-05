const express = require('express');
const { db, generateUUID } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();

// Helper to sanitize numeric inputs (default to 0, non-negative)
function cleanInt(val) {
  if (val === undefined || val === null || val === '') return 0;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) || parsed < 0 ? 0 : parsed;
}

// 1. Get Monthly Reports for a Specific Church
router.get('/church/:churchId', requireAuth, (req, res) => {
  try {
    const { churchId } = req.params;
    const now = new Date();
    const year = cleanInt(req.query.year) || now.getFullYear();
    const month = cleanInt(req.query.month) || (now.getMonth() + 1);

    const church = db.prepare(`
      SELECT c.*, z.name as zone_name
      FROM churches c
      JOIN zones z ON c.zone_id = z.id
      WHERE c.id = ?
    `).get(churchId);

    if (!church) {
      return res.status(404).json({ error: 'Church not found.' });
    }

    const reports = db.prepare(`
      SELECT * FROM weekly_reports
      WHERE church_id = ? AND report_year = ? AND report_month = ?
      ORDER BY week_number ASC
    `).all(churchId, year, month);

    // Structure 5 weeks (1 to 5)
    const weeksData = {};
    for (let w = 1; w <= 5; w++) {
      const existing = reports.find(r => r.week_number === w);
      weeksData[w] = existing || null;
    }

    res.json({
      church,
      year,
      month,
      weeks: weeksData
    });
  } catch (err) {
    console.error('Fetch church reports error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Submit / Upsert Weekly Report
router.post('/submit', requireAuth, (req, res) => {
  try {
    const {
      churchId,
      year,
      month,
      weekNumber,
      // Category 1
      sundaySchool,
      bibleStudy,
      prayerMeeting,
      visitors,
      // Category 2
      childrenCount,
      cadetsCount,
      torchbearersCount,
      candlelightersCount,
      teachersCount,
      // Category 3
      salvations,
      holyGhostBaptisms,
      healings
    } = req.body;

    const repChurchId = req.user.role === 'district_admin' ? (churchId || req.user.church_id) : req.user.church_id;
    if (!repChurchId) {
      return res.status(400).json({ error: 'No church assigned to this submission.' });
    }

    const church = db.prepare('SELECT zone_id FROM churches WHERE id = ?').get(repChurchId);
    if (!church) {
      return res.status(404).json({ error: 'Target church not found.' });
    }

    const reportYear = cleanInt(year);
    const reportMonth = cleanInt(month);
    const weekNum = cleanInt(weekNumber);

    if (weekNum < 1 || weekNum > 5) {
      return res.status(400).json({ error: 'Week number must be between 1 and 5 (1st Sunday to 5th Sunday).' });
    }

    const cSundaySchool = cleanInt(sundaySchool);
    const cBibleStudy = cleanInt(bibleStudy);
    const cPrayerMeeting = cleanInt(prayerMeeting);
    const cVisitors = cleanInt(visitors);

    const cChildren = cleanInt(childrenCount);
    const cCadets = cleanInt(cadetsCount);
    const cTorchbearers = cleanInt(torchbearersCount);
    const cCandlelighters = cleanInt(candlelightersCount);
    const cTeachers = cleanInt(teachersCount);

    const cSalvations = cleanInt(salvations);
    const cHolyGhost = cleanInt(holyGhostBaptisms);
    const cHealings = cleanInt(healings);

    // Check if report already exists for this (church_id, report_year, report_month, week_number)
    const existing = db.prepare(`
      SELECT id FROM weekly_reports
      WHERE church_id = ? AND report_year = ? AND report_month = ? AND week_number = ?
    `).get(repChurchId, reportYear, reportMonth, weekNum);

    let reportId = existing ? existing.id : generateUUID();

    if (existing) {
      // Update existing record
      db.prepare(`
        UPDATE weekly_reports
        SET 
          submitted_by = ?,
          sunday_school = ?,
          bible_study = ?,
          prayer_meeting = ?,
          visitors = ?,
          children_count = ?,
          cadets_count = ?,
          torchbearers_count = ?,
          candlelighters_count = ?,
          teachers_count = ?,
          salvations = ?,
          holy_ghost_baptisms = ?,
          healings = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        req.user.id,
        cSundaySchool, cBibleStudy, cPrayerMeeting, cVisitors,
        cChildren, cCadets, cTorchbearers, cCandlelighters, cTeachers,
        cSalvations, cHolyGhost, cHealings,
        reportId
      );
    } else {
      // Insert new record
      db.prepare(`
        INSERT INTO weekly_reports (
          id, church_id, zone_id, submitted_by, report_year, report_month, week_number,
          sunday_school, bible_study, prayer_meeting, visitors,
          children_count, cadets_count, torchbearers_count, candlelighters_count, teachers_count,
          salvations, holy_ghost_baptisms, healings
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        reportId, repChurchId, church.zone_id, req.user.id, reportYear, reportMonth, weekNum,
        cSundaySchool, cBibleStudy, cPrayerMeeting, cVisitors,
        cChildren, cCadets, cTorchbearers, cCandlelighters, cTeachers,
        cSalvations, cHolyGhost, cHealings
      );
    }

    const savedRecord = db.prepare('SELECT * FROM weekly_reports WHERE id = ?').get(reportId);

    res.json({
      message: `Week ${weekNum} report saved successfully.`,
      report: savedRecord
    });
  } catch (err) {
    console.error('Submit report error:', err);
    res.status(500).json({ error: 'Failed to save report: ' + err.message });
  }
});

// 3. District Collation & Submission Tracking Engine
router.get('/district/collation', requireAuth, (req, res) => {
  try {
    const now = new Date();
    const year = cleanInt(req.query.year) || now.getFullYear();
    const month = cleanInt(req.query.month) || (now.getMonth() + 1);
    const weekFilter = req.query.week || 'all'; // 'all', '1', '2', '3', '4', '5'
    const aggregationMode = req.query.aggregationMode || 'average'; // 'average' (headcount) or 'cumulative' (sum)

    const allZones = db.prepare('SELECT * FROM zones ORDER BY name ASC').all();
    const allChurches = db.prepare(`
      SELECT c.*, z.name as zone_name
      FROM churches c
      JOIN zones z ON c.zone_id = z.id
      ORDER BY z.name ASC, c.name ASC
    `).all();

    // Query all reports for this month/year
    const reports = db.prepare(`
      SELECT r.*, u.full_name as submitter_name
      FROM weekly_reports r
      LEFT JOIN users u ON r.submitted_by = u.id
      WHERE r.report_year = ? AND r.report_month = ?
    `).all(year, month);

    // Build Compliance Metrics
    const totalChurchesCount = allChurches.length;
    const weeklyCompliance = {};
    for (let w = 1; w <= 5; w++) {
      const reportsForWeek = reports.filter(r => r.week_number === w);
      weeklyCompliance[w] = {
        submittedCount: reportsForWeek.length,
        percentage: totalChurchesCount > 0 ? Math.round((reportsForWeek.length / totalChurchesCount) * 100) : 0
      };
    }

    // Zone by Zone Compliance Breakdown
    const complianceByZone = allZones.map(zone => {
      const zoneChurches = allChurches.filter(c => c.zone_id === zone.id);
      const churchStatusList = zoneChurches.map(c => {
        // If weekFilter is a specific week (1-5), check that week; if 'all', check if has at least 1 report
        let isSubmitted = false;
        let submittedWeeks = [];
        const churchReports = reports.filter(r => r.church_id === c.id);
        
        if (weekFilter !== 'all') {
          const targetW = parseInt(weekFilter, 10);
          isSubmitted = churchReports.some(r => r.week_number === targetW);
        } else {
          isSubmitted = churchReports.length > 0;
        }

        submittedWeeks = churchReports.map(r => r.week_number).sort();

        return {
          churchId: c.id,
          churchName: c.name,
          isSubmitted,
          submittedWeeks,
          submittedCount: submittedWeeks.length
        };
      });

      const submittedCount = churchStatusList.filter(c => c.isSubmitted).length;

      return {
        zoneId: zone.id,
        zoneName: zone.name,
        totalChurches: zoneChurches.length,
        submittedCount,
        churches: churchStatusList
      };
    });

    // Helper to calculate aggregate metrics for a set of reports
    function calculateMetrics(repsList) {
      if (!repsList || repsList.length === 0) {
        return {
          weeksCount: 0,
          sundaySchool: 0,
          bibleStudy: 0,
          prayerMeeting: 0,
          visitors: 0,
          totalAttendance: 0,
          childrenCount: 0,
          cadetsCount: 0,
          torchbearersCount: 0,
          candlelightersCount: 0,
          teachersCount: 0,
          salvations: 0,
          holyGhostBaptisms: 0,
          healings: 0
        };
      }

      const count = repsList.length;

      // Always cumulative (SUM): Visitors, Salvations, Holy Ghost, Healings
      const sumVisitors = repsList.reduce((acc, r) => acc + r.visitors, 0);
      const sumSalvations = repsList.reduce((acc, r) => acc + r.salvations, 0);
      const sumHolyGhost = repsList.reduce((acc, r) => acc + r.holy_ghost_baptisms, 0);
      const sumHealings = repsList.reduce((acc, r) => acc + r.healings, 0);

      // Attendance & Recurring Groups: depends on aggregationMode
      let sundaySchool, bibleStudy, prayerMeeting, children, cadets, torchbearers, candlelighters, teachers;

      if (aggregationMode === 'cumulative') {
        sundaySchool = repsList.reduce((acc, r) => acc + r.sunday_school, 0);
        bibleStudy = repsList.reduce((acc, r) => acc + r.bible_study, 0);
        prayerMeeting = repsList.reduce((acc, r) => acc + r.prayer_meeting, 0);
        children = repsList.reduce((acc, r) => acc + r.children_count, 0);
        cadets = repsList.reduce((acc, r) => acc + r.cadets_count, 0);
        torchbearers = repsList.reduce((acc, r) => acc + r.torchbearers_count, 0);
        candlelighters = repsList.reduce((acc, r) => acc + r.candlelighters_count, 0);
        teachers = repsList.reduce((acc, r) => acc + r.teachers_count, 0);
      } else {
        // Average Headcount (default)
        sundaySchool = Math.round(repsList.reduce((acc, r) => acc + r.sunday_school, 0) / count);
        bibleStudy = Math.round(repsList.reduce((acc, r) => acc + r.bible_study, 0) / count);
        prayerMeeting = Math.round(repsList.reduce((acc, r) => acc + r.prayer_meeting, 0) / count);
        children = Math.round(repsList.reduce((acc, r) => acc + r.children_count, 0) / count);
        cadets = Math.round(repsList.reduce((acc, r) => acc + r.cadets_count, 0) / count);
        torchbearers = Math.round(repsList.reduce((acc, r) => acc + r.torchbearers_count, 0) / count);
        candlelighters = Math.round(repsList.reduce((acc, r) => acc + r.candlelighters_count, 0) / count);
        teachers = Math.round(repsList.reduce((acc, r) => acc + r.teachers_count, 0) / count);
      }

      return {
        weeksCount: count,
        sundaySchool,
        bibleStudy,
        prayerMeeting,
        visitors: sumVisitors,
        totalAttendance: sundaySchool + bibleStudy + prayerMeeting + sumVisitors,
        childrenCount: children,
        cadetsCount: cadets,
        torchbearersCount: torchbearers,
        candlelightersCount: candlelighters,
        teachersCount: teachers,
        salvations: sumSalvations,
        holyGhostBaptisms: sumHolyGhost,
        healings: sumHealings
      };
    }

    // Detailed Data: Zone by Zone and Church breakdown
    const zonesCollation = allZones.map(zone => {
      const zoneChurches = allChurches.filter(c => c.zone_id === zone.id);

      const churchRows = zoneChurches.map(c => {
        let churchReports = reports.filter(r => r.church_id === c.id);
        
        // Filter by week if specific week selected
        if (weekFilter !== 'all') {
          const wNum = parseInt(weekFilter, 10);
          churchReports = churchReports.filter(r => r.week_number === wNum);
        }

        const weeksObj = {};
        for (let w = 1; w <= 5; w++) {
          weeksObj[w] = reports.find(r => r.church_id === c.id && r.week_number === w) || null;
        }

        const aggregated = calculateMetrics(churchReports);

        return {
          churchId: c.id,
          churchName: c.name,
          weeks: weeksObj,
          metrics: aggregated
        };
      });

      // Zone Subtotal: Sum of church metrics
      const zoneSubtotal = {
        sundaySchool: churchRows.reduce((a, b) => a + b.metrics.sundaySchool, 0),
        bibleStudy: churchRows.reduce((a, b) => a + b.metrics.bibleStudy, 0),
        prayerMeeting: churchRows.reduce((a, b) => a + b.metrics.prayerMeeting, 0),
        visitors: churchRows.reduce((a, b) => a + b.metrics.visitors, 0),
        totalAttendance: churchRows.reduce((a, b) => a + b.metrics.totalAttendance, 0),
        childrenCount: churchRows.reduce((a, b) => a + b.metrics.childrenCount, 0),
        cadetsCount: churchRows.reduce((a, b) => a + b.metrics.cadetsCount, 0),
        torchbearersCount: churchRows.reduce((a, b) => a + b.metrics.torchbearersCount, 0),
        candlelightersCount: churchRows.reduce((a, b) => a + b.metrics.candlelightersCount, 0),
        teachersCount: churchRows.reduce((a, b) => a + b.metrics.teachersCount, 0),
        salvations: churchRows.reduce((a, b) => a + b.metrics.salvations, 0),
        holyGhostBaptisms: churchRows.reduce((a, b) => a + b.metrics.holyGhostBaptisms, 0),
        healings: churchRows.reduce((a, b) => a + b.metrics.healings, 0)
      };

      return {
        zoneId: zone.id,
        zoneName: zone.name,
        churches: churchRows,
        subtotal: zoneSubtotal
      };
    });

    // District Grand Totals
    const districtGrandTotals = {
      totalRegisteredChurches: totalChurchesCount,
      totalZones: allZones.length,
      sundaySchool: zonesCollation.reduce((a, z) => a + z.subtotal.sundaySchool, 0),
      bibleStudy: zonesCollation.reduce((a, z) => a + z.subtotal.bibleStudy, 0),
      prayerMeeting: zonesCollation.reduce((a, z) => a + z.subtotal.prayerMeeting, 0),
      visitors: zonesCollation.reduce((a, z) => a + z.subtotal.visitors, 0),
      totalAttendance: zonesCollation.reduce((a, z) => a + z.subtotal.totalAttendance, 0),
      childrenCount: zonesCollation.reduce((a, z) => a + z.subtotal.childrenCount, 0),
      cadetsCount: zonesCollation.reduce((a, z) => a + z.subtotal.cadetsCount, 0),
      torchbearersCount: zonesCollation.reduce((a, z) => a + z.subtotal.torchbearersCount, 0),
      candlelightersCount: zonesCollation.reduce((a, z) => a + z.subtotal.candlelightersCount, 0),
      teachersCount: zonesCollation.reduce((a, z) => a + z.subtotal.teachersCount, 0),
      salvations: zonesCollation.reduce((a, z) => a + z.subtotal.salvations, 0),
      holyGhostBaptisms: zonesCollation.reduce((a, z) => a + z.subtotal.holyGhostBaptisms, 0),
      healings: zonesCollation.reduce((a, z) => a + z.subtotal.healings, 0)
    };

    res.json({
      year,
      month,
      weekFilter,
      aggregationMode,
      totalChurchesCount,
      weeklyCompliance,
      complianceByZone,
      zones: zonesCollation,
      grandTotals: districtGrandTotals
    });
  } catch (err) {
    console.error('District collation error:', err);
    res.status(500).json({ error: 'Collation calculation error: ' + err.message });
  }
});

module.exports = router;
