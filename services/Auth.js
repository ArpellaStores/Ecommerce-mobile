import axios from 'axios';
import { Platform } from 'react-native';
import { baseUrl } from '@/constants/const';

// Create a custom axios instance with better timeout handling
const apiClient = axios.create({
  baseURL: baseUrl,
  timeout: Platform.OS === 'ios' ? 15000 : 10000, // Longer timeout for iOS
  headers: {
    'Content-Type': 'application/json',
  }
});

export const loginUserApi = async (credentials) => {
  console.log(credentials);
  try {
    // For iOS, add a small delay to ensure network connection is fully established
    if (Platform.OS === 'ios') {
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    const response = await apiClient.post(
      '/login',
      {
        userName: credentials.phoneNumber, 
        passwordHash: credentials.passwordHash,
      }
    );

    if (response.status === 200) {
      console.log('Login API Response:', response.data);
      const result = Array.isArray(response.data) ? response.data[0] : response.data;
      return result;
    }
    throw new Error('Unexpected server response');
  } catch (error) {
    console.error('Login API Error Details:', error);
    
    // Check for network errors (common on iOS)
    if (!error.response) {
      if (Platform.OS === 'ios') {
        // For iOS, we'll try one more time after a delay
        try {
          console.log('iOS: Retrying login after network error...');
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          const retryResponse = await apiClient.post(
            '/login',
            {
              userName: credentials.phoneNumber, 
              passwordHash: credentials.passwordHash,
            }
          );
          
          if (retryResponse.status === 200) {
            console.log('Retry Login Response:', retryResponse.data);
            const retryResult = Array.isArray(retryResponse.data) ? retryResponse.data[0] : retryResponse.data;
            return retryResult;
          }
        } catch (retryError) {
          console.error('iOS retry failed:', retryError);
        }
      }
      
      throw new Error('Network Error. Please check your connection.');
    }
    
    if (error.response) {
      console.log(error.response);
      throw new Error(error.response.data || 'Login failed');
    }
    throw new Error(error.message || 'An unexpected error occurred.');
  }
};

export const registerUserApi = async (userData) => {
  try {
    // For iOS, add a small delay to ensure network connection is fully established
    if (Platform.OS === 'ios') {
      await new Promise(resolve => setTimeout(resolve, 800));
    }
    
    console.log("sending from api ", userData);
    const response = await apiClient.post('/register', userData);
    console.log("Raw API Response:", response.data);

    const result = Array.isArray(response.data) ? response.data[0] : response.data;
    console.log("Processed Registration Response:", result);
    return result;
  } catch (error) {
    console.log('API Error:', error);
    throw new Error(error.response || 'Something went wrong');
  }
};