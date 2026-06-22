import { baseApi } from "../../api/baseApi";

export const payrollApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPayrollRuns: build.query({ query: () => "/payroll-runs/", providesTags: ["Payroll"] }),
    runPayroll: build.mutation({
      query: (body) => ({ url: "/payroll-runs/run/", method: "POST", body }),
      invalidatesTags: ["Payroll", "Payslip"],
    }),
    getPayslips: build.query({
      query: (params) => ({ url: "/payslips/", params }),
      providesTags: ["Payslip"],
    }),
  }),
});

export const { useGetPayrollRunsQuery, useRunPayrollMutation, useGetPayslipsQuery } = payrollApi;
