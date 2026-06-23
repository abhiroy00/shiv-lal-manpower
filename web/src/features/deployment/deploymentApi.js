import { baseApi } from "../../api/baseApi";

export const deploymentApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
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
    getDistricts: build.query({
      query: () => ({ url: "/districts/", params: { page_size: 200 } }),
      providesTags: ["Deployment"],
    }),
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
  useGetSitesQuery,
  useGetSiteSummaryQuery,
  useGetSiteEmployeesQuery,
  useGetDistrictsQuery,
  useTransferEmployeeMutation,
  useBulkTransferMutation,
} = deploymentApi;
