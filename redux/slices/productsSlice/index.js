// src/redux/slices/productsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { baseUrl } from '../../../constants/const';

/** Normalize a single product's structure - OPTIMIZED */
const normalizeProduct = item => {
  // Only keep essential fields to reduce memory
  const barcodes = item.barcodes ? [item.barcodes] : (Array.isArray(item.barcodes) ? item.barcodes : []);
  const images  = Array.isArray(item.productimages) ? item.productimages : item.productimages ? [item.productimages] : [];
  const primary = images.find(img => img.isPrimary) || images[0] || {};

  return {
    id: item.id,
    name: item.name,
    price: item.price,
    barcodes,
    productimages: images,
    imageUrl: primary.imageUrl || item.imageUrl || null,
    imageId: primary.id || item.imageId || null,
    imageLoaded: Boolean(primary.imageUrl || item.imageUrl),
    imageFetching: false,
    // Only include other fields if they exist
    ...(item.description && { description: item.description }),
    ...(item.categoryId && { categoryId: item.categoryId }),
    ...(item.subcategoryId && { subcategoryId: item.subcategoryId }),
    ...(item.sku && { sku: item.sku }),
    ...(item.stock && { stock: item.stock }),
    ...(item.discountQuantity && { discountQuantity: item.discountQuantity }),
    ...(item.priceAfterDiscount && { priceAfterDiscount: item.priceAfterDiscount }),
  };
};

/** Merge products with the same name into a single record - OPTIMIZED */
const mergeProductsByName = data => {
  const map = new Map();

  data.forEach(raw => {
    const item = normalizeProduct(raw);
    const key = item.name || `id-${item.id}`;
    
    if (!map.has(key)) {
      map.set(key, item);
    } else {
      const existing = map.get(key);

      // Merge unique barcodes
      if (item.barcodes && item.barcodes.length > 0) {
        item.barcodes.forEach(code => {
          if (!existing.barcodes.includes(code)) {
            existing.barcodes.push(code);
          }
        });
      }

      // Prefer the first available primary image
      if (!existing.imageUrl && item.imageUrl) {
        existing.imageUrl = item.imageUrl;
        existing.imageId = item.imageId;
        existing.imageLoaded = true;
      }

      // Merge other fields conservatively
      existing.price = existing.price ?? item.price;
    }
  });

  return Array.from(map.values());
};

/**
 * API helper for React Query / external fetchers.
 */
export const fetchProductsApi = async (pageNumber = 1, pageSize = 25) => {
  const url = `${baseUrl}/paged-products?pageNumber=${pageNumber}&pageSize=${pageSize}`;
  const res = await axios.get(url);
  const items = Array.isArray(res.data) ? res.data : (res.data.items || []);
  const hasMore = items.length === pageSize;
  return { items, hasMore };
};

