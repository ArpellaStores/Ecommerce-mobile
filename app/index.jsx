import React, { useEffect, useState } from 'react';
import { 
  View, Text, TextInput, Image, StyleSheet, TouchableOpacity, 
  TouchableWithoutFeedback, Keyboard, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { registerUser } from '../redux/slices/authSlice';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { Colors } from '../constants/Colors';
import { useRouter } from 'expo-router';
import { useToast } from 'react-native-toast-notifications';

const Register = () => {
  const router = useRouter();
  const toast = useToast();

  const { control, handleSubmit, formState: { errors }, reset } = useForm();
  const dispatch = useDispatch();
  const { isAuthenticated, loading, user } = useSelector(state => state.auth);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Local loading state

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/Home');
    }
  }, [isAuthenticated]);

  const validatePassword = (value) => {
    const pattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&#^_+=<>?,./|~])[A-Za-z\d@$!%*?&#^_+=<>?,./|~]{8,}$/;
    return pattern.test(value) || 'Password must have at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character';
  };

  const onSubmit = async (formData) => {
    const credentials = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phoneNumber: formData.phone,
      passwordHash: formData.password,
    };

    console.log('Submitting registration data:', JSON.stringify(credentials, null, 2));
    
    setIsLoading(true);
    
    try {
      const result = await dispatch(registerUser(credentials)).unwrap();
      console.log('Registration successful:', result);
      toast.show('Registration successful!', { type: 'success' });
      reset();
    } catch (error) {
      console.error('Registration error:', error);
      toast.show(error.message || 'Registration failed. Please try again.', { type: 'danger' });
    } finally {
      setIsLoading(false);
      console.log(result)

    }
  };

  const handleNavigate = () => {
    router.push('/Login');
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  // Use combined loading state (local or redux)
  const showLoading = isLoading || loading;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.header}>Registration</Text>
          <View style={styles.logoContainer}>
            <Image source={require('../assets/images/logo.jpeg')} style={styles.logo} />
          </View>
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Create Your Account</Text>

            {['firstName', 'lastName', 'email', 'phone'].map((field, index) => (
              <View style={styles.inputGroup} key={index}>
                <Text>{field === 'phone' ? 'Phone Number' : field.replace(/([A-Z])/g, ' $1')}:</Text>
                <Controller
                  control={control}
                  name={field}
                  rules={{ required: `${field === 'phone' ? 'Phone Number' : field.replace(/([A-Z])/g, ' $1')} is required` }}
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      style={styles.input}
                      placeholder={field === 'phone' ? 'Phone Number' : field.replace(/([A-Z])/g, ' $1')}
                      keyboardType={field === 'email' ? 'email-address' : field === 'phone' ? 'phone-pad' : 'default'}
                      onChangeText={onChange}
                      value={value || ''}
                      editable={!showLoading}
                    />
                  )}
                />
                {errors[field] && <Text style={styles.errorText}>{errors[field].message}</Text>}
              </View>
            ))}

            <View style={styles.inputGroup}>
              <Text>Password:</Text>
              <View style={styles.passwordContainer}>
                <Controller
                  control={control}
                  name="password"
                  rules={{ required: "Password is required", validate: validatePassword }}
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Password"
                      secureTextEntry={!showPassword}
                      onChangeText={onChange}
                      value={value || ''}
                      editable={!showLoading}
                    />
                  )}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)} 
                  style={styles.eyeIcon}
                  disabled={showLoading}
                >
                  <FontAwesome name={showPassword ? "eye-slash" : "eye"} size={20} color="#666" />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
            </View>

            <TouchableOpacity
              style={[styles.button, showLoading && styles.loadingButton]}
              onPress={handleSubmit(onSubmit)}
              disabled={showLoading}
            >
              {showLoading ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.buttonText}>Registering...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Register</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.orText}>or</Text>

            <View style={styles.socialButtons}>
              <TouchableOpacity 
                onPress={handleNavigate} 
                style={styles.socialButton}
                disabled={showLoading}
              >
                <FontAwesome name="user" size={20} color={Colors.textPrimary} />
                <Text>Already have an account? Login</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.socialButton}
                disabled={showLoading}
              >
                <FontAwesome name="google" size={20} color={Colors.error} />
                <Text>Login with Google</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.socialButton}
                disabled={showLoading}
              >
                <FontAwesome name="facebook" size={20} color={Colors.info} />
                <Text>Login with Facebook</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Loading Overlay */}
          {showLoading && (
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4B2C20" />
                <Text style={styles.loadingText}>Creating account...</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, backgroundColor: '#FFF8E1' },
  header: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginVertical: 16 },
  logoContainer: { alignItems: 'center', marginBottom: 20 },
  logo: { width: 120, height: 120, resizeMode: 'contain' },
  formContainer: { marginTop: 20 },
  formTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  inputGroup: { marginBottom: 12 },
  input: { height: 40, borderColor: '#ccc', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, backgroundColor: '#ffe' },
  passwordInput: { flex: 1, height: 40, paddingHorizontal: 10, backgroundColor: '#ffe' },
  errorText: { color: 'red', fontSize: 12 },
  orText: { textAlign: 'center', marginVertical: 8 },
  socialButtons: { marginTop: 20 },
  socialButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ddd', padding: 10, marginBottom: 10, borderRadius: 8, justifyContent: 'center' },
  button: { backgroundColor: '#4B2C20', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  loadingButton: { backgroundColor: '#8D6E63' },  // Lighter brown when loading
  buttonText: { color: 'white', fontSize: 16, marginLeft: 8 },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderColor: '#ccc', borderWidth: 1, borderRadius: 8, backgroundColor: '#ffe' },
  eyeIcon: { padding: 10 },
  // Loading overlay styles
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4B2C20',
  },
});

export default Register;