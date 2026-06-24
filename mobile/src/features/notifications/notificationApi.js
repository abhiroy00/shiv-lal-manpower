import { baseApi } from "../../api/baseApi";

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query({
      query: () => "/notifications/",
      providesTags: ["Notification"],
    }),
    markRead: build.mutation({
      query: (id) => ({ url: `/notifications/${id}/read/`, method: "POST" }),
      invalidatesTags: ["Notification"],
    }),
    markAllRead: build.mutation({
      query: () => ({ url: "/notifications/read-all/", method: "POST" }),
      invalidatesTags: ["Notification"],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
} = notificationApi;
