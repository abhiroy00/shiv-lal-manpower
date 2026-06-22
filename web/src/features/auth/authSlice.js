import { createSlice } from "@reduxjs/toolkit";

const stored = (() => {
  try {
    return JSON.parse(localStorage.getItem("auth") || "{}");
  } catch {
    return {};
  }
})();

const initialState = {
  user: stored.user || null,
  accessToken: stored.accessToken || null,
  refreshToken: stored.refreshToken || null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, { payload }) => {
      if (payload.user !== undefined) state.user = payload.user;
      if (payload.accessToken !== undefined) state.accessToken = payload.accessToken;
      if (payload.refreshToken !== undefined) state.refreshToken = payload.refreshToken;
      localStorage.setItem("auth", JSON.stringify(state));
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      localStorage.removeItem("auth");
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
