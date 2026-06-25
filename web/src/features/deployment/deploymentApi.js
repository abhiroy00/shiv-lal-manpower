import { baseApi } from "../../api/baseApi";

export const deploymentApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // ── States ────────────────────────────────────────────────
    getStates: build.query({
      query: () => ({ url: "/states/", params: { page_size: 200 } }),
      providesTags: ["State"],
    }),
    createState: build.mutation({
      query: (body) => ({ url: "/states/", method: "POST", body }),
      invalidatesTags: ["State"],
    }),

    // ── Districts ─────────────────────────────────────────────
    getDistricts: build.query({
      query: (stateId) => ({
        url: "/districts/",
        params: stateId ? { state: stateId, page_size: 200 } : { page_size: 200 },
      }),
      providesTags: ["District"],
    }),
    createDistrict: build.mutation({
      query: (body) => ({ url: "/districts/", method: "POST", body }),
      invalidatesTags: ["District"],
    }),

    // ── Sites ─────────────────────────────────────────────────
    getSites: build.query({
      query: (params) => ({ url: "/sites/", params: { page_size: 200, ...params } }),
      providesTags: ["Deployment"],
    }),
    getSiteSummary: build.query({
      query: () => "/sites/summary/",
      providesTags: ["Deployment"],
    }),
    getSiteEmployees: build.query({
      query: (siteId) => `/sites/${siteId}/employees/`,
      providesTags: ["Deployment", "Employee"],
    }),
    createSite: build.mutation({
      query: (body) => ({ url: "/sites/", method: "POST", body }),
      invalidatesTags: ["Deployment"],
    }),
    updateSite: build.mutation({
      query: ({ id, ...body }) => ({ url: `/sites/${id}/`, method: "PATCH", body }),
      invalidatesTags: ["Deployment"],
    }),

    // ── Transfers ─────────────────────────────────────────────
    transferEmployee: build.mutation({
      query: ({ employeeId, siteId }) => ({
        url: `/employees/${employeeId}/transfer/`,
        method: "POST",
        body: { site_id: siteId },
      }),
      invalidatesTags: ["Deployment", "Employee"],
    }),
    bulkTransfer: build.mutation({
      query: ({ employeeIds, siteId }) => ({
        url: "/employees/bulk-transfer/",
        method: "POST",
        body: { employee_ids: employeeIds, site_id: siteId },
      }),
      invalidatesTags: ["Deployment", "Employee"],
    }),
  }),
});

export const {
  useGetStatesQuery,
  useCreateStateMutation,
  useGetDistrictsQuery,
  useCreateDistrictMutation,
  useGetSitesQuery,
  useGetSiteSummaryQuery,
  useGetSiteEmployeesQuery,
  useCreateSiteMutation,
  useUpdateSiteMutation,
  useTransferEmployeeMutation,
  useBulkTransferMutation,
} = deploymentApi;
