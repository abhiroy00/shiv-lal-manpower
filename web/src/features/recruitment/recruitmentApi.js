import { baseApi } from "../../api/baseApi";

export const recruitmentApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCandidates: build.query({
      query: (params) => ({ url: "/candidates/", params: { page_size: 200, ...params } }),
      providesTags: ["Recruitment"],
    }),
    getCandidateStats: build.query({
      query: () => "/candidates/stats/",
      providesTags: ["Recruitment"],
    }),
    getRequisitions: build.query({
      query: () => ({ url: "/requisitions/", params: { page_size: 100 } }),
      providesTags: ["Recruitment"],
    }),
    createCandidate: build.mutation({
      query: (body) => ({ url: "/candidates/", method: "POST", body }),
      invalidatesTags: ["Recruitment"],
    }),
    updateCandidate: build.mutation({
      query: ({ id, ...body }) => ({ url: `/candidates/${id}/`, method: "PATCH", body }),
      invalidatesTags: ["Recruitment"],
    }),
    deleteCandidate: build.mutation({
      query: (id) => ({ url: `/candidates/${id}/`, method: "DELETE" }),
      invalidatesTags: ["Recruitment"],
    }),
    moveCandidate: build.mutation({
      query: ({ id, stage }) => ({ url: `/candidates/${id}/move/`, method: "POST", body: { stage } }),
      invalidatesTags: ["Recruitment"],
    }),
    createRequisition: build.mutation({
      query: (body) => ({ url: "/requisitions/", method: "POST", body }),
      invalidatesTags: ["Recruitment"],
    }),
  }),
});

export const {
  useGetCandidatesQuery,
  useGetCandidateStatsQuery,
  useGetRequisitionsQuery,
  useCreateCandidateMutation,
  useUpdateCandidateMutation,
  useDeleteCandidateMutation,
  useMoveCandidateMutation,
  useCreateRequisitionMutation,
} = recruitmentApi;
