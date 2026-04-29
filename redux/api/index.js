import { API_URL } from "../../constants/const";
import {
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";
import { setSignOut } from "../slices/authSlice";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";

const clearStoredCredentials = async () => {
  try {
    await SecureStore.deleteItemAsync('userToken')
    await SecureStore.deleteItemAsync('token')
  } catch {}
};

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth?.token;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
  timeout: 15000,
});

const baseQueryWithLogout = async (args, queryApi, extraOptions) => {
  const url = typeof args === "string" ? args : args.url;

  const isPublicAuthEndpoint = url?.includes("login") || url?.includes("otp") || url?.includes("register");

  if (!isPublicAuthEndpoint) {
    // Wait for redux-persist to finish rehydrating before reading the token.
    // Without this, the token is null during the rehydration window and every
    // protected request fires as unauthenticated, producing a spurious 401.
    const isRehydrated = () => queryApi.getState().auth?._persist?.rehydrated === true;
    if (!isRehydrated()) {
      await new Promise((resolve) => {
        const interval = setInterval(() => {
          if (isRehydrated()) {
            clearInterval(interval);
            resolve();
          }
        }, 50);
        // Safety timeout: give up after 5 s and let the request proceed as-is.
        setTimeout(() => { clearInterval(interval); resolve(); }, 5000);
      });
    }
  }

  const state = queryApi.getState();
  const token = state.auth?.token;

  if (!token && !isPublicAuthEndpoint) {
    queryApi.dispatch(api.util.resetApiState());
    queryApi.dispatch(setSignOut());
    if (router && router.replace) {
      router.replace('/Login');
    }
    return {
      error: {
        status: 'CUSTOM_ERROR',
        error: 'Missing authentication token.',
        data: { message: 'Authentication required' }
      }
    };
  }

  const result = await baseQuery(args, queryApi, extraOptions);

  const status = result?.error?.status;

  if (status === 401 && !url?.includes('login')) {
    console.warn(`[API] 401 on ${url} — session expired, clearing and redirecting to Login.`);
    queryApi.dispatch(api.util.resetApiState());
    queryApi.dispatch(setSignOut());
    clearStoredCredentials();
    if (router && router.replace) {
      router.replace('/Login');
    }
  } else if (status === 403) {
    // 403 = authenticated but restricted endpoint — do NOT sign out, just log it
    console.warn(`[API] 403 on ${url} — endpoint restricted for this account role.`);
  }

  return result;
};


export const api = createApi({
  baseQuery: baseQueryWithLogout,
  endpoints: () => ({}),
  tagTypes: ["Products", "Categories", "Orders"],
  refetchOnMountOrArgChange: 60,
  refetchOnReconnect: true,
  keepUnusedDataFor: 300,
  extractRehydrationInfo(action, { reducerPath }) {
    if (action.type === "persist/REHYDRATE") {
      return action.payload?.[reducerPath];
    }
  },
});
