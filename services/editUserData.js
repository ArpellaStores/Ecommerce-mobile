import axios from "axios";
import {baseUrl} from "../constants/const"

export const editUserData = async ( phoneNumber , field, newValue) => {
    console.log(field,newValue)
  try {
    const response = await axios.put(`${baseUrl}/userdetails/${phoneNumber}`, { field, value: newValue });
    return response.data;  
  } catch (error) {
    console.error('Error updating user data:', error);
    throw error;
  }
};
