import { api } from "./index";

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: "/login?platform=mobile",
        method: "POST",
        body: {
          userName: credentials.userName || credentials.phoneNumber,
          password: credentials.passwordHash || credentials.password,
        },
      }),
    }),

    register: builder.mutation({
      query: (userData) => ({
        url: "/register",
        method: "POST",
        body: userData,
      }),
    }),

    sendOtp: builder.mutation({
      query: ({ username }) => ({
        url: `/send-otp?username=${username}`,
        method: "GET",
      }),
    }),

    verifyOtp: builder.mutation({
      query: ({ username, otp }) => ({
        url: `/verify-otp?username=${username}&otp=${otp}`,
        method: "POST",
      }),
    }),
  }),
  overrideExisting: true,
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useSendOtpMutation,
  useVerifyOtpMutation,
} = authApi;
