/**
 * NotificationBell — header bell icon with unread badge and dropdown panel.
 *
 * Features:
 *  - Polls /api/notifications every 15 s (same as web Navbar)
 *  - Real-time updates via Socket.IO "notification" event
 *  - Unread red badge count
 *  - Tap bell → slide-down panel with last 20 notifications
 *  - Marks all as read when panel opens
 *  - Works in Expo Go (no push token required for in-app display)
 */
import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  FlatList, Pressable, ActivityIndicator,
} from 'react-native';
import { io } from 'socket.io-client';
import { AuthContext } from '../navigation/AuthContext';
import API_BASE_URL from '../config';
import { colors, spacing, fontSize, radius } from '../styles/theme';

const POLL_MS = 15_000;

export default function NotificationBell() {
  const { session } = useContext(AuthContext);
  const token = session?.token;
  const userId = session?.id || session?.userId;

  const [notifications, setNotifications] = useState([]);
  const [visible,       setVisible]       = useState(false);
  const [loading,       setLoading]       = useState(false);

  const socketRef   = useRef(null);
  const intervalRef = useRef(null);

  // ── Fetch notifications ────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res  = await fetch(`${API_BASE_URL}/api/notifications`, {
        headers: { Authorization: token },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      // Silent — background polling, don't bother the user
    }
  }, [token]);

  // ── Mark all as read ───────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}/api/notifications/read`, {
        method: 'PUT',
        headers: { Authorization: token },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) { /* ignore */ }
  }, [token]);

  // ── Socket.IO real-time listener ───────────────────────────────────────────
  useEffect(() => {
    if (!token || !userId) return;

    try {
      const socket = io(API_BASE_URL, {
        transports: ['websocket'],
        reconnectionAttempts: 5,
        timeout: 10000,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join', String(userId));
      });

      socket.on('notification', (notif) => {
        setNotifications((prev) => [notif, ...prev]);
      });

      socket.on('connect_error', () => {
        // Socket unavailable — polling will cover it
      });
    } catch (err) {
      // Socket.IO not available in this environment — polling only
    }

    return () => {
      try { socketRef.current?.disconnect(); } catch (e) { /* ignore */ }
    };
  }, [token, userId]);

  // ── Polling ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    fetchNotifications();
    intervalRef.current = setInterval(fetchNotifications, POLL_MS);
    return () => clearInterval(intervalRef.current);
  }, [fetchNotifications]);

  // ── Open panel ─────────────────────────────────────────────────────────────
  const openPanel = () => {
    setVisible(true);
    if (unreadCount > 0) markAllRead();
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // ── Notification row ───────────────────────────────────────────────────────
  const renderItem = ({ item }) => (
    <View style={[ns.row, !item.isRead && ns.rowUnread]}>
      <Text style={ns.typeIcon}>
        {item.type === 'task' ? '📋' : item.type === 'chat' ? '💬' : item.type === 'leave' ? '🗓️' : '🔔'}
      </Text>
      <View style={{ flex: 1 }}>
        <Text style={[ns.msg, !item.isRead && ns.msgBold]}>{item.message}</Text>
        <Text style={ns.time}>
          {item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN') : ''}
        </Text>
      </View>
    </View>
  );

  return (
    <>
      {/* ── Bell button ── */}
      <TouchableOpacity style={ns.bellBtn} onPress={openPanel} activeOpacity={0.7}>
        <Text style={ns.bellIcon}>🔔</Text>
        {unreadCount > 0 && (
          <View style={ns.badge}>
            <Text style={ns.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* ── Notification panel (modal) ── */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={ns.overlay} onPress={() => setVisible(false)}>
          {/* Stop press propagation so tapping the panel itself doesn't close it */}
          <Pressable style={ns.panel} onPress={(e) => e.stopPropagation()}>

            {/* Header */}
            <View style={ns.panelHeader}>
              <Text style={ns.panelTitle}>🔔 Notifications</Text>
              <TouchableOpacity onPress={() => setVisible(false)} style={ns.closeBtn}>
                <Text style={ns.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* List */}
            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ margin: spacing[4] }} />
            ) : notifications.length === 0 ? (
              <View style={ns.empty}>
                <Text style={ns.emptyText}>No notifications yet</Text>
              </View>
            ) : (
              <FlatList
                data={notifications.slice(0, 20)}
                keyExtractor={(item, i) => String(item._id || i)}
                renderItem={renderItem}
                style={{ maxHeight: 420 }}
                showsVerticalScrollIndicator={false}
              />
            )}

            {/* Footer — mark all read */}
            {notifications.some((n) => !n.isRead) && (
              <TouchableOpacity style={ns.footerBtn} onPress={markAllRead}>
                <Text style={ns.footerText}>Mark all as read</Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const ns = StyleSheet.create({
  // Bell
  bellBtn: {
    marginRight: spacing[3],
    padding: 6,
    position: 'relative',
  },
  bellIcon: { fontSize: 22 },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },

  // Overlay + panel
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-start',
    paddingTop: 56,          // push panel just below header
    paddingHorizontal: spacing[3],
  },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },

  // Panel header
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  panelTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  closeBtn:   { padding: 4 },
  closeText:  { fontSize: 16, color: colors.textMuted, fontWeight: '700' },

  // Rows
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing[2],
  },
  rowUnread: {
    backgroundColor: '#eff6ff',
  },
  typeIcon: { fontSize: 16, marginTop: 1 },
  msg:      { fontSize: fontSize.sm, color: colors.text, lineHeight: 18 },
  msgBold:  { fontWeight: '700' },
  time:     { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  // Empty
  empty:     { padding: spacing[5], alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: fontSize.sm },

  // Footer
  footerBtn: {
    padding: spacing[3],
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  footerText: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '700' },
});
