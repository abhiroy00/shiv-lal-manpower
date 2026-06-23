import { baseApi } from "../../api/baseApi";

export const attendanceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    myToday: build.query({
      query: () => "/attendance/my-today/",
      providesTags: ["Attendance"],
    }),
    myAttendance: build.query({
      query: ({ year, month }) => `/attendance/my/?year=${year}&month=${month}`,
      providesTags: ["Attendance"],
    }),
    checkOut: build.mutation({
      query: () => ({ url: "/attendance/check-out/", method: "POST" }),
      invalidatesTags: ["Attendance"],
    }),
  }),
});

export const {
  useMyTodayQuery,
  useMyAttendanceQuery,
  useCheckOutMutation,
} = attendanceApi;
