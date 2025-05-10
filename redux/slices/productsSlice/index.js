import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import {baseUrl} from "../../../constants/const"

export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (_, thunkAPI) => {
    try {
      const response = await axios.get(`${baseUrl}/products`);
      if (!Array.isArray(response.data)) {
        console.error("API response is not an array:", response.data);
        return thunkAPI.rejectWithValue("Invalid data format received");
      }

      // Filter duplicate products by name and merge barcodes if present
      const productMap = new Map();
      response.data.forEach(item => {
        if (productMap.has(item.name)) {
          const existing = productMap.get(item.name);
          // Merge barcode if it exists and isn't already in the list
          if (item.barcode && !existing.barcodes.includes(item.barcode)) {
            existing.barcodes.push(item.barcode);
          }
        } else {
          // Ensure all products have consistent property naming
          productMap.set(item.name, {
            ...item,
            id: item.id || Math.random().toString(),
            name: item.name || '',
            price: item.price || 0,
            barcodes: item.barcode ? [item.barcode] : []
          });
        }
      });

      const uniqueProducts = Array.from(productMap.values());

      // Also fetch categories to ensure we have them
      try {
        const categoriesResponse = await axios.get(`${baseUrl}/categories`);
        
        // Return the processed data
        return {
          products: uniqueProducts,
          categories: Array.isArray(categoriesResponse.data) ? categoriesResponse.data : []
        };
      } catch (categoryError) {
        return {
          products: uniqueProducts,
          categories: []
        };
      }
    } catch (error) {
      return thunkAPI.rejectWithValue(error.response?.data || "Unknown error");
    }
  }
);

const initialState = {
  products: [],
  inventories: [],
  categories: [],
  subcategories: [],
  loading: false,
  error: null
};

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    // Add a manual reset action for debugging
    resetProductsState: () => initialState
  },
  extraReducers: (builder) => {
    builder
      // fetchProducts
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        
        state.loading = false;
        // Explicitly update each property to ensure they're set correctly
        state.products = action.payload.products || [];
        state.categories = action.payload.categories || [];
        state.error = null;
        
       
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch products";
      });
  }
});

export const { resetProductsState } = productsSlice.actions;
export default productsSlice.reducer;