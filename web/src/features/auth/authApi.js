import { baseApi } from "../../api/baseApi";

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation({
      query: (body) => ({ url: "/auth/token/", method: "POST", body }),
    }),
    getMe: build.query({
      query: () => "/auth/me/",
      providesTags: ["User"],
    }),
    requestPasswordReset: build.mutation({
      query: (body) => ({ url: "/auth/password-reset/", method: "POST", body }),
    }),
    confirmPasswordReset: build.mutation({
      query: (body) => ({ url: "/auth/password-reset/confirm/", method: "POST", body }),
    }),
  }),
});

export const {
  useLoginMutation,
  useGetMeQuery,
  useRequestPasswordResetMutation,
  useConfirmPasswordResetMutation,
} = authApi;
