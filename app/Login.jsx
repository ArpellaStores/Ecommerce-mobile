// screens/Login.js

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
  const { isAuthenticated, isLoading, error: authError } = useSelector((s) => s.auth);

  const { control, handleSubmit, setValue, formState: { errors } } = useForm();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const [manualLoginPressed, setManualLoginPressed] = useState(false);

  /** Load saved credentials & remember flag on mount **/
  useEffect(() => {
    (async () => {
      try {
        const { phone, pass, rememberMe: rem } = await loadCredentials();
        if (rem && phone) {
          setValue('phone', phone);
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
          });
        } else {
          await clearCredentials();
        }
      } else {
        const msg =
          result.payload?.message ||
          result.error?.message ||
          authError ||
          'Login failed';
        toast.show(msg, { type: 'danger' });
      }
    } catch (e) {
      console.error('Login error:', e);
      toast.show(e.message || authError || 'Unexpected error', { type: 'danger' });
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

  /** Auto‑login effect: only if rememberMe flag is true **/
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
          toast.show('Auto‑login successful!', { type: 'success' });
        } else {
          const msg =
            result.payload?.message ||
            result.error?.message ||
            authError ||
            'Auto-login failed';
          toast.show(msg, { type: 'danger' });
        }
      } catch (e) {
        console.error('Auto-login error:', e);
        toast.show(e.message || authError || 'Auto-login error', { type: 'danger' });
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
    authError,
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
            pattern: { value: /^[0-9]{8,12}$/, message: '9–13 digits' },
          }}
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={[styles.input, error && styles.inputError]}
                placeholder="0712345678"
                keyboardType="numeric"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
              {error && <Text style={styles.errorText}>{error.message}</Text>}
            </View>
          )}
        />

        {/* Password */}
        <Controller
          control={control}
          name="password"
          rules={{ required: 'Password required' }}
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
                />
                <TouchableOpacity
                  onPress={() => setPasswordVisible((v) => !v)}
                  style={styles.eyeIcon}
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
        >
          <FontAwesome
            name={rememberMe ? 'check-square' : 'square-o'}
            size={24}
            color="#4B2C20"
          />
          <Text style={styles.rememberMeText}> Remember Me</Text>
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit(onSubmit)}
          disabled={isProcessing || isLoading}
        >
          <Text style={styles.buttonText}>
            {isProcessing || isLoading ? 'Processing...' : 'Login'}
          </Text>
        </TouchableOpacity>

        {/* Auth Error */}
        {authError ? <Text style={styles.authError}>{authError}</Text> : null}
      </View>

      {(isProcessing || isLoading) && (
        <View style={styles.backdrop}>
          <ActivityIndicator size="large" color="#4B2C20" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      {/* Social & Register */}
      <View style={styles.socialButtons}>
        <TouchableOpacity
          onPress={() => router.replace('/')}
          style={styles.socialButton}
        >
          <FontAwesome name="user" size={20} color="#000" />
          <Text> Don't have an account? Register</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton}>
          <FontAwesome name="google" size={20} color="#db4437" />
          <Text> Login with Google</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton}>
          <FontAwesome name="facebook" size={20} color="#3b5998" />
          <Text> Login with Facebook</Text>
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
  button: {
    backgroundColor: '#4B2C20',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  authError: {
    color: 'red',
    textAlign: 'center',
    marginTop: 8,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#ddd',
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
});

export default Login;
