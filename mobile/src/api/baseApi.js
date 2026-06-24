import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getTokens, saveTokens, clearTokens } from "../services/storage";
import { logout, setCredentials } from "../features/auth/authSlice";

// apna PC ka IP yahan dalo (ipconfig se dekho)
const API_URL = "http://10.126.247.43:8000/api";

// Simple mutex — async-mutex ki jagah (private fields problem avoid karta hai)
let isRefreshing = false;
let pendingQueue = [];

function processQueue(error, token = null) {
  pendingQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  pendingQueue = [];
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  prepareHeaders: async (headers, { getState }) => {
    const token = getState().auth.accessToken;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

const baseQueryWithReauth = async (args, api, extra) => {
  let result = await rawBaseQuery(args, api, extra);

  if (result.error?.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
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
          processQueue(null, refreshRes.data.access);
          result = await rawBaseQuery(args, api, extra);
        } else {
          processQueue(new Error("Refresh failed"));
          await clearTokens();
          api.dispatch(baseApi.util.resetApiState());
          api.dispatch(logout());
        }
      } catch (err) {
        processQueue(err);
        await clearTokens();
        api.dispatch(baseApi.util.resetApiState());
        api.dispatch(logout());
      } finally {
        isRefreshing = false;
      }
    } else {
      // Wait for ongoing refresh
      await new Promise((resolve, reject) =>
        pendingQueue.push({ resolve, reject })
      );
      result = await rawBaseQuery(args, api, extra);
    }
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery:   baseQueryWithReauth,
  tagTypes:    ["Attendance", "Payslip", "Leave", "User", "Profile", "Notification"],
  endpoints:   () => ({}),
});

export { API_URL };
