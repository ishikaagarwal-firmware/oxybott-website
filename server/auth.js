const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');
require('dotenv').config();

const INSECURE_FALLBACKS = [
  'oxybott_default_secret_key_change_me',
  'oxybott_super_secure_jwt_secret_key_2026_change_in_production',
  'your_production_high_entropy_jwt_secret_here_minimum_32_chars',
  'secret',
  'password',
  '123456',
  'changeme'
];

/**
 * Validate JWT secret and administrative security configuration.
 * Fails safely during production startup if insecure defaults are detected.
 */
function validateAuthConfiguration() {
  const isProd = process.env.NODE_ENV === 'production';
  const secret = (process.env.JWT_SECRET || '').trim();

  if (isProd) {
    if (!secret || secret.length < 32 || INSECURE_FALLBACKS.includes(secret)) {
      throw new Error(
        '[SECURITY FATAL] Refusing to start in production: JWT_SECRET is missing, shorter than 32 characters, or using a known insecure default. Set a strong secret in environment variables.'
      );
    }
  } else if (!secret || INSECURE_FALLBACKS.includes(secret)) {
    console.warn('\x1b[33m[SECURITY WARNING] Running with development JWT secret. Ensure high-entropy JWT_SECRET is configured before deploying to production.\x1b[0m');
  }
}

// Run configuration check
validateAuthConfiguration();

const JWT_SECRET = process.env.JWT_SECRET || 'oxybott_dev_secret_key_88f921ab04e76d33c5e0129a';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate a JWT token for an authenticated user
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Hash a plain password using bcrypt
 */
async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, 10);
}

/**
 * Compare plain password against stored hash
 */
async function comparePassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

/**
 * Middleware: Enforce admin authentication
 * Supports Authorization: Bearer <token> and secure httpOnly cookies.
 * Mitigates CSRF on cookie-authenticated state-changing requests via custom header inspection.
 */
function requireAdminAuth(req, res, next) {
  let token = null;
  let isCookieAuth = false;

  // Check Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.oxybott_token) {
    token = req.cookies.oxybott_token;
    isCookieAuth = true;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
  }

  // Anti-CSRF protection: For state-changing requests authenticated purely via cookie,
  // require custom header (X-Requested-With or X-Oxybott-CSRF) that cross-origin browsers cannot forge
  const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (isCookieAuth && stateChangingMethods.includes(req.method.toUpperCase())) {
    const hasCsrfHeader = req.headers['x-requested-with'] || req.headers['x-oxybott-csrf'];
    if (!hasCsrfHeader) {
      return res.status(403).json({
        success: false,
        error: 'CSRF Protection: Cookie-authenticated state-changing operations require custom header (X-Requested-With or X-Oxybott-CSRF).'
      });
    }
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verify user still exists in database
    const stmt = db.prepare('SELECT id, username, email, role FROM admin_users WHERE id = ?');
    const user = stmt.get(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, error: 'User account no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Session expired or invalid token. Please log in again.' });
  }
}

/**
 * Record an audit log entry for administrative activity
 */
function recordAuditLog(req, action, entityType, entityId, details = null) {
  try {
    const userId = req.user ? req.user.id : null;
    const username = req.user ? req.user.username : 'system';
    const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';
    const detailStr = typeof details === 'object' ? JSON.stringify(details) : String(details || '');

    const stmt = db.prepare(`
      INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(userId, username, action, entityType, String(entityId || ''), detailStr, ip);
  } catch (err) {
    console.error('Audit logging error:', err.message);
  }
}

module.exports = {
  generateToken,
  hashPassword,
  comparePassword,
  requireAdminAuth,
  recordAuditLog,
  validateAuthConfiguration
};
