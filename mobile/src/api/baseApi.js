import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Mutex } from "async-mutex";
import { getTokens, saveTokens, clearTokens } from "../services/storage";
import { logout, setCredentials } from "../features/auth/authSlice";

const API_URL = "http://10.0.2.2:8000/api";
const mutex = new Mutex();

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: async (headers, { getState }) => {
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
        const { refresh } = await getTokens();
        const refreshRes = await rawBaseQuery(
          { url: "/auth/token/refresh/", method: "POST", body: { refresh } },
          api,
          extra
        );
        if (refreshRes.data) {
          await saveTokens(refreshRes.data.access, refresh);
          api.dispatch(setCredentials({ accessToken: refreshRes.data.access }));
          result = await rawBaseQuery(args, api, extra);
        } else {
          await clearTokens();
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
  tagTypes: ["Attendance", "Payslip", "User"],
  endpoints: () => ({}),
});
