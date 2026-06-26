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
  }),
});

export const { useLoginMutation, useGetMeQuery } = authApi;
