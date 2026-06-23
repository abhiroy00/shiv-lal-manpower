import { baseApi } from "../../api/baseApi";
import { setCredentials } from "./authSlice";

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation({
      query: (body) => ({ url: "/auth/token/", method: "POST", body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const meRes = await fetch("/api/auth/me/", {
            headers: { Authorization: `Bearer ${data.access}` },
          });
          const user = await meRes.json();
          dispatch(setCredentials({ accessToken: data.access, refreshToken: data.refresh, user }));
        } catch {
          // login mutation's own error state handles the UI
        }
      },
    }),
    getMe: build.query({
      query: () => "/auth/me/",
      providesTags: ["User"],
    }),
  }),
});

export const { useLoginMutation, useGetMeQuery } = authApi;
