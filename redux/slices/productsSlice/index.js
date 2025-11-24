import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { baseUrl } from '../../../constants/const';

const normalizeProduct = item => {
  const barcodes = item.barcodes ? [item.barcodes] : (Array.isArray(item.barcodes) ? item.barcodes : []);
  const images = Array.isArray(item.productimages) ? item.productimages : item.productimages ? [item.productimages] : [];
  const primary = images.find(img => img.isPrimary) || images[0] || {};

  return {
    ...item,
    id: item.id ?? item._id ?? item.productId,
    barcodes,
    productimages: images,
    imageUrl: primary.imageUrl || item.imageUrl || null,
    imageId: primary.id || item.imageId || null,
    imageLoaded: Boolean(primary.imageUrl || item.imageUrl),
    imageFetching: false
  };
};

const mergeProductsByName = data => {
  const map = new Map();

  data.forEach(raw => {
    const item = normalizeProduct(raw);
    const key = item.name || `id-${item.id}`;
    if (!map.has(key)) {
      map.set(key, item);
    } else {
      const existing = map.get(key);

      (item.barcodes || []).forEach(code => {
        if (!existing.barcodes.includes(code)) {
          existing.barcodes.push(code);
        }
      });

      if (!existing.imageUrl && item.imageUrl) {
        existing.imageUrl = item.imageUrl;
        existing.imageId = item.imageId;
        existing.imageLoaded = true;
      }

      existing.price = existing.price ?? item.price;
    }
  });

  return Array.from(map.values());
};

export const fetchProductsApi = async (pageNumber = 1, pageSize = 50) => {
  const url = `${baseUrl}/paged-products?pageNumber=${pageNumber}&pageSize=${pageSize}`;
  const res = await axios.get(url);
  const items = Array.isArray(res.data) ? res.data : (res.data.items || []);
  const hasMore = items.length === pageSize;
  return { items, hasMore };
};

export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (arg = { pageNumber: 1, pageSize: 50 }, { getState, rejectWithValue }) => {
    try {
      const { pageNumber = 1, pageSize = 50 } = arg || {};
      
      const state = getState();
      const existingPage = state.products.pages[pageNumber];
      
      if (existingPage && Date.now() - existingPage.ts < 60000) {
        return { 
          items: existingPage.ids.map(id => state.products.productsById[id]).filter(Boolean), 
          pageNumber, 
          pageSize, 
          hasMore: state.products.hasMore,
          cached: true 
        };
      }

      const url = `${baseUrl}/paged-products?pageNumber=${pageNumber}&pageSize=${pageSize}`;
      const { data } = await axios.get(url);
      const arr = Array.isArray(data) ? data : (data.items || []);
      const normalized = arr.map(normalizeProduct);
      
      return { 
        items: normalized, 
        pageNumber, 
        pageSize, 
        hasMore: arr.length === pageSize,
        cached: false
      };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const fetchProductImage = createAsyncThunk(
  'products/fetchProductImage',
  async (productId, { getState, rejectWithValue }) => {
    if (!productId) {
      return rejectWithValue('Missing productId');
    }

    const state = getState();
    const product = state.products.productsById[productId];

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
        ...imageData
      };
    } catch (err) {
      return rejectWithValue(err.response?.data || err.message);
    }
  }
);

export const fetchProductsAndRelated = createAsyncThunk(
  'products/fetchProductsAndRelated',
  async (_, { rejectWithValue }) => {
    try {
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
  hasMore: true,
  currentPage: 0,
  pageSize: 50
};

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setProducts(state, action) {
      const incoming = Array.isArray(action.payload) ? action.payload : (action.payload.items || []);
      
      if (incoming.length === 0) return;
      
      const existingIds = new Set(Object.keys(state.productsById));
      const newProducts = incoming.filter(p => !existingIds.has(String(p.id)));
      
      if (newProducts.length === 0) return;

      newProducts.forEach(p => {
        state.productsById[p.id] = p;
      });
      
      state.products = Object.values(state.productsById);
      state.lastFetchTimestamp = Date.now();
    },

    updateProduct(state, action) {
      const product = action.payload;
      if (!product || !product.id) return;
      
      if (state.productsById[product.id]) {
        state.productsById[product.id] = { ...state.productsById[product.id], ...product };
        const idx = state.products.findIndex(p => p.id === product.id);
        if (idx !== -1) {
          state.products[idx] = state.productsById[product.id];
        }
      }
    },

    clearImageLoadingStates(state) {
      state.imageLoadingStates = {};
    },

    resetPagination(state) {
      state.currentPage = 0;
      state.hasMore = true;
      state.pages = {};
      state.pageFetchStatus = {};
    }
  },
  extraReducers: builder => {
    builder
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

      .addCase(fetchProducts.pending, (state, action) => {
        const pageNumber = (action.meta.arg && action.meta.arg.pageNumber) || 1;
        state.pageFetchStatus[pageNumber] = 'pending';
        if (pageNumber === 1) {
          state.loading = true;
        }
        state.error = null;
        state.fetchRequestCount++;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        const { items, pageNumber, hasMore, cached } = action.payload;
        
        state.pageFetchStatus[pageNumber] = 'fulfilled';
        
        if (!cached && items.length > 0) {
          const existingIds = new Set(Object.keys(state.productsById));
          const newProducts = items.filter(p => !existingIds.has(String(p.id)));
          
          if (newProducts.length > 0) {
            newProducts.forEach(p => {
              state.productsById[p.id] = p;
            });
            
            state.products = Object.values(state.productsById);
          }
          
          state.pages[pageNumber] = { 
            ids: items.map(i => i.id), 
            ts: Date.now() 
          };
        }
        
        state.hasMore = typeof hasMore === 'boolean' ? hasMore : state.hasMore;
        state.currentPage = Math.max(state.currentPage, pageNumber);
        state.loading = false;
        state.lastFetchTimestamp = Date.now();
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        const pageNumber = (action.meta.arg && action.meta.arg.pageNumber) || 1;
        state.pageFetchStatus[pageNumber] = 'rejected';
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchProductImage.pending, (state, action) => {
        const id = action.meta.arg;
        state.imageLoadingStates[id] = true;
      })
      .addCase(fetchProductImage.fulfilled, (state, action) => {
        const { productId, imageUrl, cached } = action.payload;
        delete state.imageLoadingStates[productId];
        
        if (!cached && imageUrl && state.productsById[productId]) {
          state.productsById[productId].imageUrl = imageUrl;
          state.productsById[productId].imageId = action.payload.id;
          state.productsById[productId].imageLoaded = true;
          
          const idx = state.products.findIndex(p => p.id === productId);
          if (idx !== -1) {
            state.products[idx] = state.productsById[productId];
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
  resetPagination
} = productsSlice.actions;

export default productsSlice.reducer;