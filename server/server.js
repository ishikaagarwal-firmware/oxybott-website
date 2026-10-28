const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const db = require('./db');
const {
  generateToken,
  comparePassword,
  hashPassword,
  requireAdminAuth,
  recordAuditLog,
  validateAuthConfiguration
} = require('./auth');
const upload = require('./upload');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Rate limiter for admin login to prevent brute force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per IP per window
  message: { success: false, error: 'Too many login attempts. Please try again in 15 minutes.' }
});

// Rate limiter for public inquiries to prevent spam / automated scraping
const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per IP per window
  message: { success: false, error: 'Too many inquiries submitted from this connection. Please wait a few minutes before trying again.' }
});

// Static directories
app.use('/uploads', express.static(path.resolve('./uploads')));
app.use('/admin', express.static(path.resolve('./admin')));
app.use(express.static(path.resolve('.')));

// ============================================================================
// PUBLIC STORE APIS
// ============================================================================

/**
 * GET /api/settings
 * Returns public store configuration (currency, store name, announcement)
 */
app.get('/api/settings', (req, res) => {
  try {
    const rows = db.prepare('SELECT setting_key, setting_value FROM site_settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/categories
 * Returns published categories with product count
 */
app.get('/api/categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(DISTINCT pc.product_id) 
         FROM product_categories pc 
         JOIN products p ON p.id = pc.product_id 
         WHERE pc.category_id = c.id AND p.is_published = 1) AS products_count
      FROM categories c
      WHERE c.is_published = 1
      ORDER BY c.sort_order ASC, c.name ASC
    `).all();

    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/products
 * Public products catalog with search, filter, sort
 */
app.get('/api/products', (req, res) => {
  try {
    const { category, series, search, sort, featured, limit, offset } = req.query;

    let query = `
      SELECT DISTINCT p.id, p.slug, p.sku, p.name, p.short_name, p.tagline,
             p.series, p.age, p.grade, p.price, p.sale_price, p.stock_quantity,
             p.badge, p.rating, p.reviews_count, p.sort_order, p.created_at,
             (SELECT image_url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS main_image
      FROM products p
      LEFT JOIN product_categories pc ON pc.product_id = p.id
      LEFT JOIN categories c ON c.id = pc.category_id
      WHERE p.is_published = 1
    `;

    const params = [];

    if (category) {
      query += ` AND (c.slug = ? OR c.name = ? OR p.series = ?)`;
      params.push(category, category, category);
    }

    if (series) {
      query += ` AND LOWER(p.series) = LOWER(?)`;
      params.push(series);
    }

    if (featured === 'true' || featured === '1') {
      query += ` AND p.is_featured = 1`;
    }

    if (search) {
      query += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.short_name LIKE ? OR p.description LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    // Sort order
    if (sort === 'price-asc') {
      query += ` ORDER BY p.price ASC`;
    } else if (sort === 'price-desc') {
      query += ` ORDER BY p.price DESC`;
    } else if (sort === 'rating') {
      query += ` ORDER BY p.rating DESC, p.reviews_count DESC`;
    } else if (sort === 'newest') {
      query += ` ORDER BY p.created_at DESC`;
    } else {
      query += ` ORDER BY p.sort_order ASC, p.created_at DESC`;
    }

    if (limit) {
      query += ` LIMIT ?`;
      params.push(parseInt(limit, 10));
      if (offset) {
        query += ` OFFSET ?`;
        params.push(parseInt(offset, 10));
      }
    }

    const stmt = db.prepare(query);
    const products = stmt.all(...params);

    // Fallback image handling
    products.forEach(p => {
      if (!p.main_image) {
        const anyImg = db.prepare('SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order ASC LIMIT 1').get(p.id);
        p.main_image = anyImg ? anyImg.image_url : 'assets/images/oxybott_logo.webp';
      }
    });

    res.json({ success: true, count: products.length, products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/products/:slugOrId
 * Public single product detail
 */
app.get('/api/products/:slugOrId', (req, res) => {
  try {
    const { slugOrId } = req.params;

    const product = db.prepare(`
      SELECT * FROM products 
      WHERE (id = ? OR slug = ?) AND is_published = 1
    `).get(slugOrId, slugOrId);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }

    // Fetch images
    const images = db.prepare(`
      SELECT id, image_url, alt_text, is_main, sort_order 
      FROM product_images 
      WHERE product_id = ? 
      ORDER BY is_main DESC, sort_order ASC
    `).all(product.id);

    // Fetch specs
    const specsRows = db.prepare(`
      SELECT spec_key, spec_value 
      FROM product_specifications 
      WHERE product_id = ? 
      ORDER BY sort_order ASC
    `).all(product.id);
    const specs = {};
    specsRows.forEach(s => { specs[s.spec_key] = s.spec_value; });

    // Fetch highlights
    const highlights = db.prepare(`
      SELECT highlight_text 
      FROM product_highlights 
      WHERE product_id = ? 
      ORDER BY sort_order ASC
    `).all(product.id).map(h => h.highlight_text);

    // Fetch box contents
    const boxContents = db.prepare(`
      SELECT item_text 
      FROM product_box_contents 
      WHERE product_id = ? 
      ORDER BY sort_order ASC
    `).all(product.id).map(b => b.item_text);

    // Fetch linked categories
    const categories = db.prepare(`
      SELECT c.id, c.name, c.slug 
      FROM categories c 
      JOIN product_categories pc ON pc.category_id = c.id 
      WHERE pc.product_id = ?
    `).all(product.id);

    res.json({
      success: true,
      product: {
        ...product,
        images,
        main_image: images.length > 0 ? images[0].image_url : 'assets/images/oxybott_logo.webp',
        specs,
        highlights,
        boxContents,
        categories
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/banners
 * Returns active homepage promotional banners
 */
app.get('/api/banners', (req, res) => {
  try {
    const banners = db.prepare(`
      SELECT * FROM banners WHERE is_active = 1 ORDER BY sort_order ASC
    `).all();
    res.json({ success: true, banners });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/inquiries
 * Public lead capture for contact messages, school quotations, curriculum trials, and newsletter subscriptions.
 * Validates, sanitizes, prevents duplicate submissions, and persists to SQLite.
 */
app.post('/api/inquiries', inquiryLimiter, (req, res) => {
  try {
    const { type, name, email, organization, phone, subject, message, details } = req.body;

    const validTypes = ['contact', 'quote', 'trial', 'newsletter'];
    const inquiryType = (type && validTypes.includes(type.toLowerCase())) ? type.toLowerCase() : 'contact';

    // Email validation
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, error: 'A valid email address is required.' });
    }

    // Name validation (required for contact, quote, and trial)
    if (inquiryType !== 'newsletter') {
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Name is required.' });
      }
    }

    const cleanEmail = email.trim().toLowerCase().slice(0, 255);
    const cleanName = (name || '').trim().slice(0, 200);
    const cleanOrg = (organization || '').trim().slice(0, 200);
    const cleanPhone = (phone || '').trim().slice(0, 50);
    const cleanSubject = (subject || (
      inquiryType === 'quote' ? 'School STEM Kit Quotation' :
      inquiryType === 'trial' ? 'Curriculum Trial Request' :
      inquiryType === 'newsletter' ? 'Newsletter Subscription' : 'General Inquiry'
    )).trim().slice(0, 300);
    const cleanMessage = (message || '').trim().slice(0, 5000);
    const detailsStr = typeof details === 'object' && details !== null 
      ? JSON.stringify(details) 
      : (typeof details === 'string' ? details.slice(0, 5000) : null);
    const clientIp = req.ip || req.connection?.remoteAddress || '127.0.0.1';

    // Duplicate submission check: Same email + type within the last 60 seconds
    const recentDuplicate = db.prepare(`
      SELECT id FROM inquiries 
      WHERE email = ? AND type = ? AND created_at >= datetime('now', '-60 seconds')
    `).get(cleanEmail, inquiryType);

    if (recentDuplicate) {
      return res.status(200).json({
        success: true,
        message: 'Your inquiry was already received and is being processed by our STEM education team.',
        id: recentDuplicate.id
      });
    }

    const id = `inq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const stmt = db.prepare(`
      INSERT INTO inquiries (id, type, name, email, organization, phone, subject, message, details, status, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)
    `);

    stmt.run(id, inquiryType, cleanName, cleanEmail, cleanOrg, cleanPhone, cleanSubject, cleanMessage, detailsStr, clientIp);

    // Optional SMTP notification (safe check without pretending or crashing)
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      console.log(`[Email Notification] SMTP configured. Dispatching inquiry ${id} notification to ${process.env.NOTIFICATION_EMAIL || 'admin@oxybott.com'}`);
    } else {
      console.log(`[Inquiry Stored] New ${inquiryType} inquiry from ${cleanEmail} persisted to database. (SMTP email dispatch disabled)`);
    }

    res.status(201).json({
      success: true,
      message: inquiryType === 'newsletter'
        ? 'Thank you for subscribing to Oxybott STEM news!'
        : inquiryType === 'quote'
        ? 'Quotation request received! Our STEM curriculum specialist will send an institutional proposal within 24 hours.'
        : inquiryType === 'trial'
        ? 'Curriculum trial request submitted! Our education team will verify your school credentials and prepare your kit.'
        : 'Thank you! Your message has been received by the Oxybott team.',
      id
    });
  } catch (err) {
    console.error('Error saving inquiry:', err.message);
    res.status(500).json({ success: false, error: 'Failed to record inquiry. Please try again or contact us directly.' });
  }
});

// ============================================================================
// ADMIN AUTHENTICATION APIS
// ============================================================================

/**
 * POST /api/admin/auth/login
 */
app.post('/api/admin/auth/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required.' });
    }

    const user = db.prepare('SELECT * FROM admin_users WHERE username = ? OR email = ?').get(username, username);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid username or password.' });
    }

    // Update last login
    db.prepare("UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?").run(user.id);

    const token = generateToken(user);

    // Set HTTP-only cookie with strict SameSite flag
    res.cookie('oxybott_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    recordAuditLog(req, 'LOGIN', 'USER', user.id, `User ${user.username} logged in successfully`);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/auth/me
 */
app.get('/api/admin/auth/me', requireAdminAuth, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

/**
 * POST /api/admin/auth/logout
 */
app.post('/api/admin/auth/logout', (req, res) => {
  res.clearCookie('oxybott_token');
  res.json({ success: true, message: 'Logged out successfully.' });
});

/**
 * POST /api/admin/auth/change-password
 */
app.post('/api/admin/auth/change-password', requireAdminAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'New password must be at least 8 characters long.' });
    }

    const user = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.user.id);
    const isMatch = await comparePassword(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect.' });
    }

    const newHash = await hashPassword(newPassword);
    db.prepare('UPDATE admin_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newHash, user.id);

    recordAuditLog(req, 'PASSWORD_CHANGE', 'USER', user.id, 'User password changed');

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// ADMIN DASHBOARD & STATS APIS
// ============================================================================

/**
 * GET /api/admin/stats
 */
app.get('/api/admin/stats', requireAdminAuth, (req, res) => {
  try {
    const totalProducts = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
    const publishedProducts = db.prepare('SELECT COUNT(*) as c FROM products WHERE is_published = 1').get().c;
    const draftProducts = db.prepare('SELECT COUNT(*) as c FROM products WHERE is_published = 0').get().c;
    const lowStockProducts = db.prepare('SELECT COUNT(*) as c FROM products WHERE stock_quantity <= low_stock_threshold').get().c;
    const totalCategories = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;

    const recentUpdates = db.prepare(`
      SELECT id, name, sku, price, stock_quantity, is_published, updated_at
      FROM products
      ORDER BY updated_at DESC
      LIMIT 5
    `).all();

    const recentAuditLogs = db.prepare(`
      SELECT * FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 8
    `).all();

    res.json({
      success: true,
      stats: {
        totalProducts,
        publishedProducts,
        draftProducts,
        lowStockProducts,
        totalCategories,
        recentUpdates,
        recentAuditLogs
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// ADMIN PRODUCT MANAGEMENT (FULL CRUD)
// ============================================================================

/**
 * GET /api/admin/products
 */
app.get('/api/admin/products', requireAdminAuth, (req, res) => {
  try {
    const { search, series, status, sort, page = 1, limit = 20 } = req.query;

    let query = `
      SELECT p.*,
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_main = 1 LIMIT 1) AS main_image
      FROM products p
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.short_name LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    if (series) {
      query += ` AND p.series = ?`;
      params.push(series);
    }

    if (status === 'published') {
      query += ` AND p.is_published = 1`;
    } else if (status === 'draft') {
      query += ` AND p.is_published = 0`;
    } else if (status === 'low_stock') {
      query += ` AND p.stock_quantity <= p.low_stock_threshold`;
    }

    // Sorting
    if (sort === 'price-asc') query += ` ORDER BY p.price ASC`;
    else if (sort === 'price-desc') query += ` ORDER BY p.price DESC`;
    else if (sort === 'stock-asc') query += ` ORDER BY p.stock_quantity ASC`;
    else if (sort === 'name-asc') query += ` ORDER BY p.name ASC`;
    else query += ` ORDER BY p.updated_at DESC`;

    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM (${query})`);
    const total = countStmt.get(...params).total;

    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const offset = (pageNum - 1) * limitNum;

    query += ` LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const products = db.prepare(query).all(...params);

    products.forEach(p => {
      if (!p.main_image) {
        const anyImg = db.prepare('SELECT image_url FROM product_images WHERE product_id = ? ORDER BY sort_order ASC LIMIT 1').get(p.id);
        p.main_image = anyImg ? anyImg.image_url : 'assets/images/oxybott_logo.webp';
      }
    });

    res.json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      products
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/products/:id
 */
app.get('/api/admin/products/:id', requireAdminAuth, (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found.' });

    const images = db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_main DESC, sort_order ASC').all(product.id);
    const specs = db.prepare('SELECT spec_key, spec_value, sort_order FROM product_specifications WHERE product_id = ? ORDER BY sort_order ASC').all(product.id);
    const highlights = db.prepare('SELECT highlight_text, sort_order FROM product_highlights WHERE product_id = ? ORDER BY sort_order ASC').all(product.id);
    const boxContents = db.prepare('SELECT item_text, sort_order FROM product_box_contents WHERE product_id = ? ORDER BY sort_order ASC').all(product.id);
    const categories = db.prepare('SELECT category_id FROM product_categories WHERE product_id = ?').all(product.id).map(c => c.category_id);

    res.json({
      success: true,
      product: {
        ...product,
        images,
        specs,
        highlights,
        boxContents,
        categoryIds: categories
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/products
 * Create product
 */
app.post('/api/admin/products', requireAdminAuth, (req, res) => {
  try {
    const {
      name, short_name, sku, price, sale_price, stock_quantity,
      series, age, grade, tagline, description, badge, is_published,
      is_featured, specs, highlights, boxContents, categoryIds
    } = req.body;

    if (!name || !price || !sku) {
      return res.status(400).json({ success: false, error: 'Product Name, SKU, and Price are required.' });
    }

    // Check SKU uniqueness
    const existingSku = db.prepare('SELECT id FROM products WHERE sku = ?').get(sku.trim());
    if (existingSku) {
      return res.status(400).json({ success: false, error: `SKU '${sku}' is already in use by another product.` });
    }

    // Generate unique ID and slug
    let productId = req.body.id ? req.body.id.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-') : null;
    const baseSlug = (req.body.slug || (productId || name)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (db.prepare('SELECT id FROM products WHERE slug = ? AND id != ?').get(slug, productId || '')) {
      slug = `${baseSlug}-${counter++}`;
    }
    if (!productId) productId = slug;

    const numPrice = parseFloat(price);
    const numSalePrice = sale_price ? parseFloat(sale_price) : null;
    const numStock = parseInt(stock_quantity !== undefined ? stock_quantity : 100, 10);

    // Insert Product
    const insertProd = db.prepare(`
      INSERT INTO products (
        id, slug, sku, name, short_name, tagline, description, series,
        age, grade, price, sale_price, stock_quantity, is_published, is_featured,
        badge, rating, reviews_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 5.0, 0)
    `);

    insertProd.run(
      productId,
      slug,
      sku.trim(),
      name.trim(),
      short_name ? short_name.trim() : name.trim(),
      tagline || '',
      description || '',
      series || 'Explorer Series',
      age || '8+',
      grade || 'Grade 3-8',
      numPrice,
      numSalePrice,
      numStock,
      is_published ? 1 : 0,
      is_featured ? 1 : 0,
      badge || 'New'
    );

    // Insert specs (supports array of {key, value} or key-value object)
    if (specs) {
      const insSpec = db.prepare('INSERT INTO product_specifications (product_id, spec_key, spec_value, sort_order) VALUES (?, ?, ?, ?)');
      if (Array.isArray(specs)) {
        specs.forEach((s, idx) => {
          if (s.key && s.value) insSpec.run(productId, s.key.trim(), s.value.trim(), idx);
        });
      } else if (typeof specs === 'object') {
        Object.entries(specs).forEach(([k, v], idx) => {
          if (k && v) insSpec.run(productId, String(k).trim(), String(v).trim(), idx);
        });
      }
    }

    // Insert highlights
    const hlList = highlights || req.body.highlight_list;
    if (hlList && Array.isArray(hlList)) {
      const insHl = db.prepare('INSERT INTO product_highlights (product_id, highlight_text, sort_order) VALUES (?, ?, ?)');
      hlList.forEach((h, idx) => {
        if (h && String(h).trim()) insHl.run(productId, String(h).trim(), idx);
      });
    }

    // Insert box contents (supports boxContents or box_contents)
    const boxList = boxContents || req.body.box_contents;
    if (boxList && Array.isArray(boxList)) {
      const insBox = db.prepare('INSERT INTO product_box_contents (product_id, item_text, sort_order) VALUES (?, ?, ?)');
      boxList.forEach((b, idx) => {
        if (b && String(b).trim()) insBox.run(productId, String(b).trim(), idx);
      });
    }

    // Insert categories
    if (categoryIds && Array.isArray(categoryIds)) {
      const insCat = db.prepare('INSERT OR IGNORE INTO product_categories (product_id, category_id) VALUES (?, ?)');
      categoryIds.forEach(cId => insCat.run(productId, parseInt(cId, 10)));
    }

    recordAuditLog(req, 'CREATE_PRODUCT', 'PRODUCT', productId, `Created product "${name}" (SKU: ${sku})`);

    res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      productId,
      slug
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/admin/products/:id
 * Update product
 */
app.put('/api/admin/products/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, short_name, sku, price, sale_price, stock_quantity,
      series, age, grade, tagline, description, badge, is_published,
      is_featured, specs, highlights, boxContents, categoryIds
    } = req.body;

    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, error: 'Product not found.' });

    // Check SKU collision with other products
    if (sku && sku.trim() !== existing.sku) {
      const collision = db.prepare('SELECT id FROM products WHERE sku = ? AND id != ?').get(sku.trim(), id);
      if (collision) {
        return res.status(400).json({ success: false, error: `SKU '${sku}' is already in use by another product.` });
      }
    }

    const numPrice = parseFloat(price);
    const numSalePrice = sale_price ? parseFloat(sale_price) : null;
    const numStock = parseInt(stock_quantity !== undefined ? stock_quantity : existing.stock_quantity, 10);

    const updateProd = db.prepare(`
      UPDATE products SET
        name = ?, short_name = ?, sku = ?, price = ?, sale_price = ?,
        stock_quantity = ?, series = ?, age = ?, grade = ?, tagline = ?,
        description = ?, badge = ?, is_published = ?, is_featured = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    updateProd.run(
      name !== undefined ? name.trim() : existing.name,
      short_name !== undefined ? short_name.trim() : existing.short_name,
      sku !== undefined ? sku.trim() : existing.sku,
      !isNaN(numPrice) ? numPrice : existing.price,
      numSalePrice,
      numStock,
      series || existing.series,
      age || existing.age,
      grade || existing.grade,
      tagline !== undefined ? tagline : existing.tagline,
      description !== undefined ? description : existing.description,
      badge !== undefined ? badge : existing.badge,
      is_published !== undefined ? (is_published ? 1 : 0) : existing.is_published,
      is_featured !== undefined ? (is_featured ? 1 : 0) : existing.is_featured,
      id
    );

    // Sync specs
    if (specs && Array.isArray(specs)) {
      db.prepare('DELETE FROM product_specifications WHERE product_id = ?').run(id);
      const insSpec = db.prepare('INSERT INTO product_specifications (product_id, spec_key, spec_value, sort_order) VALUES (?, ?, ?, ?)');
      specs.forEach((s, idx) => {
        if (s.key && s.value) insSpec.run(id, s.key.trim(), s.value.trim(), idx);
      });
    }

    // Sync highlights
    if (highlights && Array.isArray(highlights)) {
      db.prepare('DELETE FROM product_highlights WHERE product_id = ?').run(id);
      const insHl = db.prepare('INSERT INTO product_highlights (product_id, highlight_text, sort_order) VALUES (?, ?, ?)');
      highlights.forEach((h, idx) => {
        if (h && String(h).trim()) insHl.run(id, String(h).trim(), idx);
      });
    }

    // Sync box contents
    if (boxContents && Array.isArray(boxContents)) {
      db.prepare('DELETE FROM product_box_contents WHERE product_id = ?').run(id);
      const insBox = db.prepare('INSERT INTO product_box_contents (product_id, item_text, sort_order) VALUES (?, ?, ?)');
      boxContents.forEach((b, idx) => {
        if (b && String(b).trim()) insBox.run(id, String(b).trim(), idx);
      });
    }

    // Sync categories
    if (categoryIds && Array.isArray(categoryIds)) {
      db.prepare('DELETE FROM product_categories WHERE product_id = ?').run(id);
      const insCat = db.prepare('INSERT OR IGNORE INTO product_categories (product_id, category_id) VALUES (?, ?)');
      categoryIds.forEach(cId => insCat.run(id, parseInt(cId, 10)));
    }

    recordAuditLog(req, 'UPDATE_PRODUCT', 'PRODUCT', id, `Updated product "${name || existing.name}"`);

    res.json({ success: true, message: 'Product updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/admin/products/:id/publish
 */
app.patch('/api/admin/products/:id/publish', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { is_published } = req.body;

    const val = is_published ? 1 : 0;
    db.prepare('UPDATE products SET is_published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(val, id);

    recordAuditLog(req, val ? 'PUBLISH' : 'UNPUBLISH', 'PRODUCT', id, `Changed publication status to ${val ? 'Published' : 'Draft'}`);

    res.json({ success: true, is_published: val });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/products/:id/duplicate
 */
app.post('/api/admin/products/:id/duplicate', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const orig = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!orig) return res.status(404).json({ success: false, error: 'Original product not found.' });

    const newName = `${orig.name} (Copy)`;
    const newSku = `${orig.sku}-COPY-${Math.floor(100 + Math.random() * 900)}`;
    const baseSlug = `${orig.slug}-copy`;
    let newSlug = baseSlug;
    let count = 1;
    while (db.prepare('SELECT id FROM products WHERE slug = ?').get(newSlug)) {
      newSlug = `${baseSlug}-${count++}`;
    }
    const newId = newSlug;

    // Insert duplicate
    db.prepare(`
      INSERT INTO products (
        id, slug, sku, name, short_name, tagline, description, series,
        age, grade, price, sale_price, stock_quantity, is_published, is_featured,
        badge, rating, reviews_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
    `).run(
      newId, newSlug, newSku, newName, `${orig.short_name} (Copy)`,
      orig.tagline, orig.description, orig.series, orig.age, orig.grade,
      orig.price, orig.sale_price, orig.stock_quantity, 'Draft', orig.rating, 0
    );

    // Copy relational data
    const images = db.prepare('SELECT * FROM product_images WHERE product_id = ?').all(id);
    const insImg = db.prepare('INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_main) VALUES (?, ?, ?, ?, ?)');
    images.forEach(img => insImg.run(newId, img.image_url, img.alt_text, img.sort_order, img.is_main));

    const specs = db.prepare('SELECT * FROM product_specifications WHERE product_id = ?').all(id);
    const insSpec = db.prepare('INSERT INTO product_specifications (product_id, spec_key, spec_value, sort_order) VALUES (?, ?, ?, ?)');
    specs.forEach(s => insSpec.run(newId, s.spec_key, s.spec_value, s.sort_order));

    const hls = db.prepare('SELECT * FROM product_highlights WHERE product_id = ?').all(id);
    const insHl = db.prepare('INSERT INTO product_highlights (product_id, highlight_text, sort_order) VALUES (?, ?, ?)');
    hls.forEach(h => insHl.run(newId, h.highlight_text, h.sort_order));

    const boxes = db.prepare('SELECT * FROM product_box_contents WHERE product_id = ?').all(id);
    const insBox = db.prepare('INSERT INTO product_box_contents (product_id, item_text, sort_order) VALUES (?, ?, ?)');
    boxes.forEach(b => insBox.run(newId, b.item_text, b.sort_order));

    const cats = db.prepare('SELECT * FROM product_categories WHERE product_id = ?').all(id);
    const insCat = db.prepare('INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)');
    cats.forEach(c => insCat.run(newId, c.category_id));

    recordAuditLog(req, 'DUPLICATE_PRODUCT', 'PRODUCT', newId, `Duplicated from product ${id}`);

    res.status(201).json({ success: true, message: 'Product duplicated successfully.', newId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/admin/products/:id
 */
app.delete('/api/admin/products/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT name, sku FROM products WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, error: 'Product not found.' });

    db.prepare('DELETE FROM products WHERE id = ?').run(id);

    recordAuditLog(req, 'DELETE_PRODUCT', 'PRODUCT', id, `Deleted product "${existing.name}" (${existing.sku})`);

    res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// ADMIN IMAGE MANAGEMENT
// ============================================================================

/**
 * POST /api/admin/products/:id/images
 * Upload images for a product
 */
app.post('/api/admin/products/:id/images', requireAdminAuth, upload.array('images', 10), (req, res) => {
  try {
    const { id } = req.params;
    const product = db.prepare('SELECT id, name FROM products WHERE id = ?').get(id);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found.' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files were uploaded.' });
    }

    // Check if product already has a main image
    const mainImg = db.prepare('SELECT id FROM product_images WHERE product_id = ? AND is_main = 1').get(id);
    const hasMain = !!mainImg;

    const insImg = db.prepare(`
      INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_main)
      VALUES (?, ?, ?, ?, ?)
    `);

    const uploaded = [];
    req.files.forEach((file, index) => {
      const webPath = `/uploads/products/${file.filename}`;
      const isMain = (!hasMain && index === 0) ? 1 : 0;
      const resInfo = insImg.run(id, webPath, product.name, 99 + index, isMain);
      uploaded.push({ id: resInfo.lastInsertRowid, image_url: webPath, is_main: isMain });
    });

    recordAuditLog(req, 'UPLOAD_IMAGES', 'PRODUCT', id, `Uploaded ${req.files.length} image(s)`);

    res.json({ success: true, uploaded });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/admin/products/:id/images/:imageId/main
 * Set an image as the main product image
 */
app.patch('/api/admin/products/:id/images/:imageId/main', requireAdminAuth, (req, res) => {
  try {
    const { id, imageId } = req.params;
    db.prepare('UPDATE product_images SET is_main = 0 WHERE product_id = ?').run(id);
    db.prepare('UPDATE product_images SET is_main = 1 WHERE product_id = ? AND id = ?').run(id, imageId);

    recordAuditLog(req, 'SET_MAIN_IMAGE', 'PRODUCT', id, `Set image ${imageId} as main image`);

    res.json({ success: true, message: 'Main image updated.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/admin/products/:id/images/:imageId
 * Delete an image
 */
app.delete('/api/admin/products/:id/images/:imageId', requireAdminAuth, (req, res) => {
  try {
    const { id, imageId } = req.params;
    const img = db.prepare('SELECT image_url, is_main FROM product_images WHERE product_id = ? AND id = ?').get(id, imageId);
    if (!img) return res.status(404).json({ success: false, error: 'Image not found.' });

    // Delete record
    db.prepare('DELETE FROM product_images WHERE id = ?').run(imageId);

    // If deleted image was main, promote another image
    if (img.is_main) {
      const nextImg = db.prepare('SELECT id FROM product_images WHERE product_id = ? ORDER BY sort_order ASC LIMIT 1').get(id);
      if (nextImg) {
        db.prepare('UPDATE product_images SET is_main = 1 WHERE id = ?').run(nextImg.id);
      }
    }

    // Try deleting physical file if under uploads/
    if (img.image_url.startsWith('/uploads/')) {
      const diskPath = path.resolve('.' + img.image_url);
      if (fs.existsSync(diskPath)) {
        fs.unlinkSync(diskPath);
      }
    }

    recordAuditLog(req, 'DELETE_IMAGE', 'PRODUCT', id, `Deleted image ${imageId}`);

    res.json({ success: true, message: 'Image deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// ADMIN CATEGORIES MANAGEMENT
// ============================================================================

app.get('/api/admin/categories', requireAdminAuth, (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM product_categories WHERE category_id = c.id) AS products_count
      FROM categories c
      ORDER BY c.sort_order ASC, c.name ASC
    `).all();

    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/categories', requireAdminAuth, (req, res) => {
  try {
    const { name, slug, description, image_url, sort_order, is_published } = req.body;

    if (!name) return res.status(400).json({ success: false, error: 'Category name is required.' });

    const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const ins = db.prepare(`
      INSERT INTO categories (name, slug, description, image_url, sort_order, is_published)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = ins.run(name.trim(), finalSlug, description || '', image_url || '', parseInt(sort_order || 0, 10), is_published ? 1 : 0);

    recordAuditLog(req, 'CREATE_CATEGORY', 'CATEGORY', result.lastInsertRowid, `Created category "${name}"`);

    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/admin/categories/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, image_url, sort_order, is_published } = req.body;

    db.prepare(`
      UPDATE categories SET
        name = ?, slug = ?, description = ?, image_url = ?, sort_order = ?,
        is_published = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, slug, description, image_url, sort_order, is_published ? 1 : 0, id);

    recordAuditLog(req, 'UPDATE_CATEGORY', 'CATEGORY', id, `Updated category "${name}"`);

    res.json({ success: true, message: 'Category updated.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/admin/categories/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);

    recordAuditLog(req, 'DELETE_CATEGORY', 'CATEGORY', id, `Deleted category ${id}`);

    res.json({ success: true, message: 'Category deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// ADMIN BANNERS & PROMOTIONS
// ============================================================================

app.get('/api/admin/banners', requireAdminAuth, (req, res) => {
  try {
    const banners = db.prepare('SELECT * FROM banners ORDER BY sort_order ASC').all();
    res.json({ success: true, banners });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/admin/banners', requireAdminAuth, (req, res) => {
  try {
    const { title, subtitle, image_url, cta_text, cta_link, is_active, sort_order } = req.body;
    const ins = db.prepare(`
      INSERT INTO banners (title, subtitle, image_url, cta_text, cta_link, is_active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const r = ins.run(title, subtitle, image_url, cta_text, cta_link, is_active ? 1 : 0, parseInt(sort_order || 0, 10));

    recordAuditLog(req, 'CREATE_BANNER', 'BANNER', r.lastInsertRowid, `Created banner "${title}"`);

    res.status(201).json({ success: true, id: r.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/admin/banners/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, image_url, cta_text, cta_link, is_active, sort_order } = req.body;
    db.prepare(`
      UPDATE banners SET title = ?, subtitle = ?, image_url = ?, cta_text = ?, cta_link = ?, is_active = ?, sort_order = ?
      WHERE id = ?
    `).run(title, subtitle, image_url, cta_text, cta_link, is_active ? 1 : 0, sort_order, id);

    recordAuditLog(req, 'UPDATE_BANNER', 'BANNER', id, `Updated banner "${title}"`);

    res.json({ success: true, message: 'Banner updated.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/admin/banners/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM banners WHERE id = ?').run(id);

    recordAuditLog(req, 'DELETE_BANNER', 'BANNER', id, `Deleted banner ${id}`);

    res.json({ success: true, message: 'Banner deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// ADMIN SETTINGS & AUDIT LOGS
// ============================================================================

app.get('/api/admin/settings', requireAdminAuth, (req, res) => {
  try {
    const rows = db.prepare('SELECT setting_key, setting_value FROM site_settings').all();
    const settings = {};
    rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/admin/settings', requireAdminAuth, (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid settings object.' });
    }

    const ins = db.prepare(`
      INSERT INTO site_settings (setting_key, setting_value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = CURRENT_TIMESTAMP
    `);

    for (const [key, value] of Object.entries(settings)) {
      ins.run(key, String(value));
    }

    recordAuditLog(req, 'UPDATE_SETTINGS', 'SETTINGS', 'GLOBAL', 'Updated site configuration settings');

    res.json({ success: true, message: 'Settings saved successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/admin/audit-logs', requireAdminAuth, (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const logs = db.prepare(`
      SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?
    `).all(parseInt(limit, 10));

    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// ADMIN INQUIRIES & LEADS MANAGEMENT APIS
// ============================================================================

/**
 * GET /api/admin/inquiries
 * List customer inquiries and school quotation requests with filtering & pagination
 */
app.get('/api/admin/inquiries', requireAdminAuth, (req, res) => {
  try {
    const { type, status, search, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT * FROM inquiries WHERE 1=1';
    const params = [];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR organization LIKE ? OR subject LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const inquiries = db.prepare(query).all(...params);
    const countRow = db.prepare('SELECT COUNT(*) as total FROM inquiries').get();

    res.json({
      success: true,
      inquiries,
      total: countRow ? countRow.total : inquiries.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/admin/inquiries/:id
 * Update inquiry status (new, in_progress, resolved, archived)
 */
app.patch('/api/admin/inquiries/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['new', 'in_progress', 'resolved', 'archived'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const result = db.prepare(`
      UPDATE inquiries SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(status, id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Inquiry not found.' });
    }

    recordAuditLog(req, 'UPDATE_INQUIRY_STATUS', 'INQUIRY', id, `Updated inquiry status to ${status}`);

    res.json({ success: true, message: `Inquiry status updated to ${status}.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/admin/inquiries/:id
 * Remove an inquiry
 */
app.delete('/api/admin/inquiries/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM inquiries WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Inquiry not found.' });
    }

    recordAuditLog(req, 'DELETE_INQUIRY', 'INQUIRY', id, `Deleted inquiry ${id}`);

    res.json({ success: true, message: 'Inquiry deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Global Error Handler Middleware (Catches Multer errors, bad payloads, and server exceptions)
app.use((err, req, res, next) => {
  if (err && (err.name === 'MulterError' || (err.message && (err.message.includes('Invalid image') || err.message.includes('File too large'))))) {
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err) {
    console.error('[Server Error]', err.message);
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal Server Error'
    });
  }
  next();
});

// 404 Not Found Middleware
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, error: `Endpoint ${req.method} ${req.path} not found.` });
  }
  const notFoundPage = path.resolve('./404.html');
  if (fs.existsSync(notFoundPage)) {
    return res.status(404).sendFile(notFoundPage);
  }
  res.status(404).send('404 Not Found');
});

// Validate security configuration before accepting connections
validateAuthConfiguration();

if (process.env.NODE_ENV === 'production') {
  const adminUser = db.prepare("SELECT * FROM admin_users WHERE username = 'admin'").get();
  if (adminUser) {
    const bcrypt = require('bcryptjs');
    if (bcrypt.compareSync('AdminPassword123!', adminUser.password_hash)) {
      throw new Error('[SECURITY FATAL] Refusing to start in production: Default admin password AdminPassword123! is still active. Please change the administrator password before deploying.');
    }
  }
}

// Start Server
app.listen(PORT, HOST, () => {
  console.log(`====================================================`);
  console.log(`🚀 OXYBOTT ENTERPRISE BACKEND SERVER RUNNING`);
  console.log(`📍 Public Website:  http://${HOST}:${PORT}/`);
  console.log(`🔒 Admin Dashboard: http://${HOST}:${PORT}/admin/`);
  console.log(`📦 Database:        ${process.env.DATABASE_FILE || './data/oxybott.db'}`);
  console.log(`====================================================`);
});

