import React, { useEffect, useState, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import API_BASE_URL from "../config";
import { usePermissions } from "../hooks/usePermissions";

function getUserIdFromToken(token) {
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload).id;
  } catch (e) {
    return null;
  }
}

function Chat() {
  const { role } = usePermissions();
  const token = localStorage.getItem("token");
  const myUserId = localStorage.getItem("userId") || localStorage.getItem("id") || getUserIdFromToken(token);
  const myName = localStorage.getItem("name") || "Me";

  // State
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Modals / Searches
  const [usersList, setUsersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  
  // Group Create Form
  const [groupName, setGroupName] = useState("");
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);

  // Socket
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const messagesEndRef = useRef(null);

  const headers = {
    "Content-Type": "application/json",
    Authorization: token
  };

  // 1. Initialize Socket Connection
  useEffect(() => {
    if (!myUserId || !token) return;

    const activeSocket = window.socket || io(API_BASE_URL.replace("/api", ""), {
      transports: ["websocket", "polling"]
    });
    
    if (!window.socket) {
      window.socket = activeSocket;
    }

    activeSocket.emit("join", myUserId);

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
          return { ...m, deletedForEveryone: true, deletedByName: data.deletedByName, text: null, mediaUrl: null, fileName: null };
        }
        return m;
      }));
    };

    activeSocket.on("online_users", handleOnlineUsers);
    activeSocket.on("new_message", handleNewMessage);
    activeSocket.on("message_deleted", handleMessageDeleted);
    
    if (activeConv) {
      activeSocket.emit("join_room", activeConv.id || activeConv._id);
    }

    setSocket(activeSocket);

    return () => {
      activeSocket.off("online_users", handleOnlineUsers);
      activeSocket.off("new_message", handleNewMessage);
      activeSocket.off("message_deleted", handleMessageDeleted);
    };
  }, [myUserId, activeConv]);

  // 2. Fetch Conversations List
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/conversations/${myUserId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch {}
  }, [myUserId, token]);

  // 3. Fetch Company Users List
  const loadUsersList = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, { headers });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
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

  // 4. Fetch Message History for selected Conversation
  useEffect(() => {
    if (!activeConv) return;
    
    async function loadHistory() {
      const convId = activeConv.id || activeConv._id;
      try {
        const res = await fetch(`${API_BASE_URL}/api/messages/${convId}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
          
          // Join socket room
          if (socket) {
            socket.emit("join_room", convId);
          }
        }
      } catch {}
    }

    loadHistory();
  }, [activeConv, socket]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 5. Send Message
  const sendMessage = async () => {
    if (!draft.trim() || !activeConv) return;
    const convId = activeConv.id || activeConv._id;

    try {
      const payload = {
        conversationId: convId,
        text: draft.trim()
      };

      const res = await fetch(`${API_BASE_URL}/api/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => {
          if (prev.some(m => m._id === data.msg._id)) return prev;
          return [...prev, data.msg];
        });
        setDraft("");
        loadConversations();
      }
    } catch (err) {
      setError("Failed to send message.");
    }
  };

  // Start Individual Chat
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE_URL}/api/messages/upload`, {
        method: "POST",
        headers: { Authorization: token },
        body: formData
      });

      if (!res.ok) throw new Error("Upload failed.");
      const data = await res.json();

      let type = "file";
      if (file.type.startsWith("image/")) type = "image";
      else if (file.type.startsWith("video/")) type = "video";
      else if (file.type.startsWith("audio/")) type = "voice";

      const msgRes = await fetch(`${API_BASE_URL}/api/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          conversationId: activeConv.id || activeConv._id,
          type,
          mediaUrl: data.mediaUrl,
          fileName: data.fileName
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
      setError("File upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const startIndividualChat = async (otherUser) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/conversations`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "individual",
          participants: [otherUser._id]
        })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveConv(data);
        setShowNewChatModal(false);
        loadConversations();
      }
    } catch {}
  };

  // Create Group Chat
  const createGroupChat = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || selectedGroupMembers.length === 0) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/conversations`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "group",
          name: groupName.trim(),
          participants: selectedGroupMembers
        })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveConv(data);
        setGroupName("");
        setSelectedGroupMembers([]);
        setShowGroupModal(false);
        loadConversations();
      }
    } catch {}
  };

  // Manage Group Members
  const toggleGroupMember = async (action, memberId) => {
    if (!activeConv || activeConv.type !== "group") return;
    const convId = activeConv.id || activeConv._id;
    try {
      const res = await fetch(`${API_BASE_URL}/api/conversations/${convId}/members`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ action, memberId })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveConv(data);
      }
    } catch {}
  };

  const getChatPartner = (conv) => {
    if (conv.type === "group") return { name: conv.name, isOnline: false };
    const other = conv.participants?.find(p => String(p._id) !== String(myUserId));
    if (!other) return { name: "User", isOnline: false };
    const isOnline = onlineUsers.includes(String(other._id));
    return { ...other, name: other.name, isOnline };
  };

  const filteredUsers = usersList.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h1>💬 Team Messages</h1>
        <p>Real-time corporate messaging and group collaboration.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "20px", height: "calc(100vh - 220px)", minHeight: "500px" }}>
        
        {/* LEFT PANE: Conversations list */}
        <div className="sp-card" style={{ display: "flex", flexDirection: "column", height: "100%", padding: 0 }}>
          <div style={{ padding: "16px", borderBottom: "1px solid var(--color-border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0 }}>Chats</h3>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="sp-btn sp-btn-primary sp-btn-sm"
                  style={{ borderRadius: "50%", width: "32px", height: "32px", padding: 0 }}
                  onClick={() => setShowNewChatModal(true)}
                  title="Start Chat"
                >
                  ＋
                </button>
                <button
                  className="sp-btn sp-btn-secondary sp-btn-sm"
                  onClick={() => setShowGroupModal(true)}
                  title="Create Group"
                >
                  👥 Group
                </button>
              </div>
            </div>
            <input
              type="text"
              placeholder="Search chat list..."
              className="sp-input"
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {conversations.map((c) => {
              const partner = getChatPartner(c);
              const isActive = (c.id || c._id) === (activeConv?.id || activeConv?._id);
              return (
                <div
                  key={c.id || c._id}
                  onClick={() => setActiveConv(c)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 12px",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    backgroundColor: isActive ? "var(--color-primary-light)" : "transparent",
                    transition: "background-color 0.2s"
                  }}
                  className="chat-item-hover"
                >
                  <div style={{ position: "relative" }}>
                    <div style={{
                      width: "40px", height: "40px", borderRadius: "50%",
                      background: c.type === "group" ? "linear-gradient(135deg, #a78bfa, #7c3aed)" : "linear-gradient(135deg, #60a5fa, #3b82f6)",
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: "700", fontSize: "14px"
                    }}>
                      {c.type === "group" ? "👥" : partner.name?.charAt(0)?.toUpperCase()}
                    </div>
                    {c.type === "individual" && partner.isOnline && (
                      <div style={{
                        position: "absolute", bottom: 0, right: 0, width: "12px", height: "12px",
                        backgroundColor: "var(--color-success)", borderRadius: "50%", border: "2px solid #fff"
                      }} />
                    )}
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontWeight: "700", color: "var(--color-text)", fontSize: "14px" }}>
                        {partner.name}
                      </span>
                      <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
                        {c.lastMessageTime ? new Date(c.lastMessageTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </div>
                    <p style={{
                      fontSize: "12px", color: "var(--color-text-muted)", margin: "4px 0 0 0",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                    }}>
                      {c.lastMessage || "No messages yet"}
                    </p>
                  </div>
                </div>
              );
            })}
            {conversations.length === 0 && (
              <div className="text-center text-muted p-4">No active conversations. Tap ＋ to start!</div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Chat window */}
        <div className="sp-card" style={{ display: "flex", flexDirection: "column", height: "100%", padding: 0 }}>
          {activeConv ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              {/* Header */}
              <div style={{
                padding: "12px 16px", borderBottom: "1px solid var(--color-border)",
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <div>
                  <h3 style={{ margin: 0 }}>
                    {activeConv.type === "group" ? `👥 ${activeConv.name}` : getChatPartner(activeConv).name}
                  </h3>
                  {activeConv.type === "group" ? (
                    <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                      {activeConv.participants?.length || 0} members · Admin: {
                        activeConv.participants?.find(p => String(p._id) === String(activeConv.groupAdmin))?.name || "Creator"
                      }
                    </span>
                  ) : (
                    <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                      {getChatPartner(activeConv).isOnline ? (
                        "🟢 Online"
                      ) : (
                        `⚪ Last active: ${
                          getChatPartner(activeConv).lastActive
                            ? new Date(getChatPartner(activeConv).lastActive).toLocaleString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit"
                              })
                            : "Offline"
                        }`
                      )}
                    </span>
                  )}
                </div>

                {/* Group details settings */}
                {activeConv.type === "group" && String(activeConv.groupAdmin) === String(myUserId) && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <select
                      className="sp-select"
                      style={{ padding: "4px 8px", fontSize: "12px", marginBottom: 0 }}
                      onChange={(e) => {
                        if (e.target.value) {
                          toggleGroupMember("add", e.target.value);
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="">Add Member...</option>
                      {usersList
                        .filter(u => !activeConv.participants?.some(p => String(p._id) === String(u._id)))
                        .map(u => <option key={u._id} value={u._id}>{u.name}</option>)
                      }
                    </select>

                    <select
                      className="sp-select"
                      style={{ padding: "4px 8px", fontSize: "12px", marginBottom: 0 }}
                      onChange={(e) => {
                        if (e.target.value) {
                          toggleGroupMember("remove", e.target.value);
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="">Remove Member...</option>
                      {activeConv.participants
                        .filter(p => String(p._id) !== String(myUserId))
                        .map(p => <option key={p._id} value={p._id}>{p.name}</option>)
                      }
                    </select>
                  </div>
                )}
              </div>

              {/* Chat timeline */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "10px", backgroundColor: "#f8fafc" }}>
                {messages.map((m, idx) => {
                  const authorIsMe = String(m.senderId) === String(myUserId);
                  const senderName = activeConv.participants?.find(p => String(p._id) === String(m.senderId))?.name || "User";
                  const resolvedMediaUrl = m.mediaUrl ? (m.mediaUrl.startsWith("http") ? m.mediaUrl : `${API_BASE_URL.replace("/api", "")}${m.mediaUrl}`) : "";

                  // Deleted for everyone placeholder
                  if (m.deletedForEveryone) {
                    return (
                      <div
                        key={m._id || idx}
                        style={{
                          alignSelf: authorIsMe ? "flex-end" : "flex-start",
                          backgroundColor: authorIsMe ? "var(--color-primary)" : "#fff",
                          color: authorIsMe ? "#fff" : "var(--color-text)",
                          border: authorIsMe ? "none" : "1px solid var(--color-border)",
                          padding: "8px 12px", borderRadius: "12px", maxWidth: "70%",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.05)", opacity: 0.6
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px", marginBottom: "4px", fontSize: "10px", opacity: 0.8 }}>
                          <strong>{authorIsMe ? myName : senderName}</strong>
                          <span>{new Date(m.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: "13px", fontStyle: "italic", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>🚫</span> This message was deleted{m.deletedByName ? ` by ${m.deletedByName}` : ""}
                        </p>
                      </div>
                    );
                  }

                  const handleContextMenu = (e) => {
                    e.preventDefault();
                    const sentAt = new Date(m.timestamp || m.createdAt);
                    const diffMinutes = (new Date() - sentAt) / (1000 * 60);
                    const canDeleteForEveryone = authorIsMe && diffMinutes <= 10;

                    const choice = window.confirm(
                      canDeleteForEveryone
                        ? "Delete this message?\n\nClick OK to delete for EVERYONE.\nClick Cancel then right-click again to delete for you only."
                        : "Delete this message for you?"
                    );

                    if (choice && canDeleteForEveryone) {
                      // Delete for everyone
                      fetch(`${API_BASE_URL}/api/messages/${m._id}/for-everyone`, {
                        method: "DELETE", headers
                      }).then(r => r.json()).then(data => {
                        if (data.success) {
                          setMessages(prev => prev.map(msg =>
                            String(msg._id) === String(m._id)
                              ? { ...msg, deletedForEveryone: true, deletedByName: data.deletedByName || myName, text: null, mediaUrl: null, fileName: null }
                              : msg
                          ));
                        } else { alert(data.error || "Failed to delete"); }
                      }).catch(() => alert("Failed to delete message"));
                    } else if (choice || !canDeleteForEveryone) {
                      // Delete for me
                      fetch(`${API_BASE_URL}/api/messages/${m._id}/for-me`, {
                        method: "DELETE", headers
                      }).then(r => r.json()).then(data => {
                        if (data.success) {
                          setMessages(prev => prev.filter(msg => String(msg._id) !== String(m._id)));
                        }
                      }).catch(() => {});
                    }
                  };

                  return (
                    <div
                      key={m._id || idx}
                      className={`sp-chat-message ${authorIsMe ? "sp-chat-sent" : "sp-chat-received"}`}
                      onContextMenu={handleContextMenu}
                      title="Right-click to delete"
                      style={{
                        alignSelf: authorIsMe ? "flex-end" : "flex-start",
                        backgroundColor: authorIsMe ? "var(--color-primary)" : "#fff",
                        color: authorIsMe ? "#fff" : "var(--color-text)",
                        border: authorIsMe ? "none" : "1px solid var(--color-border)",
                        padding: "8px 12px",
                        borderRadius: "12px",
                        maxWidth: "70%",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                        cursor: "context-menu"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px", marginBottom: "4px", fontSize: "10px", opacity: 0.8 }}>
                        <strong>{authorIsMe ? myName : senderName}</strong>
                        <span>{new Date(m.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      {m.text ? <p style={{ margin: "0 0 4px 0", fontSize: "14px", whiteSpace: "pre-wrap" }}>{m.text}</p> : null}
                      
                      {m.type === "image" && (
                        <img src={resolvedMediaUrl} alt="Attachment" style={{ maxWidth: "100%", maxHeight: "240px", borderRadius: "8px", marginTop: "4px", cursor: "pointer" }} onClick={() => window.open(resolvedMediaUrl, "_blank")} />
                      )}
                      
                      {m.type === "video" && (
                        <video src={resolvedMediaUrl} controls style={{ maxWidth: "100%", maxHeight: "240px", borderRadius: "8px", marginTop: "4px" }} />
                      )}
                      
                      {m.type === "file" && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(0,0,0,0.1)", padding: "8px 12px", borderRadius: "8px", marginTop: "4px" }}>
                          <span style={{ fontSize: "20px" }}>📄</span>
                          <a href={resolvedMediaUrl} target="_blank" rel="noreferrer" style={{ color: authorIsMe ? "#fff" : "var(--color-primary)", textDecoration: "underline", fontSize: "13px", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", display: "inline-block", maxWidth: "150px" }}>
                            {m.fileName || "Download Attachment"}
                          </a>
                        </div>
                      )}
                      
                      {m.type === "voice" && (
                        <audio src={resolvedMediaUrl} controls style={{ marginTop: "4px", maxWidth: "100%" }} />
                      )}
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <div className="text-center text-muted p-4 my-auto">No messages yet. Say hello!</div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input bar */}
              <div style={{ padding: "12px 16px", borderTop: "1px solid var(--color-border)", display: "flex", gap: "10px", alignItems: "center" }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                <button
                  className="sp-btn sp-btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  style={{ padding: "8px 12px", fontSize: "18px" }}
                  type="button"
                >
                  📎
                </button>
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage();
                  }}
                  placeholder={uploading ? "Uploading attachment..." : `Message ${activeConv.type === "group" ? activeConv.name : getChatPartner(activeConv).name}...`}
                  className="sp-input"
                  style={{ marginBottom: 0, flex: 1 }}
                  disabled={uploading}
                />
                <button className="sp-btn sp-btn-primary" onClick={sendMessage} disabled={!draft.trim() || uploading}>
                  {uploading ? "⏳" : "Send"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: "40px" }} className="text-center">
              <span style={{ fontSize: "48px" }}>💬</span>
              <h3 className="mt-3">Start Messaging</h3>
              <p className="text-muted" style={{ maxWidth: "360px" }}>
                Select a thread from the list or start a new conversation with any employee in the company.
              </p>
              <button className="sp-btn sp-btn-primary mt-3" onClick={() => setShowNewChatModal(true)}>
                Start New Chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL 1: Start New Chat --- */}
      {showNewChatModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div className="sp-card" style={{ width: "400px", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}>Start Chat</h3>
              <button className="sp-btn sp-btn-secondary sp-btn-sm" onClick={() => setShowNewChatModal(false)}>✕</button>
            </div>
            
            <input
              type="text"
              placeholder="Search user or role..."
              className="sp-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
              {filteredUsers.map(u => (
                <div
                  key={u._id}
                  onClick={() => startIndividualChat(u)}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px", padding: "8px 12px",
                    borderRadius: "6px", cursor: "pointer", border: "1px solid var(--color-border)"
                  }}
                  className="chat-item-hover"
                >
                  <div style={{
                    width: "36px", height: "36px", borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700"
                  }}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "14px" }}>{u.name}</div>
                    <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                      {u.role?.toUpperCase()} · {u.department || "General"}
                    </div>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="text-center text-muted">No users found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Create Group --- */}
      {showGroupModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <form onSubmit={createGroupChat} className="sp-card" style={{ width: "400px", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}>Create Group Chat</h3>
              <button type="button" className="sp-btn sp-btn-secondary sp-btn-sm" onClick={() => setShowGroupModal(false)}>✕</button>
            </div>

            <div className="sp-form-group">
              <label className="sp-label">Group Name *</label>
              <input
                type="text"
                className="sp-input"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Blister Packing Team"
                required
              />
            </div>

            <label className="sp-label mb-2">Select Members *</label>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px", maxHeight: "200px" }}>
              {usersList.map(u => {
                const checked = selectedGroupMembers.includes(u._id);
                return (
                  <label
                    key={u._id}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px", padding: "8px",
                      border: "1px solid var(--color-border)", borderRadius: "6px", cursor: "pointer"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...selectedGroupMembers, u._id]
                          : selectedGroupMembers.filter(id => id !== u._id);
                        setSelectedGroupMembers(next);
                      }}
                    />
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "700" }}>{u.name}</div>
                      <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{u.role?.toUpperCase()}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            <button type="submit" className="sp-btn sp-btn-primary" disabled={!groupName.trim() || selectedGroupMembers.length === 0}>
              Create Group
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default Chat;
