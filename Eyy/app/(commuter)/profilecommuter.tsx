import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Text, SafeAreaView, Platform, StatusBar, Image, TouchableOpacity, ScrollView, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter, useFocusEffect } from 'expo-router';
import { walletAPI, paymentAPI } from '../../lib/api';

export default function ProfileCommuter() {
  const router = useRouter();

  // Wallet and transaction state
  const [balance, setBalance] = useState<number | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null); // Track wallet ID
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [depositing, setDepositing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Helper function to fetch wallet and transactions
    const fetchWalletAndTransactions = async () => {
      setLoading(true);
      setError(null);
    
    // Fetch wallet first (critical - show errors if this fails)
    let wallet;
    try {
      const walletResponse = await walletAPI.getWallet();
      wallet = walletResponse?.data || walletResponse;
    } catch (walletErr: any) {
      // If wallet doesn't exist, try to initialize it
      if (walletErr?.response?.status === 404) {
        try {
          await walletAPI.initializeWallet();
          const walletResponse = await walletAPI.getWallet();
          wallet = walletResponse?.data || walletResponse;
        } catch (initErr) {
          console.log('Could not initialize wallet:', initErr);
          // Fallback to getWallets if getWallet fails
          try {
            const wallets = await walletAPI.getWallets();
            wallet = Array.isArray(wallets) ? wallets[0] : wallets;
          } catch (fallbackErr) {
            // If all wallet methods fail, show error
            const errorMessage = walletErr?.response?.data?.message || walletErr?.message || 'Failed to load wallet';
            setError(errorMessage);
            setBalance(0);
            setTransactions([]);
            setLoading(false);
            return;
          }
        }
      } else {
        // Fallback to getWallets if getWallet fails
        try {
        const wallets = await walletAPI.getWallets();
          wallet = Array.isArray(wallets) ? wallets[0] : wallets;
        } catch (fallbackErr) {
          const errorMessage = walletErr?.response?.data?.message || walletErr?.message || 'Failed to load wallet';
          setError(errorMessage);
          setBalance(0);
          setTransactions([]);
          setLoading(false);
          return;
        }
      }
    }

    // Set wallet balance (critical - we have wallet now)
    const walletBalance = wallet?.amount ?? wallet?.balance ?? 0;
    const walletIdValue = wallet?._id ?? wallet?.id ?? null;
    setBalance(walletBalance);
    setWalletId(walletIdValue);

    // Fetch transaction history (non-critical - don't show errors if this fails)
    // Try multiple methods to get transaction history
    let transactionsArray: any[] = [];
    
    // Method 1: Check if wallet object has transactions property
    if (wallet?.transactions && Array.isArray(wallet.transactions)) {
      transactionsArray = wallet.transactions;
    } else if (wallet?.transactionHistory && Array.isArray(wallet.transactionHistory)) {
      transactionsArray = wallet.transactionHistory;
    } else {
      // Method 2: Try wallet transaction history endpoint
      try {
        const transactionsResponse = await walletAPI.getTransactionHistory({ limit: 50 });
        const transactionsData = transactionsResponse?.data || transactionsResponse;
        // Handle both array and object with array property
        transactionsArray = Array.isArray(transactionsData) 
          ? transactionsData 
          : (transactionsData?.transactions || transactionsData?.data || transactionsData?.history || []);
        
        // Sort by date (newest first)
        if (transactionsArray.length > 0) {
          transactionsArray.sort((a: any, b: any) => {
            const dateA = new Date(a.createdAt || a.date || a.timestamp || 0).getTime();
            const dateB = new Date(b.createdAt || b.date || b.timestamp || 0).getTime();
            return dateB - dateA;
          });
        }
      } catch (txErr: any) {
        console.log('Wallet transaction history endpoint failed:', txErr?.message || txErr);
        
        // Method 3: Try to get transactions from wallet by ID if we have walletId
        if (walletIdValue) {
          try {
            const walletById = await walletAPI.getWalletById(walletIdValue);
            if (walletById?.transactions && Array.isArray(walletById.transactions)) {
              transactionsArray = walletById.transactions;
            } else if (walletById?.transactionHistory && Array.isArray(walletById.transactionHistory)) {
              transactionsArray = walletById.transactionHistory;
            }
          } catch (walletByIdErr) {
            console.log('Could not get wallet by ID:', walletByIdErr);
          }
        }
        
        // Method 4: Try payments API as fallback (only if wallet transactions fail)
        if (transactionsArray.length === 0) {
          try {
        const payments = await paymentAPI.getPayments();
            const paymentsArray = Array.isArray(payments) ? payments : (payments?.data || []);
            // Filter payments related to this user/wallet
            transactionsArray = paymentsArray.map((payment: any) => ({
              ...payment,
              type: payment.type || 'payment',
              amount: payment.amount || payment.value || 0,
              description: payment.description || 'Payment',
              createdAt: payment.createdAt || payment.date || payment.timestamp
            }));
          } catch (paymentErr: any) {
            console.log('Payments API also failed:', paymentErr?.message || paymentErr);
            // Empty transaction history is fine - don't show error
            transactionsArray = [];
          }
        }
      }
    }
    
    // Filter and format transactions to ensure deposits are included
    const formattedTransactions = transactionsArray.map((tx: any) => {
      // Normalize transaction type
      let type = tx.type || tx.transactionType || tx.category || 'payment';
      
      // If it's a topup/deposit related transaction, ensure type is 'deposit'
      if (
        tx.description?.toLowerCase().includes('topup') ||
        tx.description?.toLowerCase().includes('deposit') ||
        tx.description?.toLowerCase().includes('top up') ||
        tx.note?.toLowerCase().includes('topup') ||
        tx.note?.toLowerCase().includes('deposit') ||
        tx.reference?.toLowerCase().includes('topup') ||
        (tx.amount > 0 && !tx.type && !tx.transactionType)
      ) {
        type = 'deposit';
      }
      
      return {
        ...tx,
        type: type,
        // Ensure amount is positive for deposits
        amount: type === 'deposit' ? Math.abs(tx.amount || tx.value || 0) : (tx.amount || tx.value || 0),
      };
    });
    
    // Sort by date (newest first)
    formattedTransactions.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || a.date || a.timestamp || 0).getTime();
      const dateB = new Date(b.createdAt || b.date || b.timestamp || 0).getTime();
      return dateB - dateA;
    });
    
    setTransactions(formattedTransactions);
    setLastRefresh(new Date());
    setLoading(false);
    console.log(`Loaded ${formattedTransactions.length} transactions`);
    
    // Check for pending transactions and verify them (async, don't block)
    const pendingTransactions = formattedTransactions.filter(
      tx => (tx.status === 'pending' || tx.status === 'PENDING') && (tx.referenceId || tx.xenditId)
    );
    
    if (pendingTransactions.length > 0) {
      console.log(`Found ${pendingTransactions.length} pending transactions, verifying...`);
      // Verify each pending transaction
      (async () => {
        for (const tx of pendingTransactions) {
          try {
            const verifyResponse = await walletAPI.verifyTransaction({
              referenceId: tx.referenceId,
              xenditId: tx.xenditId
            });
            const verifyData = verifyResponse?.data || verifyResponse;
            console.log('Transaction verification result:', verifyData);
            
            // If transaction was updated, refresh wallet
            if (verifyData.status === 'updated' || verifyData.status === 'completed') {
              // Refresh after verification
              setTimeout(() => {
                fetchWalletAndTransactions();
              }, 1000);
              break; // Only verify one at a time to avoid race conditions
            }
          } catch (verifyErr) {
            console.log('Could not verify transaction:', verifyErr);
          }
        }
      })();
    }
  };

  // Initial load
  useEffect(() => {
    fetchWalletAndTransactions();
  }, []);

  // Refresh when screen comes into focus (e.g., returning from payment)
  useFocusEffect(
    useCallback(() => {
      // Longer delay to ensure webhook has processed payment
      const timer = setTimeout(() => {
        console.log('Screen focused - refreshing wallet and transactions');
        fetchWalletAndTransactions();
        
        // Also do a delayed refresh in case webhook is still processing
        const delayedTimer = setTimeout(() => {
          console.log('Delayed refresh after payment');
          fetchWalletAndTransactions();
        }, 5000);
        
        return () => clearTimeout(delayedTimer);
      }, 2000);
      
      return () => clearTimeout(timer);
    }, [])
  );

  // Also refresh when app comes to foreground (in case payment completed in background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // App has come to the foreground, refresh wallet
        setTimeout(() => {
          fetchWalletAndTransactions();
        }, 1500);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  // Periodic refresh to catch new transactions (every 10 seconds when screen is active)
  // More frequent after payment to catch webhook updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if not currently loading
      if (!loading) {
        fetchWalletAndTransactions();
      }
    }, 10000); // Refresh every 10 seconds (more frequent to catch payment updates)

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Deposit handler - redirects to topup flow with Xendit
  const handleDeposit = async () => {
    if (balance === null) return;
    setDepositing(true);
    setError(null);
    try {
      // topUp creates a Xendit payment URL - it doesn't directly add funds
      // The funds are added via webhook after payment is completed
      const topUpResponse = await walletAPI.topUp(500, 'EWALLET');
      const topUpData = topUpResponse?.data || topUpResponse;
      
      // Check if we got a payment URL (Xendit flow)
      if (topUpData?.paymentUrl || topUpData?.url) {
        // Navigate to payment WebView to complete the payment
        router.push({
          pathname: '/PaymentWebView',
          params: {
            url: topUpData.paymentUrl || topUpData.url,
            referenceId: topUpData.referenceId || topUpData.id || '',
            amount: '500'
          }
        });
        setDepositing(false);
        return;
      }
      
      // If no payment URL, check if funds were added directly (test mode)
      if (topUpData?.success || topUpData?.amount) {
      // Refresh wallet and transactions
        await fetchWalletAndTransactions();
        setDepositing(false);
        return;
      }
      
      // Fallback: Try addFunds endpoint for direct deposit (if available)
      try {
        await walletAPI.addFunds(500);
        await fetchWalletAndTransactions();
      } catch (addFundsErr: any) {
        console.log('addFunds endpoint failed:', addFundsErr?.response?.status);
        throw new Error('Could not initiate payment. Please try again.');
      }
    } catch (err: any) {
      console.error('Deposit error:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to initiate deposit';
      setError(errorMessage);
    } finally {
      setDepositing(false);
    }
  };

  // Helper functions for transaction display
  const getTransactionIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'deposit':
      case 'credit':
        return 'add-circle';
      case 'withdrawal':
      case 'debit':
        return 'remove-circle';
      case 'payment':
      case 'ride':
        return 'car';
      case 'refund':
        return 'refresh-circle';
      default:
        return 'card';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'deposit':
      case 'credit':
        return '#4CAF50';
      case 'withdrawal':
      case 'debit':
        return '#f44336';
      case 'payment':
      case 'ride':
        return '#FF9800';
      case 'refund':
        return '#2196F3';
      default:
        return '#FFD700';
    }
  };

  const getTransactionTitle = (title: string) => {
    if (title?.toLowerCase().includes('ride')) return 'Ride Payment';
    if (title?.toLowerCase().includes('deposit')) return 'Wallet Deposit';
    if (title?.toLowerCase().includes('withdrawal')) return 'Withdrawal';
    if (title?.toLowerCase().includes('refund')) return 'Refund';
    return title || 'Transaction';
  };

  const getAmountColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'deposit':
      case 'credit':
      case 'refund':
        return '#4CAF50';
      case 'withdrawal':
      case 'debit':
      case 'payment':
      case 'ride':
        return '#f44336';
      default:
        return '#FFD700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'completed':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'failed':
      case 'cancelled':
        return '#f44336';
      default:
        return '#666';
    }
  };

  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'completed':
        return 'Success';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Success';
    }
  };

  const formatTransactionDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

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
          <TouchableOpacity onPress={() => router.push('/menucommuter')}>
            <Ionicons name="menu" size={24} color="#FFD700" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.content}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>Your available balance</Text>
              <View style={styles.balanceAmount}>
                <Text style={styles.currencySymbol}>₱</Text>
                {loading ? (
                  <Text style={styles.balanceValue}>...</Text>
                ) : (
                  <Text style={styles.balanceValue}>{balance?.toFixed(2) ?? '0.00'}</Text>
                )}
                <TouchableOpacity
                  onPress={() => {
                    if (balance !== null) {
                      // Copy balance to clipboard
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(balance.toFixed(2));
                      }
                    }
                  }}
                >
                  <Ionicons name="copy-outline" size={20} color="#fff" style={styles.copyIcon} />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.depositButton} onPress={handleDeposit} disabled={depositing || loading || !walletId}>
              {depositing ? (
                <Text style={{ color: '#0d4217', fontWeight: 'bold' }}>Adding...</Text>
              ) : (
                <Ionicons name="wallet" size={24} color="#0d4217" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.transactionSection}>
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Transaction History</Text>
              {lastRefresh && (
                <Text style={styles.lastUpdatedText}>
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </Text>
              )}
            </View>
            <TouchableOpacity 
              style={styles.refreshButton} 
              onPress={fetchWalletAndTransactions}
              disabled={loading}
            >
              <Ionicons 
                name={loading ? "reload" : "refresh"} 
                size={20} 
                color="#FFD700"
                style={loading ? { transform: [{ rotate: '360deg' }] } : undefined}
              />
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <Ionicons name="reload" size={24} color="#FFD700" />
              <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={32} color="#ff6b6b" />
              <Text style={styles.errorText}>{error}</Text>
              <Text style={styles.errorSubtext}>
                {error.toLowerCase().includes('transaction') 
                  ? 'Transaction history is not available, but your wallet balance is loaded.'
                  : 'Please check your connection and try again.'}
              </Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={fetchWalletAndTransactions}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.transactionList}>
              {transactions.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="receipt-outline" size={48} color="#ffffff40" />
                  <Text style={styles.emptyText}>No transactions found</Text>
                  <Text style={styles.emptySubtext}>Your transaction history will appear here</Text>
                </View>
              ) : (
                transactions.map((tx, idx) => {
                  // Handle different transaction data structures
                  const transactionType = tx.type || tx.transactionType || tx.category || 'payment';
                  const transactionStatus = tx.status || tx.transactionStatus || 'completed';
                  const transactionAmount = tx.amount || tx.value || 0;
                  const transactionDescription = tx.description || tx.note || tx.memo || tx.reference || 'Transaction';
                  const transactionDate = tx.createdAt || tx.date || tx.timestamp || tx.created_at;
                  const transactionId = tx._id || tx.id || `tx-${idx}`;
                  
                  return (
                    <View style={styles.transactionCard} key={transactionId}>
                    <View style={styles.transactionHeader}>
                      <View style={styles.transactionIcon}>
                        <Ionicons 
                            name={getTransactionIcon(transactionType)} 
                          size={20} 
                            color={getTransactionColor(transactionType)} 
                        />
                      </View>
                      <View style={styles.transactionInfo}>
                        <Text style={styles.transactionTitle}>
                            {getTransactionTitle(transactionDescription)}
                        </Text>
                        <Text style={styles.transactionDate}>
                            {transactionDate ? formatTransactionDate(transactionDate) : 'Unknown date'}
                        </Text>
                      </View>
                      <View style={styles.transactionAmount}>
                        <Text style={[
                          styles.amount,
                            { color: getAmountColor(transactionType) }
                        ]}>
                            {transactionAmount ? `${transactionAmount > 0 ? '+' : ''}₱${Math.abs(transactionAmount).toFixed(2)}` : '₱0.00'}
                        </Text>
                        <View style={[
                          styles.statusBadge,
                            { backgroundColor: getStatusColor(transactionStatus) }
                        ]}>
                          <Text style={styles.statusText}>
                              {getStatusText(transactionStatus)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                      {transactionDescription && transactionDescription !== tx.reference && (
                      <Text style={styles.transactionDescription}>
                          {transactionDescription}
                      </Text>
                    )}
                    
                      {(tx.reference || tx.referenceNumber || tx.transactionId) && (
                      <Text style={styles.transactionReference}>
                          Ref: {tx.reference || tx.referenceNumber || tx.transactionId}
                      </Text>
                    )}
                  </View>
                  );
                })
              )}
            </View>
          )}
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
  content: {
    flex: 1,
    padding: 16,
  },
  balanceCard: {
    backgroundColor: '#0d4217',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ffffff20',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  balanceLabel: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 8,
  },
  balanceAmount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 4,
  },
  balanceValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  copyIcon: {
    marginLeft: 8,
    opacity: 0.8,
  },
  depositButton: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    padding: 12,
  },
  transactionSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  lastUpdatedText: {
    color: '#ffffff60',
    fontSize: 11,
    marginTop: 4,
  },
  refreshButton: {
    padding: 8,
  },
  transactionList: {
    gap: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    color: '#FFD700',
    fontSize: 16,
    marginTop: 8,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    color: '#ffffff80',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#0d4217',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#ffffff80',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  transactionCard: {
    backgroundColor: '#ffffff10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff20',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  transactionDate: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.6,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  amount: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  status: {
    color: '#4CAF50',
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  transactionDescription: {
    color: '#ffffff80',
    fontSize: 14,
    marginTop: 8,
    fontStyle: 'italic',
  },
  transactionReference: {
    color: '#ffffff60',
    fontSize: 12,
    marginTop: 4,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#bed2d0',
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  navItem: {
    alignItems: 'center',
    padding: 10,
  },
  inactiveNavItem: {
    opacity: 0.7,
  },
  inactiveIcon: {
    opacity: 0.7,
  },
}); 