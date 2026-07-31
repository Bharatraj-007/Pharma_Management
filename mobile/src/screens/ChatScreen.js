import React, { useEffect, useState, useCallback, useContext, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, Modal, Alert, ScrollView,
  Image, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { io } from 'socket.io-client';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { AuthContext } from '../navigation/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import API_BASE_URL from '../config';
import { AlertBanner, Spinner, Badge, Btn, EmptyState } from '../components/ui';
import { colors, spacing, fontSize } from '../styles/theme';

function getUserIdFromToken(token) {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const str = payload.replace(/-/g, '+').replace(/_/g, '/');
    let binary = '';
    const cleanStr = str.replace(/=+$/, '');
    for (let i = 0; i < cleanStr.length; i += 4) {
      const char1 = chars.indexOf(cleanStr[i]);
      const char2 = chars.indexOf(cleanStr[i+1]);
      const char3 = i + 2 < cleanStr.length ? chars.indexOf(cleanStr[i+2]) : 0;
      const char4 = i + 3 < cleanStr.length ? chars.indexOf(cleanStr[i+3]) : 0;
      
      const b1 = (char1 << 2) | (char2 >> 4);
      const b2 = ((char2 & 15) << 4) | (char3 >> 2);
      const b3 = ((char3 & 3) << 6) | char4;
      
      binary += String.fromCharCode(b1);
      if (i + 2 < cleanStr.length) binary += String.fromCharCode(b2);
      if (i + 3 < cleanStr.length) binary += String.fromCharCode(b3);
    }
    return JSON.parse(binary).id;
  } catch (e) {
    return null;
  }
}

// 🔊 Sub-component for playing voice messages
function VoicePlayer({ uri, duration }) {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const playSound = async () => {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            setPosition(status.positionMillis / 1000);
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPosition(0);
            }
          }
        }
      );
      setSound(newSound);
      setIsPlaying(true);
    } catch (err) {
      Alert.alert('Playback Error', 'Failed to play audio.');
    }
  };

  return (
    <TouchableOpacity onPress={playSound} style={s.audioRow}>
      <Text style={s.audioPlayBtn}>{isPlaying ? '⏸️' : '▶️'}</Text>
      <Text style={s.audioText}>
        Voice message ({duration ? `${Math.floor(duration)}s` : `${Math.round(position)}s`})
      </Text>
    </TouchableOpacity>
  );
}

