const express = require('express');
const { db, normalizeTitleCase, generateUUID } = require('../db');
const { requireAdmin } = require('../auth');

const router = express.Router();

// Get all Zones (with their churches)
router.get('/zones', (req, res) => {
  try {
    const zones = db.prepare('SELECT * FROM zones ORDER BY name ASC').all();
    const churches = db.prepare('SELECT * FROM churches ORDER BY name ASC').all();

    const zonesWithChurches = zones.map(z => ({
      ...z,
      churches: churches.filter(c => c.zone_id === z.id)
    }));

    res.json({ zones: zonesWithChurches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Churches (optionally filter by ?zoneId=...)
router.get('/churches', (req, res) => {
  try {
    const { zoneId } = req.query;
    let churches;
    if (zoneId) {
      churches = db.prepare(`
        SELECT c.*, z.name as zone_name 
        FROM churches c
        JOIN zones z ON c.zone_id = z.id
        WHERE c.zone_id = ?
        ORDER BY c.name ASC
      `).all(zoneId);
    } else {
      churches = db.prepare(`
        SELECT c.*, z.name as zone_name 
        FROM churches c
        JOIN zones z ON c.zone_id = z.id
        ORDER BY z.name ASC, c.name ASC
      `).all();
    }
    res.json({ churches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Rename a Zone
router.put('/admin/zones/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const normalizedName = normalizeTitleCase(name);

    if (!normalizedName) {
      return res.status(400).json({ error: 'Zone name cannot be blank.' });
    }

    // Check conflict
    const conflict = db.prepare('SELECT id FROM zones WHERE LOWER(name) = LOWER(?) AND id != ?').get(normalizedName, id);
    if (conflict) {
      return res.status(400).json({ error: `A Zone named "${normalizedName}" already exists.` });
    }

    db.prepare('UPDATE zones SET name = ? WHERE id = ?').run(normalizedName, id);
    res.json({ message: `Zone renamed to "${normalizedName}".` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Rename Church or Move to Another Zone
router.put('/admin/churches/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { name, zoneId } = req.body;
    const normalizedName = normalizeTitleCase(name);

    const church = db.prepare('SELECT * FROM churches WHERE id = ?').get(id);
    if (!church) return res.status(404).json({ error: 'Church not found.' });

    const targetZoneId = zoneId || church.zone_id;
    const targetName = normalizedName || church.name;

    // Check conflict in target zone
    const conflict = db.prepare('SELECT id FROM churches WHERE zone_id = ? AND LOWER(name) = LOWER(?) AND id != ?').get(targetZoneId, targetName, id);
    if (conflict) {
      return res.status(400).json({ error: `A Church named "${targetName}" already exists in that Zone.` });
    }

    db.prepare('UPDATE churches SET name = ?, zone_id = ? WHERE id = ?').run(targetName, targetZoneId, id);

    // Also update any existing reports zone_id if church was moved
    if (targetZoneId !== church.zone_id) {
      db.prepare('UPDATE weekly_reports SET zone_id = ? WHERE church_id = ?').run(targetZoneId, id);
      db.prepare('UPDATE users SET zone_id = ? WHERE church_id = ?').run(targetZoneId, id);
    }

    res.json({ message: `Church updated to "${targetName}".` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Delete a Church (with confirmation cascade)
router.delete('/admin/churches/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM churches WHERE id = ?').run(id);
    res.json({ message: 'Church and associated reports removed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Delete a Zone (if no churches)
router.delete('/admin/zones/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const churchCount = db.prepare('SELECT COUNT(*) as count FROM churches WHERE zone_id = ?').get(id).count;
    if (churchCount > 0) {
      return res.status(400).json({ error: `Cannot delete Zone with ${churchCount} church(es). Move or delete churches first.` });
    }
    db.prepare('DELETE FROM zones WHERE id = ?').run(id);
    res.json({ message: 'Zone deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
