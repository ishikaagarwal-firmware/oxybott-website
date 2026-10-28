/**
 * Oxybott Main Interactive Script
 * Handles Cart, Mega Menu, Search, Filter Pills, Modals, and Interactive Code Studio
 */

document.addEventListener('DOMContentLoaded', () => {
  initStickyHeader();
  initMegaMenu();
  initCart();
  initSearch();
  initFilterTabs();
  initCodeStudio();
  initModals();
  initMobileMenu();
});

/* ==========================================================================
   1. Sticky Header
   ========================================================================== */
function initStickyHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

/* ==========================================================================
   2. Mega Menu Tabs
   ========================================================================== */
function initMegaMenu() {
  const tabBtns = document.querySelectorAll('.mega-tab-btn');
  const panes = document.querySelectorAll('.mega-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      const targetPaneId = btn.getAttribute('data-target');
      
      tabBtns.forEach(b => b.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(targetPaneId);
      if (targetPane) targetPane.classList.add('active');
    });
  });
}

/* ==========================================================================
   3. Shopping Cart System (localStorage backed)
   ========================================================================== */
const CartState = {
  items: JSON.parse(localStorage.getItem('oxybott_cart') || '[]'),

  save() {
    localStorage.setItem('oxybott_cart', JSON.stringify(this.items));
    this.updateUI();
  },

  addItem(productOrId, qty = 1) {
    let prod = null;
    if (typeof productOrId === 'object' && productOrId !== null) {
      prod = productOrId;
    } else {
      const pid = productOrId;
      if (window.StoreClient && window.StoreClient.productsCache) {
        prod = window.StoreClient.productsCache.find(p => p.id === pid || p.slug === pid);
      }
      if (!prod && typeof OXYBOTT_PRODUCTS !== 'undefined') {
        prod = OXYBOTT_PRODUCTS.find(p => p.id === pid || p.slug === pid);
      }
    }
    if (!prod) return;

    const productId = prod.id || prod.slug;
    const existing = this.items.find(item => item.id === productId);
    if (existing) {
      existing.qty += qty;
      existing.price = Number(prod.price) || existing.price;
    } else {
      this.items.push({
        id: productId,
        name: prod.name,
        shortName: prod.shortName || prod.name,
        price: Number(prod.price) || 0,
        image: prod.image,
        qty: qty
      });
    }

    this.save();
    showToast(`Added "${prod.shortName || prod.name}" to your cart!`);
    openCartDrawer();
  },

  removeItem(productId) {
    this.items = this.items.filter(item => item.id !== productId);
    this.save();
  },

  updateQty(productId, delta) {
    const item = this.items.find(i => i.id === productId);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      this.removeItem(productId);
    } else {
      this.save();
    }
  },

  getCount() {
    return this.items.reduce((sum, item) => sum + item.qty, 0);
  },

  getSubtotal() {
    return this.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  },

  updateUI() {
    // Badges
    const badges = document.querySelectorAll('.cart-badge');
    const count = this.getCount();
    badges.forEach(b => {
      b.textContent = count;
      b.style.display = count > 0 ? 'flex' : 'none';
    });

    // Drawer Contents
    const cartList = document.getElementById('cartDrawerItems');
    const emptyState = document.getElementById('cartEmptyState');
    const subtotalEl = document.getElementById('cartDrawerSubtotal');

    if (subtotalEl) {
      subtotalEl.textContent = (window.StoreClient ? window.StoreClient.formatPrice(this.getSubtotal()) : `$${this.getSubtotal().toFixed(2)}`);
    }

    if (!cartList) return;

    if (this.items.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
      cartList.innerHTML = '';
    } else {
      if (emptyState) emptyState.style.display = 'none';
      cartList.innerHTML = this.items.map(item => `
        <div class="cart-item">
          <img src="${item.image}" alt="${item.shortName}" class="cart-item-img">
          <div class="cart-item-details">
            <h4 class="cart-item-title">${item.shortName}</h4>
            <div class="cart-item-price">${window.StoreClient ? window.StoreClient.formatPrice(item.price) : `$${item.price.toFixed(2)}`}</div>
            <div class="cart-qty-ctrl">
              <button class="cart-qty-btn" onclick="CartState.updateQty('${item.id}', -1)">-</button>
              <span class="cart-qty-val">${item.qty}</span>
              <button class="cart-qty-btn" onclick="CartState.updateQty('${item.id}', 1)">+</button>
              <button class="cart-remove-btn" onclick="CartState.removeItem('${item.id}')">Remove</button>
            </div>
          </div>
        </div>
      `).join('');
    }
  }
};

