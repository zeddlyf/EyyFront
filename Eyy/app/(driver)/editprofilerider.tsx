import React, { useState } from 'react';
import { View, StyleSheet, Text, SafeAreaView, Platform, StatusBar, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { authAPI } from '../../lib/api';

export default function EditProfileRider() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize address fields
  const initialAddress = user?.address && typeof user.address === 'object' 
    ? user.address 
    : { street: '', city: '', province: '', postalCode: '', country: '', fullAddress: user?.address || '' };

  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    username: user?.username || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    address: initialAddress
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // Prepare address data - ensure it's properly formatted
      const updatedAddress = formData.address;
      
      // Generate fullAddress from individual fields if not provided
      if (!updatedAddress.fullAddress && (updatedAddress.street || updatedAddress.city)) {
        const addressParts = [
          updatedAddress.street,
          updatedAddress.city,
          updatedAddress.province,
          updatedAddress.postalCode,
          updatedAddress.country
        ].filter(Boolean);
        
        updatedAddress.fullAddress = addressParts.join(', ');
      }
      
      // Call API to update user profile with formatted address
      const updatedFormData = {
        ...formData,
        address: updatedAddress
      };
      
      const response = await authAPI.updateUserProfile(updatedFormData);
      
      if (response.success) {
        // Update local user data
        updateUser({
          ...user,
          ...updatedFormData
        });
        
        // Navigate back to the profile screen
        router.back();
      } else {
        throw new Error(response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      // Handle error (show error message, etc.)
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView}>
        <View style={styles.formContainer}>
          {/* Profile Image */}
          <View style={styles.profileImageContainer}>
            <Ionicons name="person-circle" size={80} color="#fff" />
            <TouchableOpacity style={styles.changePhotoButton}>
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={formData.fullName}
              onChangeText={(text) => handleChange('fullName', text)}
              placeholder="Enter your full name"
              placeholderTextColor="#ffffff80"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.input}
              value={formData.username}
              onChangeText={(text) => handleChange('username', text)}
              placeholder="Enter your username"
              placeholderTextColor="#ffffff80"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(text) => handleChange('email', text)}
              placeholder="Enter your email"
              placeholderTextColor="#ffffff80"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={formData.phoneNumber}
              onChangeText={(text) => handleChange('phoneNumber', text)}
              placeholder="Enter your phone number"
              placeholderTextColor="#ffffff80"
              keyboardType="phone-pad"
            />
          </View>

          <Text style={styles.sectionLabel}>Address</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Street</Text>
            <TextInput
              style={styles.input}
              value={formData.address.street}
              onChangeText={(text) => handleChange('address', {...formData.address, street: text})}
              placeholder="Enter street address"
              placeholderTextColor="#ffffff80"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>City</Text>
            <TextInput
              style={styles.input}
              value={formData.address.city}
              onChangeText={(text) => handleChange('address', {...formData.address, city: text})}
              placeholder="Enter city"
              placeholderTextColor="#ffffff80"
            />
          </View>
          
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, styles.halfInput]}>
              <Text style={styles.inputLabel}>Province/State</Text>
              <TextInput
                style={styles.input}
                value={formData.address.province}
                onChangeText={(text) => handleChange('address', {...formData.address, province: text})}
                placeholder="Province/State"
                placeholderTextColor="#ffffff80"
              />
            </View>
            
            <View style={[styles.inputGroup, styles.halfInput]}>
              <Text style={styles.inputLabel}>Postal Code</Text>
              <TextInput
                style={styles.input}
                value={formData.address.postalCode}
                onChangeText={(text) => handleChange('address', {...formData.address, postalCode: text})}
                placeholder="Postal Code"
                placeholderTextColor="#ffffff80"
              />
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Country</Text>
            <TextInput
              style={styles.input}
              value={formData.address.country}
              onChangeText={(text) => handleChange('address', {...formData.address, country: text})}
              placeholder="Enter country"
              placeholderTextColor="#ffffff80"
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity 
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d4217',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff20',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  changePhotoButton: {
    marginTop: 8,
  },
  changePhotoText: {
    color: '#1e8e3e',
    fontSize: 14,
  },
  sectionLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  inputLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff15',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#1e8e3e',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});