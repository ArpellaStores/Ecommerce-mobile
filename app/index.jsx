// screens/Register.js

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Linking,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { registerUser } from '../redux/slices/authSlice';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { Colors } from '../constants/Colors';
import { Link, useRouter } from 'expo-router';
import { useToast } from 'react-native-toast-notifications';

/**
 * User Registration Screen
 * - Collects user details with form validation
 * - Presents Terms & Conditions agreement
 * - Performs OTP verification (demo)
 * - Submits registration upon successful verification
 */
const index = () => {
  const router = useRouter();
  const toast = useToast();
  const dispatch = useDispatch();
  const { isAuthenticated, loading: reduxLoading } = useSelector((s) => s.auth);

  const { control, handleSubmit, formState: { errors }, reset } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);

  const [agreementModalVisible, setAgreementModalVisible] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [otpError, setOtpError] = useState('');

  const [savedFormData, setSavedFormData] = useState(null);
  const DEMO_OTP = '12345';

  // Redirect to Home on successful auth
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/Home');
    }
  }, [isAuthenticated, router]);

  // Password strength validator
  const validatePassword = (value) => {
    const pattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&#^_+=<>?,./|~]).{8,}$/;
    return pattern.test(value)
      || 'Password must include uppercase, lowercase, number, special char, and be ≥8 chars';
  };

  // Initial form submission triggers agreement modal
  const onFormSubmit = (data) => {
    setSavedFormData(data);
    setAgreementModalVisible(true);
  };

  // Handle terms acceptance and move to OTP step
  const onAgreementSubmit = () => {
    if (!agreementAccepted) {
      toast.show('Please accept the terms and conditions', { type: 'warning' });
      return;
    }
    setAgreementModalVisible(false);
    setOtpModalVisible(true);
    toast.show('OTP sent to your phone number', { type: 'info' });
  };

  // Handle OTP verification and final registration
  const onOtpSubmit = async () => {
    if (otpValue !== DEMO_OTP) {
      setOtpError('Invalid OTP. Please try again.');
      return;
    }
    setOtpError('');
    setOtpModalVisible(false);

    setLocalLoading(true);
    const credentials = {
      firstName: savedFormData.firstName,
      lastName: savedFormData.lastName,
      email: savedFormData.email || null,
      phoneNumber: savedFormData.phone,
      passwordHash: savedFormData.password,
    };

    try {
      await dispatch(registerUser(credentials)).unwrap();
      toast.show('Registration successful!', { type: 'success' });
      reset();
      router.replace('/Login');
    } catch (err) {
      toast.show(err.message || 'Registration failed. Please try again.', { type: 'danger' });
    } finally {
      setLocalLoading(false);
    }
  };

  const combinedLoading = reduxLoading || localLoading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.header}>Registration</Text>
          <View style={styles.logoWrapper}>
            <Image source={require('../assets/images/logo.jpeg')} style={styles.logo} />
          </View>

          {/* Registration Form */}
          <View style={styles.form}>
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
                    value={value || ''}
                    onChangeText={onChange}
                    editable={!combinedLoading}
                  />
                )}
              />
              {errors.firstName && <Text style={styles.error}>{errors.firstName.message}</Text>}
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
                    value={value || ''}
                    onChangeText={onChange}
                    editable={!combinedLoading}
                  />
                )}
              />
              {errors.lastName && <Text style={styles.error}>{errors.lastName.message}</Text>}
            </View>

            {/* Email (Optional) */}
            <View style={styles.inputGroup}>
              <Text>Email (Optional):</Text>
              <Controller
                control={control}
                name="email"
                rules={{
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address',
                  },
                }}
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    style={styles.input}
                    placeholder="Email (Optional)"
                    keyboardType="email-address"
                    value={value || ''}
                    onChangeText={onChange}
                    editable={!combinedLoading}
                  />
                )}
              />
              {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}
            </View>

            {/* Phone Number */}
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
                    value={value || ''}
                    onChangeText={onChange}
                    editable={!combinedLoading}
                  />
                )}
              />
              {errors.phone && <Text style={styles.error}>{errors.phone.message}</Text>}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text>Password:</Text>
              <View style={styles.passwordRow}>
                <Controller
                  control={control}
                  name="password"
                  rules={{ required: 'Password is required', validate: validatePassword }}
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Password"
                      secureTextEntry={!showPassword}
                      value={value || ''}
                      onChangeText={onChange}
                      editable={!combinedLoading}
                    />
                  )}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  disabled={combinedLoading}
                  style={styles.eyeButton}
                >
                  <FontAwesome
                    name={showPassword ? 'eye-slash' : 'eye'}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.button, combinedLoading && styles.buttonDisabled]}
              onPress={handleSubmit(onFormSubmit)}
              disabled={combinedLoading}
            >
              {combinedLoading ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator size="small" color="#FFF" />
                  <Text style={styles.buttonText}>Registering...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Register</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.orText}>or</Text>

            {/* Alternate Actions */}
            <View style={styles.socialWrapper}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => router.push('/Login')}
                disabled={combinedLoading}
              >
                <FontAwesome name="user" size={20} color={Colors.textPrimary} />
                <Text>Already have an account? Login</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton} disabled={combinedLoading}>
                <FontAwesome name="google" size={20} color={Colors.error} />
                <Text>Login with Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton} disabled={combinedLoading}>
                <FontAwesome name="facebook" size={20} color={Colors.info} />
                <Text>Login with Facebook</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Loading Overlay */}
          {combinedLoading && (
            <View style={styles.overlay}>
              <View style={styles.loader}>
                <ActivityIndicator size="large" color="#4B2C20" />
                <Text style={styles.loadingText}>Creating account...</Text>
              </View>
            </View>
          )}

          {/* Terms & Conditions Modal */}
          <Modal visible={agreementModalVisible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalHeader}>Terms and Conditions</Text>
                  <ScrollView style={styles.termsText}>
                    <Text>
                      By creating an account, you agree to our Terms of Service and Privacy Policy...
                    </Text>

                    <TouchableOpacity
                      style={styles.linkButton}
                      onPress={() => Linking.openURL('https://www.arpellastores.com/terms-and-conditions')}
                    >
                      <Text style={styles.linkText}>
                        https://www.arpellastores.com/terms-and-conditions
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.linkButton}
                      onPress={() => Linking.openURL('https://www.arpellastores.com/privacy-policy')}
                    >
                      <Text style={styles.linkText}>
                        https://www.arpellastores.com/privacy-policy
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>

                <View style={styles.checkboxRow}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setAgreementAccepted((v) => !v)}
                  >
                    {agreementAccepted && (
                      <FontAwesome name="check" size={16} color="#4B2C20" />
                    )}
                  </TouchableOpacity>
                  <Text style={styles.checkboxLabel}>
                    I agree to the terms and conditions
                  </Text>
                </View>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setAgreementModalVisible(false)}
                  >
                    <Text>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      !agreementAccepted && styles.buttonDisabled,
                    ]}
                    onPress={onAgreementSubmit}
                    disabled={!agreementAccepted}
                  >
                    <Text style={styles.submitText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* OTP Verification Modal */}
          <Modal visible={otpModalVisible} transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalBox}>
                <Text style={styles.modalHeader}>OTP Verification</Text>
                <Text style={styles.otpDesc}>
                  Enter the code sent to your phone.
                </Text>
                <TextInput
                  style={styles.otpInput}
                  placeholder="OTP"
                  keyboardType="numeric"
                  maxLength={5}
                  value={otpValue}
                  onChangeText={setOtpValue}
                />
                {otpError ? <Text style={styles.error}>{otpError}</Text> : null}
                <Text style={styles.demoNote}>Demo OTP: {DEMO_OTP}</Text>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => {
                      setOtpModalVisible(false);
                      setOtpValue('');
                      setOtpError('');
                    }}
                  >
                    <Text>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.submitBtn} onPress={onOtpSubmit}>
                    <Text style={styles.submitText}>Verify</Text>
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
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: 16, backgroundColor: '#FFF8E1' },
  header: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginVertical: 16 },
  logoWrapper: { alignItems: 'center', marginBottom: 20 },
  logo: { width: 120, height: 120, resizeMode: 'contain' },
  form: { marginTop: 20 },
  formTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  inputGroup: { marginBottom: 12 },
  input: {
    height: 40, borderColor: '#ccc', borderWidth: 1,
    borderRadius: 8, paddingHorizontal: 10, backgroundColor: '#ffe',
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    borderColor: '#ccc', borderWidth: 1, borderRadius: 8, backgroundColor: '#ffe',
  },
  passwordInput: { flex: 1, height: 40, paddingHorizontal: 10, backgroundColor: '#ffe' },
  eyeButton: { padding: 10 },
  error: { color: 'red', fontSize: 12 },
  button: {
    backgroundColor: '#4B2C20', padding: 12,
    borderRadius: 8, alignItems: 'center', marginBottom: 12,
  },
  buttonDisabled: { backgroundColor: '#8D6E63', opacity: 0.7 },
  buttonContent: { flexDirection: 'row', alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 16, marginLeft: 8 },
  orText: { textAlign: 'center', marginVertical: 8 },
  socialWrapper: { marginTop: 20 },
  socialButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ddd', padding: 10, marginBottom: 10,
    borderRadius: 8, justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', zIndex: 1000,
  },
  loader: {
    backgroundColor: '#FFF', padding: 20,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    elevation: 5,
  },
  loadingText: { marginTop: 10, fontSize: 16, color: '#4B2C20' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#FFF', width: '85%', borderRadius: 10,
    padding: 20, elevation: 5,
  },
  modalHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#4B2C20' },
  termsText: {
    maxHeight: 300, marginBottom: 15, padding: 10,
    backgroundColor: '#f9f9f9', borderRadius: 5,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 15 },
  checkbox: {
    width: 24, height: 24, borderWidth: 1, borderColor: '#4B2C20',
    borderRadius: 4, marginRight: 10, justifyContent: 'center', alignItems: 'center',
  },
  checkboxLabel: { flex: 1, fontSize: 14 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn: {
    backgroundColor: '#ddd', padding: 10, borderRadius: 5, flex: 1,
    marginRight: 5, alignItems: 'center',
  },
  submitBtn: {
    backgroundColor: '#4B2C20', padding: 10, borderRadius: 5,
    flex: 1, marginLeft: 5, alignItems: 'center',
  },
  submitText: { color: '#FFF' },
  otpDesc: { marginBottom: 15, textAlign: 'center' },
  otpInput: {
    height: 45, borderColor: '#ccc', borderWidth: 1,
    borderRadius: 8, paddingHorizontal: 10, backgroundColor: '#ffe',
    fontSize: 18, textAlign: 'center', letterSpacing: 5, marginBottom: 15,
  },
  linkButton: {
  paddingVertical: 12,
  paddingHorizontal: 10,
  marginTop: 5,
},

linkText: {
  color: '#4B2C20',
  fontWeight: '500',
  textDecorationLine: 'underline',
},

  demoNote: { color: '#666', fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginBottom: 15 },
});

export default index;
