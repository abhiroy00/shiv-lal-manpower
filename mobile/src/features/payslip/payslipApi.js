import { baseApi } from "../../api/baseApi";

export const payslipApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    myPayslips: build.query({
      query: () => "/my-payslips/",
      providesTags: ["Payslip"],
    }),
  }),
});

export const { useMyPayslipsQuery } = payslipApi;
