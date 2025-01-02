import React, { useEffect } from 'react';
import { View, Text, TextInput, Button, Image, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { toast } from "react-native-toast-notifications"; 
import { registerUserApi } from '../services/Auth';
import { register as registerUser } from '../redux/slices/authSlice';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { Colors } from '../constants/Colors';
import { useRouter } from 'expo-router';

const Register = () => {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm();
  const dispatch = useDispatch();
  const { isAuthenticated, loading } = useSelector(state => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('./Home');
    }
  }, [isAuthenticated]);

  const validatePassword = (value) => {
    const pattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&#^_+=<>?,./|~])[A-Za-z\d@$!%*?&#^_+=<>?,./|~]{8,}$/;
    return pattern.test(value) || 'Password must have at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character';
  };

  const onSubmit = async (data) => {
    try {
      await registerUserApi({
        FirstName: data.FirstName,
        LastName: data.LastName,
        email: data.email,
        PasswordHash: data.passwordHash,
        PhoneNumber: data.phone,
      });
      dispatch(registerUser(data));
    } catch (error) {
      const errorMessage = error.message || "An error occurred";
      toast.error(errorMessage);
    }
  };

  const handleNavigate = () => {
    router.push('./Login');
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Registration</Text>
        <View style={styles.logoContainer}>
          <Image source={require('../assets/images/logo.jpeg')} style={styles.logo} />
        </View>
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Create Your Account</Text>
          
          <View style={styles.inputGroup}>
            <Text>First Name:</Text>
            <TextInput
              style={styles.input}
              placeholder="First Name"
              {...register('FirstName', { required: 'First Name is required' })}
            />
            {errors.FirstName && <Text style={styles.errorText}>{errors.FirstName.message}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text>Last Name:</Text>
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              {...register('LastName', { required: 'Last Name is required' })}
            />
            {errors.LastName && <Text style={styles.errorText}>{errors.LastName.message}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text>Email:</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              keyboardType="email-address"
              {...register('email', { required: 'Email is required' })}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text>Password:</Text>
            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry
              {...register('passwordHash', {
                required: 'Password is required',
                validate: validatePassword,
              })}
            />
            {errors.passwordHash && <Text style={styles.errorText}>{errors.passwordHash.message}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text>Phone Number:</Text>
            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              {...register('phone', { required: 'Phone Number is required' })}
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone.message}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.loadingButton]}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Registering...' : 'Register'}</Text>
          </TouchableOpacity>

          <Text style={styles.orText}>or</Text>

          <View style={styles.socialButtons}>
            <TouchableOpacity onPress={handleNavigate} style={styles.socialButton}>
              <FontAwesome name="user" size={20} color={Colors.textPrimary} />
              <Text>Already have an account? Login</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <FontAwesome name="google" size={20} color={Colors.error} />
              <Text>Login with Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <FontAwesome name="facebook" size={20} color={Colors.info} />
              <Text>Login with Facebook</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#FFF8E1'
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  formContainer: {
    marginTop: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 12,
  },
  input: {
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#ffe',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
  },
  orText: {
    textAlign: 'center',
    marginVertical: 8,
  },
  socialButtons: {
    marginTop: 20,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ddd',
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#4B2C20', // Dark brown shade
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  loadingButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
});

export default Register;
