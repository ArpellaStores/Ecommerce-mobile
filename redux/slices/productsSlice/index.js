import { createSlice } from "@reduxjs/toolkit";

export const normalizeProduct = (item) => {
  const barcodes = Array.isArray(item.barcodes)
    ? item.barcodes
    : item.barcodes
    ? [item.barcodes]
    : [];
  const images = Array.isArray(item.productimages)
    ? item.productimages
    : item.productimages
    ? [item.productimages]
    : [];
  const primary = images.find((img) => img.isPrimary) || images[0] || {};

  return {
    ...item,
    id: item.id ?? item._id ?? item.productId,
    barcodes,
    productimages: images,
    imageUrl: primary.imageUrl || item.imageUrl || null,
    imageId: primary.id || item.imageId || null,
    imageLoaded: Boolean(primary.imageUrl || item.imageUrl),
    imageFetching: false,
  };
};

const initialState = {
  products: [],
  categories: [],
  subcategories: [],
  productImages: {},
  loading: false,
  error: null,
  imageLoadingStates: {},
  lastFetchTimestamp: null,
  pages: {},
  productsById: {},
  pageFetchStatus: {},
  hasMore: true,
  currentPage: 0,
  pageSize: 50,
};

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    setProducts(state, action) {
      const incoming = Array.isArray(action.payload)
        ? action.payload
        : action.payload.items ?? [];

      if (incoming.length === 0) {
         state.products = [];
         state.productsById = {};
         return;
      }

      // Re-initialize for a fresh set (Page 1)
      const newItems = incoming.map(p => normalizeProduct(p));
      
      newItems.forEach((p) => {
        state.productsById[p.id] = p;
        if (p.imageUrl) {
          state.productImages[p.id] = {
            imageUrl: p.imageUrl,
            imageId: p.imageId,
            loading: false,
            error: null,
          };
        }
      });

      state.products = Object.values(state.productsById);
      state.lastFetchTimestamp = Date.now();
    },

    appendProducts(state, action) {
      const { items, pageNumber, hasMore } = action.payload;

      items.forEach((p) => {
        const normalized = normalizeProduct(p);
        state.productsById[normalized.id] = normalized;
        if (normalized.imageUrl) {
          state.productImages[normalized.id] = {
            imageUrl: normalized.imageUrl,
            imageId: normalized.imageId,
            loading: false,
            error: null,
          };
        }
      });

      state.products = Object.values(state.productsById);
      state.pages[pageNumber] = {
        ids: items.map((i) => i.id ?? i._id ?? i.productId),
        ts: Date.now(),
      };
      state.hasMore = typeof hasMore === "boolean" ? hasMore : state.hasMore;
      state.currentPage = Math.max(state.currentPage, pageNumber);
      state.lastFetchTimestamp = Date.now();
    },

    setCategories(state, action) {
      const payload = action.payload;
      state.categories = Array.isArray(payload)
        ? payload
        : payload?.data ?? payload?.content ?? payload?.items ?? [];
    },

    setSubcategories(state, action) {
      const payload = action.payload;
      state.subcategories = Array.isArray(payload)
        ? payload
        : payload?.data ?? payload?.content ?? payload?.items ?? [];
    },

    setProductImageData(state, action) {
      const { productId, imageUrl, id } = action.payload;
      state.productImages[productId] = {
        ...(state.productImages[productId] ?? {}),
        imageUrl: imageUrl ?? null,
        imageId: id ?? null,
        loading: false,
        error: null,
        lastFetched: Date.now(),
      };
      delete state.imageLoadingStates[productId];
    },

    setProductImageLoading(state, action) {
      const id = action.payload;
      state.productImages[id] = state.productImages[id] ?? {};
      state.productImages[id].loading = true;
      state.productImages[id].error = null;
      state.imageLoadingStates[id] = true;
    },

    setProductImageError(state, action) {
      const { productId, error } = action.payload;
      delete state.imageLoadingStates[productId];
      if (state.productImages[productId]) {
        state.productImages[productId].loading = false;
        state.productImages[productId].error = error;
      }
    },

    updateProduct(state, action) {
      const product = action.payload;
      if (!product?.id) return;

      if (state.productsById[product.id]) {
        state.productsById[product.id] = {
          ...state.productsById[product.id],
          ...product,
        };
        const idx = state.products.findIndex((p) => p.id === product.id);
        if (idx !== -1) {
          state.products[idx] = state.productsById[product.id];
        }
      }
    },

    setLoading(state, action) {
      state.loading = action.payload;
    },

    setError(state, action) {
      state.error = action.payload;
      state.loading = false;
    },

    resetPagination(state) {
      state.currentPage = 0;
      state.hasMore = true;
      state.pages = {};
      state.pageFetchStatus = {};
    },

    clearImageLoadingStates(state) {
      state.imageLoadingStates = {};
    },
  },
});

export const {
  setProducts,
  appendProducts,
  setCategories,
  setSubcategories,
  setProductImageData,
  setProductImageLoading,
  setProductImageError,
  updateProduct,
  setLoading,
  setError,
  resetPagination,
  clearImageLoadingStates,
} = productsSlice.actions;

export default productsSlice.reducer;