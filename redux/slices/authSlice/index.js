// redux/slices/authSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loginUserApi, registerUserApi } from '../../../services/Auth';

/**
 * Async thunk for user login
 * - Calls backend API
 * - On success, returns user data
 * - On failure, rejects with error message
 */
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await loginUserApi(credentials);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Async thunk for user registration
 * - Calls backend API
 * - On success, returns user data
 * - On failure, rejects with error message
 */
export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await registerUserApi(userData);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    isAuthenticated: false,
    isLoading: false,
    user: null,
    error: null,
  },
  reducers: {
    /**
     * Logs out the current user
     */
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login flow
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, { payload }) => {
        state.isAuthenticated = true;
        state.user = {
          firstName: payload.firstName,
          lastName: payload.lastName,
          phone: payload.phoneNumber,
          email: payload.email,
          role: payload.role,
        };
        state.isLoading = false;
      })
      .addCase(loginUser.rejected, (state, { payload }) => {
        state.isLoading = false;
        state.error = payload;
      })

      // Registration flow
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, { payload }) => {
        state.isAuthenticated = true;
        state.user = {
          firstName: payload.firstName,
          lastName: payload.lastName,
          phone: payload.phoneNumber,
          email: payload.email,
          role: payload.role,
        };
        state.isLoading = false;
      })
      .addCase(registerUser.rejected, (state, { payload }) => {
        state.isLoading = false;
        state.error = payload;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
