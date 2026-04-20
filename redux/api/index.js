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
  const method = typeof args === "string" ? "GET" : args.method || "GET";
  const body = args.body;
  
  console.log(`\n[API REQUEST] ${method} ${url}`);
  if (body) console.log(`[API PAYLOAD]`, JSON.stringify(body, null, 2));

  const result = await baseQuery(args, queryApi, extraOptions);
  
  if (result.data) {
    console.log(`[API RESPONSE] ${method} ${url} -> SUCCESS`);
    // Only log first 500 chars of data to avoid bloat, or just the count if it's an array
    if (Array.isArray(result.data)) {
       console.log(`[API DATA] Count: ${result.data.length}`);
    } else {
       console.log(`[API DATA]`, JSON.stringify(result.data).substring(0, 500));
    }
  }

  if (result.error) {
     console.log(`[API ERROR] ${method} ${url} -> Status: ${result.error.status}`);
     console.log(`[API ERROR DETAIL]`, JSON.stringify(result.error, null, 2));
  }

  if (result?.error?.status === 401 && !url?.includes("login")) {
    queryApi.dispatch(api.util.resetApiState());
    queryApi.dispatch(setSignOut());
  }

  return result;
};

export const api = createApi({
  baseQuery: baseQueryWithLogout,
  endpoints: () => ({}),
  tagTypes: ["Products", "Categories"],
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
