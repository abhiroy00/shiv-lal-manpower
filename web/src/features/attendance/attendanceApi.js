import { baseApi } from "../../api/baseApi";

export const attendanceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAttendance: build.query({
      query: (params) => ({ url: "/attendance/", params }),
      providesTags: ["Attendance"],
    }),
    getTodaySummary: build.query({
      query: () => "/attendance/today-summary/",
      providesTags: ["Attendance"],
    }),
  }),
});

export const { useGetAttendanceQuery, useGetTodaySummaryQuery } = attendanceApi;
