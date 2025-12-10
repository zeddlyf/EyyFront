// components/WalletBalance.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../lib/AuthContext';

const WalletBalance = () => {
  const { user } = useAuth();
  const wallet = user?.wallet; // Assuming wallet is populated in the user object

  return (
    <View style={styles.container}>
      <Text style={styles.balanceLabel}>Wallet Balance</Text>
      <Text style={styles.balanceAmount}>₱{wallet?.balance?.toFixed(2) || '0.00'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
});

export default WalletBalance;