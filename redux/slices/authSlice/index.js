import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { toast } from 'react-native-toast-notifications';
import { loginUserApi } from  '../../../services/Auth';

// Helper functions for showing toast notifications
const showToastError = (message) => {
  toast.error(message);
};

const showToastSuccess = (message) => {
  toast.success(message);
};

// Async thunk for logging in
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await loginUserApi(credentials);
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data || 'An unexpected error occurred';
      return rejectWithValue(errorMessage);
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    isAuthenticated: false,
    isLoading: false,
    user: null,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.error = null;
      showToastSuccess('Logged out successfully');
    },
    register: (state, action) => {
      const { FirstName, phone } = action.payload;
      state.isAuthenticated = true;
      state.user = {
        FirstName: FirstName,
        phone: phone,
      };
      state.error = null;

      showToastSuccess('Registration successful');
      showToastSuccess(`Welcome ${FirstName || ''}! Your username is ${phone || ''}`);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.isLoading = false;
        const userName = state.user.firstName || state.user.phone;
        toast.success(`Welcome, ${userName}!`);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        toast.error(action.payload);
      });
  },
});

export const { logout, register } = authSlice.actions;
export default authSlice.reducer;
