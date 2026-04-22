import { API_URL } from "../../constants/const";
import {
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";
import { setSignOut } from "../slices/authSlice";

const baseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth?.token;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    } else {
      console.warn("[API] No token found in Redux state.auth.token");
    }
    return headers;
  },
  timeout: 15000,
});

const baseQueryWithLogout = async (args, queryApi, extraOptions) => {
  const url = typeof args === "string" ? args : args.url;
  
  const state = queryApi.getState();
  const isAuthenticated = state.auth?.isAuthenticated;
  const token = state.auth?.token;

  const isPublicAuthEndpoint = url?.includes("login") || url?.includes("otp") || url?.includes("register");

  if (isAuthenticated && !token && !isPublicAuthEndpoint) {
    console.warn("[API] Auth state conflict: authenticated but no token. Forcing logout.");
    queryApi.dispatch(api.util.resetApiState());
    queryApi.dispatch(setSignOut());
    return {
      error: {
        status: 'CUSTOM_ERROR',
        error: 'Missing authentication token while logged in.',
        data: { message: 'Authentication required' }
      }
    };
  }

  const result = await baseQuery(args, queryApi, extraOptions);

  if (result?.error?.status === 401 && !url?.includes("login")) {
    queryApi.dispatch(api.util.resetApiState());
    queryApi.dispatch(setSignOut());
  }

  return result;
};


export const api = createApi({
  baseQuery: baseQueryWithLogout,
  endpoints: () => ({}),
  tagTypes: ["Products", "Categories", "Orders"],
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  keepUnusedDataFor: 0,
  extractRehydrationInfo(action, { reducerPath }) {
    if (action.type === "persist/REHYDRATE") {
      return action.payload?.[reducerPath];
    }
  },
});
