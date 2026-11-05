const express = require('express');
const bcrypt = require('bcryptjs');
const { db, normalizeTitleCase, generateUUID } = require('../db');
const { generateToken, requireAuth, ADMIN_INVITE_CODE } = require('../auth');

const router = express.Router();

// Helper to query full user profile with joined names
function getUserProfile(userId) {
  return db.prepare(`
    SELECT 
      u.id, u.full_name, u.email_or_phone, u.role, u.church_id, u.zone_id, u.created_at,
      c.name as church_name,
      z.name as zone_name
    FROM users u
    LEFT JOIN churches c ON u.church_id = c.id
    LEFT JOIN zones z ON u.zone_id = z.id
    WHERE u.id = ?
  `).get(userId);
}

// Register
router.post('/register', (req, res) => {
  try {
    const {
      fullName,
      emailOrPhone,
      password,
      role = 'church_rep',
      zoneName,
      churchName,
      adminInviteCode
    } = req.body;

    if (!fullName || !emailOrPhone || !password) {
      return res.status(400).json({ error: 'Full name, email/phone, and password are required.' });
    }

    const cleanEmailOrPhone = emailOrPhone.trim().toLowerCase();

    // Check if user exists
    const existing = db.prepare('SELECT id FROM users WHERE email_or_phone = ?').get(cleanEmailOrPhone);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email/phone already exists. Please log in.' });
    }

    let finalRole = role;
    let churchId = null;
    let zoneId = null;

    if (role === 'district_admin') {
      return res.status(403).json({ error: 'District Administrator accounts cannot be self-registered. Please contact the district coordinator.' });
    }

    finalRole = 'church_rep';

    // Church Rep Flow: Resolve or Create Zone and Church (Reps type their zone by themselves)
    const normalizedZone = normalizeTitleCase(zoneName);
    const normalizedChurch = normalizeTitleCase(churchName);

    if (!normalizedZone || !normalizedChurch) {
      return res.status(400).json({ error: 'Both Zone Name and Church Name are required for Church Representatives.' });
    }

    // 1. Find or create Zone
    let zoneRecord = db.prepare('SELECT id, name FROM zones WHERE LOWER(name) = LOWER(?)').get(normalizedZone);
    if (!zoneRecord) {
      zoneId = generateUUID();
      db.prepare('INSERT INTO zones (id, name) VALUES (?, ?)').run(zoneId, normalizedZone);
    } else {
      zoneId = zoneRecord.id;
    }

    // 2. Find or create Church under Zone
    let churchRecord = db.prepare('SELECT id, name FROM churches WHERE zone_id = ? AND LOWER(name) = LOWER(?)').get(zoneId, normalizedChurch);
    if (!churchRecord) {
      churchId = generateUUID();
      db.prepare('INSERT INTO churches (id, zone_id, name) VALUES (?, ?, ?)').run(churchId, zoneId, normalizedChurch);
    } else {
      churchId = churchRecord.id;
    }

    // Hash password & save user
    const passwordHash = bcrypt.hashSync(password, 10);
    const userId = generateUUID();

    db.prepare(`
      INSERT INTO users (id, full_name, email_or_phone, password_hash, role, church_id, zone_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, fullName.trim(), cleanEmailOrPhone, passwordHash, finalRole, churchId, zoneId);

    const userProfile = getUserProfile(userId);
    const token = generateToken(userProfile);

    res.status(201).json({
      message: 'Account registered successfully.',
      user: userProfile,
      token
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to complete registration: ' + err.message });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;
    if (!emailOrPhone || !password) {
      return res.status(400).json({ error: 'Email/Phone and password are required.' });
    }

    const cleanEmailOrPhone = emailOrPhone.trim().toLowerCase();
    const userRecord = db.prepare('SELECT * FROM users WHERE email_or_phone = ?').get(cleanEmailOrPhone);

    if (!userRecord) {
      return res.status(401).json({ error: 'No account found with this email/phone.' });
    }

    const validPass = bcrypt.compareSync(password, userRecord.password_hash);
    if (!validPass) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    const userProfile = getUserProfile(userRecord.id);
    const token = generateToken(userProfile);

    res.json({
      message: 'Logged in successfully.',
      user: userProfile,
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// Get current user profile
router.get('/me', requireAuth, (req, res) => {
  try {
    const user = getUserProfile(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Profile (e.g. rep edits church/zone or name)
router.put('/profile', requireAuth, (req, res) => {
  try {
    const { fullName, zoneName, churchName } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    let churchId = user.church_id;
    let zoneId = user.zone_id;

    if (user.role === 'church_rep' && zoneName && churchName) {
      const normalizedZone = normalizeTitleCase(zoneName);
      const normalizedChurch = normalizeTitleCase(churchName);

      // 1. Zone
      let zoneRecord = db.prepare('SELECT id FROM zones WHERE LOWER(name) = LOWER(?)').get(normalizedZone);
      if (!zoneRecord) {
        zoneId = generateUUID();
        db.prepare('INSERT INTO zones (id, name) VALUES (?, ?)').run(zoneId, normalizedZone);
      } else {
        zoneId = zoneRecord.id;
      }

      // 2. Church
      let churchRecord = db.prepare('SELECT id FROM churches WHERE zone_id = ? AND LOWER(name) = LOWER(?)').get(zoneId, normalizedChurch);
      if (!churchRecord) {
        churchId = generateUUID();
        db.prepare('INSERT INTO churches (id, zone_id, name) VALUES (?, ?, ?)').run(churchId, zoneId, normalizedChurch);
      } else {
        churchId = churchRecord.id;
      }
    }

    const newFullName = fullName ? fullName.trim() : user.full_name;

    db.prepare(`
      UPDATE users 
      SET full_name = ?, church_id = ?, zone_id = ?
      WHERE id = ?
    `).run(newFullName, churchId, zoneId, req.user.id);

    const updatedProfile = getUserProfile(req.user.id);
    const token = generateToken(updatedProfile);

    res.json({
      message: 'Profile updated successfully.',
      user: updatedProfile,
      token
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile: ' + err.message });
  }
});

module.exports = router;
