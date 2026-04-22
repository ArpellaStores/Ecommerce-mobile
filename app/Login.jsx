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
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { useToast } from 'react-native-toast-notifications';
import logo from '../assets/images/logo.jpeg';
import { useLoginMutation } from '../redux/api/authApi';
import { setCredentials } from '../redux/slices/authSlice';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
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

  // ─── Log EVERY auth state change ────────────────────────────────────────────
  const authState = useSelector((s) => s.auth) || {};


  const { isAuthenticated } = authState;

  const { control, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: { phone: '254' },
  });

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const [manualLoginPressed, setManualLoginPressed] = useState(false);
  const [forgotPasswordModal, setForgotPasswordModal] = useState(false);

  const [loginApi] = useLoginMutation();

  // ─── Load saved credentials on mount ────────────────────────────────────────
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

  // ─── NAVIGATION EFFECT — log every time it fires ────────────────────────────
  useEffect(() => {
    if (isAuthenticated) {
      const delay = Platform.OS === 'ios' ? 300 : 0;
      setTimeout(() => {
        router.replace('/Home');
      }, delay);
    }
  }, [isAuthenticated, router]);

  // ─── Auto-login ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const performAutoLogin = async () => {
      if (autoLoginAttempted || isAuthenticated || manualLoginPressed) {
        return;
      }
      setAutoLoginAttempted(true);

      try {
        const { phone, pass, rememberMe: rem } = await loadCredentials();

        if (!rem || !phone || !pass) {
          return;
        }

        setIsProcessing(true);
        if (Platform.OS === 'ios') {
          await new Promise((r) => setTimeout(r, 1000));
        }

        const result = await loginApi({ userName: phone, passwordHash: pass }).unwrap();


        const userObject = Array.isArray(result) ? result[0] : result;
        const token = userObject?.token || userObject?.Token || '';
        const userData = {
          ...userObject?.user,
          firstName: userObject?.firstName || userObject?.user?.firstName,
          lastName: userObject?.lastName || userObject?.user?.lastName,
          role: userObject?.role || userObject?.user?.role,
          phone: phone,
        };


        if (token) {
          dispatch(setCredentials({ token, user: userData }));
          toast.show('Welcome back!', { type: 'success' });
        } else {
          console.warn('[AUTO-LOGIN] No token in response — aborting');
          toast.show('Auto-login failed. Please log in again.', { type: 'danger' });
          await clearCredentials();
          setRememberMe(false);
        }
      } catch (e) {
        if (e?.name === 'AbortError') return;
        console.error('[AUTO-LOGIN] Error:', e);
        toast.show(getErrorMessage(e), { type: 'danger' });
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
  }, [autoLoginAttempted, isAuthenticated, manualLoginPressed, dispatch, toast]);

  // ─── Error helper ────────────────────────────────────────────────────────────
  const getErrorMessage = (error) => {
    if (!error) return 'Login failed. Please try again.';

    let message =
      typeof error === 'string'
        ? error
        : error.message ||
          (typeof error.data === 'string' ? error.data : null) ||
          error.response?.data?.message ||
          'Login failed. Please try again.';

    if (message.includes('status code 400') || message.includes('status code 401')) {
      return 'Invalid phone number or password. Please check your credentials.';
    } else if (message.includes('status code 404')) {
      return 'Account not found. Please check your phone number or register.';
    } else if (message.includes('status code 500')) {
      return 'Server error. Please try again later.';
    } else if (message.includes('Network Error')) {
      return 'Network error. Please check your internet connection.';
    } else if (message.includes('timeout')) {
      return 'Connection timeout. Please try again.';
    }

    return message;
  };

  // ─── Password validator ──────────────────────────────────────────────────────
  const validatePassword = (value) => {
    if (!value) return 'Password required';
    const pattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
    return (
      pattern.test(value) ||
      'Password must include uppercase, lowercase, number, special char (e.g., .,@,#), and be ≥8 chars'
    );
  };

  // ─── Manual login ────────────────────────────────────────────────────────────
  const onSubmit = async (data) => {
    if (isProcessing) return;
    setManualLoginPressed(true);
    setIsProcessing(true);

    try {
      const result = await loginApi({
        userName: data.phone,
        passwordHash: data.password,
      }).unwrap();


      const userObject = Array.isArray(result) ? result[0] : result;
      const token = userObject?.token || userObject?.Token || '';
      const userData = {
        ...userObject?.user,
        firstName: userObject?.firstName || userObject?.user?.firstName,
        lastName: userObject?.lastName || userObject?.user?.lastName,
        role: userObject?.role || userObject?.user?.role,
        phone: data.phone,
      };


      if (token) {
        dispatch(setCredentials({ token, user: userData }));
        toast.show('Login successful!', { type: 'success' });

        saveCredentials({
          token: String(token),
          phone: String(data.phone),
          pass: rememberMe ? String(data.password) : null,
          rememberMe,
        }).catch((e) => console.error('[LOGIN] saveCredentials error:', e));
      } else {
        console.warn('[LOGIN] No token found in response — not dispatching');
        toast.show('Login failed. Invalid response from server.', { type: 'danger' });
      }
    } catch (e) {
      console.error('[LOGIN] onSubmit error:', e);
      toast.show(getErrorMessage(e), { type: 'danger' });
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── UI ──────────────────────────────────────────────────────────────────────
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Welcome Back to Arpella</Text>
        <Image source={logo} style={styles.logo} />
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>Login to Your Account</Text>

        {/* Phone */}
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
              // We always store the 254 prefix internally
              if (!cleaned.startsWith('254')) {
                cleaned = '254' + cleaned.replace(/^254/, '').replace(/^0+/, '');
              }
              // Limit to 12 digits (254 + 9 digits)
              if (cleaned.length > 12) {
                cleaned = cleaned.slice(0, 12);
              }
              onChange(cleaned);
            };

            return (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={[styles.phoneInputContainer, error && styles.inputError]}>
                  <View style={styles.phonePrefix}>
                    <Text style={styles.phonePrefixText}>254</Text>
                  </View>
                  <TextInput
                    style={styles.phoneInputBox}
                    placeholder="7XXXXXXXX"
                    keyboardType="numeric"
                    onBlur={onBlur}
                    onChangeText={handlePhoneChange}
                    value={(value || '254').replace(/^254/, '')}
                    maxLength={9}
                    editable={!isProcessing}
                  />
                </View>
                {error && <Text style={styles.errorText}>{error.message}</Text>}
              </View>
            );

          }}
        />

        {/* Password */}
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
                  editable={!isProcessing}
                />
                <TouchableOpacity
                  onPress={() => setPasswordVisible((v) => !v)}
                  style={styles.eyeIcon}
                  disabled={isProcessing}
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

        {/* Remember Me */}
        <TouchableOpacity
          style={styles.rememberMeContainer}
          onPress={() => setRememberMe((v) => !v)}
          disabled={isProcessing}
        >
          <FontAwesome
            name={rememberMe ? 'check-square' : 'square-o'}
            size={24}
            color={isProcessing ? '#ccc' : '#4B2C20'}
          />
          <Text style={[styles.rememberMeText, isProcessing && styles.disabledText]}>
            Remember Me
          </Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.button, isProcessing && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={styles.buttonText}>Logging in...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        {/* Forgot Password */}
        <TouchableOpacity
          style={[styles.forgotButton, isProcessing && styles.buttonDisabled]}
          onPress={() => setForgotPasswordModal(true)}
          disabled={isProcessing}
        >
          <Text style={styles.forgotButtonText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      {/* Loading Backdrop */}
      {isProcessing && (
        <View style={styles.backdrop}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4B2C20" />
            <Text style={styles.loadingText}>Logging you in...</Text>
          </View>
        </View>
      )}

      {/* Social / Register Buttons */}
      <View style={styles.socialButtons}>
        <TouchableOpacity
          onPress={() => router.replace('/')}
          style={styles.socialButton}
          disabled={isProcessing}
        >
          <FontAwesome name="user" size={20} color="#000" />
          <Text style={styles.socialButtonText}>Don't have an account? Register</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton} disabled={isProcessing}>
          <FontAwesome name="google" size={20} color="#db4437" />
          <Text style={styles.socialButtonText}>Login with Google</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton} disabled={isProcessing}>
          <FontAwesome name="facebook" size={20} color="#3b5998" />
          <Text style={styles.socialButtonText}>Login with Facebook</Text>
        </TouchableOpacity>
      </View>

      <ForgotPasswordModal
        visible={forgotPasswordModal}
        onClose={() => setForgotPasswordModal(false)}
      />
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
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
    height: 48,
  },
  phonePrefix: {
    backgroundColor: '#eee',
    paddingHorizontal: 12,
    height: '100%',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  phonePrefixText: {
    fontWeight: 'bold',
    color: '#4B2C20',
    fontSize: 16,
  },
  phoneInputBox: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#000',
  },
});


export default Login;