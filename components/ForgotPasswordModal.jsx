import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Modal,
} from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useToast } from 'react-native-toast-notifications';
import axios from 'axios';
import { baseUrl } from '../constants/const.js';

const ForgotPasswordModal = ({ visible, onClose }) => {
    const toast = useToast();
    const [forgotStep, setForgotStep] = useState(1);
    const [forgotPhone, setForgotPhone] = useState('254');
    const [forgotOtp, setForgotOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [newPasswordVisible, setNewPasswordVisible] = useState(false);
    const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

    // Timer & Retry state
    const [retryTimer, setRetryTimer] = useState(0);
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        let interval;
        if (retryTimer > 0) {
            interval = setInterval(() => {
                setRetryTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [retryTimer]);

    useEffect(() => {
        if (visible && forgotStep === 1) {
            // Intentionally not resetting retryTimer and retryCount here
            // to enforce the 3 minute wait even if the modal is closed and reopened
            setForgotPhone('254');
            setForgotOtp('');
            setNewPassword('');
            setConfirmPassword('');
        }
    }, [visible]);

    const normalizeForgotPhone = (text) => {
        let cleaned = (text || '').replace(/\D/g, '');
        if (!cleaned.startsWith('254')) {
            cleaned = '254' + cleaned.replace(/^254/, '').replace(/^0+/, '');
        }
        if (cleaned.length > 12) cleaned = cleaned.slice(0, 12);
        return cleaned;
    };

    const handleSendOtp = async () => {
        if (retryCount >= 3) {
            toast.show('Maximum retries reached. Please try again later during the day.', { type: 'danger' });
            return;
        }

        const phonePattern = /^254\d{9}$/;
        if (!phonePattern.test(forgotPhone)) {
            toast.show('Please enter a valid phone number (254XXXXXXXXX)', { type: 'danger' });
            return;
        }

        if (retryTimer > 0) {
            toast.show(`Please wait ${retryTimer} seconds before trying again.`, { type: 'warning' });
            return;
        }

        setForgotLoading(true);
        try {
            const response = await axios.get(`${baseUrl}/send-otp?username=${forgotPhone}`, {
                timeout: 15000,
            });

            if (response.status === 200) {
                toast.show('OTP sent to your phone number', { type: 'success' });
                setRetryCount((prev) => prev + 1);
                setRetryTimer(180); // 3 minutes
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

    const handleVerifyOtpOnly = () => {
        if (!forgotOtp || forgotOtp.length < 4) {
            toast.show('Please enter the OTP sent to your phone', { type: 'danger' });
            return;
        }
        setForgotStep(3); // Move to the password reset step
    };

    const handleVerifyOtpAndResetPassword = async () => {
        if (!forgotOtp || forgotOtp.length < 4) {
            toast.show('Please enter the OTP sent to your phone', { type: 'danger' });
            return;
        }

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
            const response = await axios.post(
                `${baseUrl}/reset-password?otp=${forgotOtp}`,
                {
                    userId: forgotPhone,
                    newpassword: newPassword,
                    confirmPassword: confirmPassword
                },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 15000,
                }
            );

            if (response.status === 200 || response.status === 201) {
                toast.show('Password reset successful! Please login with your new password.', {
                    type: 'success',
                });

                // Reset state after success
                setForgotStep(1);
                setRetryCount(0);
                setRetryTimer(0);
                setTimeout(() => {
                    onClose();
                }, 300);
            } else {
                toast.show('Failed to reset password. Please try again.', { type: 'danger' });
            }
        } catch (error) {
            // fallback in case the backend uses PUT instead of POST
            if (error.response?.status === 404 || error.response?.status === 405) {
                try {
                    const retryResponse = await axios.put(
                        `${baseUrl}/reset-password?otp=${forgotOtp}`,
                        {
                            userId: forgotPhone,
                            newpassword: newPassword,
                            confirmPassword: confirmPassword
                        },
                        {
                            headers: { 'Content-Type': 'application/json' },
                            timeout: 15000,
                        }
                    );
                    if (retryResponse.status === 200 || retryResponse.status === 201) {
                        toast.show('Password reset successful! Please login with your new password.', {
                            type: 'success',
                        });
                        setForgotStep(1);
                        setRetryCount(0);
                        setRetryTimer(0);
                        setTimeout(() => {
                            onClose();
                        }, 300);
                        return;
                    }
                } catch (retryError) { }
            }

            const message = error.response?.data?.message || error.message || 'Failed to reset password';
            toast.show(message, { type: 'danger' });
        } finally {
            setForgotLoading(false);
        }
    };

    const formatTimer = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
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
                                editable={!forgotLoading && retryCount < 3}
                            />

                            {retryCount >= 3 ? (
                                <Text style={styles.errorText}>
                                    Maximum attempts reached. Please try again later today.
                                </Text>
                            ) : null}

                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    (forgotLoading || retryTimer > 0 || retryCount >= 3) && styles.buttonDisabled
                                ]}
                                onPress={handleSendOtp}
                                disabled={forgotLoading || retryTimer > 0 || retryCount >= 3}
                            >
                                {forgotLoading ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={styles.modalButtonText}>
                                        {retryTimer > 0 ? `Resend wait (${formatTimer(retryTimer)})` : 'Send OTP'}
                                    </Text>
                                )}
                            </TouchableOpacity>

                            <Text style={styles.infoText}>If you have a code, click below to reset your password.</Text>

                            <TouchableOpacity
                                style={[styles.modalSecondaryButton, forgotLoading && styles.buttonDisabled]}
                                onPress={() => setForgotStep(2)}
                                disabled={forgotLoading}
                            >
                                <Text style={styles.modalSecondaryButtonText}>I already have a code</Text>
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
                                onPress={handleVerifyOtpOnly}
                                disabled={forgotLoading}
                            >
                                <Text style={styles.modalButtonText}>Continue</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => setForgotStep(1)}
                            >
                                <Text style={styles.backButtonText}>Did not receive code? Go back</Text>
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
                                style={[styles.modalButton, (forgotLoading || !newPassword || !confirmPassword) && styles.buttonDisabled]}
                                onPress={handleVerifyOtpAndResetPassword}
                                disabled={forgotLoading || !newPassword || !confirmPassword}
                            >
                                {forgotLoading ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={styles.modalButtonText}>Reset Password</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => setForgotStep(2)}
                            >
                                <Text style={styles.backButtonText}>Back to Verify OTP</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
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
    modalSecondaryButton: {
        backgroundColor: 'transparent',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#4B2C20',
        marginTop: 15,
    },
    modalSecondaryButtonText: {
        color: '#4B2C20',
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonDisabled: {
        backgroundColor: '#8D6E63',
        borderColor: '#8D6E63',
        opacity: 0.7,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#fff',
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
    passwordRequirement: {
        fontSize: 12,
        color: '#666',
        marginTop: 8,
        marginBottom: 20,
        lineHeight: 18,
    },
    errorText: {
        color: '#d32f2f',
        marginBottom: 15,
        fontSize: 14,
        textAlign: 'center',
        fontWeight: 'bold',
    },
    infoText: {
        color: '#666',
        marginTop: 15,
        fontSize: 14,
        textAlign: 'center',
    },
    backButton: {
        marginTop: 15,
        alignItems: 'center',
        padding: 10,
    },
    backButtonText: {
        color: '#4B2C20',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
});

export default ForgotPasswordModal;
