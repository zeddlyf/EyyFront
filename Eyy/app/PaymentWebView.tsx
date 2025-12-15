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

  const handleNavigationStateChange = async (navState: any) => {
    const { url } = navState;
    
    // Check for success/failure URLs (Xendit redirects)
    if (url.includes('/wallet/topup/success') || 
        url.includes('success') || 
        url.includes('xendit.com/success') ||
        url.includes('status=SUCCEEDED')) {
      
      // Wait a moment for webhook to process
      setTimeout(async () => {
        try {
          // Refresh user data
          try {
            await refreshUser();
          } catch (refreshErr) {
            console.log('Could not refresh user:', refreshErr);
          }
          
          // Also manually refresh wallet to ensure balance is updated
          try {
            const walletResponse = await walletAPI.getWallet();
            console.log('Wallet refreshed after payment:', walletResponse);
          } catch (walletErr) {
            console.log('Could not refresh wallet:', walletErr);
          }
        } catch (err) {
          console.error('Error refreshing after payment:', err);
        }
      }, 2000);
      
      Alert.alert(
        'Payment Successful! 🎉',
        `Your wallet has been topped up with ₱${amount || '500'}. The balance will update shortly.`,
        [
          {
            text: 'OK',
            onPress: async () => {
              // Additional refresh before going back
              try {
                await refreshUser();
                const walletResponse = await walletAPI.getWallet();
                console.log('Final wallet refresh:', walletResponse);
              } catch (err) {
                console.log('Final refresh error:', err);
              }
              router.back();
            }
          }
        ]
      );
    } else if (url.includes('/wallet/topup/failed') || 
               url.includes('failed') || 
               url.includes('xendit.com/failed') ||
               url.includes('status=FAILED') ||
               url.includes('status=EXPIRED')) {
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
    } else if (url.includes('cancelled') || url.includes('cancel')) {
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
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.status === 'SUCCEEDED' || data.status === 'success') {
              setTimeout(async () => {
                try {
                  await refreshUser();
                } catch (refreshErr) {
                  console.log('Could not refresh user:', refreshErr);
                }
                Alert.alert(
                  'Payment Successful! 🎉',
                  `Your wallet has been topped up with ₱${amount || '500'}`,
                  [{ 
                    text: 'OK', 
                    onPress: async () => {
                      // Refresh before going back
                      try {
                        await refreshUser();
                        await walletAPI.getWallet();
                      } catch (err) {
                        console.log('Refresh error:', err);
                      }
                      router.back();
                    }
                  }]
                );
              }, 2000);
            } else if (data.status === 'FAILED' || data.status === 'failed') {
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
          // Listen for Xendit payment status updates
          window.addEventListener('message', function(event) {
            if (event.data && typeof event.data === 'object') {
              window.ReactNativeWebView.postMessage(JSON.stringify(event.data));
            }
          });
          true;
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

