import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { WebCard, WebBtn, WebInput } from '../components/WebUI.web';
import { webColors, webSpacing, webFontSize } from '../styles/webTheme';

export default function ChatScreen({ apiBaseUrl, session }) {
  const token = session?.token;
  const company = session?.company || 'bharath';
  const name = session?.name || 'User';

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  const fetchMessages = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/chat/messages?company=${company}`, {
        headers: { Authorization: token },
      });
      if (res.ok) setMessages(await res.json());
    } catch (e) {}
  }, [apiBaseUrl, token, company]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const handleSendMessage = async () => {
    if (!text.trim()) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/chat/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ company, text, senderName: name }),
      });
      if (res.ok) {
        setText('');
        fetchMessages();
      }
    } catch (e) {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💬 Team Chat & Announcements</Text>
        <Text style={styles.headerSubtitle}>Real-time workplace communication and company announcements.</Text>
      </View>

      <WebCard style={styles.chatCard}>
        <ScrollView style={styles.messageBox} contentContainerStyle={{ gap: 10 }}>
          {messages.length === 0 ? (
            <Text style={{ color: webColors.textMuted }}>No messages yet. Start the conversation!</Text>
          ) : (
            messages.map((m, idx) => (
              <View key={m._id || idx} style={styles.msgBubble}>
                <Text style={styles.msgSender}>{m.senderName || m.sender?.name || 'Staff'}:</Text>
                <Text style={styles.msgText}>{m.text}</Text>
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <WebInput
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            style={{ flex: 1, marginBottom: 0 }}
          />
          <WebBtn label="🚀 Send" onPress={handleSendMessage} variant="primary" />
        </View>
      </WebCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: webSpacing.lg },
  header: { marginBottom: webSpacing.xs },
  headerTitle: { fontSize: webFontSize.title, fontWeight: '800', color: webColors.text },
  headerSubtitle: { fontSize: webFontSize.base, color: webColors.textMuted, marginTop: 4 },
  chatCard: { height: 500, justifyContent: 'space-between' },
  messageBox: { flex: 1, marginBottom: 16 },
  msgBubble: { padding: 10, borderRadius: 8, backgroundColor: webColors.surfaceAlt },
  msgSender: { fontSize: 11, fontWeight: '800', color: webColors.primary },
  msgText: { fontSize: 14, color: webColors.text, marginTop: 2 },
  inputRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
});
