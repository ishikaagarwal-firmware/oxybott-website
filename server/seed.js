const db = require('./db');
const { hashPassword } = require('./auth');
const path = require('path');

// Import existing product dataset
const { OXYBOTT_PRODUCTS } = require('../assets/js/products-data.js');

async function seedDatabase() {
  console.log('--- Initializing Oxybott Database Seed ---');

  // 1. Seed or Verify First Admin User
  const adminCheck = db.prepare('SELECT id, username FROM admin_users WHERE username = ?').get('admin');
  if (!adminCheck) {
    const passwordHash = await hashPassword('AdminPassword123!');
    const insertAdmin = db.prepare(`
      INSERT INTO admin_users (username, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `);
    insertAdmin.run('admin', 'admin@oxybott.com', passwordHash, 'admin');
    console.log('[SEED] Created default admin account: admin / AdminPassword123!');
  } else {
    console.log('[SEED] Admin user already exists.');
  }

  // 2. Seed Default Categories
  const categories = [
    { name: 'Explorer Series', slug: 'explorer-series', description: 'For beginners & kids ages 8-12. Drag-and-drop block coding.', sort_order: 1 },
    { name: 'Education Series', slug: 'education-series', description: 'Classroom curriculum kits, magnetic display systems & teacher slides.', sort_order: 2 },
    { name: 'Inventor Series', slug: 'inventor-series', description: 'Advanced 4-DOF arms, biped walkers, and 8-servo spider robots.', sort_order: 3 },
    { name: 'Maker Series', slug: 'maker-series', description: 'ESP32 development boards, 37-in-1 sensor kits & electronics prototyping.', sort_order: 4 },
    { name: 'Robotics', slug: 'robotics', description: 'Mecanum coding cars, programmable arms, and bio-inspired robotics.', sort_order: 5 },
    { name: 'Smart IoT', slug: 'smart-iot', description: 'Weather stations, RFID home security, and greenhouse IoT systems.', sort_order: 6 },
    { name: 'Classroom Sets', slug: 'classroom-sets', description: 'Complete turnkey classroom solutions for schools and districts.', sort_order: 7 },
    { name: 'Electronics', slug: 'electronics', description: 'Microcontrollers, sensors, actuators, and breadboard labs.', sort_order: 8 }
  ];

  const catInsert = db.prepare(`
    INSERT OR IGNORE INTO categories (name, slug, description, sort_order)
    VALUES (?, ?, ?, ?)
  `);

  categories.forEach(c => {
    catInsert.run(c.name, c.slug, c.description, c.sort_order);
  });
  console.log(`[SEED] Verified ${categories.length} core categories.`);

  // Lookup map for categories
  const catRows = db.prepare('SELECT id, name, slug FROM categories').all();
  const catMap = new Map();
  catRows.forEach(c => {
    catMap.set(c.name.toLowerCase(), c.id);
    catMap.set(c.slug.toLowerCase(), c.id);
  });

  // 3. Seed Products
  const prodCheck = db.prepare('SELECT COUNT(*) as count FROM products').get();
  if (prodCheck.count === 0 && OXYBOTT_PRODUCTS && OXYBOTT_PRODUCTS.length > 0) {
    console.log(`[SEED] Importing ${OXYBOTT_PRODUCTS.length} authentic products from products-data.js...`);

    const insertProd = db.prepare(`
      INSERT INTO products (
        id, slug, sku, name, short_name, tagline, description, series,
        age, grade, price, sale_price, stock_quantity, is_published, is_featured,
        badge, rating, reviews_count, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertProdCat = db.prepare(`
      INSERT OR IGNORE INTO product_categories (product_id, category_id)
      VALUES (?, ?)
    `);

    const insertImage = db.prepare(`
      INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_main)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertSpec = db.prepare(`
      INSERT INTO product_specifications (product_id, spec_key, spec_value, sort_order)
      VALUES (?, ?, ?, ?)
    `);

    const insertHighlight = db.prepare(`
      INSERT INTO product_highlights (product_id, highlight_text, sort_order)
      VALUES (?, ?, ?)
    `);

    const insertBox = db.prepare(`
      INSERT INTO product_box_contents (product_id, item_text, sort_order)
      VALUES (?, ?, ?)
    `);

    OXYBOTT_PRODUCTS.forEach((p, idx) => {
      // Convert USD price to approximate INR for default currency (1 USD ~= 83 INR)
      const inrPrice = Math.round(p.price * 83);
      const inrOriginal = p.originalPrice ? Math.round(p.originalPrice * 83) : null;

      insertProd.run(
        p.id,
        p.id,
        p.sku,
        p.name,
        p.shortName,
        p.tagline || '',
        p.description || '',
        p.series || 'Explorer Series',
        p.age || '8+',
        p.grade || 'Grade 3-8',
        inrPrice,
        inrOriginal,
        100, // Initial stock
        1,   // is_published
        idx < 4 ? 1 : 0, // is_featured
        p.badge || 'Popular',
        p.rating || 5.0,
        p.reviewsCount || 50,
        idx + 1
      );

      // Link categories (series & category)
      const seriesCatId = catMap.get((p.series || '').toLowerCase());
      if (seriesCatId) insertProdCat.run(p.id, seriesCatId);

      const typeCatId = catMap.get((p.category || '').toLowerCase());
      if (typeCatId) insertProdCat.run(p.id, typeCatId);

      // Main image
      if (p.image) {
        insertImage.run(p.id, p.image, p.name, 0, 1);
      }

      // Specifications
      if (p.specs) {
        let sOrder = 0;
        for (const [key, value] of Object.entries(p.specs)) {
          insertSpec.run(p.id, key, String(value), sOrder++);
        }
      }

      // Highlights
      if (p.highlights && Array.isArray(p.highlights)) {
        p.highlights.forEach((h, hIdx) => {
          insertHighlight.run(p.id, h, hIdx);
        });
      }

      // Box Contents
      if (p.boxContents && Array.isArray(p.boxContents)) {
        p.boxContents.forEach((b, bIdx) => {
          insertBox.run(p.id, b, bIdx);
        });
      }
    });

    console.log('[SEED] Products successfully imported and relational tables linked.');
  }

  // 4. Seed Default Site Settings
  const settings = [
    { key: 'currency_code', value: 'INR' },
    { key: 'currency_symbol', value: '₹' },
    { key: 'store_name', value: 'Oxybott STEM Robotics' },
    { key: 'announcement', value: 'ESP32 EDUCATION SOLUTIONS INNOVATOR • Focus on Smart Robotics & Coding Kits!' },
    { key: 'contact_email', value: 'education@oxybott.com' },
    { key: 'support_email', value: 'support@oxybott.com' },
    { key: 'phone', value: '+1 (800) 555-OXYBOTT' },
    { key: 'free_shipping_threshold', value: '2999' },
    { key: 'seo_title', value: 'Oxybott: Leading Brand for STEM Kits, ESP32 Kits & Robot Kits' },
    { key: 'seo_description', value: 'Oxybott is a trusted brand for STEAM Kits, ESP32 Kits, and Robot Kits, designed to inspire hands-on learning in STEM education.' }
  ];

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO site_settings (setting_key, setting_value)
    VALUES (?, ?)
  `);

  settings.forEach(s => {
    insertSetting.run(s.key, s.value);
  });
  console.log('[SEED] Verified default site settings.');

  // 5. Seed Banners
  const bannerCheck = db.prepare('SELECT COUNT(*) as count FROM banners').get();
  if (bannerCheck.count === 0) {
    const insertBanner = db.prepare(`
      INSERT INTO banners (title, subtitle, image_url, cta_text, cta_link, is_active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertBanner.run(
      'Build, Code & Innovate with Oxybott STEM Kits',
      'Ignite creativity in classrooms, maker labs, and at home with open-source ESP32 kits and OxyCode block programming.',
      'assets/images/qd022-robot-arm.png',
      'Explore All Kits',
      'products.html',
      1,
      1
    );
    console.log('[SEED] Created default homepage hero banner.');
  }

  console.log('--- Database Seeding Complete ---');
}

if (require.main === module) {
  seedDatabase().catch(err => {
    console.error('Seed execution error:', err);
    process.exit(1);
  });
}

module.exports = seedDatabase;
