import AsyncStorage from "@react-native-async-storage/async-storage";

export const saveTokens = async (access, refresh) => {
  await AsyncStorage.multiSet([
    ["access_token", access],
    ["refresh_token", refresh],
  ]);
};

export const getTokens = async () => {
  const [[, access], [, refresh]] = await AsyncStorage.multiGet([
    "access_token",
    "refresh_token",
  ]);
  return { access, refresh };
};

export const clearTokens = async () => {
  await AsyncStorage.multiRemove(["access_token", "refresh_token"]);
};
