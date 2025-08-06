// services/editUserData.js

import axios from 'axios';
import { baseUrl } from '../constants/const';

/**
 * editUserData
 * - Updates a single user field via PUT to /userdetails/:phoneNumber
 * - @param {string} phoneNumber  Unique identifier for user
 * - @param {string} field        Field name to update (e.g., 'firstName', 'email')
 * - @param {any}    newValue     New value for the specified field
 * - @returns {Promise<object>}   Updated user data from server
 * - @throws {Error}              If network or server error occurs
 */
export const editUserData = async (phoneNumber, field, newValue) => {
  try {
    const { data } = await axios.put(
      `${baseUrl}/userdetails/${phoneNumber}`,
      { field, value: newValue },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return data;
  } catch (error) {
    console.error(`editUserData error (${field}):`, error);
    // Normalize error message
    const msg = error.response?.data?.message || error.message || 'Failed to update user data';
    throw new Error(msg);
  }
};
