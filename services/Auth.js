import axios from 'axios';
const baseUrl = process.env.REACT_APP_BASE_API_URL;




export const loginUserApi = async (credentials) => {
  try {
    const response = await axios.post(
      `${baseUrl}/login`,
      {
        userName: credentials.username, 
        PasswordHash: credentials.password,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 200) {
      console.log('response', response.data);
      return response.data;
    }
    throw new Error('Unexpected server response');
  } catch (error) {
    if (error.response) {
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
    const response = await axios.post(`${baseUrl}/register`, userData);
    return response.data;

  } catch (error) {
    console.error('API Error:', error); 
    throw new Error(error.response?.data?.message || 'Something went wrong');
  }
};
