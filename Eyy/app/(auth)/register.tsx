import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AntDesign } from '@expo/vector-icons';
import { authAPI, UserData } from '../../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../lib/api';

export default function RegisterScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'commuter' | 'driver' | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    licenseNumber: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!selectedRole) {
      Alert.alert('Error', 'Please select your role (Commuter or Driver)');
      return false;
    }
    if (!formData.firstName.trim()) {
      Alert.alert('Error', 'Please enter your first name');
      return false;
    }
    if (!formData.lastName.trim()) {
      Alert.alert('Error', 'Please enter your last name');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (!formData.phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return false;
    }
    if (!/^\+?[\d\s\-\(\)]+$/.test(formData.phoneNumber.trim())) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return false;
    }
    if (!formData.password) {
      Alert.alert('Error', 'Please enter a password');
      return false;
    }
    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      Alert.alert('Error', 'Password must contain at least one uppercase letter, one lowercase letter, and one number');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    if (selectedRole === 'driver' && !formData.licenseNumber.trim()) {
      Alert.alert('Error', 'Please enter your license number');
      return false;
    }
    if (!isChecked) {
      Alert.alert('Error', 'Please agree to the Terms & Privacy Policy');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const userData: UserData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        phoneNumber: formData.phoneNumber,
        role: selectedRole!,
        licenseNumber: selectedRole === 'driver' ? formData.licenseNumber : undefined,
      };

      console.log('Attempting registration with URL:', API_URL + '/api/auth/register', 'and data:', userData);
      const response = await authAPI.register(userData);

      // Store the token and user data
      await AsyncStorage.setItem('token', response.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.user));

      // Show success message and redirect
      Alert.alert(
        'Success',
        'Account created successfully! Please login to continue.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/login'),
          },
        ]
      );
    } catch (error) {
      console.error('Registration Error:', error);
      Alert.alert(
        'Registration Failed',
        error instanceof Error ? error.message : 'An unexpected error occurred during registration.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <AntDesign name="left" size={24} color="#FFD700" />
        </TouchableOpacity>
        
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/eyytrike1.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.logoText}>EyyTrike</Text>
        </View>
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Create Your Account</Text>
        <Text style={styles.subtitle}>Join the EyyTrike community</Text>
      </View>

      {/* Role Selection */}
      <View style={styles.roleContainer}>
        <Text style={styles.roleTitle}>I want to:</Text>
        <View style={styles.roleButtons}>
          <TouchableOpacity
            style={[
              styles.roleButton,
              selectedRole === 'commuter' && styles.roleButtonSelected,
            ]}
            onPress={() => setSelectedRole('commuter')}
          >
            <Text style={[
              styles.roleButtonText,
              selectedRole === 'commuter' && styles.roleButtonTextSelected,
            ]}>
              Ride as Commuter
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.roleButton,
              selectedRole === 'driver' && styles.roleButtonSelected,
            ]}
            onPress={() => setSelectedRole('driver')}
          >
            <Text style={[
              styles.roleButtonText,
              selectedRole === 'driver' && styles.roleButtonTextSelected,
            ]}>
              Drive as Rider
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Registration Form */}
      <View style={styles.formContainer}>
        <View style={styles.nameRow}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="First Name"
            placeholderTextColor="rgba(255, 215, 0, 0.5)"
            value={formData.firstName}
            onChangeText={(value) => handleInputChange('firstName', value)}
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Last Name"
            placeholderTextColor="rgba(255, 215, 0, 0.5)"
            value={formData.lastName}
            onChangeText={(value) => handleInputChange('lastName', value)}
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="rgba(255, 215, 0, 0.5)"
          value={formData.email}
          onChangeText={(value) => handleInputChange('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          placeholderTextColor="rgba(255, 215, 0, 0.5)"
          value={formData.phoneNumber}
          onChangeText={(value) => handleInputChange('phoneNumber', value)}
          keyboardType="phone-pad"
        />

        {selectedRole === 'driver' && (
          <TextInput
            style={styles.input}
            placeholder="License Number"
            placeholderTextColor="rgba(255, 215, 0, 0.5)"
            value={formData.licenseNumber}
            onChangeText={(value) => handleInputChange('licenseNumber', value)}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="rgba(255, 215, 0, 0.5)"
          secureTextEntry
          value={formData.password}
          onChangeText={(value) => handleInputChange('password', value)}
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor="rgba(255, 215, 0, 0.5)"
          secureTextEntry
          value={formData.confirmPassword}
          onChangeText={(value) => handleInputChange('confirmPassword', value)}
        />

        {/* Terms & Privacy Checkbox */}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => setIsChecked(!isChecked)}
        >
          <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
            {isChecked && <AntDesign name="check" size={16} color="#FFD700" />}
          </View>
          <Text style={styles.checkboxText}>
            I agree to the Terms & Privacy Policy
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.registerButton, isLoading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFD700" />
          ) : (
            <Text style={styles.registerButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.loginLinkText}>
            Already have an account? <Text style={styles.loginLinkBold}>Login</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B4619',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    padding: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logoImage: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  logoText: {
    fontSize: 24,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFD700',
    opacity: 0.8,
  },
  roleContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  roleTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 15,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 25,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  roleButtonSelected: {
    backgroundColor: '#FFD700',
  },
  roleButtonText: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: '600',
  },
  roleButtonTextSelected: {
    color: '#0B4619',
  },
  formContainer: {
    paddingHorizontal: 20,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#FFD700',
    borderRadius: 25,
    paddingHorizontal: 20,
    color: '#FFD700',
    fontSize: 16,
    marginBottom: 15,
  },
  halfInput: {
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#FFD700',
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  registerButton: {
    height: 50,
    backgroundColor: '#004D00',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLink: {
    alignItems: 'center',
    marginBottom: 30,
  },
  loginLinkText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  loginLinkBold: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
}); 