/**
 * Oxybott Admin Dashboard SPA Controller
 */

// State
let authToken = localStorage.getItem('oxybott_admin_token') || null;
let currentUser = null;
let cachedCategories = [];
let cachedBanners = [];
let activeCurrencySymbol = '₹';

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initNavigation();
  initProductEvents();
  initCategoryEvents();
  initBannerEvents();
  initSettingsEvents();
});

/* ==========================================================================
   1. Authentication & Session
   ========================================================================== */
async function initAuth() {
  const loginForm = document.getElementById('loginForm');
  const logoutBtn = document.getElementById('logoutBtn');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('loginUsername').value.trim();
      const password = document.getElementById('loginPassword').value;
      const alertBox = document.getElementById('loginAlert');
      const loginBtn = document.getElementById('loginBtn');

      loginBtn.disabled = true;
      loginBtn.textContent = 'Verifying...';
      alertBox.style.display = 'none';

      try {
        const res = await fetch('/api/admin/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (data.success) {
          authToken = data.token;
          currentUser = data.user;
          localStorage.setItem('oxybott_admin_token', authToken);
          showToast('Welcome back, ' + currentUser.username + '!');
          showDashboardShell();
        } else {
          alertBox.textContent = data.error || 'Login failed.';
          alertBox.style.display = 'block';
        }
      } catch (err) {
        alertBox.textContent = 'Network or server error. Please check backend connection.';
        alertBox.style.display = 'block';
      } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In to Dashboard →';
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/admin/auth/logout', { method: 'POST' });
      } catch (e) {}
      authToken = null;
      currentUser = null;
      localStorage.removeItem('oxybott_admin_token');
      showToast('Logged out successfully.');
      showLoginScreen();
    });
  }

  // Validate existing token
  if (authToken) {
    try {
      const res = await fetch('/api/admin/auth/me', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        currentUser = data.user;
        showDashboardShell();
      } else {
        showLoginScreen();
      }
    } catch (err) {
      showLoginScreen();
    }
  } else {
    showLoginScreen();
  }
}

function showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('adminShell').style.display = 'none';
}

function showDashboardShell() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminShell').style.display = 'flex';
  if (currentUser) {
    document.getElementById('headerWelcome').innerHTML = `Logged in as <strong>${currentUser.username}</strong> (${currentUser.role})`;
  }
  loadStoreSettings();
  loadDashboardStats();
  loadProducts();
  loadCategories();
  loadAuditLogs();
  loadInquiries();
}

/* ==========================================================================
   2. Navigation
   ========================================================================== */
function initNavigation() {
  const links = document.querySelectorAll('.sidebar-nav .nav-link');
  links.forEach(link => {
    link.addEventListener('click', () => {
      links.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      const targetSection = link.getAttribute('data-section');
      navigateToSection(targetSection);
    });
  });

  document.getElementById('quickAddProductBtn')?.addEventListener('click', () => {
    openProductEditor(null);
  });
}

function navigateToSection(sectionId) {
  const sections = document.querySelectorAll('.admin-section');
  sections.forEach(s => s.classList.remove('active'));
  const target = document.getElementById(sectionId);
  if (target) target.classList.add('active');

  const links = document.querySelectorAll('.sidebar-nav .nav-link');
  links.forEach(l => {
    if (l.getAttribute('data-section') === sectionId) l.classList.add('active');
    else l.classList.remove('active');
  });

  if (sectionId === 'sectionDashboard') loadDashboardStats();
  if (sectionId === 'sectionProducts') loadProducts();
  if (sectionId === 'sectionCategories') loadCategories();
  if (sectionId === 'sectionBanners') loadBanners();
  if (sectionId === 'sectionSettings') loadStoreSettings();
  if (sectionId === 'sectionAudit') loadAuditLogs();
  if (sectionId === 'sectionInquiries') loadInquiries();
}

window.navigateToSection = navigateToSection;

/* ==========================================================================
   3. Dashboard Stats
   ========================================================================== */
