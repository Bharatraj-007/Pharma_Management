import React, { useEffect, useState, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { AuthContext } from '../navigation/AuthContext';
import API_BASE_URL from '../config';
import ScreenWrapper from '../components/ScreenWrapper';
import { Btn, Spinner, EmptyState, AlertBanner } from '../components/ui';
import { colors, spacing, fontSize, radius } from '../styles/theme';

export default function NotificationsScreen() {
  const { session } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchNotifications = useCallback(async () => {
    if (!session?.token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: { Authorization: session.token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load notifications');
      setNotifications(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  const handleMarkAllRead = async () => {
    if (!session?.token) return;
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications/read`, {
        method: 'PUT',
        headers: { Authorization: session.token }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to mark read');
      setSuccess('All notifications marked as read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const renderNotifItem = ({ item }) => {
    const isTask = item.type === 'task';
    const isChat = item.type === 'chat';

    return (
      <View style={[
        s.notifCard,
        !item.isRead && s.unreadCard,
        { borderLeftColor: isTask ? colors.primary : isChat ? colors.success : colors.warning }
      ]}>
        <View style={{ flex: 1 }}>
          <Text style={[s.messageText, !item.isRead && s.unreadText]}>
            {item.message}
          </Text>
          <View style={s.metaRow}>
            <Text style={[
              s.typeText,
              { color: isTask ? colors.primary : isChat ? colors.success : colors.warning }
            ]}>
              {item.type?.toUpperCase()?.replace('_', ' ')}
            </Text>
            <Text style={s.dateText}>
              {new Date(item.createdAt).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
        {!item.isRead && <View style={s.unreadDot} />}
      </View>
    );
  };

  return (
    <ScreenWrapper style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Bell Notifications</Text>
        <TouchableOpacity
          style={s.markBtn}
          onPress={handleMarkAllRead}
          disabled={notifications.filter(n => !n.isRead).length === 0}
        >
          <Text style={s.markBtnText}>Mark All Read</Text>
        </TouchableOpacity>
      </View>

      <AlertBanner type="danger" message={error} />
      <AlertBanner type="success" message={success} />

      {loading && notifications.length === 0 ? (
        <Spinner />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderNotifItem}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <EmptyState message="You have no notifications yet!" />
          }
        />
      )}
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  markBtn: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[3],
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
  },
  markBtnText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.primary,
  },
  list: {
    padding: spacing[3],
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: spacing[3],
    borderRadius: radius.md,
    marginBottom: spacing[2],
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unreadCard: {
    backgroundColor: 'rgba(29, 78, 216, 0.03)',
  },
  messageText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  unreadText: {
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  typeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  dateText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: spacing[2],
  },
});