/** Fetch and normalize product list */
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (arg = { pageNumber: 1, pageSize: 50 }, { rejectWithValue }) => {
    try {
      const { pageNumber = 1, pageSize = 25, categoryId, subcategoryId } = arg || {};
      
      // Build query params
      let url = `${baseUrl}/paged-products?pageNumber=${pageNumber}&pageSize=${pageSize}`;
      if (categoryId) url += `&categoryId=${categoryId}`;
      if (subcategoryId) url += `&subcategoryId=${subcategoryId}`;
      
      const { data } = await axios.get(url);
      const arr = Array.isArray(data) ? data : (data.items || []);
      const merged = mergeProductsByName(arr);
      
      return { 
        items: merged, 
        pageNumber, 
        pageSize, 
        hasMore: arr.length === pageSize,
        replace: pageNumber === 1 // Flag to replace products on first page
      };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** Fetch a single product's image */
export const fetchProductImage = createAsyncThunk(
  'products/fetchProductImage',
  async (productId, { getState, rejectWithValue }) => {
    if (!productId) {
      return rejectWithValue('Missing productId');
    }

    const state = getState();
    const product = state.products.productsById?.[productId];

    if (!product) {
      return rejectWithValue('Product not found');
    }

    if (product.imageUrl) {
      return { productId, imageUrl: product.imageUrl, cached: true };
    }

    try {
      const response = await axios.get(`${baseUrl}/product-image/${productId}`);
      let imageData = response.data;

      if (Array.isArray(imageData) && imageData.length > 0) {
        imageData = imageData[0];
      } else if (imageData && typeof imageData === 'object' && imageData['0']) {
        imageData = imageData['0'];
      }

      return {
        productId,
        imageUrl: imageData.imageUrl || null,
        id: imageData.id || imageData.imageId || null,
        isPrimary: Boolean(imageData.isPrimary),
      };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

/** Fetch products and related resources */
export const fetchProductsAndRelated = createAsyncThunk(
  'products/fetchProductsAndRelated',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      // Fetch only essential resources
      const [catRes, subRes] = await Promise.all([
        axios.get(`${baseUrl}/categories`).catch(() => ({ data: [] })),
        axios.get(`${baseUrl}/subcategories`).catch(() => ({ data: [] }))
      ]);

      return {
        categories: Array.isArray(catRes.data) ? catRes.data : [],
        subcategories: Array.isArray(subRes.data) ? subRes.data : []
      };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

const initialState = {
  products: [],
  inventories: [],
  categories: [],
  subcategories: [],
  loading: false,
  error: null,
  imageLoadingStates: {},
  lastFetchTimestamp: null,
  fetchRequestCount: 0,
  pages: {},
  productsById: {},
  pageFetchStatus: {},
  hasMore: true
};

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setProducts(state, action) {
      const incoming = Array.isArray(action.payload) ? action.payload : (action.payload.items || []);
      const merged = mergeProductsByName([...(state.products || []), ...incoming]);

      // Update normalized store
      merged.forEach(p => {
        state.productsById[p.id] = p;
      });

      state.products = merged;
      state.lastFetchTimestamp = Date.now();
    },

    updateProduct(state, action) {
      const idx = state.products.findIndex(p => p.id === action.payload.id);
      if (idx !== -1) {
        state.products[idx] = { ...state.products[idx], ...action.payload };
      }
      if (action.payload?.id) {
        state.productsById[action.payload.id] = {
          ...(state.productsById[action.payload.id] || {}),
          ...action.payload
        };
      }
    },

    clearImageLoadingStates(state) {
      state.imageLoadingStates = {};
    },
  },
  extraReducers: builder => {
    builder
      // fetchProductsAndRelated
      .addCase(fetchProductsAndRelated.pending, state => {
        state.loading = true;
        state.error = null;
        state.fetchRequestCount++;
      })
      .addCase(fetchProductsAndRelated.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload.categories;
        state.subcategories = action.payload.subcategories;
        state.lastFetchTimestamp = Date.now();
      })
      .addCase(fetchProductsAndRelated.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // fetchProducts
      .addCase(fetchProducts.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.fetchRequestCount++;
        const pageNumber = (action.meta.arg && action.meta.arg.pageNumber) || 1;
        state.pageFetchStatus[pageNumber] = 'pending';
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        const { items, pageNumber, hasMore, replace } = action.payload;
        
        state.pageFetchStatus[pageNumber] = 'fulfilled';
        state.pages[pageNumber] = { ids: items.map(i => i.id), ts: Date.now() };
        
        // If replace is true (first page), clear existing products
        if (replace) {
          state.products = items;
          state.productsById = {};
          items.forEach(p => {
            state.productsById[p.id] = p;
          });
        } else {
          // Otherwise merge
          const merged = mergeProductsByName([...state.products, ...items]);
          state.products = merged;
          items.forEach(p => {
            state.productsById[p.id] = { ...(state.productsById[p.id] || {}), ...p };
          });
        }
        
        state.hasMore = typeof hasMore === 'boolean' ? hasMore : state.hasMore;
        state.lastFetchTimestamp = Date.now();
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        const pageNumber = (action.meta.arg && action.meta.arg.pageNumber) || 1;
        state.pageFetchStatus[pageNumber] = 'rejected';
        state.error = action.payload;
      })

      // fetchProductImage
      .addCase(fetchProductImage.pending, (state, action) => {
        const id = action.meta.arg;
        state.imageLoadingStates[id] = true;
      })
      .addCase(fetchProductImage.fulfilled, (state, action) => {
        const { productId, imageUrl, cached } = action.payload;
        delete state.imageLoadingStates[productId];
        
        if (!cached && imageUrl) {
          const idx = state.products.findIndex(p => p.id === productId);
          if (idx !== -1) {
            state.products[idx].imageUrl = imageUrl;
            state.products[idx].imageId = action.payload.id;
            state.products[idx].imageLoaded = true;
          }
          if (state.productsById[productId]) {
            state.productsById[productId] = {
              ...state.productsById[productId],
              imageUrl,
              imageId: action.payload.id,
              imageLoaded: true
            };
          }
        }
      })
      .addCase(fetchProductImage.rejected, (state, action) => {
        const id = action.meta.arg;
        delete state.imageLoadingStates[id];
      });
  }
});

export const {
  setProducts,
  updateProduct,
  clearImageLoadingStates,
} = productsSlice.actions;

export default productsSlice.reducer;