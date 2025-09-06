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
import { loginUser } from '../redux/slices/authSlice';

// Import our shared SecureStore helpers
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

  // default phone set to 254 per requirement
  const { control, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: { phone: '254' },
  });

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const [manualLoginPressed, setManualLoginPressed] = useState(false);

  // Password validator: at least one uppercase, one lowercase, one digit, one special char, min 8 chars
  const validatePassword = (value) => {
    if (!value) return 'Password required';
    const pattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
    return pattern.test(value)
      || 'Password must include uppercase, lowercase, number, special char (e.g., .,@,#), and be ≥8 chars';
  };

  /** Load saved credentials & remember flag on mount **/
  useEffect(() => {
    (async () => {
      try {
        const { phone, pass, rememberMe: rem } = await loadCredentials();
        if (rem && phone) {
          // if a phone exists but doesn't start with 254, normalize it to start with 254
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

  /** Helper function to extract user-friendly error messages **/
  const getErrorMessage = (error) => {
    // Check for common login error patterns and return user-friendly messages
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

    // Clean up technical error messages for better user experience
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

  /** Manual login **/
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
          await saveCredentials({
            token: result.payload,
            phone: data.phone,
            pass: data.password,
            rememberMe,
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

  /** Redirect when authenticated **/
  useEffect(() => {
    if (isAuthenticated) {
      const delay = Platform.OS === 'ios' ? 300 : 0;
      setTimeout(() => router.replace('/Home'), delay);
    }
  }, [isAuthenticated, router]);

  /** Auto-login effect: only if rememberMe flag is true **/
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
          // Clear saved credentials if auto-login fails
          await clearCredentials();
          setRememberMe(false);
        }
      } catch (e) {
        console.error('Auto-login error:', e);
        const errorMessage = getErrorMessage(e);
        toast.show(errorMessage, { type: 'danger' });
        // Clear saved credentials if auto-login fails
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
              // enforce 254 + 9 digits
              value: /^254\d{9}$/,
              message: 'Phone must start with 254 followed by 9 digits (e.g., 254712345678)',
            },
          }}
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => {
            const handlePhoneChange = (text) => {
              // strip non-digits
              let cleaned = (text || '').replace(/\D/g, '');
              // ensure it starts with 254
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

        {/* Remember Me */}
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

        {/* Submit */}
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
      </View>

      {/* Loading Overlay */}
      {(isProcessing || isLoading) && (
        <View style={styles.backdrop}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4B2C20" />
            <Text style={styles.loadingText}>Logging you in...</Text>
          </View>
        </View>
      )}

      {/* Social & Register */}
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
});

// CRITICAL: Default export is required
export default Login;