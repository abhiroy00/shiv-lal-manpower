import { baseApi } from "../../api/baseApi";

export const leaveApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    myLeaves: build.query({
      query: () => "/leaves/",
      providesTags: ["Leave"],
    }),
    applyLeave: build.mutation({
      query: (body) => ({ url: "/leaves/", method: "POST", body }),
      invalidatesTags: ["Leave"],
    }),
  }),
});

export const { useMyLeavesQuery, useApplyLeaveMutation } = leaveApi;
