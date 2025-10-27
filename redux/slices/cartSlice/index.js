import { createSlice } from '@reduxjs/toolkit';

/**
 * Cart Slice
 * - Manages shopping cart items keyed by product ID
 * - Supports adding, removing, updating, and clearing items
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
     * updateItemQuantity
     * - Updates the quantity of a specific product in the cart
     * @param {object} state
     * @param {object} action.payload { productId, quantity }
     */
    updateItemQuantity: (state, action) => {
      const { productId, quantity } = action.payload;
      
      if (!productId) {
        console.error('updateItemQuantity: Product ID is undefined');
        return;
      }

      if (state.items[productId]) {
        state.items[productId].quantity = quantity;
      } else {
        console.warn(`updateItemQuantity: Product ${productId} not found in cart`);
      }
    },

    /**
     * removeItemFromCart
     * - Deletes the product entry by ID
     * @param {object} state
     * @param {object} action.payload { productId }
     */
    removeItemFromCart: (state, action) => {
      const { productId } = action.payload;
      
      if (!productId) {
        console.error('removeItemFromCart: Product ID is undefined');
        return;
      }

      if (state.items[productId]) {
        delete state.items[productId];
      } else {
        console.warn(`removeItemFromCart: Product ${productId} not found in cart`);
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

export const { addItemToCart, updateItemQuantity, removeItemFromCart, clearCart } = cartSlice.actions;
export default cartSlice.reducer;