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
          <Text style={styles.sectionTitle}>Transaction</Text>
          {loading ? (
            <Text style={{ color: '#fff', marginTop: 16 }}>Loading...</Text>
          ) : error ? (
            <Text style={{ color: 'red', marginTop: 16 }}>{error}</Text>
          ) : (
            <View style={styles.transactionList}>
              {transactions.length === 0 ? (
                <Text style={{ color: '#fff', opacity: 0.7 }}>No transactions found.</Text>
              ) : (
                transactions.map((tx, idx) => (
                  <View style={styles.transactionItem} key={tx._id || idx}>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionTitle}>{tx.description || tx.reference || 'Payment'}</Text>
                      <Text style={styles.transactionDate}>{tx.createdAt ? new Date(tx.createdAt).toLocaleString() : ''}</Text>
                    </View>
                    <View style={styles.transactionAmount}>
                      <Text style={styles.amount}>{tx.amount ? `${tx.amount.toFixed(2)} php` : ''}</Text>
                      <Text style={styles.status}>{tx.status || 'Success'}</Text>
                    </View>
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
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  transactionList: {
    gap: 16,
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