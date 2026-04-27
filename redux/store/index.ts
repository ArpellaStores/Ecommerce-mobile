import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
} from "redux-persist";
import AsyncStorage from "@react-native-async-storage/async-storage";
import authReducer from "../slices/authSlice";
import cartReducer from "../slices/cartSlice";
import productsReducer from "../slices/productsSlice";
import { api } from "../api";

const authPersistConfig = {
  key: "authState",
  storage: AsyncStorage,
  whitelist: ["token", "user", "isAuthenticated"],
};

const productsPersistConfig = {
  key: "productsState",
  storage: AsyncStorage,
  whitelist: ["products", "categories", "subcategories", "productsById"],
};

const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  cart: cartReducer,
  products: persistReducer(productsPersistConfig, productsReducer),
  [api.reducerPath]: api.reducer,
});

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      immutableStateInvariant: false,
    }).concat(api.middleware),
});

export const persistor = persistStore(store);
export default store;