window.CartState = CartState;

function initCart() {
  CartState.updateUI();

  const cartBtns = document.querySelectorAll('.cart-trigger');
  const cartOverlay = document.getElementById('cartDrawerOverlay');
  const closeBtn = document.getElementById('cartCloseBtn');

  cartBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openCartDrawer();
    });
  });

  if (closeBtn && cartOverlay) {
    closeBtn.addEventListener('click', closeCartDrawer);
    cartOverlay.addEventListener('click', (e) => {
      if (e.target === cartOverlay) closeCartDrawer();
    });
  }

  // Bind add-to-cart clicks
  document.addEventListener('click', (e) => {
    const target = e.target.closest('.add-to-cart-btn');
    if (target) {
      e.preventDefault();
      const productId = target.getAttribute('data-id');
      CartState.addItem(productId, 1);
    }
  });

  // Bind Checkout button
  const checkoutBtn = document.getElementById('cartCheckoutBtn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (CartState.items.length === 0) {
        alert('Your cart is empty. Please add items to checkout.');
        return;
      }
      const formattedTotal = window.StoreClient 
        ? window.StoreClient.formatPrice(CartState.getSubtotal()) 
        : `₹${CartState.getSubtotal().toLocaleString('en-IN')}`;
      alert(`Thank you for shopping with Oxybott! Proceeding with mock checkout for ${formattedTotal}. (Live payment gateway integration pending)`);
    });
  }
}

