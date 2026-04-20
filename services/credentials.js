import * as SecureStore from "expo-secure-store";
import { Platform, BackHandler, Alert } from "react-native";

export async function saveCredentials({ token, phone, pass, rememberMe }) {
  try {
    if (token) await SecureStore.setItemAsync("userToken", token);
    if (phone) await SecureStore.setItemAsync("savedPhone", phone);
    await SecureStore.setItemAsync("rememberMe", rememberMe ? "true" : "false");
    if (rememberMe && pass) {
      await SecureStore.setItemAsync("savedPassword", pass);
    } else {
      await SecureStore.deleteItemAsync("savedPassword").catch(() => {});
    }
  } catch (e) {
    console.error("saveCredentials error", e);
  }
}

export async function clearCredentials() {
  try {
    await SecureStore.deleteItemAsync("userToken");
    await SecureStore.deleteItemAsync("savedPhone");
    await SecureStore.deleteItemAsync("savedPassword");
    await SecureStore.deleteItemAsync("rememberMe");
  } catch (e) {
    console.error("clearCredentials error", e);
  }
}

export async function loadCredentials() {
  try {
    const [phone, pass, remember] = await Promise.all([
      SecureStore.getItemAsync("savedPhone"),
      SecureStore.getItemAsync("savedPassword"),
      SecureStore.getItemAsync("rememberMe"),
    ]);
    return {
      phone,
      pass,
      rememberMe: remember === "true",
    };
  } catch (e) {
    console.error("loadCredentials error", e);
    return { phone: null, pass: null, rememberMe: false };
  }
}

export function exitApp() {
  if (Platform.OS === "android") {
    BackHandler.exitApp();
  } else {
    Alert.alert("Exit App", "Please close the app manually.", [{ text: "OK" }], {
      cancelable: false,
    });
  }
}