export default function ChatScreen() {
  const { session, socket } = useContext(AuthContext);
  const { role } = usePermissions();
  const token = session?.token;
  const myUserId = session?.userId || getUserIdFromToken(token);
  const myName = session?.name || 'Me';

  // Active view states
  const [activeConv, setActiveConv] = useState(null); 
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Voice recording states
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const recordIntervalRef = useRef(null);

  // Modals / Selection states
  const [usersList, setUsersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);

  // Socket
  const [onlineUsers, setOnlineUsers] = useState([]);

  const listRef = useRef(null);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: token
  };

  // 1. Listen to Socket
  useEffect(() => {
    if (!myUserId || !socket) return;

    socket.emit('join', myUserId);

    const handleOnlineUsers = (users) => {
      setOnlineUsers(users);
    };

    const handleNewMessage = (msg) => {
      setMessages((prev) => {
        if (prev.some(m => m._id === msg._id)) return prev;
        if (String(msg.conversationId) === String(activeConv?.id || activeConv?._id)) {
          return [...prev, msg];
        }
        return prev;
      });
      loadConversations();
    };

    const handleMessageDeleted = (data) => {
      setMessages((prev) => prev.map(m => {
        if (String(m._id) === String(data.messageId)) {
          return {
            ...m,
            deletedForEveryone: true,
            deletedByName: data.deletedByName,
            text: null,
            mediaUrl: null,
            fileName: null
          };
        }
        return m;
      }));
    };

    socket.on('online_users', handleOnlineUsers);
    socket.on('new_message', handleNewMessage);
    socket.on('message_deleted', handleMessageDeleted);

    if (activeConv) {
      socket.emit('join_room', activeConv.id || activeConv._id);
    }

    return () => {
      socket.off('online_users', handleOnlineUsers);
      socket.off('new_message', handleNewMessage);
      socket.off('message_deleted', handleMessageDeleted);
    };
  }, [myUserId, activeConv, socket]);

  // 2. Fetch Conversations
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/conversations/${myUserId}`, { headers });
      if (res.ok) {
        setConversations(await res.json());
      }
    } catch {}
  }, [myUserId, token]);

  // 3. Fetch Users
  const loadUsersList = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, { headers });
      if (res.ok) {
        setUsersList(await res.json());
      }
    } catch {}
  }, [token]);

  useEffect(() => {
    if (token) {
      loadConversations();
      loadUsersList();
      setLoading(false);
    }
  }, [token, loadConversations, loadUsersList]);

  // 4. Fetch Message History
  useEffect(() => {
    if (!activeConv) return;
    const convId = activeConv.id || activeConv._id;

    async function loadHistory() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/messages/${convId}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
          
          if (socket) {
            socket.emit('join_room', convId);
          }
        }
      } catch {}
      finally { setLoading(false); }
    }

    loadHistory();
  }, [activeConv, socket]);

  // 5. Send Text Message
  const sendMessage = async () => {
    if (!draft.trim() || !activeConv) return;
    const convId = activeConv.id || activeConv._id;

    try {
      const payload = { conversationId: convId, text: draft.trim(), type: 'text' };
      const res = await fetch(`${API_BASE_URL}/api/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => {
          if (prev.some(m => m._id === data.msg._id)) return prev;
          return [...prev, data.msg];
        });
        setDraft('');
        loadConversations();
      }
    } catch (err) {
      setError('Send failed.');
    }
  };

  // 6. Voice Recording Actions
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Denied', 'Audio recording permission is required.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
      setRecordTime(0);

      recordIntervalRef.current = setInterval(() => {
        setRecordTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      Alert.alert('Recording Error', 'Failed to start recording.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    clearInterval(recordIntervalRef.current);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        await uploadAndSendFile(uri, 'voice', 'voice_message.m4a', recordTime);
      }
    } catch (err) {
      Alert.alert('Recording Error', 'Failed to save recording.');
    }
  };

  const cancelRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    clearInterval(recordIntervalRef.current);
    try {
      await recording.stopAndUnloadAsync();
      setRecording(null);
    } catch {}
  };

  // 7. General File Upload & Message Send
  const uploadAndSendFile = async (localUri, type, originalName, duration = 0) => {
    setUploading(true);
    setError('');
    try {
      const filename = localUri.split('/').pop() || originalName || 'file';
      const fileExt = filename.split('.').pop() || 'm4a';
      const mimeType = type === 'image' ? 'image/jpeg' : type === 'video' ? 'video/mp4' : type === 'voice' ? `audio/${fileExt === 'm4a' ? 'mp4' : fileExt}` : 'application/octet-stream';

      const formData = new FormData();
      formData.append('file', {
        uri: localUri,
        type: mimeType,
        name: filename
      });

      const res = await fetch(`${API_BASE_URL}/api/messages/upload`, {
        method: 'POST',
        headers: {
          Authorization: token
        },
        body: formData
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();

      const msgRes = await fetch(`${API_BASE_URL}/api/messages`, {
        method: 'POST',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId: activeConv.id || activeConv._id,
          type,
          mediaUrl: data.mediaUrl,
          fileName: data.fileName || originalName,
          duration
        })
      });

      if (msgRes.ok) {
        const msgData = await msgRes.json();
        setMessages((prev) => {
          if (prev.some(m => m._id === msgData.msg._id)) return prev;
          return [...prev, msgData.msg];
        });
        loadConversations();
      }
    } catch (err) {
      Alert.alert('Upload Error', 'Failed to upload attachment.');
    } finally {
      setUploading(false);
    }
  };

  // 8. Picking media (Image/Video)
  const pickImageOrVideo = async (mediaType = 'Images') => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Denied', 'Media library permission is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaType === 'Videos' ? ['videos'] : ['images'],
        allowsEditing: true,
        quality: 0.7
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let uri = asset.uri;

        if (mediaType === 'Images') {
          const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1080 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
          );
          uri = manipResult.uri;
        }

        const filename = uri.split('/').pop();
        await uploadAndSendFile(uri, mediaType === 'Videos' ? 'video' : 'image', filename);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick media.');
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let uri = asset.uri;
        
        const manipResult = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1080 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        uri = manipResult.uri;

        const filename = uri.split('/').pop();
        await uploadAndSendFile(uri, 'image', filename);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to capture photo.');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*'
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await uploadAndSendFile(asset.uri, 'file', asset.name);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to select document.');
    }
  };

  // ── Delete Message (long-press) ──────────────────────────────────────────
  const handleDeleteMessage = (msg) => {
    const isMine = String(msg.senderId) === String(myUserId);
    if (msg.deletedForEveryone) return; // already deleted

    const sentAt = new Date(msg.timestamp || msg.createdAt);
    const now = new Date();
    const diffMinutes = (now - sentAt) / (1000 * 60);
    const canDeleteForEveryone = isMine && diffMinutes <= 10;

    const buttons = [];

    if (canDeleteForEveryone) {
      buttons.push({
        text: '🚫 Delete for Everyone',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(`${API_BASE_URL}/api/messages/${msg._id}/for-everyone`, {
              method: 'DELETE',
              headers
            });
            const data = await res.json();
            if (res.ok) {
              setMessages((prev) => prev.map(m => {
                if (String(m._id) === String(msg._id)) {
                  return { ...m, deletedForEveryone: true, deletedByName: data.deletedByName || myName, text: null, mediaUrl: null, fileName: null };
                }
                return m;
              }));
            } else {
              Alert.alert('Error', data.error || 'Failed to delete');
            }
          } catch (err) {
            Alert.alert('Error', 'Failed to delete message');
          }
        }
      });
    }

    buttons.push({
      text: '🗑️ Delete for Me',
      onPress: async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/messages/${msg._id}/for-me`, {
            method: 'DELETE',
            headers
          });
          if (res.ok) {
            setMessages((prev) => prev.filter(m => String(m._id) !== String(msg._id)));
          } else {
            const data = await res.json();
            Alert.alert('Error', data.error || 'Failed to delete');
          }
        } catch (err) {
          Alert.alert('Error', 'Failed to delete message');
        }
      }
    });

    buttons.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(
      'Delete Message',
      canDeleteForEveryone
        ? 'This message was sent less than 10 minutes ago. You can delete it for everyone.'
        : isMine
          ? 'You can only delete for everyone within 10 minutes of sending.'
          : 'You can delete this message for yourself.',
      buttons
    );
  };

  // Start Chat
  const startIndividualChat = async (otherUser) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/conversations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ type: 'individual', participants: [otherUser._id] })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveConv(data);
        setShowNewChatModal(false);
        loadConversations();
      }
    } catch {}
  };

  // Create Group
  const createGroupChat = async () => {
    if (!groupName.trim() || selectedGroupMembers.length === 0) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/conversations`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ type: 'group', name: groupName.trim(), participants: selectedGroupMembers })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveConv(data);
        setGroupName('');
        setSelectedGroupMembers([]);
        setShowGroupModal(false);
        loadConversations();
      }
    } catch {}
  };

  // Manage Group Members
  const toggleGroupMember = async (action, memberId) => {
    if (!activeConv || activeConv.type !== 'group') return;
    const convId = activeConv.id || activeConv._id;
    try {
      const res = await fetch(`${API_BASE_URL}/api/conversations/${convId}/members`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ action, memberId })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveConv(data);
        Alert.alert('Group Updated', `Member successfully ${action}ed.`);
      }
    } catch {}
  };

  const getChatPartner = (conv) => {
    if (conv.type === 'group') return { name: conv.name, isOnline: false };
    const other = conv.participants?.find(p => String(p._id) !== String(myUserId));
    if (!other) return { name: 'User', isOnline: false };
    const isOnline = onlineUsers.includes(String(other._id));
    return { ...other, name: other.name, isOnline };
  };

  const filteredUsers = usersList.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render Conversation list item
  const renderConvItem = ({ item }) => {
    const partner = getChatPartner(item);
    return (
      <TouchableOpacity style={s.convRow} onPress={() => setActiveConv(item)}>
        <View style={s.avatarContainer}>
          <View style={[s.avatar, item.type === 'group' && s.avatarGroup]}>
            <Text style={s.avatarText}>{item.type === 'group' ? '👥' : partner.name?.charAt(0).toUpperCase()}</Text>
          </View>
          {item.type === 'individual' && partner.isOnline && <View style={s.onlineIndicator} />}
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.rowBetween}>
            <Text style={s.convName}>{partner.name}</Text>
            <Text style={s.convTime}>
              {item.lastMessageTime ? new Date(item.lastMessageTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
            </Text>
          </View>
          <Text style={s.convMsg} numberOfLines={1}>{item.lastMessage || 'No messages yet'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render Message item
  const renderMessage = ({ item }) => {
    const isMine = String(item.senderId) === String(myUserId);
    const senderName = activeConv?.participants?.find(p => String(p._id) === String(item.senderId))?.name || 'User';
    const mediaFullUrl = item.mediaUrl ? (item.mediaUrl.startsWith('http') ? item.mediaUrl : `${API_BASE_URL.replace('/api', '')}${item.mediaUrl}`) : '';

    // Show deleted placeholder
    if (item.deletedForEveryone) {
      return (
        <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleOther, { opacity: 0.6 }]}>
          <Text style={[s.bubbleMeta, isMine ? s.bubbleMetaMine : s.bubbleMetaOther]}>
            {isMine ? myName : senderName}
            {'  '}
            {item.timestamp ? new Date(item.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
            <Text style={{ fontSize: 16 }}>🚫</Text>
            <Text style={[s.bubbleText, { fontStyle: 'italic', color: isMine ? 'rgba(255,255,255,0.8)' : colors.textMuted }]}>
              This message was deleted{item.deletedByName ? ` by ${item.deletedByName}` : ''}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => handleDeleteMessage(item)}
        delayLongPress={400}
      >
        <View style={[s.bubble, isMine ? s.bubbleMine : s.bubbleOther]}>
          <Text style={[s.bubbleMeta, isMine ? s.bubbleMetaMine : s.bubbleMetaOther]}>
            {isMine ? myName : senderName}
            {'  '}
            {item.timestamp ? new Date(item.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
          
          {item.text ? <Text style={[s.bubbleText, isMine ? s.bubbleTextMine : {}]}>{item.text}</Text> : null}
          
          {item.type === 'image' && (
            <TouchableOpacity onPress={() => Linking.openURL(mediaFullUrl)}>
              <Image
                source={{ uri: mediaFullUrl }}
                style={{ width: 200, height: 150, borderRadius: 8, marginTop: 4 }}
                resizeMode="cover"
              />
            </TouchableOpacity>
          )}
          
          {item.type === 'video' && (
            <TouchableOpacity onPress={() => Linking.openURL(mediaFullUrl)} style={s.videoThumbnail}>
              <View style={s.videoPlayOverlay}>
                <Text style={{ fontSize: 24, color: '#fff' }}>▶️</Text>
              </View>
              <Text style={s.videoLabel}>Play Video</Text>
            </TouchableOpacity>
          )}
          
          {item.type === 'file' && (
            <TouchableOpacity onPress={() => Linking.openURL(mediaFullUrl)} style={s.fileCard}>
              <Text style={{ fontSize: 20 }}>📄</Text>
              <Text style={[s.fileText, isMine ? { color: '#fff' } : {}]} numberOfLines={1}>
                {item.fileName || 'Download Document'}
              </Text>
            </TouchableOpacity>
          )}
          
          {item.type === 'voice' && (
            <VoicePlayer uri={mediaFullUrl} duration={item.duration} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.safe} edges={['bottom']}>
      {activeConv === null ? (
        // ── VIEW 1: CONVERSATIONS LIST ──
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={[s.rowBetween, s.header]}>
            <View>
              <Text style={s.headerTitle}>💬 Team Messages</Text>
              <Text style={s.headerSub}>Role: {role.toUpperCase()}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              <TouchableOpacity style={s.iconBtn} onPress={() => setShowNewChatModal(true)}>
                <Text style={s.iconBtnText}>＋</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.iconBtn, { width: 64, borderRadius: 16 }]} onPress={() => setShowGroupModal(true)}>
                <Text style={[s.iconBtnText, { fontSize: fontSize.sm }]}>Group</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* List */}
          {loading && conversations.length === 0 ? <Spinner /> : (
            <FlatList
              data={conversations}
              keyExtractor={(item) => item._id || item.id}
              renderItem={renderConvItem}
              contentContainerStyle={{ padding: spacing[3] }}
              ListEmptyComponent={<EmptyState message="No chats yet. Tap ＋ to start!" />}
            />
          )}
        </View>
      ) : (
        // ── VIEW 2: CHAT TIMELINE ──
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={90}>
          {/* Active Chat Header */}
          <View style={[s.rowBetween, s.header]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
              <TouchableOpacity style={s.backBtn} onPress={() => { setActiveConv(null); loadConversations(); }}>
                <Text style={s.backBtnText}>←</Text>
              </TouchableOpacity>
              <View>
                <Text style={s.headerTitle}>
                  {activeConv.type === 'group' ? `👥 ${activeConv.name}` : getChatPartner(activeConv).name}
                </Text>
                {activeConv.type === 'group' ? (
                  <Text style={s.headerSub}>{activeConv.participants?.length || 0} members</Text>
                ) : (
                  <Text style={s.headerSub}>
                    {getChatPartner(activeConv).isOnline ? (
                      '🟢 Online'
                    ) : (
                      `⚪ Last active: ${
                        getChatPartner(activeConv).lastActive
                          ? new Date(getChatPartner(activeConv).lastActive).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Offline'
                      }`
                    )}
                  </Text>
                )}
              </View>
            </View>

            {/* Member Controls (conditional) */}
            {activeConv.type === 'group' && String(activeConv.groupAdmin) === String(myUserId) && (
              <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                <Btn
                  label="+ Add"
                  size="sm"
                  variant="success"
                  onPress={() => {
                    const nonMembers = usersList.filter(u => !activeConv.participants?.some(p => String(p._id) === String(u._id)));
                    if (nonMembers.length === 0) {
                      Alert.alert('Members', 'All company users are already in this group.');
                      return;
                    }
                    Alert.alert('Add Member', 'Select user to add:', nonMembers.map(u => ({
                      text: u.name,
                      onPress: () => toggleGroupMember('add', u._id)
                    })));
                  }}
                />
                <Btn
                  label="- Remove"
                  size="sm"
                  variant="danger"
                  onPress={() => {
                    const members = activeConv.participants.filter(p => String(p._id) !== String(myUserId));
                    if (members.length === 0) {
                      Alert.alert('Members', 'No other members in this group.');
                      return;
                    }
                    Alert.alert('Remove Member', 'Select user to remove:', members.map(m => ({
                      text: m.name,
                      onPress: () => toggleGroupMember('remove', m._id)
                    })));
                  }}
                />
              </View>
            )}
          </View>

          <AlertBanner type="danger" message={error} style={{ margin: spacing[3], marginBottom: 0 }} />

          {/* Timeline FlatList */}
          {loading && messages.length === 0 ? <Spinner /> : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item, i) => item._id || String(i)}
              renderItem={renderMessage}
              contentContainerStyle={s.listContent}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
              initialNumToRender={15}
              maxToRenderPerBatch={10}
              windowSize={11}
              removeClippedSubviews={Platform.OS === 'android'}
              ListEmptyComponent={
                <View style={s.noChat}><Text style={s.noChatText}>No messages yet. Say hello!</Text></View>
              }
            />
          )}

          {/* Recording Status Bar */}
          {isRecording && (
            <View style={s.recordingBar}>
              <Text style={s.recordingText}>🔴 Recording Voice: {recordTime}s</Text>
              <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                <TouchableOpacity style={s.recordCancelBtn} onPress={cancelRecording}>
                  <Text style={s.recordBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.recordSendBtn} onPress={stopRecording}>
                  <Text style={s.recordBtnText}>Send</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Input Bar */}
          <View style={s.inputRow}>
            <TouchableOpacity
              style={s.attachBtn}
              onPress={() => {
                Alert.alert('Attach Media', 'Choose an option:', [
                  { text: '📷 Take Photo', onPress: takePhoto },
                  { text: '🖼️ Choose Photo from Library', onPress: () => pickImageOrVideo('Images') },
                  { text: '🎥 Choose Video from Library', onPress: () => pickImageOrVideo('Videos') },
                  { text: '📄 Attach Document', onPress: pickDocument },
                  { text: 'Cancel', style: 'cancel' }
                ]);
              }}
              disabled={uploading}
            >
              <Text style={s.attachBtnText}>📎</Text>
            </TouchableOpacity>

            <TextInput
              style={s.input}
              value={draft}
              onChangeText={setDraft}
              placeholder={uploading ? 'Uploading media...' : `Message ${activeConv.type === 'group' ? activeConv.name : getChatPartner(activeConv).name}…`}
              placeholderTextColor={colors.textLight}
              multiline
              disabled={uploading || isRecording}
            />

            {!draft.trim() && !isRecording ? (
              <TouchableOpacity
                style={s.micBtn}
                onPress={startRecording}
                disabled={uploading}
              >
                <Text style={s.micBtnText}>🎤</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[s.sendBtn, (!draft.trim() || loading || uploading) && s.sendBtnDisabled]}
                onPress={sendMessage}
                disabled={!draft.trim() || loading || uploading}
              >
                <Text style={s.sendBtnText}>{uploading ? '⏳' : 'Send'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ── MODAL 1: START NEW CHAT ── */}
      <Modal visible={showNewChatModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={[s.rowBetween, { marginBottom: spacing[3] }]}>
              <Text style={s.modalTitle}>Start New Chat</Text>
              <TouchableOpacity onPress={() => setShowNewChatModal(false)}>
                <Text style={s.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={s.modalInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search user or designation..."
              placeholderTextColor={colors.textLight}
            />
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.userRow} onPress={() => startIndividualChat(item)}>
                  <View style={s.avatarSmall}>
                    <Text style={s.avatarSmallText}>{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View>
                    <Text style={s.userNameText}>{item.name}</Text>
                    <Text style={s.userSubText}>{item.role?.toUpperCase()} · {item.department || 'General'}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* ── MODAL 2: CREATE GROUP ── */}
      <Modal visible={showGroupModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={[s.rowBetween, { marginBottom: spacing[3] }]}>
              <Text style={s.modalTitle}>Create Group Chat</Text>
              <TouchableOpacity onPress={() => { setShowGroupModal(false); setGroupName(''); setSelectedGroupMembers([]); }}>
                <Text style={s.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={s.modalInput}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Group Name (e.g. Mixing Department)..."
              placeholderTextColor={colors.textLight}
            />

            <Text style={{ fontSize: fontSize.sm, fontWeight: '700', marginBottom: spacing[2] }}>Select Members</Text>
            <ScrollView style={{ maxHeight: 200, marginBottom: spacing[4] }}>
              {usersList.map((u) => {
                const checked = selectedGroupMembers.includes(u._id);
                return (
                  <TouchableOpacity
                    key={u._id}
                    style={s.memberCheckRow}
                    onPress={() => {
                      const next = checked
                        ? selectedGroupMembers.filter(id => id !== u._id)
                        : [...selectedGroupMembers, u._id];
                      setSelectedGroupMembers(next);
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{checked ? '☑️' : '⬜'}</Text>
                    <View style={{ marginLeft: spacing[2] }}>
                      <Text style={s.userNameText}>{u.name}</Text>
                      <Text style={s.userSubText}>{u.role?.toUpperCase()}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Btn
              label="Create Group"
              onPress={createGroupChat}
              disabled={!groupName.trim() || selectedGroupMembers.length === 0}
              variant="primary"
              block
              size="lg"
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:           { flex:1, backgroundColor:colors.background },
  header:         { backgroundColor:colors.surface, borderBottomWidth:1, borderBottomColor:colors.border, padding:spacing[4] },
  headerTitle:    { fontSize:fontSize.lg, fontWeight:'700', color:colors.text },
  headerSub:      { fontSize:fontSize.xs, color:colors.textMuted, marginTop:2 },
  rowBetween:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBtn:        { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  iconBtnText:    { color: '#fff', fontSize: fontSize.lg, fontWeight: '700' },
  backBtn:        { paddingRight: spacing[2] },
  backBtnText:    { fontSize: 24, fontWeight: '700', color: colors.primary },

  // Conversations List
  convRow:        { flexDirection: 'row', padding: spacing[4], backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center', gap: spacing[3] },
  avatarContainer:{ position: 'relative' },
  avatar:         { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarGroup:    { backgroundColor: colors.accent },
  avatarText:     { color: '#fff', fontWeight: '800', fontSize: 16 },
  onlineIndicator:{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: colors.success, borderColor: '#fff', borderWidth: 2 },
  convName:       { fontWeight: '700', color: colors.text, fontSize: fontSize.base },
  convTime:       { fontSize: fontSize.xs, color: colors.textMuted },
  convMsg:        { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4 },

  // Chat Bubbles
  listContent:    { padding:spacing[3], paddingBottom:spacing[4] },
  noChat:         { flex:1, alignItems:'center', justifyContent:'center', padding:spacing[8] },
  noChatText:     { color:colors.textMuted, textAlign:'center', fontSize:fontSize.base, lineHeight:22 },
  bubble:         { maxWidth:'80%', marginBottom:spacing[3], borderRadius:12, padding:spacing[3] },
  bubbleMine:     { alignSelf:'flex-end', backgroundColor:colors.primary },
  bubbleOther:    { alignSelf:'flex-start', backgroundColor:colors.surface, borderWidth:1, borderColor:colors.border },
  bubbleMeta:     { fontSize:fontSize.xs, marginBottom:4 },
  bubbleMetaMine: { color:'rgba(255,255,255,0.75)' },
  bubbleMetaOther:{ color:colors.textMuted },
  bubbleText:     { fontSize:fontSize.base, color:colors.text },
  bubbleTextMine: { color:'#fff' },

  // Custom attachment bubbles
  videoThumbnail: { width: 180, height: 120, backgroundColor: '#334155', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  videoPlayOverlay: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  videoLabel:     { color: '#fff', fontSize: fontSize.xs, fontWeight: '700', marginTop: 8 },
  fileCard:       { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: 'rgba(0,0,0,0.05)', padding: spacing[3], borderRadius: 8, marginTop: 4, width: 200 },
  fileText:       { fontSize: fontSize.sm, color: colors.text, flex: 1 },
  audioRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.05)', padding: spacing[2], borderRadius: 8, marginTop: 4, gap: spacing[2], width: 200 },
  audioPlayBtn:   { fontSize: 18 },
  audioText:      { fontSize: fontSize.sm, color: colors.text, flex: 1 },

  // Input Row
  inputRow:       { flexDirection:'row', padding:spacing[3], backgroundColor:colors.surface, borderTopWidth:1, borderTopColor:colors.border, alignItems:'center', gap:spacing[2] },
  input:          { flex:1, backgroundColor:colors.background, borderWidth:1, borderColor:colors.border, borderRadius:20, paddingHorizontal:spacing[4], paddingVertical:spacing[2], fontSize:fontSize.base, color:colors.text, maxHeight:100 },
  sendBtn:        { backgroundColor:colors.primary, borderRadius:20, paddingHorizontal:spacing[4], paddingVertical:spacing[3] },
  sendBtnDisabled:{ opacity:0.45 },
  sendBtnText:    { color:'#fff', fontWeight:'700', fontSize:fontSize.sm },
  attachBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  attachBtnText:  { fontSize: 18 },
  micBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  micBtnText:     { fontSize: 18, color: '#fff' },

  // Recording Status Bar
  recordingBar:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fee2e2', padding: spacing[3], borderTopWidth: 1, borderTopColor: '#fca5a5' },
  recordingText:  { color: '#991b1b', fontWeight: '700', fontSize: fontSize.sm },
  recordCancelBtn:{ backgroundColor: '#ef4444', borderRadius: 12, paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  recordSendBtn:  { backgroundColor: colors.success, borderRadius: 12, paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  recordBtnText:  { color: '#fff', fontWeight: '700', fontSize: fontSize.xs },

  // Modals Overlay
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing[4] },
  modalCard:      { backgroundColor: colors.surface, borderRadius: 12, padding: spacing[4], maxHeight: '80%' },
  modalTitle:     { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  modalCloseText: { fontSize: 20, fontWeight: '700', color: colors.textMuted },
  modalInput:     { height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: spacing[3], fontSize: fontSize.base, color: colors.text, marginBottom: spacing[4], backgroundColor: colors.background },
  
  // User list rows
  userRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing[3] },
  avatarSmall:    { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarSmallText:{ color: '#fff', fontWeight: '700', fontSize: 14 },
  userNameText:   { fontWeight: '700', fontSize: fontSize.base, color: colors.text },
  userSubText:    { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },

  // Group creator checklist
  memberCheckRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.border }
});