function openCartDrawer() {
  const overlay = document.getElementById('cartDrawerOverlay');
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCartDrawer() {
  const overlay = document.getElementById('cartDrawerOverlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

/* ==========================================================================
   4. Global Search Modal
   ========================================================================== */
function initSearch() {
  const searchTriggers = document.querySelectorAll('.search-trigger');
  const searchModal = document.getElementById('searchModalOverlay');
  const searchInput = document.getElementById('searchModalInput');
  const resultsList = document.getElementById('searchResultsList');

  if (!searchModal) return;

  function openSearch() {
    searchModal.classList.add('open');
    if (searchInput) {
      searchInput.value = '';
      setTimeout(() => searchInput.focus(), 150);
      renderSearchResults('');
    }
    document.body.style.overflow = 'hidden';
  }

  function closeSearch() {
    searchModal.classList.remove('open');
    document.body.style.overflow = '';
  }

  searchTriggers.forEach(btn => btn.addEventListener('click', (e) => {
    e.preventDefault();
    openSearch();
  }));

  searchModal.addEventListener('click', (e) => {
    if (e.target === searchModal) closeSearch();
  });

  // Keyboard shortcut Ctrl+K or Cmd+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
    if (e.key === 'Escape') {
      closeSearch();
      closeCartDrawer();
    }
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderSearchResults(e.target.value.trim().toLowerCase());
    });
  }

  function renderSearchResults(query) {
    if (!resultsList || typeof OXYBOTT_PRODUCTS === 'undefined') return;

    if (!query) {
      resultsList.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--oxy-gray-500);">
          <p>Type product name, SKU (e.g. <strong>QD022</strong>, <strong>ESP32</strong>, <strong>Weather</strong>), or series...</p>
        </div>
      `;
      return;
    }

    const matches = OXYBOTT_PRODUCTS.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      p.series.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      p.tagline.toLowerCase().includes(query)
    );

    if (matches.length === 0) {
      resultsList.innerHTML = `
        <div style="padding: 2rem; text-align: center; color: var(--oxy-gray-500);">
          <p>No products found matching "<strong>${query}</strong>".</p>
        </div>
      `;
      return;
    }

    resultsList.innerHTML = matches.map(p => `
      <a href="product-detail.html?id=${p.id}" class="search-result-item">
        <img src="${p.image}" alt="${p.shortName}" style="width: 48px; height: 48px; object-fit: contain; background: #f8fafc; border-radius: 6px; padding: 3px;">
        <div style="flex-grow: 1;">
          <div style="font-size: 0.95rem; font-weight: 700; color: var(--oxy-navy);">${p.name}</div>
          <div style="font-size: 0.8rem; color: var(--oxy-gray-500);">${p.series} &bull; ${p.age}</div>
        </div>
        <div style="font-size: 1rem; font-weight: 700; color: var(--oxy-orange);">${window.StoreClient ? window.StoreClient.formatPrice(p.price) : `$${p.price.toFixed(2)}`}</div>
      </a>
    `).join('');
  }
}

/* ==========================================================================
   5. Filter Tabs (Homepage & Products Page)
   ========================================================================== */
function initFilterTabs() {
  const tabs = document.querySelectorAll('.filter-tab');
  const productCards = document.querySelectorAll('.product-card');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.getAttribute('data-filter');

      productCards.forEach(card => {
        if (filter === 'all' || card.getAttribute('data-category') === filter || card.getAttribute('data-series') === filter) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
}

/* ==========================================================================
   6. Interactive Code Studio (OxyCode vs Arduino vs Python)
   ========================================================================== */
function initCodeStudio() {
  const codeTabs = document.querySelectorAll('.code-tab-btn');
  const codeDisplay = document.getElementById('codeSnippetDisplay');
  const robotSimIcon = document.getElementById('robotSimIcon');
  const simStatus = document.getElementById('simStatusText');
  const runCodeBtn = document.getElementById('runCodeBtn');

  if (!codeDisplay) return;

  const CODE_SNIPPETS = {
    oxycode: `// OxyCode Block Script (Robot Arm Pick & Place)
When Program Starts:
  Initialize ESP32 Servos(Base: Pin18, Shoulder: Pin19, Elbow: Pin23, Claw: Pin5)
  Set OLED Display "Oxybott Ready!"
  Forever:
    If Joystick_Button == PRESSED Then
      Set Claw Angle(85) // Open Claw
      Move Shoulder(45), Elbow(60)
      Wait 0.5 Seconds
      Set Claw Angle(20) // Close Claw
      OLED Display "Item Secured"
      Move Base to Angle(180) // Rotate
      Set Claw Angle(85) // Release
    End If`,
    arduino: `// Arduino IDE (C++) Oxybott QD022 Driver
#include <Oxybott_ESP32_Arm.h>
#include <Wire.h>
#include <Adafruit_SSD1306.h>

OxyArm arm(18, 19, 23, 5); // Base, Shoulder, Elbow, Gripper

void setup() {
  Serial.begin(115200);
  arm.begin();
  arm.homePosition();
  Serial.println("Oxybott QD022 Online");
}

void loop() {
  if (arm.readJoystickTrigger()) {
    arm.openGripper();
    arm.moveAxis(AXIS_SHOULDER, 45);
    delay(500);
    arm.closeGripper();
    arm.rotateBase(180);
    arm.openGripper();
  }
}`,
    python: `# MicroPython Oxybott QD022 Automation
from machine import Pin, PWM, I2C
import time
from oxybott import RobotArm, OLED

arm = RobotArm(base=18, shoulder=19, elbow=23, gripper=5)
oled = OLED(scl=22, sda=21)

oled.show_text("Oxybott Python")
arm.home()

while True:
    if arm.joystick_pressed():
        oled.show_text("Picking Object...")
        arm.set_gripper(open=True)
        arm.move_to(x=120, y=80, z=30)
        time.sleep(0.5)
        arm.set_gripper(open=False)
        arm.rotate_base(angle=180)
        arm.set_gripper(open=True)
        oled.show_text("Task Complete!")`
  };

  codeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      codeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const mode = tab.getAttribute('data-lang');
      if (CODE_SNIPPETS[mode]) {
        codeDisplay.textContent = CODE_SNIPPETS[mode];
      }
    });
  });

  if (runCodeBtn && robotSimIcon && simStatus) {
    runCodeBtn.addEventListener('click', () => {
      simStatus.textContent = "Executing code... Servos articulating...";
      robotSimIcon.style.transform = "rotate(25deg) scale(1.15)";
      
      setTimeout(() => {
        robotSimIcon.style.transform = "rotate(-20deg) scale(1.15)";
      }, 700);

      setTimeout(() => {
        robotSimIcon.style.transform = "rotate(0deg) scale(1)";
        simStatus.textContent = "Task Successful! Object relocated 180°.";
        showToast("Simulation Run Complete!");
      }, 1500);
    });
  }
}

/* ==========================================================================
   7. Quote / Trial Modals & Forms
   ========================================================================== */
function initModals() {
  const quoteModal = document.getElementById('quoteModalOverlay');
  const quoteTriggers = document.querySelectorAll('.quote-modal-trigger');
  const quoteClose = document.getElementById('quoteModalClose');
  const quoteForm = document.getElementById('quoteRequestForm');

  if (!quoteModal) return;

  quoteTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      quoteModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });

  if (quoteClose) {
    quoteClose.addEventListener('click', () => {
      quoteModal.classList.remove('open');
      document.body.style.overflow = '';
    });
  }

  quoteModal.addEventListener('click', (e) => {
    if (e.target === quoteModal) {
      quoteModal.classList.remove('open');
      document.body.style.overflow = '';
    }
  });

  if (quoteForm) {
    quoteForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = quoteForm.querySelector('button[type="submit"]');
      const textInputs = quoteForm.querySelectorAll('input[type="text"]');
      const nameInput = textInputs[0];
      const emailInput = quoteForm.querySelector('input[type="email"]');
      const orgInput = textInputs[1];
      const selects = quoteForm.querySelectorAll('select');
      const studentCount = selects[0]?.value;
      const kit = selects[1]?.value;
      const comments = quoteForm.querySelector('textarea')?.value.trim();

      const name = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const organization = orgInput ? orgInput.value.trim() : '';

      if (!name || !email) {
        showToast("Please enter your name and email address.", true);
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Submitting Request...";
      }

      try {
        const res = await fetch('/api/inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'quote',
            name,
            email,
            organization,
            subject: `School Quote: ${kit || 'STEM Kits'}`,
            message: `Estimated students: ${studentCount || 'Not specified'}. Requirements: ${comments || 'None'}. Kit: ${kit || 'General'}`,
            details: {
              kit,
              studentCount,
              comments
            }
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          quoteModal.classList.remove('open');
          document.body.style.overflow = '';
          showToast(data.message || "Quote inquiry received! Our education team will contact you within 24 hours.");
          quoteForm.reset();
        } else {
          showToast(data.error || "Failed to submit quote request. Please try again.", true);
        }
      } catch (err) {
        showToast("Network error. Please verify your connection.", true);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Submit Educational Request \u2192";
        }
      }
    });
  }

  // Newsletter forms
  const newsForms = document.querySelectorAll('.newsletter-form');
  newsForms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = form.querySelector('input[type="email"]');
      const submitBtn = form.querySelector('button[type="submit"]');
      const email = emailInput ? emailInput.value.trim() : '';

      if (!email) {
        showToast("Please enter a valid email address.", true);
        return;
      }

      if (submitBtn) submitBtn.disabled = true;

      try {
        const res = await fetch('/api/inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'newsletter',
            email: email,
            subject: 'Newsletter Subscription'
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          showToast(data.message || "Thank you for subscribing to Oxybott STEM news!");
          form.reset();
        } else {
          showToast(data.error || "Subscription error. Please check your email address.", true);
        }
      } catch (err) {
        showToast("Network error. Please verify your connection.", true);
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  });
}

/* ==========================================================================
   8. Mobile Navigation Drawer
   ========================================================================== */
function initMobileMenu() {
  const mobileToggle = document.getElementById('mobileMenuToggle');
  if (!mobileToggle) return;

  let mobileOverlay = document.getElementById('mobileNavOverlay');
  let mobileNav = document.getElementById('mobileNavDrawer');

  if (!mobileOverlay) {
    mobileOverlay = document.createElement('div');
    mobileOverlay.className = 'cart-drawer-overlay';
    mobileOverlay.id = 'mobileNavOverlay';
    mobileOverlay.innerHTML = `
      <div class="cart-drawer" id="mobileNavDrawer">
        <div class="cart-header">
          <img src="assets/images/oxybott_logo.webp" alt="Oxybott" style="height: 36px;">
          <button class="cart-close-btn" id="mobileNavClose" aria-label="Close Mobile Navigation">&times;</button>
        </div>
        <div class="cart-body">
          <ul style="display: flex; flex-direction: column; gap: 1rem; font-family: var(--font-heading); font-size: 1.1rem; font-weight: 700;">
            <li><a href="index.html" style="color: var(--oxy-primary);">Home</a></li>
            <li><a href="products.html">All Products</a></li>
            <li><a href="products.html?series=Explorer+Series" style="font-size: 0.95rem; color: var(--oxy-gray-600); padding-left: 1rem;">&bull; Explorer Series</a></li>
            <li><a href="products.html?series=Education+Series" style="font-size: 0.95rem; color: var(--oxy-gray-600); padding-left: 1rem;">&bull; Education Series</a></li>
            <li><a href="products.html?series=Inventor+Series" style="font-size: 0.95rem; color: var(--oxy-gray-600); padding-left: 1rem;">&bull; Inventor Series</a></li>
            <li><a href="products.html?series=Maker+Series" style="font-size: 0.95rem; color: var(--oxy-gray-600); padding-left: 1rem;">&bull; Maker Series</a></li>
            <li><a href="education.html">Education Solutions</a></li>
            <li><a href="software.html">Software &amp; OxyCode</a></li>
            <li><a href="tutorials.html">Tutorials &amp; Wiki</a></li>
            <li><a href="about.html">About Oxybott</a></li>
            <li><a href="contact.html">Contact Us</a></li>
          </ul>
          <div style="margin-top: 2rem;">
            <a href="contact.html" class="btn btn-orange" style="width: 100%; text-align: center;">Get Free Quote</a>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(mobileOverlay);
    mobileNav = document.getElementById('mobileNavDrawer');
  }

  const mobileClose = document.getElementById('mobileNavClose');

  function openMobile() {
    mobileOverlay.classList.add('open');
    mobileNav.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMobile() {
    mobileOverlay.classList.remove('open');
    mobileNav.classList.remove('open');
    document.body.style.overflow = '';
  }

  mobileToggle.addEventListener('click', openMobile);
  if (mobileClose) mobileClose.addEventListener('click', closeMobile);
  if (mobileOverlay) {
    mobileOverlay.addEventListener('click', (e) => {
      if (e.target === mobileOverlay) closeMobile();
    });
  }
}

/* ==========================================================================
   9. Toast Notification Helper
   ========================================================================== */
function showToast(message, isError = false) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'toast-error' : ''}`;
  toast.innerHTML = isError ? `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <span>${message}</span>
  ` : `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2">
      <path d="M20 6L9 17l-5-5"/>
    </svg>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

