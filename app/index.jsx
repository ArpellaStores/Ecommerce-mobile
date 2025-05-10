import React, { useEffect, useState } from 'react';
import { 
  View, Text, TextInput, Image, StyleSheet, TouchableOpacity, 
  TouchableWithoutFeedback, Keyboard, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Modal
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
  
  // Modal states
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [formData, setFormData] = useState(null);
  const [otpError, setOtpError] = useState('');

  // Hardcoded OTP for demo
  const DEMO_OTP = '12345';

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/Home');
    }
  }, [isAuthenticated]);

  const validatePassword = (value) => {
    const pattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&#^_+=<>?,./|~])[A-Za-z\d@$!%*?&#^_+=<>?,./|~]{8,}$/;
    return pattern.test(value) || 'Password must have at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character';
  };

  const onSubmit = async (data) => {
    // Store form data and show agreement modal
    setFormData(data);
    setShowAgreementModal(true);
  };

  const handleAgreementSubmit = () => {
    if (!agreementAccepted) {
      toast.show('Please accept the terms and conditions', { type: 'warning' });
      return;
    }
    
    // Close agreement modal and show OTP modal
    setShowAgreementModal(false);
    setShowOtpModal(true);
    
    // In a real app, you would trigger OTP sending here
    toast.show('OTP sent to your phone number', { type: 'info' });
  };

  const handleOtpSubmit = async () => {
    if (otp !== DEMO_OTP) {
      setOtpError('Invalid OTP. Please try again.');
      return;
    }
    
    setOtpError('');
    setShowOtpModal(false);
    
    // Now proceed with the actual registration
    const credentials = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email || null, // Make email optional
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

            {/* First Name */}
            <View style={styles.inputGroup}>
              <Text>First Name:</Text>
              <Controller
                control={control}
                name="firstName"
                rules={{ required: 'First Name is required' }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="First Name"
                    onChangeText={onChange}
                    value={value || ''}
                    editable={!showLoading}
                  />
                )}
              />
              {errors.firstName && <Text style={styles.errorText}>{errors.firstName.message}</Text>}
            </View>

            {/* Last Name */}
            <View style={styles.inputGroup}>
              <Text>Last Name:</Text>
              <Controller
                control={control}
                name="lastName"
                rules={{ required: 'Last Name is required' }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="Last Name"
                    onChangeText={onChange}
                    value={value || ''}
                    editable={!showLoading}
                  />
                )}
              />
              {errors.lastName && <Text style={styles.errorText}>{errors.lastName.message}</Text>}
            </View>

            {/* Email (Optional) */}
            <View style={styles.inputGroup}>
              <Text>Email (Optional):</Text>
              <Controller
                control={control}
                name="email"
                rules={{ 
                  required: false, // Make email optional
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address"
                  }
                }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="Email (Optional)"
                    keyboardType="email-address"
                    onChangeText={onChange}
                    value={value || ''}
                    editable={!showLoading}
                  />
                )}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text>Phone Number:</Text>
              <Controller
                control={control}
                name="phone"
                rules={{ required: 'Phone Number is required' }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number"
                    keyboardType="phone-pad"
                    onChangeText={onChange}
                    value={value || ''}
                    editable={!showLoading}
                  />
                )}
              />
              {errors.phone && <Text style={styles.errorText}>{errors.phone.message}</Text>}
            </View>

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

          {/* User Agreement Modal */}
          <Modal
            visible={showAgreementModal}
            transparent={true}
            animationType="slide"
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Terms and Conditions</Text>
                
                <ScrollView style={styles.agreementText}>
                  <Text>
                    By creating an account on our platform, you agree to our Terms of Service and Privacy Policy.
                    {'\n\n'}
                    1. You must be at least 18 years old to create an account.
                    {'\n\n'}
                    2. You agree to provide accurate and complete information during the registration process.
                    {'\n\n'}
                    3. You are responsible for maintaining the confidentiality of your account and password.
                    {'\n\n'}
                    4. You agree not to use the service for any illegal or unauthorized purpose.
                    {'\n\n'}
                    5. We reserve the right to terminate or suspend your account at any time without notice.
                    {'\n\n'}
                    6. Your personal data will be processed as described in our Privacy Policy.
                    {'\n\n'}
                    7. You agree to receive communications from us related to your account and the service.
                    {'\n\n'}
                    8. We may update these terms from time to time, and continued use of the service constitutes acceptance of any changes.
                  </Text>
                </ScrollView>
                
                <View style={styles.checkboxContainer}>
                  <TouchableOpacity 
                    style={styles.checkbox}
                    onPress={() => setAgreementAccepted(!agreementAccepted)}
                  >
                    {agreementAccepted && <FontAwesome name="check" size={16} color="#4B2C20" />}
                  </TouchableOpacity>
                  <Text style={styles.checkboxLabel}>
                    I have read and agree to the terms and conditions
                  </Text>
                </View>
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={styles.cancelButton} 
                    onPress={() => setShowAgreementModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.submitButton, !agreementAccepted && styles.disabledButton]} 
                    onPress={handleAgreementSubmit}
                    disabled={!agreementAccepted}
                  >
                    <Text style={styles.submitButtonText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* OTP Verification Modal */}
          <Modal
            visible={showOtpModal}
            transparent={true}
            animationType="slide"
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>OTP Verification</Text>
                <Text style={styles.otpDescription}>
                  Please enter the verification code sent to your phone number.
                </Text>
                
                <TextInput
                  style={styles.otpInput}
                  placeholder="Enter OTP"
                  keyboardType="numeric"
                  maxLength={5}
                  value={otp}
                  onChangeText={setOtp}
                />
                
                {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}
                
                <Text style={styles.demoNote}>
                  Note: For demo purposes, the OTP is {DEMO_OTP}
                </Text>
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={styles.cancelButton} 
                    onPress={() => {
                      setShowOtpModal(false);
                      setOtp('');
                      setOtpError('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.submitButton} 
                    onPress={handleOtpSubmit}
                  >
                    <Text style={styles.submitButtonText}>Verify</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
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
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    width: '85%',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#4B2C20',
  },
  agreementText: {
    maxHeight: 300,
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: '#4B2C20',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#ddd',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginRight: 5,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#4B2C20',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginLeft: 5,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
  },
  disabledButton: {
    backgroundColor: '#8D6E63',
    opacity: 0.7,
  },
  
  // OTP Modal styles
  otpDescription: {
    marginBottom: 15,
    textAlign: 'center',
  },
  otpInput: {
    height: 45,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#ffe',
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 5,
    marginBottom: 15,
  },
  demoNote: {
    color: '#666',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 15,
  },
});

export default Register;