import axios from 'axios';
const baseUrl = 'http://arpella-001.runasp.net';

export const loginUserApi = async (credentials) => {
  console.log(credentials)
  try {
    const response = await axios.post(
      `${baseUrl}/login`,
      {
        userName: credentials.phoneNumber, 
        passwordHash: credentials.passwordHash
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 200) {
      console.log('Login API Response:', response.data);
      const result = Array.isArray(response.data) ? response.data[0] : response.data;
      return result;
    }
    throw new Error('Unexpected server response');
  } catch (error) {
    if (error.response) {
      console.log(error.response)
      throw new Error(error.response.data || 'Login failed');
    }
    throw new Error(error.message || 'An unexpected error occurred.');
  }
};

export const registerUserApi = async (userData) => {
  if (!baseUrl) {
    console.error("Base URL is not defined.");
    return;
  }
  try {
    console.log("sending from api ", userData)
    const response = await axios.post(`${baseUrl}/register`, userData);
    console.log("Raw API Response:", response.data);

    const result = Array.isArray(response.data) ? response.data[0] : response.data;
    console.log("Processed Registration Response:", result);
    return result;
  } catch (error) {
    console.log('API Error:', error);

    console.log('API Error:', error);
    throw new Error(error.response?.data || 'Something went wrong');

  }
};
