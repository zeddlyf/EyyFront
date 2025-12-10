import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../lib/AuthContext';
import { walletAPI } from '../lib/api';

export default function PaymentWebView() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const paymentUrl = params.url as string;
  const referenceId = params.referenceId as string;
  const amount = params.amount as string;

  useEffect(() => {
    // Handle Android back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handlePaymentClose();
      return true;
    });

    return () => backHandler.remove();
  }, []);

  const handlePaymentClose = () => {
    Alert.alert(
      'Payment in Progress',
      'Are you sure you want to leave? Your payment may still be processing.',
      [
        { text: 'Stay', style: 'cancel' },
        { 
          text: 'Leave', 
          style: 'destructive',
          onPress: () => {
            refreshUser();
            router.back();
          }
        }
      ]
    );
  };

  const handleNavigationStateChange = (navState: any) => {
    const { url } = navState;
    
    // Check for success/failure URLs
    if (url.includes('/wallet/topup/success') || url.includes('success')) {
      Alert.alert(
        'Payment Successful',
        `Your wallet has been topped up with ₱${amount}`,
        [
          {
            text: 'OK',
            onPress: () => {
              refreshUser();
              router.back();
            }
          }
        ]
      );
    } else if (url.includes('/wallet/topup/failed') || url.includes('failed')) {
      Alert.alert(
        'Payment Failed',
        'Your payment could not be processed. Please try again.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.back();
            }
          }
        ]
      );
    }
  };

  if (!paymentUrl) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2ecc71" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: paymentUrl }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2ecc71" />
          </View>
        )}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
      />
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2ecc71" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
});

