// screens/Login.jsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { useToast } from 'react-native-toast-notifications';
import logo from '../assets/images/logo.jpeg';
import { loginUser } from '../redux/slices/authSlice';
import axios from 'axios';
import { baseUrl } from '../constants/const.js';

import {
  saveCredentials,
  loadCredentials,
  clearCredentials,
} from '../services/Auth';

const Login = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const toast = useToast();
  const { isAuthenticated, isLoading } = useSelector((s) => s.auth);

  const { control, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: { phone: '254' },
  });

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const [manualLoginPressed, setManualLoginPressed] = useState(false);

  const [forgotPasswordModal, setForgotPasswordModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotPhone, setForgotPhone] = useState('254');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const validatePassword = (value) => {
    if (!value) return 'Password required';
    const pattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
    return pattern.test(value)
      || 'Password must include uppercase, lowercase, number, special char (e.g., .,@,#), and be ≥8 chars';
  };

  useEffect(() => {
    (async () => {
      try {
        const { phone, pass, rememberMe: rem } = await loadCredentials();
        if (rem && phone) {
          const normalized = (phone || '').replace(/\D/g, '');
          if (normalized && !normalized.startsWith('254')) {
            setValue('phone', '254' + normalized.replace(/^0+/, ''));
          } else if (normalized) {
            setValue('phone', normalized);
          }
          setRememberMe(true);
        }
        if (rem && pass) {
          setValue('password', pass);
        }
      } catch (e) {
        console.error('Error loading credentials:', e);
      }
    })();
  }, [setValue]);

  const getErrorMessage = (error) => {
    if (!error) return 'Login failed. Please try again.';
    
    let message = '';
    
    if (typeof error === 'string') {
      message = error;
    } else if (error.message) {
      message = error.message;
    } else if (error.data && typeof error.data === 'string') {
      message = error.data;
    } else if (error.response?.data?.message) {
      message = error.response.data.message;
    } else {
      message = 'Login failed. Please try again.';
    }

    if (message.includes('Request failed with status code 400')) {
      return 'Invalid phone number or password. Please check your credentials.';
    } else if (message.includes('Request failed with status code 401')) {
      return 'Invalid phone number or password. Please check your credentials.';
    } else if (message.includes('Request failed with status code 404')) {
      return 'Account not found. Please check your phone number or register.';
    } else if (message.includes('Request failed with status code 500')) {
      return 'Server error. Please try again later.';
    } else if (message.includes('Network Error')) {
      return 'Network error. Please check your internet connection.';
    } else if (message.includes('timeout')) {
      return 'Connection timeout. Please try again.';
    }
    
    return message;
  };

  const onSubmit = async (data) => {
    if (isProcessing) return;
    setManualLoginPressed(true);
    setIsProcessing(true);
  
    try {
      const result = await dispatch(
        loginUser({ phoneNumber: data.phone, passwordHash: data.password })
      );
  
      if (loginUser.fulfilled.match(result)) {
        toast.show('Login successful!', { type: 'success' });
  
        if (rememberMe) {
          // Get the token from the result payload
          const token = result.payload?.token || '';
          
          await saveCredentials({
            token: String(token),
            phone: String(data.phone),
            pass: String(data.password),
          });
        } else {
          await clearCredentials();
        }
      } else {
        const errorMessage = getErrorMessage(result.payload || result.error);
        toast.show(errorMessage, { type: 'danger' });
      }
    } catch (e) {
      console.error('Login error:', e);
      const errorMessage = getErrorMessage(e);
      toast.show(errorMessage, { type: 'danger' });
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      const delay = Platform.OS === 'ios' ? 300 : 0;
      setTimeout(() => router.replace('/Home'), delay);
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const performAutoLogin = async () => {
      if (autoLoginAttempted || isAuthenticated || manualLoginPressed) return;
      setAutoLoginAttempted(true);

      try {
        const { phone, pass, rememberMe: rem } = await loadCredentials();
        if (!rem || !phone || !pass) return;

        setIsProcessing(true);
        if (Platform.OS === 'ios') {
          await new Promise((r) => setTimeout(r, 1000));
        }

        const result = await dispatch(
          loginUser({ phoneNumber: phone, passwordHash: pass })
        );

        if (loginUser.fulfilled.match(result)) {
          toast.show('Welcome back!', { type: 'success' });
        } else {
          const errorMessage = getErrorMessage(result.payload || result.error);
          toast.show(errorMessage, { type: 'danger' });
          await clearCredentials();
          setRememberMe(false);
        }
      } catch (e) {
        console.error('Auto-login error:', e);
        const errorMessage = getErrorMessage(e);
        toast.show(errorMessage, { type: 'danger' });
        await clearCredentials();
        setRememberMe(false);
      } finally {
        setIsProcessing(false);
      }
    };

    const timer = setTimeout(
      performAutoLogin,
      Platform.OS === 'ios' ? 1000 : 300
    );
    return () => clearTimeout(timer);
  }, [
    autoLoginAttempted,
    isAuthenticated,
    manualLoginPressed,
    dispatch,
    toast,
  ]);

  const openForgotPasswordModal = () => {
    setForgotPasswordModal(true);
    setForgotStep(1);
    setForgotPhone('254');
    setForgotOtp('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const closeForgotPasswordModal = () => {
    setForgotPasswordModal(false);
    setForgotStep(1);
    setForgotPhone('254');
    setForgotOtp('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSendOtp = async () => {
    const phonePattern = /^254\d{9}$/;
    if (!phonePattern.test(forgotPhone)) {
      toast.show('Please enter a valid phone number (254XXXXXXXXX)', { type: 'danger' });
      return;
    }

    setForgotLoading(true);
    try {
      const response = await axios.get(`${baseUrl}/send-otp?username=${forgotPhone}`, {
        timeout: 15000,
      });

      if (response.status === 200) {
        toast.show('OTP sent to your phone number', { type: 'success' });
        setForgotStep(2);
      } else {
        toast.show('Failed to send OTP. Please try again.', { type: 'danger' });
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to send OTP';
      toast.show(message, { type: 'danger' });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!forgotOtp || forgotOtp.length < 4) {
      toast.show('Please enter the OTP sent to your phone', { type: 'danger' });
      return;
    }

    setForgotLoading(true);
    try {
      const response = await axios.get(
        `${baseUrl}/send-otp?username=${forgotPhone}&otp=${forgotOtp}`,
        { timeout: 15000 }
      );

      if (response.status === 200) {
        toast.show('OTP verified successfully', { type: 'success' });
        setForgotStep(3);
      } else {
        toast.show('Invalid OTP. Please try again.', { type: 'danger' });
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Invalid OTP';
      toast.show(message, { type: 'danger' });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const passwordPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

    if (!passwordPattern.test(newPassword)) {
      toast.show(
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character (e.g., .,@,#)',
        { type: 'danger' }
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.show('Passwords do not match', { type: 'danger' });
      return;
    }

    setForgotLoading(true);
    try {
      const response = await axios.put(
        `${baseUrl}/user-details/${forgotPhone}`,
        { passwordHash: newPassword },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
        }
      );

      if (response.status === 200) {
        toast.show('Password reset successful! Please login with your new password.', {
          type: 'success',
        });
        closeForgotPasswordModal();
      } else {
        toast.show('Failed to reset password. Please try again.', { type: 'danger' });
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Failed to reset password';
      toast.show(message, { type: 'danger' });
    } finally {
      setForgotLoading(false);
    }
  };

  const normalizeForgotPhone = (text) => {
    let cleaned = (text || '').replace(/\D/g, '');
    if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned.replace(/^254/, '').replace(/^0+/, '');
    }
    if (cleaned.length > 12) cleaned = cleaned.slice(0, 12);
    return cleaned;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Welcome Back to Arpella</Text>
        <Image source={logo} style={styles.logo} />
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>Login to Your Account</Text>

        <Controller
          control={control}
          name="phone"
          rules={{
            required: 'Phone required',
            pattern: {
              value: /^254\d{9}$/,
              message: 'Phone must start with 254 followed by 9 digits (e.g., 254712345678)',
            },
          }}
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => {
            const handlePhoneChange = (text) => {
              let cleaned = (text || '').replace(/\D/g, '');
              if (!cleaned.startsWith('254')) {
                cleaned = '254' + cleaned.replace(/^254/, '').replace(/^0+/, '');
              }
              onChange(cleaned);
            };

            return (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={[styles.input, error && styles.inputError]}
                  placeholder="254712345678"
                  keyboardType="numeric"
                  onBlur={onBlur}
                  onChangeText={handlePhoneChange}
                  value={value || '254'}
                  maxLength={12}
                  editable={!isProcessing && !isLoading}
                />
                {error && <Text style={styles.errorText}>{error.message}</Text>}
              </View>
            );
          }}
        />

        <Controller
          control={control}
          name="password"
          rules={{ validate: validatePassword }}
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[styles.passwordContainer, error && styles.inputError]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••"
                  secureTextEntry={!passwordVisible}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  editable={!isProcessing && !isLoading}
                />
                <TouchableOpacity
                  onPress={() => setPasswordVisible((v) => !v)}
                  style={styles.eyeIcon}
                  disabled={isProcessing || isLoading}
                >
                  <FontAwesome
                    name={passwordVisible ? 'eye-slash' : 'eye'}
                    size={20}
                    color="#777"
                  />
                </TouchableOpacity>
              </View>
              {error && <Text style={styles.errorText}>{error.message}</Text>}
            </View>
          )}
        />

        <TouchableOpacity
          style={styles.rememberMeContainer}
          onPress={() => setRememberMe((v) => !v)}
          disabled={isProcessing || isLoading}
        >
          <FontAwesome
            name={rememberMe ? 'check-square' : 'square-o'}
            size={24}
            color={isProcessing || isLoading ? '#ccc' : '#4B2C20'}
          />
          <Text style={[styles.rememberMeText, (isProcessing || isLoading) && styles.disabledText]}>
            Remember Me
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, (isProcessing || isLoading) && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isProcessing || isLoading}
        >
          {(isProcessing || isLoading) ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={styles.buttonText}>Logging in...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.forgotButton, (isProcessing || isLoading) && styles.buttonDisabled]}
          onPress={openForgotPasswordModal}
          disabled={isProcessing || isLoading}
        >
          <Text style={styles.forgotButtonText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      {(isProcessing || isLoading) && (
        <View style={styles.backdrop}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4B2C20" />
            <Text style={styles.loadingText}>Logging you in...</Text>
          </View>
        </View>
      )}

      <View style={styles.socialButtons}>
        <TouchableOpacity
          onPress={() => router.replace('/')}
          style={styles.socialButton}
          disabled={isProcessing || isLoading}
        >
          <FontAwesome name="user" size={20} color="#000" />
          <Text style={styles.socialButtonText}>Don't have an account? Register</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.socialButton}
          disabled={isProcessing || isLoading}
        >
          <FontAwesome name="google" size={20} color="#db4437" />
          <Text style={styles.socialButtonText}>Login with Google</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.socialButton}
          disabled={isProcessing || isLoading}
        >
          <FontAwesome name="facebook" size={20} color="#3b5998" />
          <Text style={styles.socialButtonText}>Login with Facebook</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={forgotPasswordModal}
        animationType="slide"
        transparent
        onRequestClose={closeForgotPasswordModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={closeForgotPasswordModal}>
              <FontAwesome name="close" size={24} color="#333" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Forgot Password</Text>

            {forgotStep === 1 && (
              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>Enter your phone number</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="254712345678"
                  keyboardType="numeric"
                  value={forgotPhone}
                  onChangeText={(text) => setForgotPhone(normalizeForgotPhone(text))}
                  maxLength={12}
                  editable={!forgotLoading}
                />
                <TouchableOpacity
                  style={[styles.modalButton, forgotLoading && styles.buttonDisabled]}
                  onPress={handleSendOtp}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.modalButtonText}>Send OTP</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {forgotStep === 2 && (
              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>Enter the OTP sent to {forgotPhone}</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter OTP"
                  keyboardType="numeric"
                  value={forgotOtp}
                  onChangeText={setForgotOtp}
                  maxLength={6}
                  editable={!forgotLoading}
                />
                <TouchableOpacity
                  style={[styles.modalButton, forgotLoading && styles.buttonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.modalButtonText}>Verify OTP</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {forgotStep === 3 && (
              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalLabel}>Enter new password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="New Password"
                    secureTextEntry={!newPasswordVisible}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    editable={!forgotLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setNewPasswordVisible((v) => !v)}
                    style={styles.eyeIcon}
                    disabled={forgotLoading}
                  >
                    <FontAwesome
                      name={newPasswordVisible ? 'eye-slash' : 'eye'}
                      size={20}
                      color="#777"
                    />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.modalLabel, { marginTop: 15 }]}>Confirm new password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm Password"
                    secureTextEntry={!confirmPasswordVisible}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!forgotLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setConfirmPasswordVisible((v) => !v)}
                    style={styles.eyeIcon}
                    disabled={forgotLoading}
                  >
                    <FontAwesome
                      name={confirmPasswordVisible ? 'eye-slash' : 'eye'}
                      size={20}
                      color="#777"
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.passwordRequirement}>
                  Password must be at least 8 characters with uppercase, lowercase, number, and special character (e.g., .,@,#)
                </Text>

                <TouchableOpacity
                  style={[styles.modalButton, forgotLoading && styles.buttonDisabled]}
                  onPress={handleResetPassword}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.modalButtonText}>Reset Password</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#FFF8E1',
  },
  headerContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4B2C20',
    marginBottom: 12,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#4B2C20',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4B2C20',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    marginBottom: 6,
    fontSize: 15,
    fontWeight: '500',
    color: '#4B2C20',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fafafa',
    fontSize: 16,
  },
  inputError: {
    borderColor: 'red',
    borderWidth: 1.5,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    height: 48,
  },
  passwordInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 12,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  rememberMeText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#4B2C20',
  },
  disabledText: {
    color: '#ccc',
  },
  button: {
    backgroundColor: '#4B2C20',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#8D6E63',
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  forgotButton: {
    backgroundColor: '#4B2C20',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  forgotButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4B2C20',
  },
  socialButtons: {
    marginTop: 20,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  socialButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    color: 'red',
    marginTop: 6,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 20,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 5,
    zIndex: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4B2C20',
    marginBottom: 20,
    textAlign: 'center',
    marginTop: 10,
  },
  modalBody: {
    width: '100%',
  },
  modalLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4B2C20',
    marginBottom: 8,
  },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#4B2C20',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  passwordRequirement: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 18,
  },
});

export default Login;