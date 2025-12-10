import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, Text, SafeAreaView, Platform, StatusBar, TouchableOpacity, Image, Switch, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { authAPI, userAPI } from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

export default function MenuCommuter() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const [silentMode, setSilentMode] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleEditProfile = () => {
    router.push('/editprofilecommuter');
  };

  useFocusEffect(
    useCallback(() => {
      let active = true
      ;(async () => {
        try {
          const profile = await userAPI.getProfile()
          if (active) updateUser(profile)
        } catch {}
      })()
      return () => { active = false }
    }, [])
  )

  useEffect(() => {
    if (!user) {
      ;(async () => {
        try {
          const profile = await userAPI.getProfile()
          updateUser(profile)
        } catch {}
      })()
    }
  }, [user])

  return (
    <SafeAreaView style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.helpButton}>
          <Ionicons name="help-circle" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          {/* Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person-circle" size={60} color="#fff" />
            </View>
            <Text style={styles.name}>{user?.fullName || 'User'}</Text>
            <Text style={styles.status}>Online</Text>
            <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          {/* About Me Section */}
          <Text style={styles.sectionTitle}>About Me</Text>
          <View style={styles.section}>
            <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
              <Ionicons name="person" size={20} color="#fff" />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuText}>{user?.username || user?.fullName || 'No username'}</Text>
                <Text style={styles.menuSubText}>Username</Text>
              </View>
              <Ionicons name="create-outline" size={20} color="#fff" style={styles.chevron} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
              <Ionicons name="mail" size={20} color="#fff" />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuText}>{user?.email || 'No email'}</Text>
                <Text style={styles.menuSubText}>E-mail Address</Text>
              </View>
              <Ionicons name="create-outline" size={20} color="#fff" style={styles.chevron} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
              <Ionicons name="call" size={20} color="#fff" />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuText}>{user?.phoneNumber || 'No phone number'}</Text>
                <Text style={styles.menuSubText}>Phone Number</Text>
              </View>
              <Ionicons name="create-outline" size={20} color="#fff" style={styles.chevron} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleEditProfile}>
              <Ionicons name="location" size={20} color="#fff" />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuText}>
                  {user?.address ? 
                    (typeof user.address === 'object' ? 
                      (user.address.fullAddress || `${user.address.street || ''}, ${user.address.city || ''}`) 
                      : user.address) 
                    : 'No address provided'}
                </Text>
                <Text style={styles.menuSubText}>Address</Text>
              </View>
              <Ionicons name="create-outline" size={20} color="#fff" style={styles.chevron} />
            </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(commuter)/contacts')}>
            <Ionicons name="book" size={20} color="#fff" />
            <View style={styles.menuItemContent}>
              <Text style={styles.menuText}>Save Contact</Text>
              <Text style={styles.menuSubText}>Manage saved contacts</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" style={styles.chevron} />
          </TouchableOpacity>

          
          </View>

          {/* Settings Section */}
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.section}>
            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="globe" size={20} color="#fff" />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuText}>English</Text>
                <Text style={styles.menuSubText}>Language</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" style={styles.chevron} />
            </TouchableOpacity>

            <View style={styles.menuItem}>
              <Ionicons name="notifications" size={20} color="#fff" />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuText}>Silent Mode</Text>
                <Text style={styles.menuSubText}>Notifications & Message</Text>
              </View>
              <Switch
                value={silentMode}
                onValueChange={setSilentMode}
                trackColor={{ false: '#666', true: '#00FF00' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.menuItem}>
              <Ionicons name="moon" size={20} color="#fff" />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuText}>Dark Mode</Text>
                <Text style={styles.menuSubText}>Theme</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#666', true: '#00FF00' }}
                thumbColor="#fff"
              />
            </View>

            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="phone-portrait" size={20} color="#fff" />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuText}>Camera, Location, & Microphone</Text>
                <Text style={styles.menuSubText}>Device Permissions</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" style={styles.chevron} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <Ionicons name="cellular" size={20} color="#fff" />
              <View style={styles.menuItemContent}>
                <Text style={styles.menuText}>Highest Quality</Text>
                <Text style={styles.menuSubText}>Mobile Data Settings</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" style={styles.chevron} />
            </TouchableOpacity>
          </View>

          {/* Sign Out Section */}
          <View style={styles.signOutSection}>
            <TouchableOpacity 
              style={[styles.signOutButton, isLoggingOut && styles.signOutButtonDisabled]}
              onPress={handleSignOut}
              disabled={isLoggingOut}
            >
              <Ionicons name="log-out" size={20} color="#fff" />
              <Text style={styles.signOutText}>
                {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.privacyText}>Privacy & Policy</Text>
          </View>
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
  helpButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  avatarContainer: {
    marginBottom: 6,
  },
  name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  status: {
    color: '#00FF00',
    fontSize: 12,
    marginBottom: 10,
  },
  editProfileButton: {
    backgroundColor: '#1e8e3e',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  editProfileText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  section: {
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff20',
  },
  menuItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuText: {
    color: '#fff',
    fontSize: 14,
  },
  menuSubText: {
    color: '#ffffff80',
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    opacity: 0.7,
  },
  signOutSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#ffffff20',
    marginTop: 20,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
  },
  signOutButtonDisabled: {
    opacity: 0.7,
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
    fontWeight: 'bold',
  },
  privacyText: {
    color: '#ffffff80',
    fontSize: 12,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
});
