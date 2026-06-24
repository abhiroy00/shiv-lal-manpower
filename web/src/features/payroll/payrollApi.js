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
    // Salary structures
    getSalaryStructure: build.query({
      query: (employeeId) => ({ url: "/salary-structures/", params: { employee: employeeId } }),
      providesTags: (r, e, id) => [{ type: "SalaryStructure", id }],
    }),
    upsertSalaryStructure: build.mutation({
      queryFn: async (payload, _api, _extra, baseQuery) => {
        // Try GET first to check if a record exists, then POST or PATCH
        const check = await baseQuery({ url: "/salary-structures/", params: { employee: payload.employee } });
        const existing = check.data?.results?.[0] ?? check.data?.[0];
        if (existing) {
          return baseQuery({ url: `/salary-structures/${existing.id}/`, method: "PATCH", body: payload });
        }
        return baseQuery({ url: "/salary-structures/", method: "POST", body: payload });
      },
      invalidatesTags: (r, e, { employee }) => [{ type: "SalaryStructure", id: employee }],
    }),
  }),
});

export const {
  useGetPayrollRunsQuery,
  useRunPayrollMutation,
  useApprovePayrollRunMutation,
  useMarkPaidPayrollRunMutation,
  useGetPayslipsQuery,
  useGetSalaryStructureQuery,
  useUpsertSalaryStructureMutation,
} = payrollApi;
