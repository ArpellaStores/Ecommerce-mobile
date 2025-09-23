// redux/slices/authSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loginUserApi, registerUserApi, sendOtpApi, verifyOtpApi } from '../../../services/Auth';

/**
 * Async thunk for user login
 * - Calls backend API
 * - On success, returns user data
 * - On failure, rejects with full error object for detailed handling
 */
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await loginUserApi(credentials);
      return response;
    } catch (error) {
      // Pass the full error object so components can inspect response details
      return rejectWithValue({
        message: error.message,
        response: error.response,
        data: error.response?.data,
        status: error.response?.status,
        // Include the original error for comprehensive inspection
        originalError: error
      });
    }
  }
);

/**
 * Async thunk for user registration
 * - Calls backend API
 * - On success, returns user data
 * - On failure, rejects with full error object for detailed handling
 */
export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await registerUserApi(userData);
      return response;
    } catch (error) {
      // Pass the full error object so components can inspect response details
      return rejectWithValue({
        message: error.message,
        response: error.response,
        data: error.response?.data,
        status: error.response?.status,
        // Include the original error for comprehensive inspection
        originalError: error
      });
    }
  }
);

/**
 * Async thunk for sending OTP
 * - Calls backend API to send OTP to user's phone
 * - On success, returns confirmation
 * - On failure, rejects with full error object
 */
export const sendOtp = createAsyncThunk(
  'auth/sendOtp',
  async ({ username }, { rejectWithValue }) => {
    try {
      const response = await sendOtpApi({ username });
      return response;
    } catch (error) {
      return rejectWithValue({
        message: error.message,
        response: error.response,
        data: error.response?.data,
        status: error.response?.status,
        originalError: error
      });
    }
  }
);

/**
 * Async thunk for verifying OTP
 * - Calls backend API to verify OTP with username and code
 * - On success, returns verification result
 * - On failure, rejects with full error object
 */
export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async ({ username, otp }, { rejectWithValue }) => {
    try {
      const response = await verifyOtpApi({ username, otp });
      return response;
    } catch (error) {
      return rejectWithValue({
        message: error.message,
        response: error.response,
        data: error.response?.data,
        status: error.response?.status,
        originalError: error
      });
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
    otpSent: false,
    otpVerified: false,
    otpLoading: false,
  },
  reducers: {
    /**
     * Logs out the current user
     */
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.error = null;
      state.otpSent = false;
      state.otpVerified = false;
      state.otpLoading = false;
    },
    /**
     * Reset OTP state
     */
    resetOtpState: (state) => {
      state.otpSent = false;
      state.otpVerified = false;
      state.otpLoading = false;
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
        // Store the full error object, but display the message for basic UI needs
        state.error = payload?.message || payload || 'Login failed';
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
        // Store the full error object, but display the message for basic UI needs
        state.error = payload?.message || payload || 'Registration failed';
      })

      // Send OTP flow
      .addCase(sendOtp.pending, (state) => {
        state.otpLoading = true;
        state.error = null;
      })
      .addCase(sendOtp.fulfilled, (state) => {
        state.otpSent = true;
        state.otpLoading = false;
      })
      .addCase(sendOtp.rejected, (state, { payload }) => {
        state.otpLoading = false;
        state.error = payload?.message || payload || 'Failed to send OTP';
      })

      // Verify OTP flow
      .addCase(verifyOtp.pending, (state) => {
        state.otpLoading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state) => {
        state.otpVerified = true;
        state.otpLoading = false;
      })
      .addCase(verifyOtp.rejected, (state, { payload }) => {
        state.otpLoading = false;
        state.error = payload?.message || payload || 'OTP verification failed';
      });
  },
});

export const { logout, resetOtpState } = authSlice.actions;
export default authSlice.reducer;