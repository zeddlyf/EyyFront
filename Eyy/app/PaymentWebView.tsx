import React, { useState, useEffect, useRef } from 'react';
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
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const paymentUrl = params.url as string;
  const referenceId = params.referenceId as string;
  const amount = params.amount as string;
  const refreshAttempts = useRef(0);
  const maxRefreshAttempts = 5;

  useEffect(() => {
    // Handle Android back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handlePaymentClose();
      return true;
    });

    return () => backHandler.remove();
  }, []);

  const handlePaymentClose = async () => {
    Alert.alert(
      'Payment in Progress',
      'Are you sure you want to leave? Your payment may still be processing.',
      [
        { text: 'Stay', style: 'cancel' },
        { 
          text: 'Leave', 
          style: 'destructive',
          onPress: async () => {
            try {
              await refreshUser();
            } catch (err) {
              console.log('Could not refresh user:', err);
            }
            router.back();
          }
        }
      ]
    );
  };

  // Poll for payment status and wallet update
  const pollPaymentStatus = async (attempt: number = 0): Promise<boolean> => {
    if (attempt >= maxRefreshAttempts) {
      console.log('Max refresh attempts reached');
      return false;
    }

    try {
      // Check wallet balance to see if payment was processed
      const walletResponse = await walletAPI.getWallet();
      const wallet = walletResponse?.data || walletResponse;
      const currentBalance = wallet?.amount || wallet?.balance || 0;
      
      // Check transaction history for the new transaction
      try {
        const transactionsResponse = await walletAPI.getTransactionHistory();
        const transactionsData = transactionsResponse?.data || transactionsResponse;
        const transactions = Array.isArray(transactionsData) 
          ? transactionsData 
          : (transactionsData?.transactions || transactionsData?.data || []);
        
        // Check if there's a recent transaction matching this payment
        const recentTransaction = transactions.find((tx: any) => {
          const txAmount = tx.amount || tx.value || 0;
          const txRef = tx.referenceId || tx.xenditId || tx.id;
          const txDate = new Date(tx.createdAt || tx.date || tx.timestamp);
          const isRecent = (Date.now() - txDate.getTime()) < 60000; // Within last minute
          
          return (
            (Math.abs(txAmount - parseFloat(amount || '0')) < 0.01) &&
            (txRef === referenceId || isRecent) &&
            (tx.status === 'completed' || tx.status === 'success')
          );
        });

        if (recentTransaction) {
          console.log('Payment confirmed in transaction history');
          return true;
        }
      } catch (txErr) {
        console.log('Could not check transaction history:', txErr);
      }

      // If we have a reference ID, we might need to wait longer for webhook
      if (referenceId && attempt < maxRefreshAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return pollPaymentStatus(attempt + 1);
      }

      return false;
    } catch (err) {
      console.log(`Payment status check attempt ${attempt + 1} failed:`, err);
      if (attempt < maxRefreshAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return pollPaymentStatus(attempt + 1);
      }
      return false;
    }
  };

  const handlePaymentSuccess = async () => {
    if (paymentCompleted) return; // Prevent multiple alerts
    setPaymentCompleted(true);

    // Wait for webhook to process (initial delay)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Poll for payment confirmation
    refreshAttempts.current = 0;
    const confirmed = await pollPaymentStatus();

    // Refresh user and wallet data
    try {
      await refreshUser();
      const walletResponse = await walletAPI.getWallet();
      const wallet = walletResponse?.data || walletResponse;
      const newBalance = wallet?.amount || wallet?.balance || 0;
      console.log('Wallet balance after payment:', newBalance);
    } catch (err) {
      console.log('Error refreshing after payment:', err);
    }

    Alert.alert(
      'Payment Successful! 🎉',
      confirmed 
        ? `Your wallet has been topped up with ₱${amount || '500'}. Your balance has been updated.`
        : `Your payment of ₱${amount || '500'} was successful. Your wallet balance will update shortly.`,
      [
        {
          text: 'OK',
          onPress: () => {
            // Navigate back and trigger refresh in profile screen
            router.back();
            // Force a small delay to ensure navigation completes
            setTimeout(() => {
              // The useFocusEffect in profilecommuter should handle the refresh
            }, 500);
          }
        }
      ]
    );
  };

  const handleNavigationStateChange = async (navState: any) => {
    const { url } = navState;
    
    // Check for success/failure URLs (Xendit redirects)
    if (!paymentCompleted && (
        url.includes('/wallet/topup/success') || 
        url.includes('success') || 
        url.includes('xendit.com/success') ||
        url.includes('status=SUCCEEDED') ||
        url.includes('payment_status=SUCCEEDED')
    )) {
      handlePaymentSuccess();
    } else if (url.includes('/wallet/topup/failed') || 
               url.includes('failed') || 
               url.includes('xendit.com/failed') ||
               url.includes('status=FAILED') ||
               url.includes('status=EXPIRED') ||
               url.includes('payment_status=FAILED')) {
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
    } else if (url.includes('cancelled') || url.includes('cancel') || url.includes('payment_status=CANCELLED')) {
      Alert.alert(
        'Payment Cancelled',
        'You cancelled the payment. No charges were made.',
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
        onMessage={(event) => {
          // Handle postMessage from Xendit payment page
          if (paymentCompleted) return; // Prevent duplicate handling
          
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.status === 'SUCCEEDED' || data.status === 'success' || data.payment_status === 'SUCCEEDED') {
              handlePaymentSuccess();
            } else if (data.status === 'FAILED' || data.status === 'failed' || data.payment_status === 'FAILED') {
              Alert.alert(
                'Payment Failed',
                'Your payment could not be processed. Please try again.',
                [{ text: 'OK', onPress: () => router.back() }]
              );
            }
          } catch (err) {
            // Not a JSON message, ignore
          }
        }}
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
        injectedJavaScript={`
          (function() {
            // Listen for Xendit payment status updates
            window.addEventListener('message', function(event) {
              if (event.data && typeof event.data === 'object') {
                window.ReactNativeWebView.postMessage(JSON.stringify(event.data));
              }
            });
            
            // Also check URL parameters for payment status
            const urlParams = new URLSearchParams(window.location.search);
            const status = urlParams.get('status') || urlParams.get('payment_status');
            if (status) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ status: status }));
            }
            
            // Monitor URL changes for success/failure indicators
            let lastUrl = window.location.href;
            const checkUrl = setInterval(function() {
              if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                if (lastUrl.includes('success') || lastUrl.includes('SUCCEEDED')) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'SUCCEEDED' }));
                  clearInterval(checkUrl);
                } else if (lastUrl.includes('failed') || lastUrl.includes('FAILED')) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'FAILED' }));
                  clearInterval(checkUrl);
                }
              }
            }, 500);
            
            true;
          })();
        `}
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

