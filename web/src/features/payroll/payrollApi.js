import { baseApi } from "../../api/baseApi";

export const payrollApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPayrollRuns: build.query({
      query: () => "/payroll-runs/",
      providesTags: ["Payroll"],
    }),
    runPayroll: build.mutation({
      query: (body) => ({ url: "/payroll-runs/run/", method: "POST", body }),
      invalidatesTags: ["Payroll", "Payslip"],
    }),
    approvePayrollRun: build.mutation({
      query: (id) => ({ url: `/payroll-runs/${id}/approve/`, method: "POST" }),
      invalidatesTags: ["Payroll"],
    }),
    markPaidPayrollRun: build.mutation({
      query: (id) => ({ url: `/payroll-runs/${id}/mark-paid/`, method: "POST" }),
      invalidatesTags: ["Payroll"],
    }),
    getPayslips: build.query({
      query: (params) => ({ url: "/payslips/", params: { page_size: 500, ...params } }),
      providesTags: ["Payslip"],
    }),
  }),
});

export const {
  useGetPayrollRunsQuery,
  useRunPayrollMutation,
  useApprovePayrollRunMutation,
  useMarkPaidPayrollRunMutation,
  useGetPayslipsQuery,
} = payrollApi;
