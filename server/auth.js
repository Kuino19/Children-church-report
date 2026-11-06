const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'district-church-secret-key-2026-prod-fallback';
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('⚠️ WARNING: JWT_SECRET environment variable is not set in production. Using fallback secret.');
}
const ADMIN_INVITE_CODE = 'DISTRICT2026';

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email_or_phone: user.email_or_phone,
      role: user.role,
      church_id: user.church_id,
      zone_id: user.zone_id
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'district_admin') {
      return res.status(403).json({ error: 'Access denied. District Coordinator (Admin) rights required.' });
    }
    next();
  });
}

module.exports = {
  generateToken,
  requireAuth,
  requireAdmin,
  ADMIN_INVITE_CODE
};
