// redux/slices/productsSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { baseUrl } from '../../../constants/const';

/**
 * Async thunk: fetchProducts
 * - Retrieves products and categories from backend
 * - De-duplicates products by name, merging barcodes
 * - Returns { products: Array, categories: Array }
 * - On failure, rejects with error message
 */
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (_, thunkAPI) => {
    try {
      const { data: productsData } = await axios.get(`${baseUrl}/products`);
      if (!Array.isArray(productsData)) {
        return thunkAPI.rejectWithValue('Invalid products data format');
      }

      // De-duplicate by product name, merge barcodes
      const map = new Map();
      productsData.forEach((item) => {
        const name = item.name || '';
        if (map.has(name)) {
          const existing = map.get(name);
          if (item.barcode && !existing.barcodes.includes(item.barcode)) {
            existing.barcodes.push(item.barcode);
          }
        } else {
          map.set(name, {
            ...item,
            id: item.id || Math.random().toString(),
            price: item.price ?? 0,
            barcodes: item.barcode ? [item.barcode] : [],
          });
        }
      });
      const uniqueProducts = Array.from(map.values());

      // Fetch categories (best-effort)
      let categories = [];
      try {
        const { data: categoriesData } = await axios.get(`${baseUrl}/categories`);
        categories = Array.isArray(categoriesData) ? categoriesData : [];
      } catch {
        // ignore category errors
      }

      return { products: uniqueProducts, categories };
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data || err.message || 'Unknown error');
    }
  }
);

const initialState = {
  products: [],
  categories: [],
  loading: false,
  error: null,
};

/**
 * Products Slice
 * - Handles fetchProducts lifecycle
 * - Exposes resetProductsState reducer for manual reset
 */
const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    /**
     * resetProductsState
     * - Resets slice to initial state
     */
    resetProductsState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.products = payload.products;
        state.categories = payload.categories;
        state.error = null;
      })
      .addCase(fetchProducts.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload || 'Failed to fetch products';
      });
  },
});

export const { resetProductsState } = productsSlice.actions;
export default productsSlice.reducer;
