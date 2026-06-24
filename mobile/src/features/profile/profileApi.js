import { baseApi } from "../../api/baseApi";

export const profileApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMe: build.query({
      query: () => "/auth/me/",
      providesTags: ["Profile"],
    }),
    updateProfile: build.mutation({
      query: (data) => ({ url: "/auth/me/", method: "PATCH", body: data }),
      invalidatesTags: ["Profile"],
    }),
    changePassword: build.mutation({
      query: (data) => ({ url: "/auth/change-password/", method: "POST", body: data }),
    }),
  }),
});

export const {
  useGetMeQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
} = profileApi;