window.showToast = showToast;

/* ==========================================================================
   10. Dynamic Storefront Bridge (Database Connected)
   ========================================================================== */
function renderHomepageDynamicProducts() {
  const grid = document.getElementById('homepageProductGrid');
  if (!grid || typeof OXYBOTT_PRODUCTS === 'undefined' || !OXYBOTT_PRODUCTS.length) return;

  const prods = OXYBOTT_PRODUCTS.slice(0, 12);
  grid.innerHTML = prods.map(p => `
    <div class="product-card" data-category="${p.category}" data-series="${p.series}">
      <div class="product-media">
        ${p.badge ? `<span class="product-badge ${(p.badge === 'Bestseller' || p.badge === 'Educator Choice') ? 'orange' : (p.badge === 'New' ? 'purple' : '')}">${p.badge}</span>` : ''}
        <button class="product-wish-btn" aria-label="Add to Wishlist">&#9825;</button>
        <img src="${p.image}" alt="${p.shortName}" class="product-img" onerror="this.src='assets/images/oxybott_logo.webp'">
      </div>
      <div class="product-card-body">
        <div class="product-meta-row">
          <span class="product-series-tag">${p.series}</span>
          <span class="product-rating">&#9733; ${p.rating} (${p.reviewsCount})</span>
        </div>
        <h3 class="product-title">
          <a href="product-detail.html?id=${p.id}">${p.name}</a>
        </h3>
        <div class="product-age-chip">&#127891; ${p.age || 'All Ages'} ${p.grade ? `&bull; ${p.grade}` : ''}</div>
        <div class="product-price-row">
          <span class="product-price">${window.StoreClient ? window.StoreClient.formatPrice(p.price) : `$${p.price}`}</span>
          ${(p.originalPrice && p.originalPrice > p.price) ? `<span class="product-originalPrice">${window.StoreClient ? window.StoreClient.formatPrice(p.originalPrice) : `₹${p.originalPrice}`}</span>` : ''}
        </div>
        <div class="product-actions">
          <button class="btn btn-primary btn-sm add-to-cart-btn" data-id="${p.id}">Add to Cart</button>
          <a href="product-detail.html?id=${p.id}" class="btn btn-outline btn-sm">Details</a>
        </div>
      </div>
    </div>
  `).join('');

  // Re-bind Add to Cart buttons
  grid.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.getAttribute('data-id');
      CartState.addItem(id, 1);
    });
  });

  // Re-bind filter tabs
  initFilterTabs();

  // Update hero showcase product price dynamically if present
  const qd022 = (window.StoreClient?.productsCache || []).find(p => p.id === 'qd022');
  if (qd022 && window.StoreClient) {
    const hp = document.getElementById('heroCardPrice');
    if (hp) hp.textContent = window.StoreClient.formatPrice(qd022.price);
    const hop = document.getElementById('heroCardOriginalPrice');
    if (hop && qd022.originalPrice) hop.textContent = window.StoreClient.formatPrice(qd022.originalPrice);
  }
}

function updateStoreSiteSettings(settings) {
  if (!settings) return;
  // Update Announcement bar if present
  const annEl = document.querySelector('.announcement-content');
  if (annEl && settings.announcement) {
    const badge = annEl.querySelector('.announcement-badge');
    const badgeText = badge ? badge.outerHTML : '';
    annEl.innerHTML = `<span>${badgeText} ${settings.announcement} <a href="education.html" class="announcement-link">Education Grants &rarr;</a></span>`;
  }
}

// Listen to StoreClient data ready event
document.addEventListener('oxybott:data-ready', (e) => {
  if (e.detail && e.detail.settings) {
    updateStoreSiteSettings(e.detail.settings);
  }
  renderHomepageDynamicProducts();
  if (window.CartState) {
    window.CartState.updateUI();
  }
});

