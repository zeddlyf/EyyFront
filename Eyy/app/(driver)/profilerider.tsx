import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, SafeAreaView, Platform, StatusBar, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { rideAPI, userAPI, authAPI, walletAPI } from '../../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DriverStats {
  totalEarnings: number;
  completedRides: number;
  pendingRides: number;
  cancelledRides: number;
  totalRides: number;
}

interface UserProfile {
  _id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'driver';
  licenseNumber?: string;
  isAvailable?: boolean;
}

export default function ProfileRider() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<DriverStats>({
    totalEarnings: 0,
    completedRides: 0,
    pendingRides: 0,
    cancelledRides: 0,
    totalRides: 0,
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [availableBalance, setAvailableBalance] = useState(0);

  const fetchDriverData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch user profile
      const profile = await userAPI.getProfile();
      setUserProfile(profile);

      // Fetch all rides
      const rides = await rideAPI.getMyRides();
      
      // Calculate statistics
      const completedRides = rides.filter((ride: any) => ride.status === 'completed');
      const pendingRides = rides.filter((ride: any) => ride.status === 'pending' || ride.status === 'accepted');
      const cancelledRides = rides.filter((ride: any) => ride.status === 'cancelled');
      
      const totalEarnings = completedRides.reduce((sum: number, ride: any) => {
        return sum + (ride.fare || 0);
      }, 0);

      setStats({
        totalEarnings,
        completedRides: completedRides.length,
        pendingRides: pendingRides.length,
        cancelledRides: cancelledRides.length,
        totalRides: rides.length,
      });

      // Fetch available balance for withdrawal (from wallet if exists)
      try {
        const walletResponse = await walletAPI.getWallet();
        const wallet = walletResponse?.data || walletResponse;
        if (wallet && (wallet.amount !== undefined || wallet.balance !== undefined)) {
          setAvailableBalance(wallet.amount || wallet.balance || 0);
        } else {
          // If no wallet, use total earnings as available balance
          setAvailableBalance(totalEarnings);
        }
      } catch (walletErr: any) {
        // If wallet doesn't exist, use total earnings
        console.log('Wallet not found, using total earnings:', walletErr);
        setAvailableBalance(totalEarnings);
      }

    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('authenticate')) {
        Alert.alert('Session expired', 'Please log in again.');
        router.replace('/');
      } else {
        setError(err.message || 'Failed to load profile data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      router.replace('/loginrider');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toFixed(2)}`;
  };

  const handleCashOut = () => {
    if (availableBalance <= 0) {
      Alert.alert('No Balance', 'You have no available balance to withdraw.');
      return;
    }
    setShowWithdrawalModal(true);
  };

  const handleWithdrawalSubmit = async () => {
    const amount = parseFloat(withdrawalAmount);
    
    // Validation
    if (!amount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid withdrawal amount.');
      return;
    }

    if (amount > availableBalance) {
      Alert.alert('Insufficient Balance', `You can only withdraw up to ${formatCurrency(availableBalance)}.`);
      return;
    }

    if (!bankCode || !accountNumber || !accountHolderName) {
      Alert.alert('Missing Information', 'Please fill in all bank details.');
      return;
    }

    // Minimum withdrawal amount
    if (amount < 100) {
      Alert.alert('Minimum Amount', 'Minimum withdrawal amount is ₱100.00.');
      return;
    }

    try {
      setWithdrawing(true);
      
      const response = await walletAPI.cashOut({
        amount,
        bankCode,
        accountNumber,
        accountHolderName,
      });

      Alert.alert(
        'Withdrawal Request Submitted',
        `Your withdrawal request of ${formatCurrency(amount)} has been submitted successfully. It will be processed within 1-3 business days.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowWithdrawalModal(false);
              resetWithdrawalForm();
              fetchDriverData(); // Refresh data
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      Alert.alert(
        'Withdrawal Failed',
        error.message || 'Failed to process withdrawal request. Please try again.'
      );
    } finally {
      setWithdrawing(false);
    }
  };

  const resetWithdrawalForm = () => {
    setWithdrawalAmount('');
    setBankCode('');
    setAccountNumber('');
    setAccountHolderName('');
  };

  const handleCloseModal = () => {
    if (!withdrawing) {
      setShowWithdrawalModal(false);
      resetWithdrawalForm();
    }
  };

  useEffect(() => {
    // Check authentication on mount
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Session expired', 'Please log in again.');
        router.replace('/loginrider');
        return;
      }
      fetchDriverData();
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Image 
              source={require('../../assets/images/eyytrike1.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <TouchableOpacity onPress={() => router.push('/menurider')}>
              <Ionicons name="menu" size={24} color="#FFD700" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logo}>
          <Image 
            source={require('../../assets/images/eyytrike1.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <TouchableOpacity onPress={() => router.push('/menurider')}>
            <Ionicons name="menu" size={24} color="#FFD700" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={64} color="#dc3545" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchDriverData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* User Profile Section */}
            <View style={styles.profileSection}>
              <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                  <Ionicons name="person" size={40} color="#FFD700" />
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>
                    {userProfile?.fullName || 'Driver'}
                  </Text>
                  <Text style={styles.profileEmail}>
                    {userProfile?.email || 'driver@example.com'}
                  </Text>
                  <Text style={styles.profilePhone}>
                    {userProfile?.phoneNumber || 'No phone number'}
                  </Text>
                </View>
              </View>
              {userProfile?.licenseNumber && (
                <View style={styles.licenseInfo}>
                  <Ionicons name="card" size={16} color="#FFD700" />
                  <Text style={styles.licenseText}>
                    License: {userProfile.licenseNumber}
                  </Text>
                </View>
              )}
            </View>

            {/* Statistics Grid */}
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Your Statistics</Text>
              <View style={styles.statsGrid}>
                {/* Total Earning */}
                <View style={styles.statsCard}>
                  <Text style={styles.statsValue}>
                    {formatCurrency(stats.totalEarnings)}
                  </Text>
                  <View style={styles.statsIconContainer}>
                    <Ionicons name="wallet-outline" size={20} color="#fff" />
                  </View>
                  <Text style={styles.statsLabel}>Total{'\n'}Earning</Text>
                </View>

                {/* Complete Ride */}
                <View style={styles.statsCard}>
                  <Text style={styles.statsValue}>{stats.completedRides}</Text>
                  <View style={styles.statsIconContainer}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  </View>
                  <Text style={styles.statsLabel}>Complete{'\n'}Ride</Text>
                </View>

                {/* Pending Ride */}
                <View style={styles.statsCard}>
                  <Text style={styles.statsValue}>{stats.pendingRides}</Text>
                  <View style={styles.statsIconContainer}>
                    <Ionicons name="time-outline" size={20} color="#fff" />
                  </View>
                  <Text style={styles.statsLabel}>Pending{'\n'}Ride</Text>
                </View>

                {/* Cancel Ride */}
                <View style={styles.statsCard}>
                  <Text style={styles.statsValue}>{stats.cancelledRides}</Text>
                  <View style={styles.statsIconContainer}>
                    <Ionicons name="close-circle-outline" size={20} color="#fff" />
                  </View>
                  <Text style={styles.statsLabel}>Cancel{'\n'}Ride</Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.actionsSection}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/historyrider')}
                >
                  <Ionicons name="time" size={24} color="#0d4217" />
                  <Text style={styles.actionButtonText}>View History</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => router.push('/dashboardrider')}
                >
                  <Ionicons name="car" size={24} color="#0d4217" />
                  <Text style={styles.actionButtonText}>Go Online</Text>
                </TouchableOpacity>
              </View>
              
              {/* Cash Out Button */}
              <TouchableOpacity 
                style={[styles.cashOutButton, availableBalance <= 0 && styles.cashOutButtonDisabled]}
                onPress={handleCashOut}
                disabled={availableBalance <= 0}
              >
                <Ionicons name="cash-outline" size={24} color="#fff" />
                <View style={styles.cashOutButtonContent}>
                  <Text style={styles.cashOutButtonText}>Cash Out Earnings</Text>
                  <Text style={styles.cashOutButtonSubtext}>
                    Available: {formatCurrency(availableBalance)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Logout Button */}
            <View style={styles.logoutSection}>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#fff" />
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Withdrawal Modal */}
      <Modal
        visible={showWithdrawalModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cash Out Earnings</Text>
              <TouchableOpacity onPress={handleCloseModal} disabled={withdrawing}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Available Balance */}
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text style={styles.balanceAmount}>{formatCurrency(availableBalance)}</Text>
              </View>

              {/* Amount Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Withdrawal Amount</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>₱</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    placeholderTextColor="#999"
                    value={withdrawalAmount}
                    onChangeText={setWithdrawalAmount}
                    keyboardType="decimal-pad"
                    editable={!withdrawing}
                  />
                </View>
                <Text style={styles.inputHint}>Minimum: ₱100.00</Text>
              </View>

              {/* Bank Code */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bank</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., BPI, BDO, GCASH, PAYMAYA"
                  placeholderTextColor="#999"
                  value={bankCode}
                  onChangeText={setBankCode}
                  editable={!withdrawing}
                />
              </View>

              {/* Account Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Account Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your account number"
                  placeholderTextColor="#999"
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  keyboardType="numeric"
                  editable={!withdrawing}
                />
              </View>

              {/* Account Holder Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Account Holder Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter account holder name"
                  placeholderTextColor="#999"
                  value={accountHolderName}
                  onChangeText={setAccountHolderName}
                  editable={!withdrawing}
                />
              </View>

              {/* Info Note */}
              <View style={styles.infoNote}>
                <Ionicons name="information-circle-outline" size={20} color="#FFD700" />
                <Text style={styles.infoNoteText}>
                  Withdrawal requests are processed within 1-3 business days. Please ensure your bank details are correct.
                </Text>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCloseModal}
                disabled={withdrawing}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton, withdrawing && styles.submitButtonDisabled]}
                onPress={handleWithdrawalSubmit}
                disabled={withdrawing}
              >
                {withdrawing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>Submit Request</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#0d4217',
    padding: 16,
  },
  logo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    paddingLeft: 10,
  },
  logoImage: {
    width: 120,
    height: 32,
    marginLeft: -20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFD700',
    fontSize: 16,
    marginTop: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 12,
  },
  retryButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#0d4217',
    fontWeight: 'bold',
    fontSize: 16,
  },
  profileSection: {
    backgroundColor: '#083010',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0d4217',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#FFD700',
    marginBottom: 2,
  },
  profilePhone: {
    fontSize: 14,
    color: '#ccc',
  },
  licenseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#0d4217',
  },
  licenseText: {
    fontSize: 14,
    color: '#FFD700',
    marginLeft: 8,
  },
  statsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  statsCard: {
    width: '48%',
    backgroundColor: '#083010',
    borderRadius: 8,
    padding: 16,
    alignItems: 'flex-start',
    marginBottom: 10,
    height: 120,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  statsIconContainer: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    padding: 8,
    marginBottom: 8,
    position: 'absolute',
    right: 8,
    top: 8,
  },
  statsLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
  actionsSection: {
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#083010',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  logoutSection: {
    marginBottom: 20,
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  cashOutButton: {
    backgroundColor: '#FFD700',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    justifyContent: 'space-between',
  },
  cashOutButtonDisabled: {
    backgroundColor: '#555',
    opacity: 0.6,
  },
  cashOutButtonContent: {
    flex: 1,
    marginLeft: 12,
  },
  cashOutButtonText: {
    color: '#0d4217',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cashOutButtonSubtext: {
    color: '#0d4217',
    fontSize: 12,
    marginTop: 2,
    opacity: 0.8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#083010',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#0d4217',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  modalBody: {
    padding: 20,
    maxHeight: 500,
  },
  balanceInfo: {
    backgroundColor: '#0d4217',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#FFD700',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0d4217',
    borderRadius: 8,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#1a5a2a',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d4217',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1a5a2a',
    paddingHorizontal: 14,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    padding: 14,
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  inputHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  infoNote: {
    flexDirection: 'row',
    backgroundColor: '#0d4217',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#ccc',
    marginLeft: 8,
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#0d4217',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#333',
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#FFD700',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#0d4217',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 