async function loadDashboardStats() {
  try {
    const res = await fetch('/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (!data.success) return;

    const s = data.stats;
    document.getElementById('metricTotalProducts').textContent = s.totalProducts;
    document.getElementById('metricPublished').textContent = s.publishedProducts;
    document.getElementById('metricDrafts').textContent = s.draftProducts;
    document.getElementById('metricLowStock').textContent = s.lowStockProducts;
    document.getElementById('metricCategories').textContent = s.totalCategories;

    // Recent products
    const tbody = document.getElementById('recentProductsTableBody');
    if (tbody) {
      tbody.innerHTML = (s.recentUpdates || []).map(p => `
        <tr>
          <td><code>${p.sku}</code></td>
          <td><strong>${p.name}</strong></td>
          <td>${activeCurrencySymbol}${parseFloat(p.price).toFixed(2)}</td>
          <td><span class="badge ${p.stock_quantity <= 5 ? 'badge-red' : 'badge-green'}">${p.stock_quantity} in stock</span></td>
          <td><span class="badge ${p.is_published ? 'badge-green' : 'badge-gray'}">${p.is_published ? 'Published' : 'Draft'}</span></td>
          <td style="color: var(--admin-gray-500); font-size: 0.825rem;">${new Date(p.updated_at).toLocaleString()}</td>
        </tr>
      `).join('');
    }

    // Recent audit logs
    const auditTbody = document.getElementById('dashboardAuditTableBody');
    if (auditTbody) {
      auditTbody.innerHTML = (s.recentAuditLogs || []).map(l => `
        <tr>
          <td style="font-size: 0.8rem; color: var(--admin-gray-500);">${new Date(l.created_at).toLocaleTimeString()}</td>
          <td><strong>${l.username}</strong></td>
          <td><span class="badge badge-orange">${l.action}</span></td>
          <td><code>${l.entity_type}:${l.entity_id}</code></td>
          <td style="font-size: 0.85rem;">${l.details || ''}</td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

/* ==========================================================================
   4. Products Management
   ========================================================================== */
function initProductEvents() {
  const searchInput = document.getElementById('productSearchInput');
  const seriesFilter = document.getElementById('productSeriesFilter');
  const statusFilter = document.getElementById('productStatusFilter');
  const addBtn = document.getElementById('openAddProductModalBtn');

  let debounceTimer = null;
  searchInput?.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadProducts, 300);
  });

  seriesFilter?.addEventListener('change', loadProducts);
  statusFilter?.addEventListener('change', loadProducts);

  addBtn?.addEventListener('click', () => openProductEditor(null));

  // Modal controls
  document.getElementById('closeProductModalBtn')?.addEventListener('click', closeProductEditor);
  document.getElementById('cancelProductBtn')?.addEventListener('click', closeProductEditor);
  document.getElementById('saveProductBtn')?.addEventListener('click', saveProduct);

  // Dynamic row additions
  document.getElementById('addSpecRowBtn')?.addEventListener('click', () => addSpecRow('', ''));
  document.getElementById('addHighlightRowBtn')?.addEventListener('click', () => addHighlightRow(''));
  document.getElementById('addBoxRowBtn')?.addEventListener('click', () => addBoxRow(''));

  // Image file input
  const fileInput = document.getElementById('productImageFileInput');
  fileInput?.addEventListener('change', handleImageUpload);
}

async function loadProducts() {
  const search = document.getElementById('productSearchInput')?.value.trim() || '';
  const series = document.getElementById('productSeriesFilter')?.value || '';
  const status = document.getElementById('productStatusFilter')?.value || '';

  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (series) params.set('series', series);
  if (status) params.set('status', status);

  try {
    const res = await fetch(`/api/admin/products?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (!data.success) return;

    document.getElementById('productCountBadge').textContent = `${data.total} products`;

    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    if (data.products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 3rem; color: var(--admin-gray-500);">No products found matching filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.products.map(p => {
      const imgPath = (p.main_image && !p.main_image.startsWith('/') && !p.main_image.startsWith('http')) ? '/' + p.main_image : (p.main_image || '/assets/images/oxybott_logo.webp');
      return `
      <tr>
        <td>
          <img src="${imgPath}" alt="" style="width: 44px; height: 44px; object-fit: contain; background: var(--admin-gray-50); border-radius: 6px; padding: 2px;" onerror="this.src='/assets/images/oxybott_logo.webp'">
        </td>
        <td><code>${p.sku}</code></td>
        <td>
          <strong>${p.name}</strong>
          ${p.is_featured ? '<span class="badge badge-orange" style="margin-left: 0.5rem; font-size: 0.65rem;">Featured</span>' : ''}
        </td>
        <td><span class="badge badge-gray">${p.series}</span></td>
        <td>
          <strong>${activeCurrencySymbol}${parseFloat(p.price).toFixed(2)}</strong>
          ${p.sale_price ? `<br><small style="color: var(--admin-gray-400); text-decoration: line-through;">${activeCurrencySymbol}${parseFloat(p.sale_price).toFixed(2)}</small>` : ''}
        </td>
        <td>
          <span class="badge ${p.stock_quantity <= p.low_stock_threshold ? 'badge-red' : 'badge-green'}">
            ${p.stock_quantity}
          </span>
        </td>
        <td>
          <button class="btn btn-sm ${p.is_published ? 'badge-green' : 'badge-gray'}" style="cursor: pointer;" onclick="togglePublish('${p.id}', ${p.is_published ? 0 : 1})">
            ${p.is_published ? '✓ Published' : 'Draft'}
          </button>
        </td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 0.35rem; justify-content: flex-end;">
            <button class="btn btn-outline btn-sm" onclick="openProductEditor('${p.id}')">Edit</button>
            <button class="btn btn-outline btn-sm" onclick="duplicateProduct('${p.id}')">Clone</button>
            <a href="/product-detail.html?id=${p.id}" target="_blank" class="btn btn-outline btn-sm">&#128065;</a>
            <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}', '${p.name.replace(/'/g, "\\'")}')">×</button>
          </div>
        </td>
      </tr>
    `;
    }).join('');
  } catch (err) {
    console.error('Failed to load products:', err);
  }
}

async function togglePublish(productId, newStatus) {
  try {
    const res = await fetch(`/api/admin/products/${productId}/publish`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ is_published: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      showToast(newStatus ? 'Product is now Published!' : 'Product moved to Drafts.');
      loadProducts();
      loadDashboardStats();
    }
  } catch (e) {
    showToast('Failed to update status');
  }
}

async function duplicateProduct(productId) {
  if (!confirm('Duplicate this product and its complete specifications/images?')) return;
  try {
    const res = await fetch(`/api/admin/products/${productId}/duplicate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (data.success) {
      showToast('Product duplicated successfully!');
      loadProducts();
      loadDashboardStats();
    } else {
      alert(data.error || 'Duplication failed.');
    }
  } catch (e) {
    showToast('Duplication error');
  }
}

async function deleteProduct(productId, name) {
  if (!confirm(`Are you sure you want to permanently delete "${name}"? This action cannot be undone.`)) return;
  try {
    const res = await fetch(`/api/admin/products/${productId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (data.success) {
      showToast('Product deleted.');
      loadProducts();
      loadDashboardStats();
    } else {
      alert(data.error);
    }
  } catch (e) {
    showToast('Deletion error');
  }
}

window.togglePublish = togglePublish;
window.duplicateProduct = duplicateProduct;
window.deleteProduct = deleteProduct;

/* ==========================================================================
   5. Product Editor Modal & Image Upload
   ========================================================================== */
let editingProductData = null;

async function openProductEditor(productId = null) {
  const modal = document.getElementById('productModal');
  const title = document.getElementById('productModalTitle');
  const form = document.getElementById('productEditForm');
  form.reset();

  document.getElementById('specsRowsContainer').innerHTML = '';
  document.getElementById('highlightsRowsContainer').innerHTML = '';
  document.getElementById('boxRowsContainer').innerHTML = '';
  document.getElementById('productGalleryContainer').innerHTML = '';
  document.getElementById('editProductId').value = '';
  document.getElementById('productImagesSection').style.display = productId ? 'block' : 'none';

  renderCategoriesCheckboxes([]);

  if (productId) {
    title.textContent = 'Edit Product';
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (!data.success) return alert(data.error);

      const p = data.product;
      editingProductData = p;

      document.getElementById('editProductId').value = p.id;
      document.getElementById('editProdName').value = p.name || '';
      document.getElementById('editProdSku').value = p.sku || '';
      document.getElementById('editProdShortName').value = p.short_name || '';
      document.getElementById('editProdSeries').value = p.series || 'Explorer Series';
      document.getElementById('editProdBadge').value = p.badge || '';
      document.getElementById('editProdAge').value = p.age || '';
      document.getElementById('editProdGrade').value = p.grade || '';
      document.getElementById('editProdTagline').value = p.tagline || '';
      document.getElementById('editProdDescription').value = p.description || '';
      document.getElementById('editProdPrice').value = p.price;
      document.getElementById('editProdSalePrice').value = p.sale_price || '';
      document.getElementById('editProdStock').value = p.stock_quantity;
      document.getElementById('editProdPublished').checked = !!p.is_published;
      document.getElementById('editProdFeatured').checked = !!p.is_featured;

      renderCategoriesCheckboxes(p.categoryIds || []);
      renderProductGallery(p.images || []);

      // Specs
      if (p.specs && p.specs.length > 0) {
        p.specs.forEach(s => addSpecRow(s.spec_key, s.spec_value));
      } else {
        addSpecRow('', '');
      }

      // Highlights
      if (p.highlights && p.highlights.length > 0) {
        p.highlights.forEach(h => addHighlightRow(h.highlight_text));
      } else {
        addHighlightRow('');
      }

      // Box Contents
      if (p.boxContents && p.boxContents.length > 0) {
        p.boxContents.forEach(b => addBoxRow(b.item_text));
      } else {
        addBoxRow('');
      }
    } catch (e) {
      console.error(e);
    }
  } else {
    title.textContent = 'Add New Product';
    editingProductData = null;
    addSpecRow('', '');
    addHighlightRow('');
    addBoxRow('');
  }

  modal.classList.add('open');
}

function closeProductEditor() {
  document.getElementById('productModal').classList.remove('open');
}

function renderCategoriesCheckboxes(selectedIds = []) {
  const container = document.getElementById('editProdCategoriesList');
  if (!container) return;

  container.innerHTML = cachedCategories.map(c => `
    <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; cursor: pointer; background: var(--admin-gray-50); padding: 0.4rem 0.75rem; border-radius: 6px; border: 1px solid var(--admin-gray-200);">
      <input type="checkbox" name="productCategories" value="${c.id}" ${selectedIds.includes(c.id) ? 'checked' : ''}>
      <span>${c.name}</span>
    </label>
  `).join('');
}

function renderProductGallery(images = []) {
  const container = document.getElementById('productGalleryContainer');
  if (!container) return;

  if (images.length === 0) {
    container.innerHTML = '<p style="font-size: 0.85rem; color: var(--admin-gray-400);">No images uploaded yet.</p>';
    return;
  }

  container.innerHTML = images.map(img => {
    const imgUrl = (img.image_url && !img.image_url.startsWith('/') && !img.image_url.startsWith('http')) ? '/' + img.image_url : img.image_url;
    return `
    <div style="position: relative; width: 100px; height: 100px; border: 1px solid var(--admin-gray-300); border-radius: 8px; overflow: hidden; background: white; text-align: center; padding: 4px;">
      <img src="${imgUrl}" alt="" style="width: 100%; height: 60px; object-fit: contain;" onerror="this.src='/assets/images/oxybott_logo.webp'">
      ${img.is_main ? '<span class="badge badge-green" style="position: absolute; top: 2px; left: 2px; font-size: 0.6rem; padding: 1px 4px;">Main</span>' : ''}
      <div style="display: flex; justify-content: space-between; margin-top: 4px;">
        ${!img.is_main ? `<button type="button" onclick="setMainImage(${img.id})" style="font-size: 0.65rem; color: var(--admin-primary); cursor: pointer;">Set Main</button>` : '<span></span>'}
        <button type="button" onclick="deleteProductImage(${img.id})" style="font-size: 0.7rem; color: var(--admin-red); cursor: pointer;">Delete</button>
      </div>
    </div>
  `;
  }).join('');
}

async function handleImageUpload(e) {
  const files = e.target.files;
  const productId = document.getElementById('editProductId').value;
  if (!files || files.length === 0 || !productId) return;

  const statusText = document.getElementById('uploadStatusText');
  statusText.textContent = `Uploading ${files.length} file(s)...`;

  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('images', files[i]);
  }

  try {
    const res = await fetch(`/api/admin/products/${productId}/images`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      statusText.textContent = 'Upload complete!';
      showToast('Image(s) uploaded successfully.');
      // Refresh product data
      const prodRes = await fetch(`/api/admin/products/${productId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const prodData = await prodRes.json();
      if (prodData.success) {
        renderProductGallery(prodData.product.images || []);
      }
    } else {
      statusText.textContent = data.error || 'Upload failed.';
    }
  } catch (err) {
    statusText.textContent = 'Upload error.';
  } finally {
    e.target.value = '';
    setTimeout(() => { statusText.textContent = ''; }, 3000);
  }
}

async function setMainImage(imageId) {
  const productId = document.getElementById('editProductId').value;
  try {
    const res = await fetch(`/api/admin/products/${productId}/images/${imageId}/main`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (data.success) {
      showToast('Main product image set.');
      const prodRes = await fetch(`/api/admin/products/${productId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const prodData = await prodRes.json();
      renderProductGallery(prodData.product.images || []);
      loadProducts();
    }
  } catch (e) {
    showToast('Failed to set main image');
  }
}

async function deleteProductImage(imageId) {
  if (!confirm('Delete this product photo?')) return;
  const productId = document.getElementById('editProductId').value;
  try {
    const res = await fetch(`/api/admin/products/${productId}/images/${imageId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (data.success) {
      showToast('Image deleted.');
      const prodRes = await fetch(`/api/admin/products/${productId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const prodData = await prodRes.json();
      renderProductGallery(prodData.product.images || []);
      loadProducts();
    }
  } catch (e) {
    showToast('Failed to delete image');
  }
}

window.setMainImage = setMainImage;
window.deleteProductImage = deleteProductImage;

// Dynamic Row Helpers
function addSpecRow(key = '', val = '') {
  const container = document.getElementById('specsRowsContainer');
  const div = document.createElement('div');
  div.style.display = 'grid';
  div.style.gridTemplateColumns = '1fr 2fr auto';
  div.style.gap = '0.5rem';
  div.innerHTML = `
    <input type="text" class="form-input spec-key-input" placeholder="Spec Key (e.g. Microcontroller)" value="${key}">
    <input type="text" class="form-input spec-val-input" placeholder="Spec Value (e.g. ESP32 Dual Core)" value="${val}">
    <button type="button" class="btn btn-outline btn-sm" onclick="this.parentElement.remove()" style="color: var(--admin-red);">&times;</button>
  `;
  container.appendChild(div);
}

function addHighlightRow(text = '') {
  const container = document.getElementById('highlightsRowsContainer');
  const div = document.createElement('div');
  div.style.display = 'flex';
  div.style.gap = '0.5rem';
  div.innerHTML = `
    <input type="text" class="form-input highlight-val-input" placeholder="Feature bullet point..." value="${text}" style="flex-grow: 1;">
    <button type="button" class="btn btn-outline btn-sm" onclick="this.parentElement.remove()" style="color: var(--admin-red);">&times;</button>
  `;
  container.appendChild(div);
}

function addBoxRow(text = '') {
  const container = document.getElementById('boxRowsContainer');
  const div = document.createElement('div');
  div.style.display = 'flex';
  div.style.gap = '0.5rem';
  div.innerHTML = `
    <input type="text" class="form-input box-val-input" placeholder="Included item (e.g. 1x USB-C Cable)..." value="${text}" style="flex-grow: 1;">
    <button type="button" class="btn btn-outline btn-sm" onclick="this.parentElement.remove()" style="color: var(--admin-red);">&times;</button>
  `;
  container.appendChild(div);
}

window.openProductEditor = openProductEditor;

// Save Product
async function saveProduct() {
  const productId = document.getElementById('editProductId').value;
  const name = document.getElementById('editProdName').value.trim();
  const sku = document.getElementById('editProdSku').value.trim();
  const price = parseFloat(document.getElementById('editProdPrice').value);

  if (!name || !sku || isNaN(price)) {
    return alert('Please fill in Product Name, SKU, and Price.');
  }

  const payload = {
    name,
    sku,
    short_name: document.getElementById('editProdShortName').value.trim() || name,
    series: document.getElementById('editProdSeries').value,
    badge: document.getElementById('editProdBadge').value.trim(),
    age: document.getElementById('editProdAge').value.trim(),
    grade: document.getElementById('editProdGrade').value.trim(),
    tagline: document.getElementById('editProdTagline').value.trim(),
    description: document.getElementById('editProdDescription').value.trim(),
    price: price,
    sale_price: parseFloat(document.getElementById('editProdSalePrice').value) || null,
    stock_quantity: parseInt(document.getElementById('editProdStock').value, 10) || 100,
    is_published: document.getElementById('editProdPublished').checked ? 1 : 0,
    is_featured: document.getElementById('editProdFeatured').checked ? 1 : 0
  };

  // Collect category IDs
  const checkedCats = Array.from(document.querySelectorAll('input[name="productCategories"]:checked')).map(cb => cb.value);
  payload.categoryIds = checkedCats;

  // Collect specs
  const specs = [];
  document.querySelectorAll('#specsRowsContainer > div').forEach(row => {
    const k = row.querySelector('.spec-key-input')?.value.trim();
    const v = row.querySelector('.spec-val-input')?.value.trim();
    if (k && v) specs.push({ key: k, value: v });
  });
  payload.specs = specs;

  // Collect highlights
  const highlights = [];
  document.querySelectorAll('#highlightsRowsContainer > div').forEach(row => {
    const h = row.querySelector('.highlight-val-input')?.value.trim();
    if (h) highlights.push(h);
  });
  payload.highlights = highlights;

  // Collect box contents
  const boxContents = [];
  document.querySelectorAll('#boxRowsContainer > div').forEach(row => {
    const b = row.querySelector('.box-val-input')?.value.trim();
    if (b) boxContents.push(b);
  });
  payload.boxContents = boxContents;

  const isEdit = !!productId;
  const url = isEdit ? `/api/admin/products/${productId}` : '/api/admin/products';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      showToast(isEdit ? 'Product updated successfully!' : 'Product created!');
      closeProductEditor();
      loadProducts();
      loadDashboardStats();

      // If created, prompt to upload images
      if (!isEdit && data.productId) {
        openProductEditor(data.productId);
      }
    } else {
      alert(data.error || 'Failed to save product.');
    }
  } catch (err) {
    alert('Server error saving product.');
  }
}

/* ==========================================================================
   6. Categories Management
   ========================================================================== */
function initCategoryEvents() {
  document.getElementById('openAddCategoryModalBtn')?.addEventListener('click', () => {
    document.getElementById('categoryModalTitle').textContent = 'Add Category';
    document.getElementById('editCategoryId').value = '';
    document.getElementById('categoryForm').reset();
    document.getElementById('categoryModal').classList.add('open');
  });

  document.getElementById('closeCategoryModalBtn')?.addEventListener('click', () => {
    document.getElementById('categoryModal').classList.remove('open');
  });

  document.getElementById('cancelCategoryBtn')?.addEventListener('click', () => {
    document.getElementById('categoryModal').classList.remove('open');
  });

  document.getElementById('saveCategoryBtn')?.addEventListener('click', async () => {
    const id = document.getElementById('editCategoryId').value;
    const name = document.getElementById('editCategoryName').value.trim();
    const slug = document.getElementById('editCategorySlug').value.trim();
    const description = document.getElementById('editCategoryDesc').value.trim();
    const is_published = document.getElementById('editCategoryPublished').checked ? 1 : 0;

    if (!name) return alert('Category Name is required.');

    const url = id ? `/api/admin/categories/${id}` : '/api/admin/categories';
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ name, slug, description, is_published })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Category saved.');
        document.getElementById('categoryModal').classList.remove('open');
        loadCategories();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert('Error saving category');
    }
  });
}

