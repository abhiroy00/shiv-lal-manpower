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
    getAttendanceRegister: build.query({
      query: (params) => ({ url: "/attendance/register/", params }),
      providesTags: ["Attendance"],
    }),
    markAttendance: build.mutation({
      query: (body) => ({ url: "/attendance/mark/", method: "POST", body }),
      // Don't auto-invalidate — we use optimistic local state in the page
    }),
  }),
});

export const {
  useGetAttendanceQuery,
  useGetTodaySummaryQuery,
  useGetAttendanceRegisterQuery,
  useMarkAttendanceMutation,
} = attendanceApi;
