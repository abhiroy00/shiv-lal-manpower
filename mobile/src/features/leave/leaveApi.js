import { baseApi } from "../../api/baseApi";

export const leaveApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    myLeaves: build.query({
      query: () => "/leaves/",
      providesTags: ["Leave"],
    }),
    leaveBalance: build.query({
      query: () => "/leaves/balance/",
      providesTags: ["Leave"],
    }),
    applyLeave: build.mutation({
      query: (body) => ({ url: "/leaves/", method: "POST", body }),
      invalidatesTags: ["Leave"],
    }),
    cancelLeave: build.mutation({
      query: (id) => ({ url: `/leaves/${id}/cancel/`, method: "POST" }),
      invalidatesTags: ["Leave"],
    }),
  }),
});

export const {
  useMyLeavesQuery,
  useLeaveBalanceQuery,
  useApplyLeaveMutation,
  useCancelLeaveMutation,
} = leaveApi;
