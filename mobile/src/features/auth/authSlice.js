import { createSlice } from "@reduxjs/toolkit";

const authSlice = createSlice({
  name: "auth",
  initialState: { user: null, accessToken: null, refreshToken: null },
  reducers: {
    setCredentials: (state, { payload }) => {
      if (payload.user !== undefined) state.user = payload.user;
      if (payload.accessToken !== undefined) state.accessToken = payload.accessToken;
      if (payload.refreshToken !== undefined) state.refreshToken = payload.refreshToken;
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
