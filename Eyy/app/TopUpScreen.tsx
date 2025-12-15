// screens/TopUpScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../lib/AuthContext';
import { walletAPI } from '../lib/api';

const TopUpScreen = () => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('EWALLET');
  const [isLoading, setIsLoading] = useState(false);
  const { refreshUser } = useAuth();
  const router = useRouter();

  const handleTopUp = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) < 1) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      setIsLoading(true);
      const response = await walletAPI.topUp(Number(amount), paymentMethod);
      const responseData = response?.data || response;
      
      if (responseData?.paymentUrl || responseData?.url) {
        // Navigate to payment WebView screen
        router.push({
          pathname: '/PaymentWebView',
          params: { 
            url: responseData.paymentUrl || responseData.url,
            referenceId: responseData.referenceId || responseData.id || '',
            amount: amount
          }
        });
      } else {
        Alert.alert('Error', 'No payment URL received from server');
      }
      
    } catch (error: any) {
      console.error('Top-up error:', error);
      Alert.alert('Error', error.message || 'Failed to process top-up. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Top Up Wallet</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.currencySymbol}>₱</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          autoFocus
        />
      </View>

      <View style={styles.presetsContainer}>
        {[100, 200, 500, 1000].map((preset) => (
          <TouchableOpacity
            key={preset}
            style={[styles.presetButton, amount === preset.toString() && styles.presetButtonSelected]}
            onPress={() => setAmount(preset.toString())}
          >
            <Text style={[styles.presetText, amount === preset.toString() && styles.presetTextSelected]}>₱{preset}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.paymentMethodContainer}>
        <Text style={styles.paymentMethodLabel}>Payment Method:</Text>
        <View style={styles.paymentMethodButtons}>
          <TouchableOpacity
            style={[styles.paymentMethodButton, paymentMethod === 'EWALLET' && styles.paymentMethodButtonSelected]}
            onPress={() => setPaymentMethod('EWALLET')}
          >
            <Text style={[styles.paymentMethodText, paymentMethod === 'EWALLET' && styles.paymentMethodTextSelected]}>
              E-Wallet
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.paymentMethodButton, paymentMethod === 'INVOICE' && styles.paymentMethodButtonSelected]}
            onPress={() => setPaymentMethod('INVOICE')}
          >
            <Text style={[styles.paymentMethodText, paymentMethod === 'INVOICE' && styles.paymentMethodTextSelected]}>
              Invoice
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleTopUp}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Processing...' : 'Proceed to Payment'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#ddd',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  currencySymbol: {
    fontSize: 24,
    marginRight: 5,
  },
  input: {
    flex: 1,
    fontSize: 24,
    paddingVertical: 10,
  },
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  presetButton: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    width: '48%',
    marginBottom: 10,
    alignItems: 'center',
  },
  presetText: {
    fontSize: 16,
    color: '#333',
  },
  presetButtonSelected: {
    backgroundColor: '#2ecc71',
  },
  presetTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  paymentMethodContainer: {
    marginBottom: 30,
  },
  paymentMethodLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  paymentMethodButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentMethodButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentMethodButtonSelected: {
    backgroundColor: '#2ecc71',
    borderColor: '#27ae60',
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  paymentMethodTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#2ecc71',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#95a5a6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TopUpScreen;