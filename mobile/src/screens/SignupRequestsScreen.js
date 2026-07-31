import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';

export default function SignupRequestsScreen() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_BASE_URL}/api/signup-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setRequests(Array.isArray(data) ? data : []);
      } else {
        Alert.alert('Error', data.error || 'Failed to load signup requests');
      }
    } catch (err) {
      console.error('Fetch signup requests error:', err);
      Alert.alert('Error', 'Network error loading requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAction = async (id, action) => {
    try {
      setActionLoading((prev) => ({ ...prev, [id]: action }));
      const token = await AsyncStorage.getItem('userToken');
      const endpoint = action === 'accept' ? `/api/signup-requests/${id}/accept` : `/api/signup-requests/${id}/reject`;
      
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();

      if (res.ok) {
        Alert.alert('Success', data.message || `Request ${action}ed`);
        fetchRequests();
      } else {
        Alert.alert('Action Failed', data.error || 'Operation failed');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error performing action');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: null }));
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.userName}>{item.name || `${item.firstName} ${item.lastName}`}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{(item.requestedRole || 'worker').toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Company:</Text>
        <Text style={styles.detailVal}>{item.company || 'Bharath Enterprises'}</Text>
      </View>

      {item.phone ? (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phone:</Text>
          <Text style={styles.detailVal}>{item.phone}</Text>
        </View>
      ) : null}

      {item.idProofType ? (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>ID Proof:</Text>
          <Text style={styles.detailVal}>{item.idProofType.toUpperCase()} - {item.idProofNumber}</Text>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnReject]}
          disabled={!!actionLoading[item._id]}
          onPress={() => handleAction(item._id, 'reject')}
        >
          {actionLoading[item._id] === 'reject' ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.btnText}>❌ Reject</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnAccept]}
          disabled={!!actionLoading[item._id]}
          onPress={() => handleAction(item._id, 'accept')}
        >
          {actionLoading[item._id] === 'accept' ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.btnText}>✅ Accept</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📋 Pending Signup Requests</Text>
        <Text style={styles.subtitle}>Approve or reject new user account creation requests</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyText}>No pending signup requests</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRequests(); }} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  title: { fontSize: 20, fontWeight: '700', color: '#F8FAFC' },
  subtitle: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  list: { padding: 16 },
  card: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  userName: { fontSize: 16, fontWeight: '700', color: '#F8FAFC' },
  userEmail: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  roleBadge: { backgroundColor: '#312E81', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleText: { color: '#818CF8', fontSize: 11, fontWeight: '700' },
  detailRow: { flexDirection: 'row', marginBottom: 6 },
  detailLabel: { width: 90, fontSize: 13, color: '#94A3B8' },
  detailVal: { fontSize: 13, color: '#E2E8F0', fontWeight: '500' },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 14 },
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, minWidth: 100, alignItems: 'center' },
  btnAccept: { backgroundColor: '#10B981' },
  btnReject: { backgroundColor: '#EF4444' },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { color: '#94A3B8', fontSize: 15 }
});
