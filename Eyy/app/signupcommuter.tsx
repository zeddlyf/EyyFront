import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import AddressForm from '../components/AddressForm';
import { useRouter } from 'expo-router';
import { AntDesign } from '@expo/vector-icons';
import { useState } from 'react';
import { authAPI, UserData } from '../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { API_URL } from '../lib/api'; // Import API_URL

export default function CommuterSignUpScreen() {
  const router = useRouter();
  const [isChecked, setIsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    address: { street: '', barangay: '', city: '', province: '', postalCode: '' },
    password: '',
    confirmPassword: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
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
    if (!formData.address.street.trim()) {
      Alert.alert('Error', 'Please enter your street address');
      return false;
    }
    if (!formData.address.barangay.trim()) {
      Alert.alert('Error', 'Please enter your barangay');
      return false;
    }
    if (!formData.address.city.trim()) {
      Alert.alert('Error', 'Please enter your city');
      return false;
    }
    if (!formData.address.province.trim()) {
      Alert.alert('Error', 'Please enter your province');
      return false;
    }
    // ZIP Code optional
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
    if (!isChecked) {
      Alert.alert('Error', 'Please agree to the Terms & Privacy Policy');
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // Split fullName into firstName and lastName
      const nameParts = formData.fullName.split(' ');
      const lastName = nameParts.pop() || '';
      const firstName = nameParts.join(' ');
      
      const userData: UserData = {
        email: formData.email,
        password: formData.password,
        firstName: firstName,
        lastName: lastName,
        phoneNumber: formData.phoneNumber,
        address: {
          street: formData.address.street,
          barangay: formData.address.barangay,
          city: formData.address.city,
          province: formData.address.province,
          postalCode: formData.address.postalCode,
          country: 'Philippines'
        },
        role: 'commuter'
      };

      console.log('Attempting signup with URL:', API_URL + '/api/auth/register', 'and data:', userData);
      const response = await authAPI.register(userData);

      // Store the token and user data
      await AsyncStorage.setItem('token', response.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.user));

      // Show success message and redirect to login
      Alert.alert(
        'Success',
        'Account created successfully! Please login to continue.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/logincommuter'),
          },
        ]
      );
    } catch (error) {
      console.error('Signup Error:', error);
      Alert.alert('Signup Failed', error instanceof Error ? error.message : 'An unexpected error occurred during signup.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.topWrapper}>
        <View style={styles.headerContainer}>
          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Let's</Text>
            <Text style={styles.titleBold}>Create</Text>
            <Text style={styles.titleBold}>Your</Text>
            <Text style={styles.titleBold}>Account</Text>
          </View>

          {/* Close Button */}
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <AntDesign name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Form Fields */}
      <View style={styles.formContainer}>
        <View style={styles.inputContainer}>
          <AntDesign name="user" size={20} color="#666666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#666666"
            value={formData.fullName}
            onChangeText={(value) => handleInputChange('fullName', value)}
          />
        </View>

        <View style={styles.inputContainer}>
          <AntDesign name="mail" size={20} color="#666666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor="#666666"
            keyboardType="email-address"
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <AntDesign name="phone" size={20} color="#666666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Mobile number"
            placeholderTextColor="#666666"
            keyboardType="phone-pad"
            value={formData.phoneNumber}
            onChangeText={(value) => handleInputChange('phoneNumber', value)}
          />
        </View>

        <AddressForm
          value={formData.address}
          onChange={(addr) => setFormData(prev => ({ ...prev, address: addr }))}
          accessibilityPrefix="Registration"
        />

        <View style={styles.inputContainer}>
          <AntDesign name="lock" size={20} color="#666666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#666666"
            secureTextEntry
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
          />
        </View>

        <View style={styles.inputContainer}>
          <AntDesign name="lock" size={20} color="#666666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Retype Password"
            placeholderTextColor="#666666"
            secureTextEntry
            value={formData.confirmPassword}
            onChangeText={(value) => handleInputChange('confirmPassword', value)}
          />
        </View>

        {/* Terms and Privacy */}
        <View style={styles.termsContainer}>
          <TouchableOpacity 
            style={styles.checkbox}
            onPress={() => setIsChecked(!isChecked)}
          >
            <View style={[styles.checkboxInner, isChecked && styles.checkboxChecked]} />
          </TouchableOpacity>
          <Text style={styles.termsText}>
            I agree to the <Text style={styles.termsLink}>Terms & Privacy</Text>
          </Text>
        </View>

        {/* Sign Up Button */}
        <TouchableOpacity 
          style={[styles.signUpButton, isLoading && styles.signUpButtonDisabled]}
          onPress={handleSignUp}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.signUpButtonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/logincommuter')}>
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topWrapper: {
    backgroundColor: '#0d4217',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    padding: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    marginRight: 20,
  },
  title: {
    fontSize: 32,
    color: '#ffffff',
    marginBottom: 5,
  },
  titleBold: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ffffff',
    lineHeight: 45,
  },
  formContainer: {
    marginTop: 30,
    paddingHorizontal: 20,
    gap: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#666666',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#000000',
    fontSize: 16,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: '#666666',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    backgroundColor: 'transparent',
    borderRadius: 2,
  },
  checkboxChecked: {
    backgroundColor: '#0d4217',
  },
  termsText: {
    color: '#666666',
    fontSize: 14,
  },
  termsLink: {
    color: '#0d4217',
    textDecorationLine: 'underline',
  },
  signUpButton: {
    backgroundColor: '#0d4217',
    borderRadius: 25,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  signUpButtonDisabled: {
    opacity: 0.7,
  },
  signUpButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  loginText: {
    color: '#666666',
    fontSize: 14,
  },
  loginLink: {
    color: '#0d4217',
    fontSize: 14,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
    alignSelf: 'flex-start',
  },
});