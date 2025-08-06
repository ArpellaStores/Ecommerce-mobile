// services/Auth.js

import axios from 'axios';
import { Platform, BackHandler, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { baseUrl } from '@/constants/const';

// Debug the baseUrl to see if that's the issue
console.log('API Base URL:', baseUrl);

/**
 * Custom axios configuration with fallbacks for iOS
 */
const createApiClient = (customConfig = {}) => {
  return axios.create({
    baseURL: baseUrl,
    timeout: Platform.OS === 'ios' ? 60000 : 10000, // 60s timeout for iOS
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Accept': '*/*',
    },
    ...customConfig
  });
};

// Create a shared instance
const apiClient = createApiClient();

/**
 * Direct fetch implementation as backup when axios fails
 * Uses the native fetch API which might bypass issues with axios
 */
const fetchWithRetry = async (endpoint, data, retries = 3) => {
  const url = `${baseUrl}${endpoint}`;
  console.log('Attempting fetch to:', url);
  
  let lastError;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Fetch retry ${attempt} for ${endpoint}`);
        // Increasing delay between retries
        await new Promise(r => setTimeout(r, attempt * 2000));
      }
      
      const timestamp = Date.now();
      const fetchUrl = `${url}?_=${timestamp}`;
      
      const response = await fetch(fetchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Accept': '*/*',
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const responseData = await response.json();
      return Array.isArray(responseData) ? responseData[0] : responseData;
    } catch (err) {
      console.error(`Fetch attempt ${attempt + 1} failed:`, err);
      lastError = err;
    }
  }
  
  throw lastError || new Error('All fetch attempts failed');
};

// Add request interceptor for common configuration
apiClient.interceptors.request.use(async (config) => {
  // For iOS, ensure we have appropriate headers set
  if (Platform.OS === 'ios') {
    // Add headers that might help with iOS network issues
    config.headers = {
      ...config.headers,
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    };
    
    // Add random param to bust cache if needed
    const url = config.url;
    const separator = url.includes('?') ? '&' : '?';
    config.url = `${url}${separator}_=${Date.now()}`;
  }
  return config;
}, error => Promise.reject(error));

/**
 * loginUserApi - completely rewritten with multiple fallback mechanisms
 */
export const loginUserApi = async ({ phoneNumber, passwordHash }) => {
  // iOS needs extra startup time
  if (Platform.OS === 'ios') {
    await new Promise((r) => setTimeout(r, 2000)); // 2 seconds
    console.log('Starting login process after delay');
  }

  const payload = {
    userName: phoneNumber,
    passwordHash,
  };
  
  // First approach: Multiple axios instances with fresh configuration each time
  try {
    console.log('Login attempt using primary axios instance');
    // First try with shared client
    const response = await apiClient.post(
      `/login?timestamp=${Date.now()}`, 
      payload
    );
    
    return Array.isArray(response.data) ? response.data[0] : response.data;
  } catch (primaryError) {
    console.error('Primary login attempt failed:', primaryError);
    
    if (Platform.OS === 'ios') {
      // Short delay before retry
      await new Promise(r => setTimeout(r, 1000));
      
      try {
        console.log('Login retry with fresh axios instance');
        // Try with fresh instance and different parameters
        const freshClient = createApiClient({
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Accept': '*/*',
          }
        });
        
        const response = await freshClient.post(
          `/login?nocache=${Date.now()}`, 
          payload
        );
        return Array.isArray(response.data) ? response.data[0] : response.data;
      } catch (secondaryError) {
        console.error('Secondary login attempt failed:', secondaryError);
        
        // Last resort: native fetch API which may bypass axios issues
        try {
          console.log('Login final attempt using native fetch');
          return await fetchWithRetry('/login', payload);
        } catch (fetchError) {
          console.error('Fetch login attempt failed:', fetchError);
          throw new Error('Network error. All connection attempts failed.');
        }
      }
    } else {
      // For non-iOS, just throw the original error
      throw primaryError;
    }
  }
};

/**
 * registerUserApi - completely rewritten with multiple fallback mechanisms
 */
export const registerUserApi = async (userData) => {
  // iOS needs extra startup time
  if (Platform.OS === 'ios') {
    await new Promise((r) => setTimeout(r, 2000));
  }

  // First approach: Try with shared client
  try {
    console.log('Register attempt using primary axios instance');
    const response = await apiClient.post(
      `/register?timestamp=${Date.now()}`, 
      userData
    );
    return Array.isArray(response.data) ? response.data[0] : response.data;
  } catch (primaryError) {
    console.error('Primary register attempt failed:', primaryError);
    
    if (Platform.OS === 'ios') {
      // Short delay before retry
      await new Promise(r => setTimeout(r, 1000));
      
      try {
        console.log('Register retry with fresh axios instance');
        // Try with fresh instance
        const freshClient = createApiClient({
          timeout: 30000,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Accept': '*/*',
          }
        });
        
        const response = await freshClient.post(
          `/register?nocache=${Date.now()}`, 
          userData
        );
        return Array.isArray(response.data) ? response.data[0] : response.data;
      } catch (secondaryError) {
        console.error('Secondary register attempt failed:', secondaryError);
        
        // Last resort: native fetch
        try {
          console.log('Register final attempt using native fetch');
          return await fetchWithRetry('/register', userData);
        } catch (fetchError) {
          console.error('Fetch register attempt failed:', fetchError);
          throw new Error('Network error. All connection attempts failed.');
        }
      }
    } else {
      // For non-iOS, just throw the original error
      throw primaryError;
    }
  }
};

/**
 * SecureStore helpers for "Remember Me" functionality
 */

/**
 * saveCredentials
 * - Persists token, phone, password, and rememberMe flag
 */
export async function saveCredentials({ token, phone, pass }) {
  try {
    await SecureStore.setItemAsync('userToken', token);
    await SecureStore.setItemAsync('savedPhone', phone);
    await SecureStore.setItemAsync('savedPassword', pass);
    await SecureStore.setItemAsync('rememberMe', 'true');
  } catch (e) {
    console.error('saveCredentials error', e);
  }
}

/**
 * clearCredentials
 * - Deletes token, phone, password, and rememberMe flag
 */
export async function clearCredentials() {
  try {
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('savedPhone');
    await SecureStore.deleteItemAsync('savedPassword');
    await SecureStore.deleteItemAsync('rememberMe');
  } catch (e) {
    console.error('clearCredentials error', e);
  }
}

/**
 * loadCredentials
 * - Returns { phone, pass, rememberMe }
 */
export async function loadCredentials() {
  try {
    const [phone, pass, remember] = await Promise.all([
      SecureStore.getItemAsync('savedPhone'),
      SecureStore.getItemAsync('savedPassword'),
      SecureStore.getItemAsync('rememberMe'),
    ]);
    return {
      phone,
      pass,
      rememberMe: remember === 'true',
    };
  } catch (e) {
    console.error('loadCredentials error', e);
    return { phone: null, pass: null, rememberMe: false };
  }
}

/**
 * exitApp
 * - On Android calls exitApp(), on iOS shows an alert
 */
export function exitApp() {
  if (Platform.OS === 'android') {
    BackHandler.exitApp();
  } else {
    Alert.alert(
      'Exit App',
      'Please close the app manually.',
      [{ text: 'OK' }],
      { cancelable: false }
    );
  }
}

/**
 * checkNetworkConnection
 * - Simple placeholder as we can't use NetInfo
 * - Returns true since we don't have actual connection info
 */
export function checkNetworkConnection() {
  // Can't use NetInfo in this implementation
  // Always return true and let the API call handle failures
  return Promise.resolve(true);
}