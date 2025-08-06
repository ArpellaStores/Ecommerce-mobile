// redux/slices/cartSlice.js

import { createSlice } from '@reduxjs/toolkit';

/**
 * Cart Slice
 * - Manages shopping cart items keyed by product ID
 * - Supports adding, removing, and clearing items
 */
const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    // items: { [productId]: { id, quantity, ...otherProductFields } }
    items: {},
  },
  reducers: {
    /**
     * addItemToCart
     * - If the product already exists in the cart, increments its quantity
     * - Otherwise, adds the product entry
     * @param {object} state
     * @param {object} action.payload.product  Product object containing at least { id, quantity }
     */
    addItemToCart: (state, action) => {
      const { product } = action.payload;
      const { id, quantity = 1 } = product;

      if (!id) {
        console.error('addItemToCart: Product ID is undefined');
        return;
      }

      if (state.items[id]) {
        state.items[id].quantity += quantity;
      } else {
        state.items[id] = { ...product, quantity };
      }
    },

    /**
     * removeItemFromCart
     * - Deletes the product entry by ID
     * @param {object} state
     * @param {string|number} action.payload  The product ID to remove
     */
    removeItemFromCart: (state, action) => {
      const productId = action.payload;
      if (state.items[productId]) {
        delete state.items[productId];
      }
    },

    /**
     * clearCart
     * - Empties the entire cart
     * @param {object} state
     */
    clearCart: (state) => {
      state.items = {};
    },
  },
});

export const { addItemToCart, removeItemFromCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
