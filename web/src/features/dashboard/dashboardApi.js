import { baseApi } from "../../api/baseApi";

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getKPIs: build.query({
      query: () => "/dashboard/kpis/",
      providesTags: ["Dashboard"],
    }),
  }),
});

export const { useGetKPIsQuery } = dashboardApi;
