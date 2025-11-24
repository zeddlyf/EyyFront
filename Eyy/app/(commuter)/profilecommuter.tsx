import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, SafeAreaView, Platform, StatusBar, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
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

  useEffect(() => {
    const fetchWalletAndTransactions = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch wallets (assuming one wallet per user)
        const wallets = await walletAPI.getWallets();
        const wallet = Array.isArray(wallets) ? wallets[0] : wallets;
        setBalance(wallet?.amount ?? 0); // Map amount to balance
        setWalletId(wallet?._id ?? null);

        // Fetch payments (transactions)
        const payments = await paymentAPI.getPayments();
        setTransactions(Array.isArray(payments) ? payments : []);
      } catch (err: any) {
        setError(err.message || 'Failed to load wallet info');
      } finally {
        setLoading(false);
      }
    };
    fetchWalletAndTransactions();
  }, []);

  // Deposit handler
  const handleDeposit = async () => {
    if (!walletId || balance === null) return;
    setDepositing(true);
    setError(null);
    try {
      await walletAPI.updateWallet(walletId, { amount: balance + 500 });
      // Refresh wallet and transactions
      const wallets = await walletAPI.getWallets();
      const wallet = Array.isArray(wallets) ? wallets[0] : wallets;
      setBalance(wallet?.amount ?? 0);
      setWalletId(wallet?._id ?? null);
      const payments = await paymentAPI.getPayments();
      setTransactions(Array.isArray(payments) ? payments : []);
    } catch (err: any) {
      setError(err.message || 'Failed to deposit');
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
            <Text style={styles.sectionTitle}>Transaction History</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={() => {
              // Refresh transactions
              const fetchWalletAndTransactions = async () => {
                setLoading(true);
                setError(null);
                try {
                  const wallets = await walletAPI.getWallets();
                  const wallet = Array.isArray(wallets) ? wallets[0] : wallets;
                  setBalance(wallet?.amount ?? 0);
                  setWalletId(wallet?._id ?? null);
                  const payments = await paymentAPI.getPayments();
                  setTransactions(Array.isArray(payments) ? payments : []);
                } catch (err: any) {
                  setError(err.message || 'Failed to load wallet info');
                } finally {
                  setLoading(false);
                }
              };
              fetchWalletAndTransactions();
            }}>
              <Ionicons name="refresh" size={20} color="#FFD700" />
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <Ionicons name="reload" size={24} color="#FFD700" />
              <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={24} color="#ff6b6b" />
              <Text style={styles.errorText}>{error}</Text>
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
                transactions.map((tx, idx) => (
                  <View style={styles.transactionCard} key={tx._id || idx}>
                    <View style={styles.transactionHeader}>
                      <View style={styles.transactionIcon}>
                        <Ionicons 
                          name={getTransactionIcon(tx.type || tx.status)} 
                          size={20} 
                          color={getTransactionColor(tx.type || tx.status)} 
                        />
                      </View>
                      <View style={styles.transactionInfo}>
                        <Text style={styles.transactionTitle}>
                          {getTransactionTitle(tx.description || tx.reference || tx.type || 'Payment')}
                        </Text>
                        <Text style={styles.transactionDate}>
                          {tx.createdAt ? formatTransactionDate(tx.createdAt) : 'Unknown date'}
                        </Text>
                      </View>
                      <View style={styles.transactionAmount}>
                        <Text style={[
                          styles.amount,
                          { color: getAmountColor(tx.type || tx.status) }
                        ]}>
                          {tx.amount ? `${tx.amount > 0 ? '+' : ''}₱${tx.amount.toFixed(2)}` : '₱0.00'}
                        </Text>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(tx.status || 'success') }
                        ]}>
                          <Text style={styles.statusText}>
                            {getStatusText(tx.status || 'success')}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    {tx.description && tx.description !== tx.reference && (
                      <Text style={styles.transactionDescription}>
                        {tx.description}
                      </Text>
                    )}
                    
                    {tx.reference && (
                      <Text style={styles.transactionReference}>
                        Ref: {tx.reference}
                      </Text>
                    )}
                  </View>
                ))
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