import { baseApi } from "../../api/baseApi";

export const leaveApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getLeaves: build.query({
      query: (params) => ({ url: "/leaves/", params }),
      providesTags: ["Leave"],
    }),
    approveLeave: build.mutation({
      query: ({ id, note }) => ({
        url: `/leaves/${id}/approve/`,
        method: "POST",
        body: { note: note || "" },
      }),
      invalidatesTags: ["Leave", "Dashboard"],
    }),
    rejectLeave: build.mutation({
      query: ({ id, note }) => ({
        url: `/leaves/${id}/reject/`,
        method: "POST",
        body: { note: note || "" },
      }),
      invalidatesTags: ["Leave", "Dashboard"],
    }),
    bulkApproveLeaves: build.mutation({
      query: () => ({
        url: "/leaves/approve-all/",
        method: "POST",
        body: {},
      }),
      invalidatesTags: ["Leave", "Dashboard"],
    }),
  }),
});

export const {
  useGetLeavesQuery,
  useApproveLeaveMutation,
  useRejectLeaveMutation,
  useBulkApproveLeaveMutation,
} = leaveApi;
