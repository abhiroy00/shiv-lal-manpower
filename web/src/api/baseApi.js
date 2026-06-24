import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Mutex } from "async-mutex";
import { setCredentials, logout } from "../features/auth/authSlice";

const mutex = new Mutex();

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || "/api",
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.accessToken;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

const baseQueryWithReauth = async (args, api, extra) => {
  await mutex.waitForUnlock();
  let result = await rawBaseQuery(args, api, extra);

  if (result.error?.status === 401) {
    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      try {
        const refresh = api.getState().auth.refreshToken;
        const refreshRes = await rawBaseQuery(
          { url: "/auth/token/refresh/", method: "POST", body: { refresh } },
          api,
          extra
        );
        if (refreshRes.data) {
          api.dispatch(setCredentials({ accessToken: refreshRes.data.access }));
          result = await rawBaseQuery(args, api, extra);
        } else {
          api.dispatch(logout());
        }
      } finally {
        release();
      }
    } else {
      await mutex.waitForUnlock();
      result = await rawBaseQuery(args, api, extra);
    }
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Employee", "Attendance", "Payroll", "Payslip", "SalaryStructure",
    "Compliance", "Recruitment", "Deployment", "Dashboard", "User", "Leave",
  ],
  endpoints: () => ({}),
});
