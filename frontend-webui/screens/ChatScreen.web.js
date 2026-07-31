import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { WebCard, WebBtn, WebInput } from '../components/WebUI.web';
import { webColors, webSpacing, webFontSize } from '../styles/webTheme';

export default function ChatScreen({ apiBaseUrl, session }) {
  const token = session?.token;
  const currentUserId = session?.userId;
  const userName = session?.name || 'User';

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/chat/conversations`, {
        headers: { Authorization: token },
      });
      if (res.ok) {
        const json = await res.json();
        setConversations(json.data || []);
      }
    } catch (e) {}
  }, [apiBaseUrl, token]);

  const fetchMessages = useCallback(async (convId) => {
    if (!token || !convId) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/chat/messages?conversationId=${convId}`, {
        headers: { Authorization: token },
      });
      if (res.ok) {
        const json = await res.json();
        setMessages(json.data || []);
      }
    } catch (e) {}
  }, [apiBaseUrl, token]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleSelectConv = (conv) => {
    setActiveConv(conv);
    fetchMessages(conv._id);
  };

  const handleSendMessage = async () => {
    if (!text || !activeConv) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({
          conversationId: activeConv._id,
          text,
        }),
      });
      if (res.ok) {
        setText('');
        fetchMessages(activeConv._id);
      }
    } catch (e) {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💬 Internal Team Chat</Text>
        <Text style={styles.headerSubtitle}>Real-time messaging, announcements, and group discussions.</Text>
      </View>

      <View style={styles.chatLayout}>
        {/* Conversations Sidebar */}
        <WebCard title="Conversations" style={styles.convCard}>
          <ScrollView style={{ maxHeight: 500 }}>
            {conversations.map((c) => (
              <TouchableOpacity
                key={c._id}
                style={[styles.convItem, activeConv?._id === c._id && styles.convItemActive]}
                onPress={() => handleSelectConv(c)}
              >
                <Text style={styles.convTitle}>{c.name || 'Chat Conversation'}</Text>
                <Text style={styles.convSub}>{c.lastMessage?.text || 'No messages yet'}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </WebCard>

        {/* Message Thread */}
        <WebCard title={activeConv ? activeConv.name || 'Conversation' : 'Select a Conversation'} style={styles.threadCard}>
          {activeConv ? (
            <>
              <ScrollView style={styles.msgList} contentContainerStyle={{ paddingVertical: 12 }}>
                {messages.map((m) => {
                  const isMine = m.sender?._id === currentUserId || m.senderName === userName;
                  return (
                    <View key={m._id} style={[styles.msgBubble, isMine ? styles.msgMine : styles.msgOther]}>
                      <Text style={[styles.msgSender, isMine && { color: '#e0e7ff' }]}>{m.senderName || 'Team Member'}</Text>
                      <Text style={[styles.msgText, isMine && { color: '#ffffff' }]}>{m.text}</Text>
                      <Text style={[styles.msgTime, isMine && { color: '#cbd5e1' }]}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.inputRow}>
                <WebInput value={text} onChangeText={setText} placeholder="Type your message..." style={{ flex: 1, marginBottom: 0 }} />
                <WebBtn label="Send 🚀" onPress={handleSendMessage} variant="primary" />
              </View>
            </>
          ) : (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: webFontSize.base, color: webColors.textMuted }}>Select a conversation to start messaging.</Text>
            </View>
          )}
        </WebCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: webSpacing.lg },
  header: { marginBottom: webSpacing.md },
  headerTitle: { fontSize: webFontSize.title, fontWeight: '800', color: webColors.text },
  headerSubtitle: { fontSize: webFontSize.base, color: webColors.textMuted, marginTop: 4 },
  chatLayout: { flexDirection: 'row', gap: 20, flexWrap: 'wrap' },
  convCard: { width: 300 },
  threadCard: { flex: 1, minWidth: 400, height: 560, justifyContent: 'space-between' },
  convItem: { padding: 12, borderRadius: 8, borderBottomWidth: 1, borderBottomColor: webColors.border, marginVertical: 2 },
  convItemActive: { backgroundColor: '#eef2ff', borderColor: webColors.primary },
  convTitle: { fontWeight: '700', fontSize: webFontSize.base, color: webColors.text },
  convSub: { fontSize: webFontSize.xs, color: webColors.textMuted, marginTop: 2 },
  msgList: { flex: 1, gap: 10 },
  msgBubble: { padding: 12, borderRadius: 12, maxWidth: '75%', marginVertical: 4 },
  msgMine: { backgroundColor: webColors.primary, alignSelf: 'flex-end' },
  msgOther: { backgroundColor: webColors.surfaceAlt, alignSelf: 'flex-start' },
  msgSender: { fontSize: 11, fontWeight: '700', color: webColors.textMuted, marginBottom: 2 },
  msgText: { fontSize: webFontSize.base, color: webColors.text },
  msgTime: { fontSize: 10, color: webColors.textMuted, alignSelf: 'flex-end', marginTop: 4 },
  inputRow: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: webColors.border },
});
