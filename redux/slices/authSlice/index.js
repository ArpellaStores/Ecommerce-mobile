import { createSlice } from "@reduxjs/toolkit";

const authSlice = createSlice({
  name: "authState",
  initialState: {
    isAuthenticated: false,
    token: null,
    user: null,
    error: null,
    otpSent: false,
    otpVerified: false,
  },
  reducers: {
    setCredentials: (state, { payload }) => {
      state.token = payload.token;
      state.user = {
        firstName: payload.user?.firstName,
        lastName: payload.user?.lastName,
        role: payload.user?.role,
        phone: payload.user?.phone,
      };
      state.isAuthenticated = true;
      state.error = null;
    },

    setSignOut: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.otpSent = false;
      state.otpVerified = false;
    },

    setOtpSent: (state) => {
      state.otpSent = true;
    },

    setOtpVerified: (state) => {
      state.otpVerified = true;
    },

    resetOtpState: (state) => {
      state.otpSent = false;
      state.otpVerified = false;
      state.error = null;
    },

    setAuthError: (state, { payload }) => {
      state.error = payload;
    },
  },
});

export const {
  setCredentials,
  setSignOut,
  setOtpSent,
  setOtpVerified,
  resetOtpState,
  setAuthError,
} = authSlice.actions;

export const logout = setSignOut;

export default authSlice.reducer;