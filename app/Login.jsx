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
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useToast } from 'react-native-toast-notifications';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import logo from '../assets/images/logo.jpeg';
import { loginUser } from '../redux/slices/authSlice';
import { useDispatch, useSelector } from 'react-redux';

const Login = () => {
  const router = useRouter();
  const toast = useToast();
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading } = useSelector((state) => state.auth);

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const [manualLoginPressed, setManualLoginPressed] = useState(false);

  const { control, handleSubmit, setValue } = useForm();

  const saveCredentials = async (token, phone, password) => {
    try {
      await SecureStore.setItemAsync('userToken', JSON.stringify(token));
      await SecureStore.setItemAsync('savedPhone', phone);
      await SecureStore.setItemAsync('savedPassword', password);
      console.log("🔐 Credentials saved to SecureStore.");
    } catch (error) {
      console.error("❌ Error saving credentials:", error);
    }
  };

  const clearCredentials = async () => {
    try {
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('savedPhone');
      await SecureStore.deleteItemAsync('savedPassword');
      console.log("🧹 Credentials cleared from SecureStore.");
    } catch (error) {
      console.error("❌ Error clearing credentials:", error);
    }
  };

  const onSubmit = async (data) => {
    if (isProcessing) return;
    
    setManualLoginPressed(true);
    setIsProcessing(true);

    const credentials = {
      phoneNumber: data.phone,
      passwordHash: data.password,
    };

    try {
      const result = await dispatch(loginUser(credentials));
      console.log("🧾 Login result:", result);

      if (result && result.payload) {
        if (rememberMe) {
          await saveCredentials(result.payload, data.phone, data.password);
        } else {
          await clearCredentials();
        }
      } else {
        toast.show("Login failed. Please check your credentials.", { type: "danger" });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.show("An error occurred during login.", { type: "danger" });
    } finally {
      setIsProcessing(false);
    }
  };

  // Auth redirect - with platform-specific handling
  useEffect(() => {
    if (isAuthenticated) {
      console.log("✅ Authenticated. Navigating to /Home...");
      
      // Small delay for iOS to ensure state is properly updated
      const navDelay = Platform.OS === 'ios' ? 300 : 0;
      
      setTimeout(() => {
        router.replace('/Home');
      }, navDelay);
    }
  }, [isAuthenticated, router]);

  // Load stored credentials to form
  useEffect(() => {
    const loadStoredCredentials = async () => {
      try {
        const savedPhone = await SecureStore.getItemAsync('savedPhone');
        const savedPassword = await SecureStore.getItemAsync('savedPassword');
        
        if (savedPhone) {
          setValue('phone', savedPhone);
          setRememberMe(true);
        }
        
        if (savedPassword) {
          setValue('password', savedPassword);
        }
      } catch (error) {
        console.error("Error loading stored credentials:", error);
      }
    };
    
    loadStoredCredentials();
  }, [setValue]);

  // Auto login - with improved iOS handling
  useEffect(() => {
    const performAutoLogin = async () => {
      if (autoLoginAttempted || isAuthenticated || manualLoginPressed) {
        return;
      }
      
      setAutoLoginAttempted(true);
      console.log(`🔍 Running auto-login on ${Platform.OS}...`);

      try {
        const savedPhone = await SecureStore.getItemAsync('savedPhone');
        const savedPassword = await SecureStore.getItemAsync('savedPassword');

        console.log("📱 savedPhone:", savedPhone ? "Found" : "Not found");
        console.log("🔑 savedPassword:", savedPassword ? "Found" : "Not found");

        if (savedPhone && savedPassword) {
          console.log("🚀 Starting auto-login process...");
          setIsProcessing(true);

          // For iOS, we need a longer initialization delay
          if (Platform.OS === 'ios') {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          const credentials = {
            phoneNumber: savedPhone,
            passwordHash: savedPassword,
          };

          console.log(credentials);
          const result = await dispatch(loginUser(credentials));
          
          if (result.error) {
            console.warn("❌ Auto-login failed:", result.error);
            
            // On iOS, try one more time after a longer delay
            if (Platform.OS === 'ios') {
              setTimeout(async () => {
                console.log("🔄 iOS: Final auto-login retry...");
                try {
                  await dispatch(loginUser(credentials));
                } catch (err) {
                  console.error("Final retry error:", err);
                } finally {
                  setIsProcessing(false);
                }
              }, 2000);
            } else {
              setIsProcessing(false);
            }
          } else {
            console.log("✅ Auto-login succeeded");
            setIsProcessing(false);
          }
        } else {
          console.log("ℹ️ No stored credentials for auto-login");
        }
      } catch (err) {
        console.error("⚠️ Error during auto-login:", err);
        setIsProcessing(false);
      }
    };

    // Delay auto-login slightly to ensure app is fully initialized
    const timer = setTimeout(() => {
      performAutoLogin();
    }, Platform.OS === 'ios' ? 1000 : 300);

    return () => clearTimeout(timer);
  }, [dispatch, isAuthenticated, autoLoginAttempted, manualLoginPressed]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Welcome Back to Arpella</Text>
      <View style={styles.logoContainer}>
        <Image source={logo} style={styles.logo} />
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>Login to Your Account</Text>

        <View style={styles.inputGroup}>
          <Text>Phone Number:</Text>
          <Controller
            control={control}
            name="phone"
            rules={{
              required: 'Phone number is required',
              pattern: {
                value: /^[0-9]{8,12}$/,
                message: 'Phone number must be 9 to 13 digits',
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                keyboardType="numeric"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text>Password:</Text>
          <View style={styles.passwordContainer}>
            <Controller
              control={control}
              name="password"
              rules={{ required: 'Password is required' }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  secureTextEntry={!passwordVisible}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
            <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)} style={styles.eyeIcon}>
              <FontAwesome name={passwordVisible ? "eye" : "eye-slash"} size={20} color="#777" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.rememberMeContainer}
          onPress={() => setRememberMe(!rememberMe)}
        >
          <FontAwesome name={rememberMe ? "check-square" : "square-o"} size={24} color="#4B2C20" />
          <Text style={styles.rememberMeText}> Remember Me</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit(onSubmit)}
          disabled={isProcessing || isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading || isProcessing ? "Processing..." : "Login"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.orText}>or</Text>

        <View style={styles.socialButtons}>
          <TouchableOpacity onPress={() => router.back('./index')} style={styles.socialButton}>
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
      </View>

      {(isProcessing || isLoading) && (
        <View style={styles.backdrop}>
          <View style={styles.spinnerContainer}>
            <FontAwesome name="spinner" size={48} color="#4B2C20" style={styles.spinner} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#FFF8E1',
    position: 'relative',
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
    flex: 1,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: 'white',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'white',
  },
  eyeIcon: {
    padding: 10,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rememberMeText: {
    fontSize: 16,
    marginLeft: 8,
    color: '#4B2C20',
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
    backgroundColor: '#4B2C20',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  spinnerContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    flexDirection: 'column',
    alignItems: 'center',
  },
  spinner: {
    ...(Platform.OS === 'ios' ? { transform: [{ scale: 1.2 }] } : {}),
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4B2C20',
  },
});

export default Login;