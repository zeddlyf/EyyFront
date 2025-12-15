import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { AntDesign } from '@expo/vector-icons';
import api from '../lib/api';

type Step = 'request' | 'verify' | 'reset';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('request');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const showError = (message: string) => Alert.alert('Reset password', message);
  const showInfo = (message: string) => Alert.alert('Reset password', message);

  const handleRequest = async () => {
    if (!identifier) {
      return showError('Enter your email or phone number.');
    }
    setLoading(true);
    try {
      await api.authAPI.requestPasswordReset(identifier);
      showInfo('If the account exists, we sent a code via email/SMS.');
      setStep('verify');
    } catch (err: any) {
      showError(err.message || 'Failed to request reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!otp) {
      return showError('Enter the verification code.');
    }
    setLoading(true);
    try {
      const data = await api.authAPI.verifyPasswordOtp(identifier, otp);
      const token = data.resetToken || data.token;
      if (!token) throw new Error('Reset token missing from server.');
      setResetToken(token);
      showInfo('Code verified. Please set your new password.');
      setStep('reset');
    } catch (err: any) {
      showError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!newPassword || !confirmPassword) return showError('Enter and confirm your new password.');
    if (newPassword !== confirmPassword) return showError('Passwords do not match.');
    if (newPassword.length < 8) return showError('Password must be at least 8 characters.');
    setLoading(true);
    try {
      await api.authAPI.resetPassword(resetToken, newPassword);
      showInfo('Password reset successful. Please log in.');
      router.back();
    } catch (err: any) {
      showError(err.message || 'Reset failed.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    if (step === 'request') {
      return (
        <>
          <Text style={styles.label}>Email or Mobile</Text>
          <View style={styles.inputContainer}>
            <AntDesign name="mail" size={20} color="#0d4217" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your email or mobile"
              placeholderTextColor="#666666"
              keyboardType="email-address"
              autoCapitalize="none"
              value={identifier}
              onChangeText={setIdentifier}
            />
          </View>
          <TouchableOpacity style={styles.resetButton} onPress={handleRequest} disabled={loading}>
            {loading ? <ActivityIndicator color="#0d4217" /> : <Text style={styles.resetButtonText}>Send Code</Text>}
          </TouchableOpacity>
        </>
      );
    }

    if (step === 'verify') {
      return (
        <>
          <Text style={styles.label}>Verification Code</Text>
          <View style={styles.inputContainer}>
            <AntDesign name="lock1" size={20} color="#0d4217" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter the 6-digit code"
              placeholderTextColor="#666666"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
            />
          </View>
          <TouchableOpacity style={styles.resetButton} onPress={handleVerify} disabled={loading}>
            {loading ? <ActivityIndicator color="#0d4217" /> : <Text style={styles.resetButtonText}>Verify Code</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStep('request')} style={styles.backToLoginButton}>
            <Text style={styles.backToLoginText}>Resend / change email or phone</Text>
          </TouchableOpacity>
        </>
      );
    }

    return (
      <>
        <Text style={styles.label}>New Password</Text>
        <View style={styles.inputContainer}>
          <AntDesign name="key" size={20} color="#0d4217" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter new password"
            placeholderTextColor="#666666"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
        </View>
        <Text style={[styles.label, { marginTop: 10 }]}>Confirm Password</Text>
        <View style={styles.inputContainer}>
          <AntDesign name="key" size={20} color="#0d4217" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor="#666666"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>
        <TouchableOpacity style={styles.resetButton} onPress={handleReset} disabled={loading}>
          {loading ? <ActivityIndicator color="#0d4217" /> : <Text style={styles.resetButtonText}>Reset Password</Text>}
        </TouchableOpacity>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.lockIconContainer}>
        <AntDesign name="lock1" size={70} color="#0d4217" />
      </View>
      <Text style={styles.title}>Forgot</Text>
      <Text style={styles.titleSecondLine}>Password?</Text>
      <Text style={styles.subtitle}>No worries, we'll send you{'\n'}reset instructions</Text>
      <View style={styles.formWrapper}>
        <View style={styles.formContainer}>
          {renderStep()}
          <TouchableOpacity style={styles.backToLoginButton} onPress={() => router.back()}>
            <Text style={styles.backToLoginText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  closeButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  lockIconContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#0d4217',
    textAlign: 'center',
    marginTop: 20,
  },
  titleSecondLine: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#0d4217',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 25,
    lineHeight: 20,
  },
  formWrapper: {
    flex: 1,
    backgroundColor: '#0d4217',
    marginTop: 80,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  formContainer: {
    padding: 20,
    marginTop: 20,
  },
  label: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#000000',
    fontSize: 16,
  },
  resetButton: {
    backgroundColor: '#E0E0E0',
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  resetButtonText: {
    color: '#0d4217',
    fontSize: 16,
    fontWeight: '600',
  },
  backToLoginButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  backToLoginText: {
    color: '#ffffff',
    fontSize: 16,
    
  },
  iconSquare: {
    width: 30,
    height: 30,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 