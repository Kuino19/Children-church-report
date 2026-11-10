const express = require('express');
const bcrypt = require('bcryptjs');
const { db, normalizeTitleCase, generateUUID } = require('../db');
const { generateToken, requireAuth, requireAdmin, ADMIN_INVITE_CODE } = require('../auth');

const router = express.Router();

// Helper to query full user profile with joined names
async function getUserProfile(userId) {
  return await db.prepare(`
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
router.post('/register', async (req, res) => {
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

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmailOrPhone = emailOrPhone.trim().toLowerCase();

    // Check if user exists
    const existing = await db.prepare('SELECT id FROM users WHERE email_or_phone = ?').get(cleanEmailOrPhone);
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
    let zoneRecord = await db.prepare('SELECT id, name FROM zones WHERE LOWER(name) = LOWER(?)').get(normalizedZone);
    if (!zoneRecord) {
      zoneId = generateUUID();
      await db.prepare('INSERT INTO zones (id, name) VALUES (?, ?)').run(zoneId, normalizedZone);
    } else {
      zoneId = zoneRecord.id;
    }

    // 2. Find or create Church under Zone
    let churchRecord = await db.prepare('SELECT id, name FROM churches WHERE zone_id = ? AND LOWER(name) = LOWER(?)').get(zoneId, normalizedChurch);
    if (!churchRecord) {
      churchId = generateUUID();
      await db.prepare('INSERT INTO churches (id, zone_id, name) VALUES (?, ?, ?)').run(churchId, zoneId, normalizedChurch);
    } else {
      churchId = churchRecord.id;
    }

    // Hash password & save user
    const passwordHash = bcrypt.hashSync(password, 10);
    const userId = generateUUID();

    await db.prepare(`
      INSERT INTO users (id, full_name, email_or_phone, password_hash, role, church_id, zone_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, fullName.trim(), cleanEmailOrPhone, passwordHash, finalRole, churchId, zoneId);

    const userProfile = await getUserProfile(userId);
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
router.post('/login', async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;
    if (!emailOrPhone || !password) {
      return res.status(400).json({ error: 'Email/Phone and password are required.' });
    }

    const cleanEmailOrPhone = emailOrPhone.trim().toLowerCase();
    const userRecord = await db.prepare('SELECT * FROM users WHERE email_or_phone = ?').get(cleanEmailOrPhone);

    if (!userRecord) {
      return res.status(401).json({ error: 'No account found with this email/phone.' });
    }

    const validPass = bcrypt.compareSync(password, userRecord.password_hash);
    if (!validPass) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    const userProfile = await getUserProfile(userRecord.id);
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
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await getUserProfile(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Profile (e.g. rep edits church/zone or name)
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { fullName, zoneName, churchName } = req.body;
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    let churchId = user.church_id;
    let zoneId = user.zone_id;

    if (user.role === 'church_rep' && zoneName && churchName) {
      const normalizedZone = normalizeTitleCase(zoneName);
      const normalizedChurch = normalizeTitleCase(churchName);

      // 1. Zone
      let zoneRecord = await db.prepare('SELECT id FROM zones WHERE LOWER(name) = LOWER(?)').get(normalizedZone);
      if (!zoneRecord) {
        zoneId = generateUUID();
        await db.prepare('INSERT INTO zones (id, name) VALUES (?, ?)').run(zoneId, normalizedZone);
      } else {
        zoneId = zoneRecord.id;
      }

      // 2. Church
      let churchRecord = await db.prepare('SELECT id FROM churches WHERE zone_id = ? AND LOWER(name) = LOWER(?)').get(zoneId, normalizedChurch);
      if (!churchRecord) {
        churchId = generateUUID();
        await db.prepare('INSERT INTO churches (id, zone_id, name) VALUES (?, ?, ?)').run(churchId, zoneId, normalizedChurch);
      } else {
        churchId = churchRecord.id;
      }
    }

    const newFullName = fullName ? fullName.trim() : user.full_name;

    await db.prepare(`
      UPDATE users 
      SET full_name = ?, church_id = ?, zone_id = ?
      WHERE id = ?
    `).run(newFullName, churchId, zoneId, req.user.id);

    const updatedProfile = await getUserProfile(req.user.id);
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

// Admin: List all Church Reps
router.get('/admin/reps', requireAdmin, async (req, res) => {
  try {
    const reps = await db.prepare(`
      SELECT 
        u.id, u.full_name, u.email_or_phone, u.role, u.church_id, u.zone_id, u.created_at,
        c.name as church_name,
        z.name as zone_name
      FROM users u
      LEFT JOIN churches c ON u.church_id = c.id
      LEFT JOIN zones z ON u.zone_id = z.id
      WHERE u.role = 'church_rep'
      ORDER BY z.name ASC, c.name ASC
    `).all();

    res.json({ reps });
  } catch (err) {
    console.error('Fetch reps error:', err);
    res.status(500).json({ error: 'Failed to fetch church reps: ' + err.message });
  }
});

// Admin: Reset Password for a Church Rep
router.post('/admin/reset-password', requireAdmin, async (req, res) => {
  try {
    const { userId, churchId, newPassword = 'reppassword123' } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    let user = null;
    if (userId) {
      user = await db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    } else if (churchId) {
      user = await db.prepare('SELECT * FROM users WHERE church_id = ? AND role = ?').get(churchId, 'church_rep');
    }

    if (!user) {
      return res.status(404).json({ error: 'Church Representative account not found.' });
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);

    res.json({
      message: `Password for ${user.full_name} (${user.email_or_phone}) has been reset.`,
      emailOrPhone: user.email_or_phone,
      newPassword
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password: ' + err.message });
  }
});

// Admin: Create Rep Profile directly
router.post('/admin/create-rep', requireAdmin, async (req, res) => {
  try {
    const {
      fullName,
      emailOrPhone,
      password = 'reppassword123',
      churchId,
      zoneName,
      churchName
    } = req.body;

    if (!fullName || !emailOrPhone) {
      return res.status(400).json({ error: 'Full name and email/phone are required.' });
    }

    const cleanEmailOrPhone = emailOrPhone.trim().toLowerCase();

    // Check if user already exists
    const existing = await db.prepare('SELECT id FROM users WHERE email_or_phone = ?').get(cleanEmailOrPhone);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email/phone already exists.' });
    }

    let targetChurchId = churchId || null;
    let targetZoneId = null;

    if (targetChurchId) {
      const churchRecord = await db.prepare('SELECT id, zone_id FROM churches WHERE id = ?').get(targetChurchId);
      if (!churchRecord) {
        return res.status(404).json({ error: 'Selected church not found.' });
      }
      targetZoneId = churchRecord.zone_id;
    } else if (zoneName && churchName) {
      const normalizedZone = normalizeTitleCase(zoneName);
      const normalizedChurch = normalizeTitleCase(churchName);

      // Find or create zone
      let zoneRecord = await db.prepare('SELECT id, name FROM zones WHERE LOWER(name) = LOWER(?)').get(normalizedZone);
      if (!zoneRecord) {
        targetZoneId = generateUUID();
        await db.prepare('INSERT INTO zones (id, name) VALUES (?, ?)').run(targetZoneId, normalizedZone);
      } else {
        targetZoneId = zoneRecord.id;
      }

      // Find or create church
      let churchRecord = await db.prepare('SELECT id, name FROM churches WHERE zone_id = ? AND LOWER(name) = LOWER(?)').get(targetZoneId, normalizedChurch);
      if (!churchRecord) {
        targetChurchId = generateUUID();
        await db.prepare('INSERT INTO churches (id, zone_id, name) VALUES (?, ?, ?)').run(targetChurchId, targetZoneId, normalizedChurch);
      } else {
        targetChurchId = churchRecord.id;
      }
    } else {
      return res.status(400).json({ error: 'Please select a church or provide zone and church names.' });
    }

    const effectivePassword = password && password.length >= 6 ? password : 'reppassword123';
    const passwordHash = bcrypt.hashSync(effectivePassword, 10);
    const userId = generateUUID();

    await db.prepare(`
      INSERT INTO users (id, full_name, email_or_phone, password_hash, role, church_id, zone_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(userId, fullName.trim(), cleanEmailOrPhone, passwordHash, 'church_rep', targetChurchId, targetZoneId);

    const userProfile = await getUserProfile(userId);

    res.status(201).json({
      message: 'Representative profile created successfully.',
      user: userProfile,
      defaultPassword: effectivePassword
    });
  } catch (err) {
    console.error('Admin create rep error:', err);
    res.status(500).json({ error: 'Failed to create representative profile: ' + err.message });
  }
});

module.exports = router;
