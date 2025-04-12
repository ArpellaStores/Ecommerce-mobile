import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const baseUrl = 'http://arpella-001.runasp.net';

// Updated fetch products thunk to fix data handling
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (_, thunkAPI) => {
    try {
      const response = await axios.get(`${baseUrl}/products`);
      console.log("📦 Products API Response:", response.data);

      // Process the products data
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
      console.log("🧹 Filtered Unique Products:", uniqueProducts);

      // Also fetch categories to ensure we have them
      try {
        const categoriesResponse = await axios.get(`${baseUrl}/categories`);
        console.log("📂 Categories API Response:", categoriesResponse.data);
        
        // Return the processed data
        return {
          products: uniqueProducts,
          categories: Array.isArray(categoriesResponse.data) ? categoriesResponse.data : []
        };
      } catch (categoryError) {
        console.error("❌ Error fetching categories:", categoryError);
        // Continue with just products if categories fail
        return {
          products: uniqueProducts,
          categories: []
        };
      }
    } catch (error) {
      console.error("❌ Error fetching products:", error.response?.data || error.message);
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
        // Log for debugging
        console.log("⏳ fetchProducts pending, setting loading state");
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        // Log the payload for debugging
        console.log("✅ fetchProducts fulfilled with payload:", action.payload);
        
        state.loading = false;
        // Explicitly update each property to ensure they're set correctly
        state.products = action.payload.products || [];
        state.categories = action.payload.categories || [];
        state.error = null;
        
        // Log the updated state for debugging
        console.log("🔄 Updated Redux state products length:", state.products.length);
        console.log("🔄 Updated Redux state categories length:", state.categories.length);
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch products";
        console.error("❌ fetchProducts rejected with error:", state.error);
      });
  }
});

export const { resetProductsState } = productsSlice.actions;
export default productsSlice.reducer;