async function loadCategories() {
  try {
    const res = await fetch('/api/admin/categories', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (!data.success) return;

    cachedCategories = data.categories;

    const tbody = document.getElementById('categoriesTableBody');
    if (!tbody) return;

    tbody.innerHTML = cachedCategories.map(c => `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td><code>${c.slug}</code></td>
        <td style="color: var(--admin-gray-600); font-size: 0.85rem;">${c.description || '-'}</td>
        <td><span class="badge badge-gray">${c.products_count} kits</span></td>
        <td><span class="badge ${c.is_published ? 'badge-green' : 'badge-gray'}">${c.is_published ? 'Published' : 'Hidden'}</span></td>
        <td style="text-align: right;">
          <button class="btn btn-outline btn-sm" onclick="editCategory(${c.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCategory(${c.id}, '${c.name}')">×</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

function editCategory(catId) {
  const cat = cachedCategories.find(c => c.id === catId);
  if (!cat) return;

  document.getElementById('categoryModalTitle').textContent = 'Edit Category';
  document.getElementById('editCategoryId').value = cat.id;
  document.getElementById('editCategoryName').value = cat.name;
  document.getElementById('editCategorySlug').value = cat.slug;
  document.getElementById('editCategoryDesc').value = cat.description || '';
  document.getElementById('editCategoryPublished').checked = !!cat.is_published;
  document.getElementById('categoryModal').classList.add('open');
}

async function deleteCategory(catId, name) {
  if (!confirm(`Delete category "${name}"? Products in this category will not be deleted.`)) return;
  try {
    const res = await fetch(`/api/admin/categories/${catId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (data.success) {
      showToast('Category deleted.');
      loadCategories();
    }
  } catch (e) {
    showToast('Failed to delete category');
  }
}

window.editCategory = editCategory;
window.deleteCategory = deleteCategory;

/* ==========================================================================
   6.5 Banners Management
   ========================================================================== */
function initBannerEvents() {
  document.getElementById('openAddBannerModalBtn')?.addEventListener('click', () => {
    document.getElementById('bannerModalTitle').textContent = 'Add Banner';
    document.getElementById('editBannerId').value = '';
    document.getElementById('bannerForm').reset();
    document.getElementById('editBannerActive').checked = true;
    document.getElementById('bannerModal').classList.add('open');
  });

  const closeBtn = document.getElementById('closeBannerModalBtn');
  const cancelBtn = document.getElementById('cancelBannerBtn');
  const close = () => document.getElementById('bannerModal').classList.remove('open');
  closeBtn?.addEventListener('click', close);
  cancelBtn?.addEventListener('click', close);

  document.getElementById('saveBannerBtn')?.addEventListener('click', async () => {
    const bannerId = document.getElementById('editBannerId').value;
    const title = document.getElementById('editBannerTitle').value.trim();
    const subtitle = document.getElementById('editBannerSubtitle').value.trim();
    const image_url = document.getElementById('editBannerImageUrl').value.trim();
    const cta_text = document.getElementById('editBannerCtaText').value.trim();
    const cta_link = document.getElementById('editBannerCtaLink').value.trim();
    const is_active = document.getElementById('editBannerActive').checked;

    if (!title) {
      alert('Banner title is required.');
      return;
    }

    const payload = { title, subtitle, image_url, cta_text, cta_link, is_active };
    try {
      const url = bannerId ? `/api/admin/banners/${bannerId}` : '/api/admin/banners';
      const method = bannerId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast(bannerId ? 'Banner updated successfully!' : 'Banner created successfully!');
        close();
        loadBanners();
      } else {
        alert(data.error || 'Failed to save banner.');
      }
    } catch (e) {
      alert('Error saving banner: ' + e.message);
    }
  });
}

async function loadBanners() {
  try {
    const res = await fetch('/api/admin/banners', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (!data.success) return;

    cachedBanners = data.banners;
    const tbody = document.getElementById('bannersTableBody');
    if (!tbody) return;

    if (cachedBanners.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 3rem; color: var(--admin-gray-500);">No promotional banners configured yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = cachedBanners.map(b => `
      <tr>
        <td>
          <strong>${b.title}</strong>
          ${b.image_url ? `<br><small style="color: var(--admin-gray-500); font-family: monospace;">${b.image_url}</small>` : ''}
        </td>
        <td>${b.subtitle || '-'}</td>
        <td>
          ${b.cta_text ? `<span class="badge badge-gray">${b.cta_text} &rarr; ${b.cta_link || '#'}</span>` : '-'}
        </td>
        <td>
          <span class="badge ${b.is_active ? 'badge-green' : 'badge-gray'}">${b.is_active ? 'Active' : 'Hidden'}</span>
        </td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 0.35rem; justify-content: flex-end;">
            <button class="btn btn-outline btn-sm" onclick="editBanner(${b.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteBanner(${b.id}, '${b.title.replace(/'/g, "\\'")}')">×</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load banners:', err);
  }
}

function editBanner(bannerId) {
  const b = cachedBanners.find(item => item.id === bannerId);
  if (!b) return;

  document.getElementById('bannerModalTitle').textContent = 'Edit Banner';
  document.getElementById('editBannerId').value = b.id;
  document.getElementById('editBannerTitle').value = b.title;
  document.getElementById('editBannerSubtitle').value = b.subtitle || '';
  document.getElementById('editBannerImageUrl').value = b.image_url || '';
  document.getElementById('editBannerCtaText').value = b.cta_text || '';
  document.getElementById('editBannerCtaLink').value = b.cta_link || '';
  document.getElementById('editBannerActive').checked = !!b.is_active;
  document.getElementById('bannerModal').classList.add('open');
}

async function deleteBanner(bannerId, title) {
  if (!confirm(`Delete banner "${title}"?`)) return;
  try {
    const res = await fetch(`/api/admin/banners/${bannerId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (data.success) {
      showToast('Banner deleted.');
      loadBanners();
    }
  } catch (e) {
    showToast('Failed to delete banner');
  }
}

window.editBanner = editBanner;
window.deleteBanner = deleteBanner;

/* ==========================================================================
   7. Settings & Audit
   ========================================================================== */
function initSettingsEvents() {
  document.getElementById('saveSettingsBtn')?.addEventListener('click', async () => {
    const settings = {
      currency_code: document.getElementById('settingCurrencyCode').value,
      currency_symbol: document.getElementById('settingCurrencySymbol').value,
      store_name: document.getElementById('settingStoreName').value,
      announcement: document.getElementById('settingAnnouncement').value,
      contact_email: document.getElementById('settingContactEmail').value,
      support_email: document.getElementById('settingSupportEmail').value,
      free_shipping_threshold: document.getElementById('settingFreeShipping').value
    };

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ settings })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Settings saved successfully!');
        loadStoreSettings();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert('Failed to save settings');
    }
  });
}

async function loadStoreSettings() {
  try {
    const res = await fetch('/api/admin/settings', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (!data.success) return;

    const s = data.settings;
    if (s.currency_code) document.getElementById('settingCurrencyCode').value = s.currency_code;
    if (s.currency_symbol) {
      document.getElementById('settingCurrencySymbol').value = s.currency_symbol;
      activeCurrencySymbol = s.currency_symbol;
      document.querySelectorAll('.currencyLabel').forEach(el => el.textContent = activeCurrencySymbol);
      document.getElementById('activeCurrencyDisplay').textContent = `Currency: ${s.currency_code} (${s.currency_symbol})`;
    }
    if (s.store_name) document.getElementById('settingStoreName').value = s.store_name;
    if (s.announcement) document.getElementById('settingAnnouncement').value = s.announcement;
    if (s.contact_email) document.getElementById('settingContactEmail').value = s.contact_email;
    if (s.support_email) document.getElementById('settingSupportEmail').value = s.support_email;
    if (s.free_shipping_threshold) document.getElementById('settingFreeShipping').value = s.free_shipping_threshold;
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

async function loadAuditLogs() {
  try {
    const res = await fetch('/api/admin/audit-logs?limit=50', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (!data.success) return;

    const tbody = document.getElementById('fullAuditTableBody');
    if (!tbody) return;

    tbody.innerHTML = data.logs.map(l => `
      <tr>
        <td style="font-size: 0.825rem; color: var(--admin-gray-500);">${new Date(l.created_at).toLocaleString()}</td>
        <td><strong>${l.username}</strong></td>
        <td><span class="badge badge-orange">${l.action}</span></td>
        <td><code>${l.entity_type}:${l.entity_id}</code></td>
        <td style="font-size: 0.85rem;">${l.details || '-'}</td>
        <td style="font-size: 0.8rem; color: var(--admin-gray-400);">${l.ip_address || '-'}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load audit logs:', err);
  }
}

/* ==========================================================================
   8. Inquiries & Leads Management
   ========================================================================== */
async function loadInquiries() {
  const tbody = document.getElementById('inquiriesTableBody');
  if (!tbody) return;

  const typeFilter = document.getElementById('inquiryTypeFilter')?.value || '';
  const statusFilter = document.getElementById('inquiryStatusFilter')?.value || '';

  try {
    let url = '/api/admin/inquiries?';
    if (typeFilter) url += `type=${encodeURIComponent(typeFilter)}&`;
    if (statusFilter) url += `status=${encodeURIComponent(statusFilter)}&`;

    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await res.json();
    if (!data.success || !data.inquiries || data.inquiries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem; color: var(--admin-gray-400);">No customer inquiries or quote requests found.</td></tr>';
      return;
    }

    tbody.innerHTML = data.inquiries.map(inq => {
      const typeBadge = inq.type === 'quote' ? 'badge-orange' : inq.type === 'trial' ? 'badge-primary' : inq.type === 'newsletter' ? 'badge-cyan' : 'badge-gray';
      const dateStr = inq.created_at ? new Date(inq.created_at).toLocaleString() : '';

      return `
        <tr>
          <td><small style="color: var(--admin-gray-500);">${dateStr}</small></td>
          <td><span class="badge ${typeBadge}">${escapeHtml(inq.type.toUpperCase())}</span></td>
          <td>
            <strong>${escapeHtml(inq.name || 'Subscriber')}</strong><br>
            <small><a href="mailto:${escapeHtml(inq.email)}" style="color: var(--admin-primary);">${escapeHtml(inq.email)}</a></small>
            ${inq.phone ? `<br><small style="color: var(--admin-gray-500);">&#128222; ${escapeHtml(inq.phone)}</small>` : ''}
          </td>
          <td>${escapeHtml(inq.organization || '—')}</td>
          <td>
            <div style="font-weight: 600; color: var(--admin-navy);">${escapeHtml(inq.subject || 'Inquiry')}</div>
            <div style="font-size: 0.85rem; color: var(--admin-gray-600); max-width: 300px; white-space: normal; line-height: 1.4;">
              ${escapeHtml(inq.message || '—')}
            </div>
            ${inq.details ? `<div style="font-size: 0.75rem; color: var(--admin-gray-400); margin-top: 0.25rem;"><code>${escapeHtml(inq.details)}</code></div>` : ''}
          </td>
          <td>
            <select class="form-select status-select" data-id="${inq.id}" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; width: auto;">
              <option value="new" ${inq.status === 'new' ? 'selected' : ''}>New</option>
              <option value="in_progress" ${inq.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
              <option value="resolved" ${inq.status === 'resolved' ? 'selected' : ''}>Resolved</option>
              <option value="archived" ${inq.status === 'archived' ? 'selected' : ''}>Archived</option>
            </select>
          </td>
          <td>
            <button class="btn btn-danger btn-sm delete-inquiry-btn" data-id="${inq.id}" title="Delete inquiry">&#128465;</button>
          </td>
        </tr>
      `;
    }).join('');

    // Bind status change listeners
    tbody.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        const id = sel.getAttribute('data-id');
        const status = sel.value;
        try {
          const ures = await fetch(`/api/admin/inquiries/${id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status })
          });
          const udata = await ures.json();
          if (udata.success) {
            showToast(`Inquiry status updated to ${status}.`);
          } else {
            showToast('Failed to update status', true);
          }
        } catch (e) {
          showToast('Network error updating status', true);
        }
      });
    });

    // Bind delete listeners
    tbody.querySelectorAll('.delete-inquiry-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Are you sure you want to delete this inquiry record?')) return;
        try {
          const dres = await fetch(`/api/admin/inquiries/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          const ddata = await dres.json();
          if (ddata.success) {
            showToast('Inquiry deleted.');
            loadInquiries();
          } else {
            showToast('Failed to delete inquiry', true);
          }
        } catch (e) {
          showToast('Network error deleting inquiry', true);
        }
      });
    });
  } catch (err) {
    console.error('Failed to load inquiries:', err);
  }
}

// Bind filter change events
document.getElementById('inquiryTypeFilter')?.addEventListener('change', loadInquiries);
document.getElementById('inquiryStatusFilter')?.addEventListener('change', loadInquiries);

/* ==========================================================================
   9. Toast Notification Helper
   ========================================================================== */
function showToast(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

window.showToast = showToast;
