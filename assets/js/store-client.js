/**
 * Oxybott Store Client
 * Connects frontend pages to the live database API with fallback support.
 */

(function(global) {
  'use strict';

  const StoreClient = {
    settings: null,
    productsCache: null,
    categoriesCache: null,
    ready: false,

    async getSettings() {
      if (this.settings) return this.settings;
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.settings) {
            this.settings = data.settings;
            return this.settings;
          }
        }
      } catch (err) {
        console.warn('[StoreClient] Using fallback site settings:', err.message);
      }
      this.settings = {
        currency_code: 'INR',
        currency_symbol: '₹',
        store_name: 'Oxybott STEM Robotics',
        announcement: 'ESP32 EDUCATION SOLUTIONS INNOVATOR • Focus on Smart Robotics & Coding Kits!'
      };
      return this.settings;
    },

    getCurrencySymbol() {
      return (this.settings && this.settings.currency_symbol) ? this.settings.currency_symbol : '₹';
    },

    formatPrice(amount) {
      const num = Number(amount) || 0;
      try {
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: (num % 1 === 0 ? 0 : 2)
        }).format(num);
      } catch (e) {
        const sym = this.getCurrencySymbol() || '₹';
        return `${sym}${num.toLocaleString('en-IN')}`;
      }
    },

    normalizeProduct(raw) {
      if (!raw) return null;
      return {
        id: raw.id || raw.slug,
        slug: raw.slug || raw.id,
        sku: raw.sku || '',
        name: raw.name || '',
        shortName: raw.short_name || raw.shortName || raw.name,
        series: raw.series || '',
        category: (raw.categories && raw.categories[0]) ? raw.categories[0].name : (raw.category || 'Robotics'),
        categories: raw.categories || [],
        age: raw.age || '',
        grade: raw.grade || '',
        price: Number(raw.price) || 0,
        originalPrice: Number(raw.sale_price || raw.originalPrice || raw.price) || 0,
        salePrice: Number(raw.sale_price) || 0,
        rating: Number(raw.rating) || 5.0,
        reviewsCount: Number(raw.reviews_count || raw.reviewsCount) || 0,
        badge: raw.badge || '',
        image: raw.main_image || raw.image || 'assets/images/oxybott_logo.webp',
        images: raw.images || [],
        inStock: (raw.stock_quantity === undefined) ? true : (raw.stock_quantity > 0),
        stockQuantity: raw.stock_quantity || 0,
        tagline: raw.tagline || '',
        description: raw.description || '',
        highlights: raw.highlights || [],
        specs: raw.specs || {},
        boxContents: raw.box_contents || raw.boxContents || []
      };
    },

    async getProducts(params = {}) {
      try {
        const qs = new URLSearchParams(params).toString();
        const url = `/api/products${qs ? '?' + qs : ''}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.products)) {
            const normalized = data.products.map(p => this.normalizeProduct(p));
            this.productsCache = normalized;
            window.OXYBOTT_PRODUCTS = normalized;
            return normalized;
          }
        }
      } catch (err) {
        console.warn('[StoreClient] Error fetching products from API, falling back to static:', err.message);
      }
      return window.OXYBOTT_PRODUCTS || [];
    },

    async getProduct(idOrSlug) {
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(idOrSlug)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.product) {
            return this.normalizeProduct(data.product);
          }
        }
      } catch (err) {
        console.warn('[StoreClient] Error fetching single product, falling back:', err.message);
      }
      if (window.OXYBOTT_PRODUCTS) {
        return window.OXYBOTT_PRODUCTS.find(p => p.id === idOrSlug || p.slug === idOrSlug) || null;
      }
      return null;
    },

    async getCategories() {
      if (this.categoriesCache) return this.categoriesCache;
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            this.categoriesCache = data.categories;
            return data.categories;
          }
        }
      } catch (err) {
        console.warn('[StoreClient] Error fetching categories:', err.message);
      }
      return [];
    },

    async getBanners(type = 'HERO') {
      try {
        const res = await fetch(`/api/banners?type=${encodeURIComponent(type)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) return data.banners;
        }
      } catch (err) {
        console.warn('[StoreClient] Error fetching banners:', err.message);
      }
      return [];
    },

    async init() {
      await this.getSettings();
      await this.getProducts();
      this.ready = true;
      document.dispatchEvent(new CustomEvent('oxybott:data-ready', {
        detail: {
          settings: this.settings,
          products: this.productsCache
        }
      }));
    }
  };

  global.StoreClient = StoreClient;

  // Auto initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => StoreClient.init());
  } else {
    StoreClient.init();
  }

})(window);
