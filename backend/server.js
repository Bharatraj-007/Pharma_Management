require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const User = require("./models/User");
const UserRequest = require("./models/UserRequest");
const ApprovalRequest = require("./models/ApprovalRequest");
const Foil = require("./models/Foil");
const Message = require("./models/Message");
const Conversation = require("./models/Conversation");

const QrScanLog = require('./models/QrScanLog');
const { buildFoilQrPayload, parseFoilQrPayload } = require('./qr/qrPayload');

const Cylinder = require("./models/Cylinder");
const AuditLog = require("./models/AuditLog");
const Task = require("./models/Task");
const LeaveRequest = require("./models/LeaveRequest");
const Holiday = require("./models/Holiday");
const Notification = require("./models/Notification");
const AdvanceRequest = require("./models/AdvanceRequest");
const ClientCompany = require("./models/ClientCompany");
const ClientProduct = require("./models/ClientProduct");
const TaskFile = require("./models/TaskFile");
const PendingSignup = require("./models/PendingSignup");
const { processCdrConversion } = require("./utils/cdrConverter");
const AdmZip = require("adm-zip");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const Product = require("./models/Product");
const Transaction = require("./models/Transaction");
const Dispatch = require("./models/Dispatch");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");
const path = require("path");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "spqrcbtg",
  api_key: process.env.CLOUDINARY_API_KEY || "321647567917158",
  api_secret: process.env.CLOUDINARY_API_SECRET || "-xsYqCcE9239mjvFQYYhJJBCEGE"
});

const COMPANY_CLOUDINARY_FOLDERS = {
  bharath: "bharath_enterprises",
  shree_ganaapathy: "shree_ganapathiroto",
  vel: "vel_gravure"
};

async function uploadToCloudinary(filePath, companyKey) {
  if (!filePath) return null;
  const folder = COMPANY_CLOUDINARY_FOLDERS[companyKey] || "bharath_enterprises";
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: "auto"
    });
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.warn("Could not delete local file:", err.message);
    }
    return result.secure_url;
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    try {
      fs.unlinkSync(filePath);
    } catch (e) {}
    const errMsg = err.message || (err.error && err.error.message) || JSON.stringify(err);
    throw new Error(errMsg);
  }
}

const app = express();
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(mongoSanitize());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many login attempts from this IP. Please try again after 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false
});

const http = require("http");
const socketIo = require("socket.io");
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  socket.on("join_company", ({ company, role }) => {
    if (role === 'ceo') {
      socket.join("room_bharath");
      socket.join("room_shree_ganaapathy");
      socket.join("room_vel");
    } else if (company) {
      socket.join(`room_${normalizeCompany(company)}`);
    }
  });

  socket.on("join", (userId) => {
    socket.userId = userId;
    socket.join(String(userId));
    onlineUsers.set(String(userId), socket.id);
    io.emit("online_users", Array.from(onlineUsers.keys()));
  });

  socket.on("join_room", (conversationId) => {
    socket.join(String(conversationId));
  });

  socket.on("disconnect", async () => {
    if (socket.userId) {
      onlineUsers.delete(String(socket.userId));
      io.emit("online_users", Array.from(onlineUsers.keys()));
      try {
        await User.findByIdAndUpdate(socket.userId, { lastActive: new Date() });
      } catch (err) {}
    }
  });
});

app.set("io", io);
app.set("onlineUsers", onlineUsers);

const https = require("https");

function sendPushNotification(expoPushToken, title, body, data = {}) {
  if (!expoPushToken || !expoPushToken.startsWith("ExponentPushToken")) return;
  
  const payload = JSON.stringify({
    to: expoPushToken,
    sound: "default",
    title,
    body,
    data
  });

  const options = {
    hostname: "exp.host",
    path: "/--/api/v2/push/send",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Accept-encoding": "gzip, deflate"
    }
  };

  const req = https.request(options, (res) => {
    let responseData = "";
    res.on("data", (chunk) => {
      responseData += chunk;
    });
    res.on("end", () => {
      // Done
    });
  });

  req.on("error", (err) => {
    console.error("Push notification error:", err.message);
  });

  req.write(payload);
  req.end();
}

async function createAndSendNotification(userId, type, message, payload = {}) {
  try {
    const notification = await Notification.create({
      userId,
      type,
      message,
      isRead: false
    });

    // Emit via Socket.IO directly to the user's room
    if (io) {
      io.to(String(userId)).emit("notification", notification);
    }

    // Send push notification if they have token
    const user = await User.findById(userId).select("expoPushToken").lean();
    if (user && user.expoPushToken) {
      sendPushNotification(
        user.expoPushToken,
        type === "task" ? "New Task Assigned" : type === "chat" ? "New Message" : "App Update",
        message,
        payload
      );
    }
    
    return notification;
  } catch (err) {
    console.error("Error creating/sending notification:", err);
  }
}
app.use(express.json({ limit: '10mb' }));
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:8081",
  "http://localhost:8082",
  "http://localhost:8083",
  "http://localhost:8084",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:8081",
  "http://127.0.0.1:8082",
  "http://127.0.0.1:8083",
  "http://127.0.0.1:8084",
  "http://192.168.56.1:3000",
  "http://192.168.50.59:8081",
  "http://192.168.50.59:8082",
  "http://192.168.50.59:8083",
  "http://192.168.50.59:8084",
  "https://backend-u4si.onrender.com",
  // Mobile app on local Wi-Fi (Expo Go on phone → laptop Wi-Fi IP)
  "http://10.20.43.184:3000",
  "http://10.20.43.184:8081",
  "http://10.20.43.184:19000",
  "http://10.20.43.184:19006",
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// QR routes
const qrRoutes = require('./routes/qrRoutes');
app.use('/qrs', qrRoutes);

app.get("/", (req, res) => {

  res.send("🚀 Smart Pharma Backend Running Successfully");
});

const DEFAULT_MONGODB_URI = "mongodb://127.0.0.1:27017/pharma";
const MONGODB_URI = (process.env.MONGODB_URI || DEFAULT_MONGODB_URI).trim();

async function seedDefaultUsers() {
  try {
    const defaultUsers = [
      { name: "Admin (bharath)", email: "admin@bharath.com", password: "Admin@123", role: "admin", company: "bharath" },
      { name: "CEO (bharath)", email: "ceo@bharath.com", password: "Admin@123", role: "ceo", company: "bharath" },
      { name: "Manager (bharath)", email: "manager@bharath.com", password: "Admin@123", role: "manager", company: "bharath" },
      { name: "Worker (bharath)", email: "worker@bharath.com", password: "Admin@123", role: "worker", company: "bharath" },
    ];

    for (const u of defaultUsers) {
      const hashed = await bcrypt.hash(u.password, 10);
      const existing = await User.findOne({ email: u.email });
      if (existing) {
        existing.password = hashed;
        existing.role = u.role;
        if (!existing.company) existing.company = "bharath";
        await existing.save();
        console.log(`🌱 Reset password for default user: ${u.email} (${u.role})`);
      } else {
        await User.create({ ...u, password: hashed });
        console.log(`🌱 Auto-seeded user: ${u.email} (${u.role})`);
      }
    }
  } catch (err) {
    console.error("Auto-seed error:", err.message);
  }
}

async function connectDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("DB Connected to", MONGODB_URI.startsWith("mongodb://127.0.0.1") ? "local MongoDB" : "MongoDB Atlas");
    await seedDefaultUsers();
  } catch (err) {
    console.error("DB connection failed for URI:", MONGODB_URI);
    console.error(err.message || err);

    if (MONGODB_URI !== DEFAULT_MONGODB_URI) {
      console.log("Attempting fallback to local MongoDB...");
      try {
        await mongoose.connect(DEFAULT_MONGODB_URI);
        console.log("DB Connected to local MongoDB fallback");
        await seedDefaultUsers();
        return;
      } catch (fallbackErr) {
        console.error("Local MongoDB fallback failed:", fallbackErr.message || fallbackErr);
      }
    }

    console.error("Please start a local MongoDB instance or update MONGODB_URI in .env with a reachable database server.");
    process.exit(1);
  }
}

const SECRET = process.env.JWT_SECRET || "MY_SECRET_KEY";

const COMPANY_NAMES = {
  bharath: "Bharath Enterprises",
  shree_ganaapathy: "Shree Ganaapathy Roto Prints",
  vel: "Vel Gravure"
};

const IGNORED_COMPANY_WORDS = new Set(["company", "co", "pvt", "ltd", "private", "limited", "print", "prints", "solutions", "services", "industries", "labs", "laboratories", "products"]);

function getCompanyPrefix(companyKey) {
  const companyName = COMPANY_NAMES[companyKey] || String(companyKey || "");
  const words = companyName
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .filter((word) => !IGNORED_COMPANY_WORDS.has(word.toLowerCase()));

  const significantWords = words.slice(0, 2);
  return significantWords.map((word) => word[0].toUpperCase()).join("");
}

async function getNextEmployeeNo(companyKey) {
  const prefix = getCompanyPrefix(companyKey);
  if (!prefix) return "";

  const regex = new RegExp(`^${prefix}(\\d{3})$`, "i");
  const users = await User.find({ company: companyKey, employeeNo: { $regex: regex } }).select("employeeNo");

  let maxSeq = 0;
  users.forEach((user) => {
    const match = String(user.employeeNo).match(regex);
    if (match) {
      const seq = Number(match[1]);
      if (!Number.isNaN(seq)) {
        maxSeq = Math.max(maxSeq, seq);
      }
    }
  });

  return `${prefix}${String(maxSeq + 1).padStart(3, "0")}`;
}

const normalizeCompany = (c) => {
  if (!c) return '';
  const s = String(c).trim().toLowerCase();
  if (s === 'company1') return 'bharath';
  if (s === 'company2') return 'shree_ganaapathy';
  if (s === 'company3') return 'vel';
  return s;
};

const getMaterialKind = (company) => normalizeCompany(company) === "shree_ganaapathy" ? "plastic" : "foil";
const getCylinderKind = (company) => normalizeCompany(company) === "shree_ganaapathy" ? "plastic_cylinder" : "standard";

async function getRequestCompany(req) {
  if (req.user?.role === 'ceo') {
    const queryCo = req.query?.company || req.body?.company;
    if (queryCo) return normalizeCompany(queryCo);
  }
  return normalizeCompany(req.user?.assignedCompany || req.user?.company || "bharath");
}

function companyQuery(company) {
  return { $or: [{ company }, { company: { $exists: false } }, { company: null }] };
}

// 🔧 QR GENERATOR
async function generateFoilQrPayload({ company, type, size, kg, version = 1 }) {
  // Auto-increment serial starting from 1
  const lastFoil = await Foil.findOne({ company }).sort({ serial: -1 }).select("serial");
  const lastSerial = lastFoil ? parseInt(lastFoil.serial, 10) : 0;
  const serial = String((isNaN(lastSerial) ? 0 : lastSerial) + 1);
  return { qrPayload: buildFoilQrPayload({ company, type, size, weightKg: kg, version, serial }), serial };
}

function normalizeComparable(value) {
  return String(value || "").trim().toLowerCase();
}

function getFoilBalance(foil) {
  const balance = foil?.remainingWeight ?? foil?.weight ?? 0;
  return Number(balance) || 0;
}

function setFoilBalance(foil, balance) {
  const next = Math.max(0, Number(balance) || 0);
  foil.weight = next;
  foil.remainingWeight = next;
}

function parseJsonField(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeFoilScansInput(reqBody, task) {
  const rawScans = parseJsonField(reqBody.foilScans, null)
    || parseJsonField(reqBody.foilUsage, null)
    || parseJsonField(reqBody.foilQrPayloads, null);

  if (Array.isArray(rawScans)) {
    return rawScans.map((entry, index) => {
      if (typeof entry === "string") return { colourNumber: index + 1, qrPayload: entry };
      return {
        colourNumber: Number(entry.colourNumber || entry.colour || index + 1),
        qrPayload: entry.qrPayload || entry.foil_qrPayload || entry.foilQrPayload || entry.value || ""
      };
    });
  }

  if (typeof rawScans === "string" && rawScans.trim()) {
    return [{ colourNumber: 1, qrPayload: rawScans.trim() }];
  }

  const singlePayload = reqBody.foil_qrPayload
    || reqBody.foilQrPayload
    || reqBody.qrPayload
    || reqBody.barcode
    || task.assigned_foil_qrPayload
    || task.foil_qrPayload;

  return singlePayload ? [{ colourNumber: 1, qrPayload: singlePayload }] : [];
}

async function getActorName(req) {
  const user = await User.findById(req.user.id).select("name email");
  return user?.name || user?.email || req.user.id;
}

async function validateFoilForTask({ qrPayload, task, company, colourNumber, allowDuplicate = false }) {
  const payload = String(qrPayload || "").trim();
  if (!payload) {
    return { ok: false, status: "invalid", message: `Scan foil for Colour ${colourNumber}` };
  }

  try {
    parseFoilQrPayload(payload);
  } catch (err) {
    return { ok: false, status: "invalid", message: err.message || "Invalid foil QR payload" };
  }

  const foil = await Foil.findOne({ qrPayload: payload, company });
  if (!foil) {
    return { ok: false, status: "not-found", message: "Foil QR payload not found in this company" };
  }

  const balance = getFoilBalance(foil);
  if (balance <= 0) {
    return { ok: false, status: "consumed", message: "Foil balance is unavailable" };
  }

  if (task.foil_type && normalizeComparable(foil.type) !== normalizeComparable(task.foil_type)) {
    return { ok: false, status: "mismatch", message: `Foil type must be ${task.foil_type}` };
  }

  if (task.size && normalizeComparable(foil.size) !== normalizeComparable(task.size)) {
    return { ok: false, status: "mismatch", message: `Foil size must be ${task.size}` };
  }

  if (!allowDuplicate && Array.isArray(task.foilUsage)) {
    const alreadyLinked = task.foilUsage.some((entry) => String(entry.foilId || "") === String(foil._id));
    if (alreadyLinked) {
      return { ok: false, status: "duplicate", message: "This foil roll is already linked to the task" };
    }
  }

  return { ok: true, foil, balance };
}

function generateCylinderBarcode(size, color) {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `CYL-${size}-${color}CLR-${random}`;
}


// 🔐 LOGIN
app.post(["/login", "/api/login", "/api/auth/login"], async (req, res) => {
  const { email, password } = req.body;

  let user = await User.findOne({ email });
  if (!user) {
    await seedDefaultUsers();
    user = await User.findOne({ email });
  }
  if (!user) return res.status(401).send("User not found");

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).send("Wrong password");

  const assignedCompany = user.assignedCompany || user.company || 'bharath';
  const companyAccess = (user.companyAccess && user.companyAccess.length)
    ? user.companyAccess
    : (user.role === 'ceo' ? ['bharath', 'shree_ganaapathy', 'vel'] : [assignedCompany]);

  const token = jwt.sign({
    id: user._id,
    role: user.role,
    company: assignedCompany,
    assignedCompany,
    companyAccess
  }, SECRET, { expiresIn: "1d" });

  res.json({
    token,
    role: user.role,
    name: user.name,
    id: user._id,
    userId: user._id,
    company: assignedCompany,
    assignedCompany,
    companyAccess,
    companyName: COMPANY_NAMES[assignedCompany]
  });
});

// PASSWORD VALIDATION
function isStrongPassword(password) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
  return regex.test(password);
}

// MOCK TRANSPORTER (console.log OTP - provide SMTP for real email)
const transporter = {
  sendMail: async ({ to, subject, text }) => {
    const otp = text.match(/(\d{6})/)[1];
    console.log(`📧 MOCK EMAIL to ${to}: ${text}`);
    console.log(`Use OTP: ${otp}`);
    return true;
  }
};

// 🔐 TOKEN VERIFY
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) return res.status(403).json({ error: "No token" });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// 🔐 ROLE CHECK
const allowRoles = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user.role;
    if (roles.includes(userRole)) {
      return next();
    }
    return res.status(403).json({ error: "Access denied" });
  };
};

// 🏢 CHECK COMPANY ACCESS MIDDLEWARE
const checkCompanyAccess = (req, res, next) => {
  const { role, companyAccess, assignedCompany, company } = req.user || {};
  const userAssignedCo = normalizeCompany(assignedCompany || company || 'bharath');

  if (role === 'ceo') {
    const requestedCompany = normalizeCompany(req.query?.company || req.body?.company);
    if (requestedCompany && requestedCompany !== 'all' && Array.isArray(companyAccess) && !companyAccess.includes(requestedCompany)) {
      return res.status(403).json({ error: 'Invalid company selection' });
    }
    return next(); // CEO — full cross-company access
  }

  // Normal Admin / Manager / Worker — ALWAYS force assignedCompany server-side!
  req.query = req.query || {};
  req.body = req.body || {};
  req.query.company = userAssignedCo;
  if (req.body && typeof req.body === 'object') {
    req.body.company = userAssignedCo;
  }
  next();
};

// 🛡️ CHECK EDIT & DELETE PERMISSION MIDDLEWARE (CEO full bypass)
const checkEditDeletePermission = (req, res, next) => {
  const role = req.user?.role;
  if (role === 'ceo') {
    return next(); // Unrestricted full edit/delete power across all 3 companies
  }
  if (['admin', 'manager'].includes(role)) {
    return next();
  }
  return res.status(403).json({ error: 'Access denied: insufficient permissions to edit or delete records.' });
};

// 📋 AUDIT LOGGING SAFEGUARD HELPER
async function logAuditAction(userId, userName, role, action, targetModel, targetId, company, details = {}) {
  try {
    await AuditLog.create({
      userId,
      performedByName: userName || "CEO",
      role: role || "ceo",
      action,
      targetModel,
      targetId,
      company: company ? normalizeCompany(company) : "bharath",
      details,
      timestamp: new Date()
    });
  } catch (err) {
    console.error("Audit log creation error:", err.message);
  }
}

// GET /api/users — List all employees in same company to start a chat with
app.get("/api/users", verifyToken, async (req, res) => {
  try {
    const company = await getRequestCompany(req);
    const users = await User.find({ company, _id: { $ne: req.user.id } })
      .select("name role email phone department employeeNo profilePhoto lastActive");
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/conversations — Create individual or group chat
app.post("/api/conversations", verifyToken, async (req, res) => {
  try {
    const { type = "individual", name, participants } = req.body;
    const company = await getRequestCompany(req);

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ error: "participants list is required" });
    }

    const allParticipants = Array.from(new Set([...participants, req.user.id]));

    if (type === "individual") {
      if (allParticipants.length !== 2) {
        return res.status(400).json({ error: "Individual chat must have exactly 2 participants" });
      }
      let conv = await Conversation.findOne({
        type: "individual",
        company,
        participants: { $all: allParticipants, $size: 2 }
      }).populate("participants", "name role email profilePhoto lastActive");

      if (conv) {
        return res.json(conv);
      }

      conv = new Conversation({
        type: "individual",
        participants: allParticipants,
        company
      });
      await conv.save();
      conv = await Conversation.findById(conv._id).populate("participants", "name role email profilePhoto lastActive");
      return res.json(conv);
    } else {
      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Group name is required" });
      }
      let conv = new Conversation({
        type: "group",
        name: name.trim(),
        participants: allParticipants,
        groupAdmin: req.user.id,
        company
      });
      await conv.save();
      conv = await Conversation.findById(conv._id).populate("participants", "name role email profilePhoto lastActive");
      return res.json(conv);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/conversations/:userId (or /api/conversations) — Fetch conversations list
app.get(["/api/conversations", "/api/conversations/:userId"], verifyToken, async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const company = await getRequestCompany(req);
    
    const conversations = await Conversation.find({
      participants: userId,
      company
    })
      .populate("participants", "name role email profilePhoto lastActive")
      .sort({ updatedAt: -1 });

    const conversationIds = conversations.map(c => c._id);
    const lastMessages = conversationIds.length > 0 ? await Message.aggregate([
      { $match: { conversationId: { $in: conversationIds } } },
      { $sort: { conversationId: 1, timestamp: -1 } },
      { $group: {
          _id: "$conversationId",
          senderId: { $first: "$senderId" },
          text: { $first: "$text" },
          type: { $first: "$type" },
          timestamp: { $first: "$timestamp" }
        }
      }
    ]) : [];

    const lastMsgMap = new Map();
    lastMessages.forEach(msg => {
      lastMsgMap.set(String(msg._id), msg);
    });

    const formattedList = conversations.map((conv) => {
      const lastMsg = lastMsgMap.get(String(conv._id));
      return {
        id: conv._id,
        _id: conv._id,
        type: conv.type,
        name: conv.name,
        participants: conv.participants,
        groupAdmin: conv.groupAdmin,
        createdAt: conv.createdAt,
        lastMessage: lastMsg 
          ? (lastMsg.text || (lastMsg.type === "voice" ? "🔊 Voice Message" : lastMsg.type === "image" ? "📷 Photo" : lastMsg.type === "video" ? "🎥 Video" : "📄 Attachment"))
          : "",
        lastMessageTime: lastMsg ? lastMsg.timestamp : conv.createdAt
      };
    });

    formattedList.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
    res.json(formattedList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `chat_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`);
  }
});
const chatUpload = multer({ storage: chatStorage }).single("file");

// POST /api/messages/upload — Handles file/photo/video/voice upload
app.post("/api/messages/upload", verifyToken, chatUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const company = await getRequestCompany(req);
    const mediaUrl = await uploadToCloudinary(req.file.path, company);
    res.json({ mediaUrl, fileName: req.file.originalname });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages — Send message in conversation (supports text, image, video, file, voice)
app.post("/api/messages", verifyToken, async (req, res) => {
  try {
    const { conversationId, text, type = "text", mediaUrl, fileName, duration } = req.body;
    if (!conversationId) return res.status(400).json({ error: "conversationId is required" });

    if (type === "text" && (!text || !String(text).trim())) {
      return res.status(400).json({ error: "text is required for text messages" });
    }
    if (type !== "text" && !mediaUrl) {
      return res.status(400).json({ error: "mediaUrl is required for media messages" });
    }

    const senderId = req.user.id;
    const company = await getRequestCompany(req);

    const conv = await Conversation.findOne({ _id: conversationId, participants: senderId });
    if (!conv) {
      return res.status(403).json({ error: "You are not a participant in this conversation" });
    }

    const msg = await Message.create({
      company,
      senderId,
      conversationId,
      type,
      text: text ? String(text).trim() : undefined,
      mediaUrl,
      fileName,
      duration,
      timestamp: new Date(),
      readBy: [senderId]
    });

    await Conversation.findByIdAndUpdate(conversationId, { updatedAt: new Date() });

    const io = req.app.get("io");
    if (io) {
      io.to(String(conversationId)).emit("new_message", msg);
    }

    const sender = await User.findById(senderId).select("name").lean();
    const senderName = sender ? sender.name : "User";
    const previewText = type === "text" ? msg.text : `[${type === "voice" ? "Voice Message" : type === "image" ? "Photo" : type === "video" ? "Video" : "Attachment"}]`;

    const recipients = conv.participants.filter(p => String(p) !== String(senderId));
    const notificationPromises = recipients.map(recipientId =>
      createAndSendNotification(recipientId, "chat", `${senderName}: ${previewText}`, { conversationId })
    );
    await Promise.all(notificationPromises).catch(err => console.error("Chat notification failed:", err.message));

    return res.json({ message: "Message sent", msg });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/:conversationId — Fetch chat history
app.get("/api/messages/:conversationId", verifyToken, async (req, res) => {
  try {
    const { conversationId } = req.params;
    if (!conversationId) return res.status(400).json({ error: "conversationId is required" });

    const conv = await Conversation.findOne({ _id: conversationId, participants: req.user.id });
    if (!conv) {
      return res.status(403).json({ error: "Access denied" });
    }

    const company = await getRequestCompany(req);
    const msgs = await Message.find({
      company,
      conversationId,
      deletedFor: { $ne: req.user.id } // exclude messages deleted for this user
    })
      .sort({ timestamp: -1 })
      .limit(100)
      .select("senderId conversationId text type mediaUrl fileName duration timestamp createdAt readBy deletedForEveryone deletedByName deletedFor")
      .lean();

    msgs.reverse();

    return res.json({ messages: msgs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/messages/:messageId/for-me — Delete message for the requesting user only
app.delete("/api/messages/:messageId/for-me", verifyToken, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ error: "Message not found" });

    if (!msg.deletedFor.includes(req.user.id)) {
      msg.deletedFor.push(req.user.id);
      await msg.save();
    }

    return res.json({ success: true, message: "Message deleted for you" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/messages/:messageId/for-everyone — Delete message for all participants (within 10 min)
app.delete("/api/messages/:messageId/for-everyone", verifyToken, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ error: "Message not found" });

    // Only the sender can delete for everyone
    if (String(msg.senderId) !== String(req.user.id)) {
      return res.status(403).json({ error: "Only the sender can delete for everyone" });
    }

    // Check 10-minute window
    const sentAt = new Date(msg.timestamp || msg.createdAt);
    const now = new Date();
    const diffMinutes = (now - sentAt) / (1000 * 60);
    if (diffMinutes > 10) {
      return res.status(400).json({ error: "You can only delete for everyone within 10 minutes of sending" });
    }

    // Get sender name
    const sender = await User.findById(req.user.id).select("name").lean();
    const senderName = sender?.name || "Unknown";

    msg.deletedForEveryone = true;
    msg.deletedByName = senderName;
    msg.text = null;
    msg.mediaUrl = null;
    msg.fileName = null;
    await msg.save();

    // Broadcast deletion to all participants in the conversation via socket
    if (io) {
      io.to(String(msg.conversationId)).emit("message_deleted", {
        messageId: msg._id,
        conversationId: msg.conversationId,
        deletedByName: senderName,
        deletedForEveryone: true
      });
    }

    return res.json({ success: true, message: "Message deleted for everyone", deletedByName: senderName });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/conversations/:id/members — Group member management (add/remove)
app.put("/api/conversations/:id/members", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, memberId } = req.body;
    
    if (!action || !memberId) {
      return res.status(400).json({ error: "action ('add'/'remove') and memberId are required" });
    }

    const conv = await Conversation.findById(id);
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    if (conv.type !== "group") {
      return res.status(400).json({ error: "Only group conversation members can be updated" });
    }

    if (String(conv.groupAdmin) !== String(req.user.id)) {
      return res.status(403).json({ error: "Only the group creator can manage members" });
    }

    if (action === "add") {
      if (!conv.participants.includes(memberId)) {
        conv.participants.push(memberId);
      }
    } else if (action === "remove") {
      if (String(memberId) === String(conv.groupAdmin)) {
        return res.status(400).json({ error: "Group creator/admin cannot be removed from the group" });
      }
      conv.participants = conv.participants.filter(p => String(p) !== String(memberId));
    }

    await conv.save();
    const updatedConv = await Conversation.findById(id).populate("participants", "name role email profilePhoto lastActive");
    res.json(updatedConv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: get age dynamically from DOB
function getAge(dobString) {
  if (!dobString) return null;
  const today = new Date();
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return null;
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// GET /profile / /api/profile/:id - Get user profile + settings
app.get(["/profile", "/profile/:id", "/api/profile/:id"], verifyToken, async (req, res) => {
  try {
    const targetId = req.params.id || req.user.id;
    
    // Check permission: workers can only view themselves
    if (req.user.role === "worker" && targetId !== req.user.id) {
      return res.status(403).json({ error: "Access denied. Workers can only view their own profile." });
    }

    const user = await User.findById(targetId).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    const obj = user.toObject();
    obj.age = getAge(user.dob); // Dynamic age calculation
    
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /profile / /api/profile/:id - Update profile + settings
app.put(["/profile", "/profile/:id", "/api/profile/:id"], verifyToken, async (req, res) => {
  try {
    const targetId = req.params.id || req.user.id;
    const company = await getRequestCompany(req);

    // Permission check
    if (req.user.role === "worker" && targetId !== req.user.id) {
      return res.status(403).json({ error: "Access denied." });
    }

    const user = await User.findById(targetId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const {
      name, dob, gender, bloodGroup, address, permanentAddress,
      emergencyContactName, emergencyContactNumber, emergencyContact, profilePhoto,
      twoFactorEnabled, pushNotifications, attendanceReminders, taskAlerts,
      language, timezone,
      email, phone, // updates might need admin approval
      employeeNo, joiningDate, department, role, reportingManager, employmentType // admin only
    } = req.body;

    const requesterRole = req.user.role;
    const isAdminOrCeo = ["admin", "ceo"].includes(requesterRole);

    // Apply updates based on roles
    if (isAdminOrCeo) {
      // Admins/CEOs can edit everything directly
      if (name !== undefined) user.name = name;
      if (email !== undefined) user.email = email;
      if (phone !== undefined) user.phone = phone;
      if (employeeNo !== undefined) user.employeeNo = employeeNo;
      if (joiningDate !== undefined) user.joiningDate = joiningDate;
      if (department !== undefined) user.department = department;
      if (role !== undefined) user.role = role;
      if (reportingManager !== undefined) user.reportingManager = reportingManager;
      if (employmentType !== undefined) user.employmentType = employmentType;
    } else {
      // Workers/Managers can't edit empId, joiningDate, etc.
      // And email/phone changes trigger approval request
      if (email !== undefined && email !== user.email) {
        await ApprovalRequest.create({
          userId: user._id,
          workerName: user.name,
          company,
          type: "email",
          oldValue: user.email,
          newValue: email
        });
      }
      if (phone !== undefined && phone !== user.phone) {
        await ApprovalRequest.create({
          userId: user._id,
          workerName: user.name,
          company,
          type: "phone",
          oldValue: user.phone,
          newValue: phone
        });
      }
    }

    // Editable by everyone
    if (dob !== undefined) user.dob = dob;
    if (gender !== undefined) user.gender = gender;
    if (bloodGroup !== undefined) user.bloodGroup = bloodGroup;
    if (address !== undefined) user.address = address;
    if (permanentAddress !== undefined) user.permanentAddress = permanentAddress;
    if (emergencyContactName !== undefined) user.emergencyContactName = emergencyContactName;
    if (emergencyContactNumber !== undefined) user.emergencyContactNumber = emergencyContactNumber;
    if (emergencyContact !== undefined) user.emergencyContact = emergencyContact;
    if (profilePhoto !== undefined) user.profilePhoto = profilePhoto;
    
    // Preferences & Toggles
    if (twoFactorEnabled !== undefined) user.twoFactorEnabled = twoFactorEnabled;
    if (pushNotifications !== undefined) user.pushNotifications = pushNotifications;
    if (attendanceReminders !== undefined) user.attendanceReminders = attendanceReminders;
    if (taskAlerts !== undefined) user.taskAlerts = taskAlerts;
    if (language !== undefined) user.language = language;
    if (timezone !== undefined) user.timezone = timezone;

    await user.save();
    
    const obj = user.toObject();
    delete obj.password;
    obj.age = getAge(user.dob);

    const hasPending = (!isAdminOrCeo && ((email !== undefined && email !== user.email) || (phone !== undefined && phone !== user.phone)));
    
    res.json({
      message: hasPending ? "Changes saved. Email/Phone change request sent for Admin approval." : "Profile updated successfully.",
      user: obj,
      pendingApproval: hasPending
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/user/change-password - Change password
app.put(["/api/user/change-password", "/profile/change-password"], verifyToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Both old and new passwords are required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) return res.status(400).json({ error: "Incorrect current password" });

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/company/settings - Update company settings (Admin/CEO only)
app.put(["/api/company/settings", "/company/settings"], verifyToken, allowRoles("admin", "ceo"), async (req, res) => {
  try {
    const { companyName, companyLogo, companyAddress, workingDays, holidays, shiftTiming } = req.body;
    const company = await getRequestCompany(req);

    // Update all users belonging to this company with company configurations
    await User.updateMany({ company }, {
      companyName: companyName || "",
      companyLogo: companyLogo || "",
      companyAddress: companyAddress || "",
      workingDays: Array.isArray(workingDays) ? workingDays : [],
      holidays: Array.isArray(holidays) ? holidays : [],
      shiftTiming: shiftTiming || ""
    });

    res.json({ message: "Company settings updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Holiday Management Routes
app.get(["/api/holidays", "/holidays"], verifyToken, async (req, res) => {
  try {
    const company = await getRequestCompany(req);
    const list = await Holiday.find({ company }).sort({ date: 1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post(["/api/holidays", "/holidays"], verifyToken, allowRoles("admin", "ceo"), async (req, res) => {
  try {
    const { date, reason } = req.body;
    if (!date || !reason) {
      return res.status(400).json({ error: "Date and reason are required" });
    }
    const company = await getRequestCompany(req);
    
    const existing = await Holiday.findOne({ date, company });
    if (existing) {
      return res.status(400).json({ error: "A holiday already exists for this date" });
    }
    
    const holiday = new Holiday({ date, reason, company });
    await holiday.save();
    res.status(201).json({ message: "Holiday added successfully", holiday });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put(["/api/holidays/:id", "/holidays/:id"], verifyToken, allowRoles("admin", "ceo"), async (req, res) => {
  try {
    const { date, reason } = req.body;
    if (!date || !reason) {
      return res.status(400).json({ error: "Date and reason are required" });
    }
    const company = await getRequestCompany(req);
    
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) return res.status(404).json({ error: "Holiday not found" });
    if (holiday.company !== company) return res.status(403).json({ error: "Access denied" });
    
    if (date !== holiday.date) {
      const existing = await Holiday.findOne({ date, company });
      if (existing) {
        return res.status(400).json({ error: "A holiday already exists for this date" });
      }
    }
    
    holiday.date = date;
    holiday.reason = reason;
    await holiday.save();
    
    res.json({ message: "Holiday updated successfully", holiday });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete(["/api/holidays/:id", "/holidays/:id"], verifyToken, allowRoles("admin", "ceo"), async (req, res) => {
  try {
    const company = await getRequestCompany(req);
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) return res.status(404).json({ error: "Holiday not found" });
    if (holiday.company !== company) return res.status(403).json({ error: "Access denied" });
    
    await Holiday.findByIdAndDelete(req.params.id);
    res.json({ message: "Holiday deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/profile/approvals - List pending approvals (Admin/CEO only)
app.get("/api/profile/approvals", verifyToken, allowRoles("admin", "ceo"), async (req, res) => {
  try {
    const company = await getRequestCompany(req);
    const list = await ApprovalRequest.find({ company, status: "pending" }).populate("userId", "name role email phone");
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/profile/approvals/:id/resolve - Resolve approval (Admin/CEO only)
app.post("/api/profile/approvals/:id/resolve", verifyToken, allowRoles("admin", "ceo"), async (req, res) => {
  try {
    const { action } = req.body; // "approve" or "reject"
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ error: "Invalid action. Must be 'approve' or 'reject'." });
    }

    const request = await ApprovalRequest.findById(request.params.id || req.params.id);
    if (!request) return res.status(404).json({ error: "Approval request not found" });

    if (action === "approve") {
      const user = await User.findById(request.userId);
      if (user) {
        if (request.type === "email") {
          user.email = request.newValue;
        } else if (request.type === "phone") {
          user.phone = request.newValue;
        }
        await user.save();
      }
      request.status = "approved";
    } else {
      request.status = "rejected";
    }

    await request.save();
    res.json({ message: `Request successfully ${action}ed.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Configure private storage for secure ID proof uploads
const privateStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./private_uploads/";
    const fs = require("fs");
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const privateUpload = multer({ storage: privateStorage }).single("idProof");

// POST /profile/upload-id - Secure ID Upload
app.post(["/profile/upload-id", "/api/profile/upload-id"], verifyToken, privateUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    const company = await getRequestCompany(req);
    const idProofUrl = await uploadToCloudinary(req.file.path, company);
    user.idProofUrl = idProofUrl;
    await user.save();
    
    res.json({ message: "ID proof uploaded successfully", idProofUrl: user.idProofUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /profile/id-proof/:filename - Secure ID Download/View (Admin/CEO/Owner only)
app.get(["/profile/id-proof/:filename", "/api/profile/id-proof/:filename"], verifyToken, async (req, res) => {
  try {
    const { filename } = req.params;
    // Find user that owns this file
    const owner = await User.findOne({ idProofUrl: { $regex: filename } });
    if (!owner) return res.status(404).json({ error: "ID proof file not found" });
    
    // Permission check: admin, ceo, or the owner themselves
    const requesterRole = req.user.role;
    const isOwner = String(owner._id) === String(req.user.id);
    const isAdminOrCeo = ["admin", "ceo"].includes(requesterRole);
    
    if (!isOwner && !isAdminOrCeo) {
      return res.status(403).json({ error: "403 Forbidden: Restricted access to ID proof" });
    }
    
    const path = require("path");
    const filePath = path.join(__dirname, "private_uploads", filename);
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/register-push-token — Register worker device push token
app.post("/api/register-push-token", verifyToken, async (req, res) => {
  try {
    const { token } = req.body;
    await User.findByIdAndUpdate(req.user.id, { expoPushToken: token || "" });
    res.json({ message: "Push token registered successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/notifications — Fetch user's notifications
app.get("/api/notifications", verifyToken, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notifications/read — Mark all user notifications as read
app.put("/api/notifications/read", verifyToken, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, isRead: false }, { isRead: true });
    res.json({ message: "Notifications marked as read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications — Send a notification manually (app update etc)
app.post("/api/notifications", verifyToken, allowRoles("admin", "ceo"), async (req, res) => {
  try {
    const { type, message, userId } = req.body;
    const company = await getRequestCompany(req);
    
    if (type === "app_update") {
      // Send to all users in the company!
      const users = await User.find({ company }).select("_id").lean();
      const promises = users.map(u => createAndSendNotification(u._id, "app_update", message));
      await Promise.all(promises);
      return res.json({ message: "App update notifications sent successfully" });
    }

    if (!userId) return res.status(400).json({ error: "userId is required for this notification type" });
    const notification = await createAndSendNotification(userId, type, message);
    res.json({ message: "Notification sent successfully", notification });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/salary/:workerId — Fetch salary breakdown
app.get("/api/salary/:workerId", verifyToken, async (req, res) => {
  try {
    const { workerId } = req.params;
    const month = req.query.month || new Date().toISOString().slice(0, 7); // format: YYYY-MM
    
    // Authorization check: workers can only view their own salary
    if (req.user.role === "worker" && String(req.user.id) !== String(workerId)) {
      return res.status(403).json({ error: "Forbidden: You can only view your own salary" });
    }

    const worker = await User.findById(workerId).select("name employeeNo role salaryRate salaryType otRate company").lean();
    if (!worker) return res.status(404).json({ error: "Worker not found" });

    // 1. Fetch attendance records for that month
    const startOfMonth = `${month}-01`;
    // Calculate total days in this specific month
    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr);
    const monthIdx = parseInt(monthStr) - 1; // 0-indexed
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const endOfMonth = `${month}-${String(daysInMonth).padStart(2, "0")}`;

    const records = await Attendance.find({
      company: worker.company,
      workerName: worker.name,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    }).sort({ date: 1 }).lean();

    // 2. Fetch approved advances for that month
    const advances = await AdvanceRequest.find({
      workerId: worker._id,
      status: "approved",
      deductedFromMonth: month
    }).lean();

    const totalAdvanceDeducted = advances.reduce((sum, adv) => sum + (adv.amountRequested || 0), 0);

    // 3. Fetch pre-configured holidays for that month
    const companyHolidays = await Holiday.find({
      company: worker.company,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    }).lean();
    const holidayDates = new Set(companyHolidays.map(h => h.date));

    // 4. Calculate calendar days
    let datesList = [];
    let current = new Date(year, monthIdx, 1);
    const lastDay = new Date(year, monthIdx, daysInMonth);
    while (current <= lastDay) {
      datesList.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }

    // Build attendance mapping
    const recordsMap = new Map();
    records.forEach(r => {
      recordsMap.set(r.date, r);
    });

    let daysPresent = 0;
    let daysAbsent = 0;
    let daysHalfDay = 0;
    let daysPaidLeave = 0;
    let otHoursTotal = 0;
    let otPayEarned = 0;
    let sundayHolidayODBonus = 0; // Worked on Sunday/Holiday bonus
    let details = [];

    // Calculate daily base rate
    let dailyBaseRate = 0;
    if (worker.salaryType === "daily") {
      dailyBaseRate = worker.salaryRate || 0;
    } else if (worker.salaryType === "hourly") {
      dailyBaseRate = (worker.salaryRate || 0) * 9; // standard 9h shift
    } else if (worker.salaryType === "monthly") {
      dailyBaseRate = (worker.salaryRate || 0) / daysInMonth;
    }

    for (const d of datesList) {
      const dateObj = new Date(d);
      const isSunday = dateObj.getDay() === 0;
      const isHoliday = holidayDates.has(d);
      const record = recordsMap.get(d);

      let status = "Absent";
      let hours = 0;
      let ot = 0;
      let dailyEarnings = 0;

      if (record) {
        hours = record.hoursWorked || 0;
        ot = record.overtime || 0;
        const statusLower = (record.status || "").toLowerCase();
        
        if (["present", "early", "on time", "late", "on-time"].includes(statusLower)) {
          status = "Present";
          daysPresent++;
          dailyEarnings = dailyBaseRate + (ot * (worker.otRate || record.otRate || 0));
        } else if (statusLower === "half-day" || statusLower === "half day") {
          status = "Half Day";
          daysHalfDay++;
          dailyEarnings = (dailyBaseRate / 2) + (ot * (worker.otRate || record.otRate || 0));
        } else if (statusLower === "paid leave" || statusLower === "paid-leave" || statusLower === "paidleave") {
          status = "Paid Leave";
          daysPaidLeave++;
          dailyEarnings = dailyBaseRate;
        } else {
          status = "Absent";
          daysAbsent++;
          dailyEarnings = 0;
        }

        // Sunday or Holiday Worked OD pay bonus
        if (isSunday || isHoliday) {
          // If they worked, they get: daily earnings (for their shift) + OD bonus (another base day rate)
          const bonus = dailyBaseRate;
          sundayHolidayODBonus += bonus;
          dailyEarnings += bonus;
        }
        
        otHoursTotal += ot;
        otPayEarned += ot * (worker.otRate || record.otRate || 0);

      } else {
        // No manual record found. If Sunday or holiday, it is automatically a Paid Leave!
        if (isSunday || isHoliday) {
          status = "Paid Leave";
          daysPaidLeave++;
          dailyEarnings = dailyBaseRate;
        } else {
          status = "Absent";
          daysAbsent++;
          dailyEarnings = 0;
        }
      }

      details.push({
        date: d,
        status,
        hoursWorked: hours,
        overtime: ot,
        earnings: Math.round(dailyEarnings * 100) / 100,
        isSundayOrHoliday: isSunday || isHoliday
      });
    }

    // Calculations
    const baseSalaryEarned = (daysPresent * dailyBaseRate) + (daysHalfDay * (dailyBaseRate / 2)) + (daysPaidLeave * dailyBaseRate);
    
    // Deduction calculation:
    // Absent days deduction (what they lost by not working on standard working days)
    const absentDeduction = daysAbsent * dailyBaseRate;

    // Final calculations
    const grossSalary = baseSalaryEarned + otPayEarned + sundayHolidayODBonus;
    const finalNetSalary = grossSalary - totalAdvanceDeducted;

    res.json({
      worker: {
        id: worker._id,
        name: worker.name,
        employeeNo: worker.employeeNo,
        salaryRate: worker.salaryRate,
        salaryType: worker.salaryType,
        otRate: worker.otRate
      },
      month,
      daysInMonth,
      summary: {
        daysPresent,
        daysAbsent,
        daysHalfDay,
        daysPaidLeave,
        otHoursTotal,
        otPayEarned: Math.round(otPayEarned * 100) / 100,
        sundayHolidayODBonus: Math.round(sundayHolidayODBonus * 100) / 100,
        totalAdvanceDeducted: Math.round(totalAdvanceDeducted * 100) / 100,
        baseSalaryEarned: Math.round(baseSalaryEarned * 100) / 100,
        absentDeduction: Math.round(absentDeduction * 100) / 100,
        grossSalary: Math.round(grossSalary * 100) / 100,
        finalNetSalary: Math.max(0, Math.round(finalNetSalary * 100) / 100)
      },
      details
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const advanceUpload = multer({ storage: chatStorage }).single("qrCode");

// POST /api/advance/request — Worker submits advance request
app.post("/api/advance/request", verifyToken, advanceUpload, async (req, res) => {
  try {
    const { amountRequested, deductedFromMonth } = req.body;
    if (!amountRequested) return res.status(400).json({ error: "amountRequested is required" });
    if (!deductedFromMonth) return res.status(400).json({ error: "deductedFromMonth (YYYY-MM) is required" });

    const company = await getRequestCompany(req);
    let qrCodeImageUrl = "";
    if (req.file) {
      qrCodeImageUrl = await uploadToCloudinary(req.file.path, company);
    }

    const request = await AdvanceRequest.create({
      workerId: req.user.id,
      amountRequested: Number(amountRequested),
      qrCodeImageUrl,
      status: "pending",
      deductedFromMonth
    });

    // Notify admins/ceos in the same company
    const admins = await User.find({ company, role: { $in: ["admin", "ceo"] } }).select("_id").lean();
    const user = await User.findById(req.user.id).select("name").lean();
    const notificationPromises = admins.map(admin =>
      createAndSendNotification(admin._id, "task", `Advance request from ${user?.name || "Worker"}: ₹${amountRequested}`)
    );
    await Promise.all(notificationPromises);

    res.json({ message: "Advance request submitted successfully", request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/advance/:id/approve — Admin approves/rejects advance request
app.put("/api/advance/:id/approve", verifyToken, allowRoles("admin", "ceo"), async (req, res) => {
  try {
    const { status, paymentMethod } = req.body; // approved / rejected, cash / online
    if (!status || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "status must be approved or rejected" });
    }

    const request = await AdvanceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found" });

    if (status === "approved" && !paymentMethod) {
      return res.status(400).json({ error: "paymentMethod is required for approval" });
    }

    request.status = status;
    if (status === "approved") {
      request.paymentMethod = paymentMethod;
      request.approvedBy = req.user.id;
      request.approvedDate = new Date();
    }
    await request.save();

    // Notify worker
    const admin = await User.findById(req.user.id).select("name").lean();
    await createAndSendNotification(
      request.workerId,
      "task",
      `Your advance request for ₹${request.amountRequested} was ${status} by ${admin?.name || "Admin"}`
    );

    res.json({ message: `Advance request ${status} successfully`, request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/advance/report — Admin fetches monthly advance list
app.get("/api/advance/report", verifyToken, allowRoles("admin", "ceo"), async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7); // format: YYYY-MM
    const company = await getRequestCompany(req);

    // Find all users in company
    const users = await User.find({ company }).select("_id name employeeNo").lean();
    const userIds = users.map(u => u._id);
    const userMap = new Map(users.map(u => [String(u._id), u]));

    const requests = await AdvanceRequest.find({
      workerId: { $in: userIds },
      deductedFromMonth: month
    }).populate("approvedBy", "name").sort({ createdAt: -1 }).lean();

    const report = requests.map(r => {
      const worker = userMap.get(String(r.workerId)) || {};
      return {
        _id: r._id,
        workerName: worker.name || "Unknown",
        employeeNo: worker.employeeNo || "N/A",
        amountRequested: r.amountRequested,
        status: r.status,
        paymentMethod: r.paymentMethod || "—",
        approvedBy: r.approvedBy ? r.approvedBy.name : "—",
        date: r.approvedDate ? r.approvedDate.toISOString().split("T")[0] : r.createdAt.toISOString().split("T")[0]
      };
    });

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/advance/report/export — Download advance report as Excel or PDF
app.get("/api/advance/report/export", verifyToken, allowRoles("admin", "ceo"), async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7); // format: YYYY-MM
    const format = req.query.format || "excel"; // excel / pdf
    const company = await getRequestCompany(req);

    // Find all users in company
    const users = await User.find({ company }).select("_id name employeeNo").lean();
    const userIds = users.map(u => u._id);
    const userMap = new Map(users.map(u => [String(u._id), u]));

    const requests = await AdvanceRequest.find({
      workerId: { $in: userIds },
      deductedFromMonth: month,
      status: "approved" // only approved advances in report exports
    }).populate("approvedBy", "name").sort({ approvedDate: -1 }).lean();

    const report = requests.map(r => {
      const worker = userMap.get(String(r.workerId)) || {};
      return {
        workerName: worker.name || "Unknown",
        employeeNo: worker.employeeNo || "N/A",
        amountRequested: r.amountRequested,
        paymentMethod: r.paymentMethod || "—",
        approvedBy: r.approvedBy ? r.approvedBy.name : "—",
        date: r.approvedDate ? r.approvedDate.toISOString().split("T")[0] : "—"
      };
    });

    if (format === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=Advance_Report_${month}.pdf`);

      const doc = new PDFDocument({ margin: 30 });
      doc.pipe(res);

      doc.fontSize(16).text(`Smart Pharma - Monthly Advance Report (${month})`, { align: "center" }).moveDown(1);
      doc.fontSize(10).text(`Company: ${company.toUpperCase()}`, { align: "left" }).moveDown(0.5);

      // Render table
      doc.font("Helvetica-Bold").fontSize(10);
      doc.text("Worker Name", 30, doc.y, { width: 130, continued: true });
      doc.text("Emp No", 160, doc.y, { width: 70, continued: true });
      doc.text("Amount (₹)", 230, doc.y, { width: 80, continued: true });
      doc.text("Method", 310, doc.y, { width: 70, continued: true });
      doc.text("Approved By", 380, doc.y, { width: 90, continued: true });
      doc.text("Date Approved", 470, doc.y, { width: 90 });
      doc.moveDown(0.2);

      doc.moveTo(30, doc.y).lineTo(560, doc.y).stroke().moveDown(0.4);
      doc.font("Helvetica").fontSize(9);

      let totalAdvance = 0;
      report.forEach((item) => {
        totalAdvance += item.amountRequested;
        doc.text(item.workerName, 30, doc.y, { width: 130, continued: true });
        doc.text(item.employeeNo, 160, doc.y, { width: 70, continued: true });
        doc.text(`₹${item.amountRequested}`, 230, doc.y, { width: 80, continued: true });
        doc.text(item.paymentMethod.toUpperCase(), 310, doc.y, { width: 70, continued: true });
        doc.text(item.approvedBy, 380, doc.y, { width: 90, continued: true });
        doc.text(item.date, 470, doc.y, { width: 90 });
        doc.moveDown(0.3);
      });

      doc.moveDown(1);
      doc.font("Helvetica-Bold").fontSize(11);
      doc.text(`Total Advances Given: ₹${totalAdvance}`, 30, doc.y);

      doc.end();
      return;
    }

    // Default to Excel
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=Advance_Report_${month}.xlsx`);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Advance Report");
    sheet.columns = [
      { header: "Worker Name", key: "workerName", width: 24 },
      { header: "Emp No", key: "employeeNo", width: 12 },
      { header: "Amount Requested (₹)", key: "amountRequested", width: 20 },
      { header: "Payment Method", key: "paymentMethod", width: 16 },
      { header: "Approved By", key: "approvedBy", width: 20 },
      { header: "Date Approved", key: "date", width: 16 }
    ];

    report.forEach(item => {
      sheet.addRow(item);
    });

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /staff — CEO and Admin can view staff profiles
app.get("/staff", verifyToken, allowRoles("admin", "ceo"), async (req, res) => {
  try {
    const company = await getRequestCompany(req);
    const query = { isDeleted: { $ne: true } };
    if (company && company !== "all") query.company = company;
    const staff = await User.find(query).select("-password").sort({ role: 1, name: 1 });
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /staff/:id — CEO and Admin can view a specific profile
app.get("/staff/:id", verifyToken, allowRoles("admin", "ceo"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /staff/:id/salary — CEO and Admin set salary rate for staff
app.put("/staff/:id/salary", verifyToken, allowRoles("admin", "ceo"), async (req, res) => {
  try {
    const { salaryRate, salaryType, otRate } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (salaryRate !== undefined) user.salaryRate = Number(salaryRate);
    if (salaryType) user.salaryType = salaryType;
    if (otRate !== undefined) user.otRate = Number(otRate);

    await user.save();
    const updated = user.toObject();
    delete updated.password;
    res.json({ message: "Salary updated", user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function createAuditLog({ req, action, itemType, before, after }) {
  const user = await User.findById(req.user.id).select("name email role");
  const actorName = user?.name || user?.email || req.user.id;
  const item = after || before;
  const company = item?.company || await getRequestCompany(req);

  try {
    await AuditLog.create({
      action,
      itemType,
      company,
      itemId: String(item?._id || ""),
      barcode: item?.barcode || "",
      qrPayload: item?.qrPayload || "",
      changedBy: actorName,
      changedByRole: req.user.role,
      before,
      after
    });
  } catch (err) {
    console.error("Audit log creation failed:", err);
  }
}

async function getApproverUser(requestedRole, company) {
  if (requestedRole === "worker" || requestedRole === "manager") {
    const admin = await User.findOne({ role: "admin", company });
    if (admin) return admin;
  }
  const ceo = await User.findOne({ role: "ceo" });
  if (ceo) return ceo;
  return await User.findOne({ role: "admin" });
}

// 📩 STEP 1: SEND SELF-OTP FOR IDENTITY VERIFICATION
app.post(["/api/auth/signup/send-self-otp", "/signup", "/api/signup"], async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dob,
      age,
      joiningDate,
      idProofType,
      idProofNumber,
      password,
      role = "worker",
      company = "bharath"
    } = req.body;

    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail) return res.status(400).json({ error: "Email is required" });

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) return res.status(400).json({ error: "An account with this email already exists" });

    if (!isStrongPassword(password)) {
      return res.status(400).json({ error: "Weak password — must contain 8+ chars, uppercase, lowercase, number, special char" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const selfOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const selfOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    let pending = await PendingSignup.findOne({ email: cleanEmail });
    if (pending) {
      Object.assign(pending, {
        firstName,
        lastName,
        name: `${firstName || ""} ${lastName || ""}`.trim(),
        phone: phone || "",
        dob: dob || "",
        age: Number(age) || 0,
        dateOfJoining: joiningDate || "",
        company,
        idProofType: idProofType || "",
        idProofNumber: idProofNumber || "",
        passwordHash: hashed,
        requestedRole: role,
        selfOtp,
        selfOtpExpiresAt,
        emailVerified: false,
        status: "pending_self_verification"
      });
      await pending.save();
    } else {
      pending = await PendingSignup.create({
        firstName,
        lastName,
        name: `${firstName || ""} ${lastName || ""}`.trim(),
        email: cleanEmail,
        phone: phone || "",
        dob: dob || "",
        age: Number(age) || 0,
        dateOfJoining: joiningDate || "",
        company,
        idProofType: idProofType || "",
        idProofNumber: idProofNumber || "",
        passwordHash: hashed,
        requestedRole: role,
        selfOtp,
        selfOtpExpiresAt,
        emailVerified: false,
        status: "pending_self_verification"
      });
    }

    try {
      if (transporter && transporter.sendMail) {
        await transporter.sendMail({
          to: cleanEmail,
          subject: "Smart Pharma System - Verification OTP",
          text: `Your 6-digit verification code is: ${selfOtp}. It expires in 10 minutes.`
        });
      }
    } catch (mailErr) {
      console.warn("Mail dispatch warning:", mailErr.message);
    }

    console.log(`🔑 Verification OTP for ${cleanEmail}: ${selfOtp}`);

    res.json({
      message: `OTP sent to ${cleanEmail}. Please enter the code to verify your identity.`,
      email: cleanEmail,
      devOtp: process.env.NODE_ENV === "development" ? selfOtp : undefined
    });
  } catch (err) {
    console.error("Send self OTP error:", err);
    res.status(500).json({ error: err.message || "Failed to send verification OTP" });
  }
});

// 📩 STEP 1 VERIFY: VERIFY SELF-OTP & TRIGGER IN-APP APPROVAL REQUEST
app.post(["/api/auth/signup/verify-self-otp", "/verify-otp", "/api/verify-otp"], async (req, res) => {
  try {
    const { email, otp } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();

    const pending = await PendingSignup.findOne({ email: cleanEmail });
    if (!pending) return res.status(400).json({ error: "Pending signup request not found" });

    if (pending.selfOtp !== String(otp).trim() || new Date(pending.selfOtpExpiresAt) < new Date()) {
      return res.status(400).json({ error: "Invalid or expired OTP code" });
    }

    pending.emailVerified = true;
    pending.phoneVerified = true;

    const approver = await getApproverUser(pending.requestedRole, pending.company);
    if (approver) {
      pending.approverUserId = approver._id;
      pending.approverRole = approver.role;
    }
    pending.status = "pending_approval";
    await pending.save();

    if (approver) {
      await Notification.create({
        userId: approver._id,
        title: "📋 New Signup Approval Request",
        message: `${pending.name} requested to join ${pending.company} as ${pending.requestedRole.toUpperCase()}`,
        type: "signup_request",
        link: "/signup-requests"
      });
      io.emit("notification", { userId: approver._id });
      io.emit("signup_request_new", { id: pending._id, approverId: approver._id });
    }

    res.json({
      message: `Identity verified successfully! Approval request sent to ${approver?.role?.toUpperCase() || "Admin"} (${approver?.name || "Company Approver"}).`,
      status: pending.status,
      approverRole: approver?.role || "admin",
      approverName: approver?.name || "Company Approver"
    });
  } catch (err) {
    console.error("Verify self OTP error:", err);
    res.status(500).json({ error: err.message || "Failed to verify OTP" });
  }
});

// 👨‍💼 STEP 2 VIEW: GET PENDING SIGNUP REQUESTS FOR ADMIN / CEO
app.get(["/api/signup-requests", "/requests", "/api/requests"], verifyToken, allowRoles("admin", "ceo"), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    let filter = { status: "pending_approval" };

    if (user.role === "admin") {
      filter.company = user.assignedCompany || user.company;
    }

    const requests = await PendingSignup.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ STEP 2 APPROVE: ADMIN / CEO ACCEPTS REQUEST & CREATES ACTIVE USER ACCOUNT
app.put(["/api/signup-requests/:id/accept", "/approve", "/api/approve"], verifyToken, allowRoles("admin", "ceo"), async (req, res) => {
  try {
    const requestId = req.params.id || req.body.id;
    const pending = await PendingSignup.findById(requestId);
    if (!pending) return res.status(404).json({ error: "Signup request not found" });

    if (pending.status === "approved") {
      return res.status(400).json({ error: "Request has already been approved" });
    }

    const employeeNo = await getNextEmployeeNo(pending.company);
    const newUser = new User({
      name: pending.name || `${pending.firstName} ${pending.lastName}`,
      email: pending.email,
      phone: pending.phone,
      password: pending.passwordHash,
      role: pending.requestedRole,
      company: pending.company,
      assignedCompany: pending.company,
      employeeNo,
      dob: pending.dob,
      joiningDate: pending.dateOfJoining,
      idProofType: pending.idProofType,
      idProofNumber: pending.idProofNumber
    });

    await newUser.save();

    pending.status = "approved";
    pending.decidedAt = new Date();
    await pending.save();

    try {
      if (transporter && transporter.sendMail) {
        await transporter.sendMail({
          to: pending.email,
          subject: "Smart Pharma Account Approved 🎉",
          text: `Congratulations! Your account request for ${pending.company} has been approved by ${req.user.role.toUpperCase()}. You can now log in.`
        });
      }
    } catch (mailErr) {
      console.warn("Mail approval notification warning:", mailErr.message);
    }

    res.json({
      message: `Account approved and activated! Assigned Employee No: ${employeeNo}`,
      user: newUser
    });
  } catch (err) {
    console.error("Approve signup error:", err);
    res.status(500).json({ error: err.message || "Failed to approve request" });
  }
});

// ❌ STEP 2 REJECT: ADMIN / CEO REJECTS REQUEST
app.put(["/api/signup-requests/:id/reject", "/reject", "/api/reject"], verifyToken, allowRoles("admin", "ceo"), async (req, res) => {
  try {
    const requestId = req.params.id || req.body.id;
    const pending = await PendingSignup.findById(requestId);
    if (!pending) return res.status(404).json({ error: "Signup request not found" });

    pending.status = "rejected";
    pending.rejectionReason = req.body.reason || "Declined by approver";
    pending.decidedAt = new Date();
    await pending.save();

    res.json({ message: "Signup request rejected", pending });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET dashboard summary
app.get("/api/dashboard/summary", verifyToken, async (req, res) => {
  try {
    const company = await getRequestCompany(req);

    // Fetch concurrent statistics
    const [staffCount, tasks, foilsCount, cylindersCount, requests, leaveRequests] = await Promise.all([
      User.countDocuments({ company }),
      Task.find({ company }),
      Foil.countDocuments({ company }),
      Cylinder.countDocuments({ company }),
      UserRequest.find({ company, status: "pending", otpVerified: true }),
      LeaveRequest.find({ company, status: "Pending" })
    ]);

    const totalTasksCount = tasks.length;
    const completedTasksCount = tasks.filter(t => t.status === "completed").length;
    const pendingTasksCount = tasks.filter(t => t.status !== "completed").length;

    const taskStatusCounts = {
      pending: tasks.filter(t => t.status === "pending" || t.status === "assigned").length,
      inProgress: tasks.filter(t => t.status === "in-progress").length,
      completed: completedTasksCount
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const todayTasksCount = tasks.filter(t => {
      const d = new Date(t.createdAt || t.updatedAt || Date.now()).toISOString().split('T')[0];
      return d === todayStr;
    }).length;

    // Get current user details for attendance and notifications
    const currentUser = await User.findById(req.user.id);
    const currentUserName = currentUser?.name || "Admin";

    // Dynamic Attendance check (need Attendance model)
    const Attendance = require("./models/Attendance");
    const todayAtt = await Attendance.findOne({ company, workerName: currentUserName, date: todayStr });
    const attendanceStatus = todayAtt ? todayAtt.status.toLowerCase().replace('-', '_') : "not_marked";

    // Notifications
    const notifications = [];
    if (["admin", "manager", "ceo"].includes(req.user.role)) {
      if (taskStatusCounts.pending > 0) {
        notifications.push({
          type: "task",
          message: `You have ${taskStatusCounts.pending} pending task${taskStatusCounts.pending !== 1 ? 's' : ''} to start.`
        });
      }
      if (leaveRequests.length > 0) {
        notifications.push({
          type: "leave",
          message: `Review team leave requests and respond before your next shift.`
        });
      }
    } else {
      // For worker role, only show their own pending tasks
      const workerPendingCount = tasks.filter(t => t.worker_name === currentUserName && (t.status === "pending" || t.status === "assigned")).length;
      if (workerPendingCount > 0) {
        notifications.push({
          type: "task",
          message: `You have ${workerPendingCount} pending task${workerPendingCount !== 1 ? 's' : ''} to start.`
        });
      }
    }

    res.json({
      companyName: COMPANY_NAMES[company] || "Bharath Enterprises",
      totalUsers: staffCount,
      totalTasks: {
        total: totalTasksCount,
        done: completedTasksCount,
        pending: pendingTasksCount
      },
      inventoryItems: {
        total: foilsCount + cylindersCount,
        foils: foilsCount,
        cylinders: cylindersCount
      },
      pendingRequests: requests.length,
      todayTasks: todayTasksCount,
      taskStatus: taskStatusCounts,
      attendanceStatus,
      notifications
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🏢 CLIENT COMPANIES & CDR SAMPLE LIBRARY ENDPOINTS

// GET /api/client-companies?search=
app.get("/api/client-companies", verifyToken, async (req, res) => {
  try {
    const search = req.query.search || "";
    const filter = search ? { name: { $regex: search, $options: "i" } } : {};
    const companies = await ClientCompany.find(filter).sort({ name: 1 }).limit(50);
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/client-companies (Admin & CEO only)
app.post("/api/client-companies", verifyToken, allowRoles("admin", "ceo"), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: "Company name is required" });
    const trimmed = name.trim();
    let company = await ClientCompany.findOne({ name: { $regex: `^${trimmed}$`, $options: "i" } });
    if (!company) {
      company = await ClientCompany.create({ name: trimmed, createdBy: req.user._id });
    }
    res.status(201).json(company);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/client-companies/:id (Admin & CEO only)
app.delete("/api/client-companies/:id", verifyToken, allowRoles("admin", "ceo"), async (req, res) => {
  try {
    await ClientCompany.findByIdAndDelete(req.params.id);
    res.json({ message: "Client company deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/client-products?clientCompany=&search=
app.get("/api/client-products", verifyToken, async (req, res) => {
  try {
    const { clientCompany, search } = req.query;
    const filter = {};
    if (clientCompany) filter.clientCompany = clientCompany;
    if (search) filter.name = { $regex: search, $options: "i" };

    const products = await ClientProduct.find(filter).sort({ name: 1 }).limit(100);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/client-products (Admin & CEO only)
app.post("/api/client-products", verifyToken, allowRoles("admin", "ceo"), async (req, res) => {
  try {
    const { clientCompany, name } = req.body;
    if (!clientCompany || !name || !name.trim()) return res.status(400).json({ error: "Company and Product name are required" });
    const trimmed = name.trim();
    let product = await ClientProduct.findOne({ clientCompany, name: { $regex: `^${trimmed}$`, $options: "i" } });
    if (!product) {
      product = await ClientProduct.create({ clientCompany, name: trimmed, createdBy: req.user._id });
    }
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/task-files?clientCompany=&productName=&search= (Everyone can view)
app.get("/api/task-files", verifyToken, async (req, res) => {
  try {
    const { clientCompany, productName, search } = req.query;
    const filter = {};
    if (clientCompany) filter.clientCompany = clientCompany;
    if (productName) filter.productName = productName;
    if (search) filter.fileName = { $regex: search, $options: "i" };

    const files = await TaskFile.find(filter).sort({ uploadedAt: -1 });
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Multer storage for CDR samples and ZIP files
const sampleStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads/samples';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `sample-${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`);
  }
});
const sampleUpload = multer({ storage: sampleStorage });

// POST /api/task-files/upload-folder (Admin & CEO only — 2-Level parsing Company/Product/sample)
app.post("/api/task-files/upload-folder", verifyToken, allowRoles("admin", "ceo"), sampleUpload.array("files", 200), async (req, res) => {
  try {
    const files = req.files || [];
    let relativePaths = req.body.relativePaths;
    if (typeof relativePaths === 'string') {
      try { relativePaths = JSON.parse(relativePaths); } catch { relativePaths = [relativePaths]; }
    }
    if (!Array.isArray(relativePaths)) relativePaths = [];

    const createdCompanies = new Set();
    const createdProducts = new Set();
    const processedFiles = [];
    const host = req.protocol + "://" + req.get("host");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relPath = relativePaths[i] || file.originalname;
      const parts = relPath.split(/[/\\]/);

      let companyName = parts.length > 1 ? parts[0] : (req.body.clientCompany || "Default Client");
      let productName = parts.length > 2 ? parts[1] : (req.body.productName || "General Product");

      companyName = companyName.trim();
      productName = productName.trim();

      let companyObj = await ClientCompany.findOne({ name: { $regex: `^${companyName}$`, $options: "i" } });
      if (!companyObj) {
        companyObj = await ClientCompany.create({ name: companyName, createdBy: req.user._id });
      }
      createdCompanies.add(companyObj.name);

      let productObj = await ClientProduct.findOne({ clientCompany: companyObj.name, name: { $regex: `^${productName}$`, $options: "i" } });
      if (!productObj) {
        productObj = await ClientProduct.create({ clientCompany: companyObj.name, name: productName, createdBy: req.user._id });
      }
      createdProducts.add(`${companyObj.name} > ${productObj.name}`);

      const relFileUrl = `${host}/${file.path.replace(/\\/g, '/')}`;

      const taskFile = await TaskFile.create({
        clientCompany: companyObj.name,
        productName: productObj.name,
        fileName: file.originalname,
        originalFileUrl: relFileUrl,
        status: "processing",
        uploadedBy: req.user._id
      });

      processCdrConversion(taskFile._id, file.path, host);
      processedFiles.push(taskFile);
    }

    res.json({
      message: `Uploaded ${processedFiles.length} files across ${createdCompanies.size} companies & ${createdProducts.size} products. Conversion running in background.`,
      companies: Array.from(createdCompanies),
      productsCount: createdProducts.size,
      files: processedFiles
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/task-files/upload-zip (Admin & CEO only — 2-Level parsing Company/Product/sample)
app.post("/api/task-files/upload-zip", verifyToken, allowRoles("admin", "ceo"), sampleUpload.single("zipFile"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "ZIP file is required" });

    const zipPath = req.file.path;
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();

    const extractDir = path.join('./uploads/samples', `extract-${Date.now()}`);
    fs.mkdirSync(extractDir, { recursive: true });

    const createdCompanies = new Set();
    const createdProducts = new Set();
    const processedFiles = [];
    const host = req.protocol + "://" + req.get("host");

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;

      const entryName = entry.entryName;
      const parts = entryName.split('/');
      let companyName = parts.length > 1 ? parts[0] : (req.body.clientCompany || "Default Client");
      let productName = parts.length > 2 ? parts[1] : (req.body.productName || "General Product");
      const fileName = path.basename(entryName);

      if (fileName.startsWith('.') || !fileName) continue;

      companyName = companyName.trim();
      productName = productName.trim();

      let companyObj = await ClientCompany.findOne({ name: { $regex: `^${companyName}$`, $options: "i" } });
      if (!companyObj) {
        companyObj = await ClientCompany.create({ name: companyName, createdBy: req.user._id });
      }
      createdCompanies.add(companyObj.name);

      let productObj = await ClientProduct.findOne({ clientCompany: companyObj.name, name: { $regex: `^${productName}$`, $options: "i" } });
      if (!productObj) {
        productObj = await ClientProduct.create({ clientCompany: companyObj.name, name: productName, createdBy: req.user._id });
      }
      createdProducts.add(`${companyObj.name} > ${productObj.name}`);

      const targetPath = path.join(extractDir, `${Date.now()}-${fileName}`);
      fs.writeFileSync(targetPath, entry.getData());

      const relFileUrl = `${host}/${targetPath.replace(/\\/g, '/')}`;

      const taskFile = await TaskFile.create({
        clientCompany: companyObj.name,
        productName: productObj.name,
        fileName: fileName,
        originalFileUrl: relFileUrl,
        status: "processing",
        uploadedBy: req.user._id
      });

      processCdrConversion(taskFile._id, targetPath, host);
      processedFiles.push(taskFile);
    }

    res.json({
      message: `Extracted ${processedFiles.length} files for ${createdCompanies.size} companies & ${createdProducts.size} products. Conversion running in background.`,
      companies: Array.from(createdCompanies),
      productsCount: createdProducts.size,
      files: processedFiles
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/task-files/:id (Admin & CEO only)
app.delete("/api/task-files/:id", verifyToken, allowRoles("admin", "ceo"), async (req, res) => {
  try {
    await TaskFile.findByIdAndDelete(req.params.id);
    res.json({ message: "Task file deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/task-files/:id/download — download original file
app.get("/api/task-files/:id/download", verifyToken, async (req, res) => {
  try {
    const fileRecord = await TaskFile.findById(req.params.id);
    if (!fileRecord) return res.status(404).json({ error: "File not found" });

    const urlParts = fileRecord.originalFileUrl.split('/');
    const relPath = urlParts.slice(3).join('/');
    const localFilePath = path.resolve(relPath);

    if (fs.existsSync(localFilePath)) {
      return res.download(localFilePath, fileRecord.fileName);
    }
    return res.redirect(fileRecord.originalFileUrl);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tasks/:id/reference-file — assign reference sample
app.put("/api/tasks/:id/reference-file", verifyToken, allowRoles("admin", "manager", "ceo"), async (req, res) => {
  try {
    const { referenceFileId, clientCompany } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: "Task not found" });

    if (referenceFileId) task.referenceFileId = referenceFileId;
    if (clientCompany) task.clientCompany = clientCompany;

    await task.save();
    const updated = await Task.findById(task._id).populate("referenceFileId");
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all tasks (supports /api/tasks and assignedTo filtering)
app.get(["/tasks", "/api/tasks"], verifyToken, async (req, res) => {
  try {
    const company = await getRequestCompany(req);
    let query = { company };

    if (req.query.assignedTo) {
      const mongoose = require("mongoose");
      if (mongoose.Types.ObjectId.isValid(req.query.assignedTo)) {
        const user = await User.findById(req.query.assignedTo).select("name");
        if (user) {
          query.worker_name = user.name;
        } else {
          return res.json([]);
        }
      } else {
        query.worker_name = req.query.assignedTo;
      }
    }

    const tasks = await Task.find(query).populate("referenceFileId").sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ CREATE TASK
app.post("/tasks", verifyToken, allowRoles("admin", "manager", "ceo"), async (req, res) => {
  try {
    const { foil_qrPayload, cylinder_barcode, worker_name, colourCount } = req.body;

    const company = await getRequestCompany(req);

    if (!worker_name || !worker_name.trim()) {
      return res.status(400).send("Worker name is required");
    }
    const parsedColourCount = Number(colourCount || 1);
    if (!Number.isInteger(parsedColourCount) || parsedColourCount < 1 || parsedColourCount > 8) {
      return res.status(400).send("Number of Colours must be between 1 and 8");
    }

    const task = new Task({
      foil_qrPayload,
      assigned_foil_qrPayload: foil_qrPayload,

      cylinder_barcode,
      worker_name: worker_name.trim(),
      colourCount: parsedColourCount,
      company,
      clientCompany: req.body.clientCompany,
      referenceFileId: req.body.referenceFileId || undefined
    });

    await task.save();
    const workerUser = await User.findOne({ name: worker_name.trim(), company }).select("_id").lean();
    if (workerUser) {
      await createAndSendNotification(workerUser._id, "task", `New Task Assigned: ${task.product_name || 'Stock Task'} (${colourCount || 1} Colour)`);
    }
    res.json({ message: "Task assigned successfully", task });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ✅ ADD FOIL
app.post("/add-foil", verifyToken, allowRoles("admin", "manager", "ceo"), async (req, res) => {
  try {
    const { type, size, weight } = req.body;

    const company = await getRequestCompany(req);
    const materialKind = getMaterialKind(company);

    if (company === "vel") {
      return res.status(403).send("Vel Gravure uses cylinder stock only");
    }

    const allowedTypes = materialKind === "plastic"
      ? ["wrapper", "pouch", "laminated", "roll"]
      : ["blister", "alualu"];

    if (!allowedTypes.includes(type)) {
      return res.status(400).send(`Invalid type. Allowed values: ${allowedTypes.join(", ")}`);
    }

    if (!type || !size || !weight) {
      return res.status(400).send("Type, Size, and Weight are required");
    }

    const { qrPayload: generatedQrPayload, serial } = await generateFoilQrPayload({ company, type, size, kg: weight, version: 1 });

    const foil = new Foil({
      company,
      materialKind,
      type,
      size,
      weight,
      remainingWeight: Number(weight),
      qrPayload: generatedQrPayload,
      version: 1,
      serial
    });

    await foil.save();
    await createAuditLog({
      req,
      action: "create",
      itemType: "foil",
      before: null,
      after: foil.toObject()
    });
    res.json({ message: "✅ Foil added successfully", foil, qrPayload: generatedQrPayload });

  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

// 🔧 ADD CYLINDER
app.post("/add-cylinder", verifyToken, allowRoles("admin", "manager", "ceo"), async (req, res) => {
  try {
    const { product_name, colors, size_inches, manufacturer, manufacture_date, client_company } = req.body;
    const company = await getRequestCompany(req);

    if (!product_name || !colors || !size_inches || !manufacturer || !manufacture_date) {
      return res.status(400).send("All fields are required");
    }

    const generatedBarcode = generateCylinderBarcode(`${size_inches}IN`, colors);

    const cylinder = new Cylinder({
      company,
      cylinderKind: getCylinderKind(company),
      client_company: client_company || (company === "vel" ? "Customer Company" : company),
      product_name,
      colors,
      size_inches,
      manufacturer,
      manufacture_date: new Date(manufacture_date),
      barcode: generatedBarcode
    });

    await cylinder.save();
    await createAuditLog({
      req,
      action: "create",
      itemType: "cylinder",
      before: null,
      after: cylinder.toObject()
    });
    res.json({ message: "✅ Cylinder added successfully", cylinder, barcode: generatedBarcode });
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

// ✅ GET ALL FOILS
app.get("/foils", verifyToken, allowRoles("admin", "manager", "ceo"), async (req, res) => {
  try {
    const company = await getRequestCompany(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 200;
    const skip = (page - 1) * limit;

    const query = { isDeleted: { $ne: true } };
    if (company && company !== "all") {
      query.company = company;
    }

    const foils = await Foil.find(query).skip(skip).limit(limit).lean();
    res.json(foils);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ✅ GET FOIL BY BARCODE
app.get("/foils/barcode/:barcode", verifyToken, allowRoles("admin", "manager", "ceo"), async (req, res) => {
  try {
    const company = await getRequestCompany(req);
    const query = { barcode: req.params.barcode, isDeleted: { $ne: true } };
    if (company && company !== "all") query.company = company;

    const foil = await Foil.findOne(query);
    if (!foil) return res.status(404).send("Foil not found");
    res.json(foil);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ✅ UPDATE FOIL
app.put("/foils/:id", verifyToken, allowRoles("admin", "manager", "ceo"), async (req, res) => {
  try {
    const { type, size, weight } = req.body;
    const foil = await Foil.findByIdAndUpdate(req.params.id, { type, size, weight }, { new: true });
    res.json(foil);
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

// ❌ DELETE FOIL
app.delete("/foils/:id", verifyToken, allowRoles("admin", "manager", "ceo"), async (req, res) => {
  try {
    const foil = await Foil.findById(req.params.id);
    if (!foil) return res.status(404).send("Foil not found");

    if (req.user.role !== 'ceo') {
      const company = await getRequestCompany(req);
      if (foil.company && foil.company !== company) return res.status(403).send("Access denied");
    }

    foil.isDeleted = true;
    foil.deletedBy = req.user.id;
    foil.deletedAt = new Date();
    await foil.save();

    await logAuditAction(req.user.id, req.user.name, req.user.role, 'delete', 'Foil', foil._id, foil.company, { type: foil.type, size: foil.size });
    res.json({ message: "Foil soft-deleted successfully" });
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

// ✅ GET ALL CYLINDERS
app.get("/cylinders", verifyToken, allowRoles("admin", "manager", "ceo"), async (req, res) => {
  try {
    const company = await getRequestCompany(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 200;
    const skip = (page - 1) * limit;

    const query = { isDeleted: { $ne: true } };
    if (company && company !== "all") {
      query.company = company;
    }

    const cylinders = await Cylinder.find(query).skip(skip).limit(limit).lean();
    res.json(cylinders);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ✅ UPDATE CYLINDER
app.put("/cylinders/:id", verifyToken, allowRoles("admin", "manager", "ceo"), async (req, res) => {
  try {
    const { product_name, colors, size_inches, manufacturer, manufacture_date, client_company } = req.body;
    const company = await getRequestCompany(req);

    if (!product_name || !colors || !size_inches || !manufacturer || !manufacture_date) {
      return res.status(400).send("Product, colors, size, manufacturer, and manufacture date are required");
    }

    const cylinder = await Cylinder.findById(req.params.id);
    if (!cylinder) return res.status(404).send("Cylinder not found");
    if (cylinder.company && cylinder.company !== company) return res.status(403).send("Access denied");

    const before = cylinder.toObject();
    cylinder.company = cylinder.company || company;
    cylinder.cylinderKind = getCylinderKind(company);
    if (client_company) cylinder.client_company = client_company;
    cylinder.product_name = product_name;
    cylinder.colors = Number(colors);
    cylinder.size_inches = Number(size_inches);
    cylinder.manufacturer = manufacturer;
    cylinder.manufacture_date = new Date(manufacture_date);

    await cylinder.save();
    await createAuditLog({
      req,
      action: "edit",
      itemType: "cylinder",
      before,
      after: cylinder.toObject()
    });

    res.json({ message: "Cylinder updated successfully", cylinder });
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

// ❌ DELETE CYLINDER
app.delete("/cylinders/:id", verifyToken, allowRoles("admin", "manager", "ceo"), async (req, res) => {
  try {
    const cylinder = await Cylinder.findById(req.params.id);
    if (!cylinder) return res.status(404).send("Cylinder not found");

    if (req.user.role !== 'ceo') {
      const company = await getRequestCompany(req);
      if (cylinder.company && cylinder.company !== company) return res.status(403).send("Access denied");
    }

    cylinder.isDeleted = true;
    cylinder.deletedBy = req.user.id;
    cylinder.deletedAt = new Date();
    await cylinder.save();

    await logAuditAction(req.user.id, req.user.name, req.user.role, 'delete', 'Cylinder', cylinder._id, cylinder.company, { productName: cylinder.product_name });
    res.json({ message: "Cylinder soft-deleted successfully" });
  } catch (err) {
    res.status(500).send("Error: " + err.message);
  }
});

// ✅ GET STOCK LOGS
app.get("/stock-logs", verifyToken, allowRoles("admin", "manager", "ceo"), async (req, res) => {
  try {
    const company = await getRequestCompany(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;
    const logs = await AuditLog.find({ company }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    res.json(logs);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/audit-logs", verifyToken, allowRoles("admin", "manager", "ceo"), async (req, res) => {
  try {
    const company = await getRequestCompany(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 200;
    const skip = (page - 1) * limit;
    const logs = await AuditLog.find({ company }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    res.json(logs);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/reports/foil-usage", verifyToken, allowRoles("admin", "manager", "ceo", "worker"), async (req, res) => {
  try {
    const company = await getRequestCompany(req);
    const tasks = await Task.find({ company }).sort({ updatedAt: -1 }).limit(200);
    const rows = tasks
      .filter((task) => Array.isArray(task.foilUsage) && task.foilUsage.length > 0)
      .map((task) => {
        const totalFoilUsed = task.foilUsage.reduce((sum, entry) => sum + Number(entry.usedWeight || 0), 0);
        const expectedUsage = Number(task.required_kg || 0) * Number(task.colourCount || 1);
        const variance = expectedUsage ? Number((totalFoilUsed - expectedUsage).toFixed(3)) : 0;
        return {
          taskId: task._id,
          productName: task.product_name,
          workerName: task.worker_name,
          status: task.status,
          colourCount: task.colourCount || 1,
          requiredKg: task.required_kg || 0,
          expectedUsage,
          totalFoilUsed: Number(totalFoilUsed.toFixed(3)),
          wasteKg: task.waste_kg || 0,
          variance,
          updatedAt: task.updatedAt,
          foilUsage: task.foilUsage
        };
      });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== NEW TASK CREATION WITH UPLOAD ==========
const taskStorage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `task-${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`);
  }
});
const taskUpload = multer({ storage: taskStorage }).single('image');

app.post('/tasks-create', verifyToken, allowRoles("admin", "manager", "ceo"), taskUpload, async (req, res) => {
  try {
    const { product_name, size, required_kg, company: bodyCompany, worker_name, colourCount } = req.body;
    const company = bodyCompany || await getRequestCompany(req);
    const parsedColourCount = Number(colourCount);

    if (!product_name || !size || !required_kg) {
      return res.status(400).send("Product name, size, required KG required");
    }
    if (!worker_name) {
      return res.status(400).send("Worker name is required");
    }
    if (!Number.isInteger(parsedColourCount) || parsedColourCount < 1 || parsedColourCount > 8) {
      return res.status(400).send("Number of Colours must be between 1 and 8");
    }
    if (!COMPANY_NAMES[company]) {
      return res.status(400).send("Invalid company");
    }

    const image_path = req.file ? await uploadToCloudinary(req.file.path, company) : null;

    // Auto-assign an available foil matching foil_type/size and weight >= required_kg (if foil_type/size are present)
    // This is required so that worker barcode scans can be validated.
    let assignedFoilQrPayload = '';

    try {
      const { foil_type, size: formSize } = req.body;
      const foilSize = formSize || size;
      const candidate = await Foil.findOne({
        company,
        type: foil_type || undefined,
        size: foilSize,
        weight: { $gt: 0 },
      }).sort({ version: 1 });

      if (candidate?.qrPayload) assignedFoilQrPayload = candidate.qrPayload;

    } catch (e) {
      // ignore auto-assign failure; start validation will block until assigned
    }

    const task = new Task({
      company,
      product_name,
      size,
      required_kg: Number(required_kg),
      colourCount: parsedColourCount,
      foil_type: req.body.foil_type,
      worker_name: worker_name.trim(),
      image_path,
      clientCompany: req.body.clientCompany,
      referenceFileId: req.body.referenceFileId || undefined,

      // Use assigned barcode for validation (security)
      assigned_foil_qrPayload: assignedFoilQrPayload || undefined

    });

    await task.save();
    const workerUser = await User.findOne({ name: worker_name.trim(), company }).select("_id").lean();
    if (workerUser) {
      await createAndSendNotification(workerUser._id, "task", `New Task Assigned: ${task.product_name || 'Stock Task'} (${parsedColourCount || 1} Colour)`);
    }

    createAuditLog({
      req,
      action: "create",
      itemType: "task",
      before: null,
      after: task.toObject()
    }).catch((auditErr) => {
      console.error("Audit log failed for task creation:", auditErr);
    });

    res.json({ message: "✅ Task created successfully", task });
  } catch (err) {
    console.error('tasks-create error:', err);
    res.status(500).json({
      message: 'Error creating task',
      details: err?.message || String(err)
    });
  }
});

// ✅ UPDATE TASK (admin/ceo)
app.put('/tasks/:id', verifyToken, allowRoles('admin', 'ceo'), multer({ storage: taskStorage }).single('image'), async (req, res) => {
  try {
    const { product_name, size, required_kg, colourCount, company: bodyCompany } = req.body;
    const company = bodyCompany || await getRequestCompany(req);

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).send('Task not found');
    if (task.company && task.company !== company) return res.status(403).send('Access denied');

    const before = task.toObject();

    task.company = task.company || company;
    if (product_name !== undefined) task.product_name = product_name;
    if (size !== undefined) task.size = size;
    if (required_kg !== undefined) task.required_kg = Number(required_kg);
    if (colourCount !== undefined) {
      const parsedColourCount = Number(colourCount);
      if (!Number.isInteger(parsedColourCount) || parsedColourCount < 1 || parsedColourCount > 8) {
        return res.status(400).json({ message: 'Number of Colours must be between 1 and 8' });
      }
      task.colourCount = parsedColourCount;
    }

    if (req.file) {
      task.image_path = await uploadToCloudinary(req.file.path, task.company || company);
    }

    task.status = task.status || 'pending';

    await task.save();

    await createAuditLog({
      req,
      action: 'edit',
      itemType: 'task',
      before,
      after: task.toObject()
    });

    res.json({ message: '✅ Task updated', task });
  } catch (err) {
    console.error('tasks edit error:', err);
    res.status(500).json({ message: 'Error updating task', details: err?.message || String(err) });
  }
});

// ❌ DELETE TASK (admin/ceo)
app.delete('/tasks/:id', verifyToken, allowRoles('admin', 'ceo'), async (req, res) => {
  try {
    const company = await getRequestCompany(req);

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).send('Task not found');
    if (task.company && task.company !== company) return res.status(403).send('Access denied');

    const before = task.toObject();
    await task.deleteOne();

    await createAuditLog({
      req,
      action: 'delete',
      itemType: 'task',
      before,
      after: null
    });

    res.json({ message: '✅ Task deleted' });
  } catch (err) {
    console.error('tasks delete error:', err);
    res.status(500).json({ message: 'Error deleting task', details: err?.message || String(err) });
  }
});

app.post('/tasks/:id/start', verifyToken, allowRoles('admin', 'manager', 'ceo', 'worker'), multer({ dest: './uploads/' }).single('foil_image'), async (req, res) => {
  try {
    const company = await getRequestCompany(req);
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const taskCompany = task.company || 'bharath';
    if (taskCompany !== company) return res.status(403).json({ error: 'Access denied: Task belongs to different company' });
    if (task.status === 'completed') return res.status(400).json({ error: 'Cannot start a completed task' });

    const actorName = await getActorName(req);
    if (req.user.role === 'worker') {
      const taskWorkerName = (task.worker_name || '').trim();
      if (taskWorkerName === '') {
        task.worker_name = actorName;
      } else if (actorName !== taskWorkerName) {
        return res.status(403).json({ error: `You can only start your own tasks. Your name is "${actorName}" but task is assigned to "${taskWorkerName}"` });
      }
    }

    const colourCount = Number(task.colourCount || 1);
    const submittedScans = normalizeFoilScansInput(req.body, task);
    if (!Array.isArray(submittedScans) || submittedScans.length < colourCount) {
      return res.status(400).json({
        error: `Scan foil for each colour before starting. Required: ${colourCount}, received: ${submittedScans.length}`
      });
    }

    const usage = [];
    for (let colourNumber = 1; colourNumber <= colourCount; colourNumber += 1) {
      const scan = submittedScans.find((entry) => Number(entry.colourNumber) === colourNumber) || submittedScans[colourNumber - 1];
      const validation = await validateFoilForTask({ qrPayload: scan?.qrPayload, task, company, colourNumber, allowDuplicate: false });
      await QrScanLog.create({
        company,
        taskId: task._id,
        foilQrPayload: scan?.qrPayload || '',
        scannedBy: req.user.id,
        scannedByRole: req.user.role,
        validationResult: validation.ok ? 'valid' : validation.status,
        details: validation.ok ? `Colour ${colourNumber} foil accepted` : validation.message
      }).catch(() => {});
      if (!validation.ok) return res.status(403).json({ error: `Colour ${colourNumber}: ${validation.message}` });

      usage.push({
        foilId: validation.foil._id,
        foilQrPayload: validation.foil.qrPayload,
        colourNumber,
        startWeight: validation.balance,
        remainingWeight: validation.balance,
        usedWeight: 0,
        isSwap: false,
        scannedAt: new Date(),
        workerName: actorName
      });
    }

    if (req.file) task.foil_start_image_path = await uploadToCloudinary(req.file.path, task.company || company);
    task.foilUsage = usage;
    task.foil_qrPayload = usage[0]?.foilQrPayload || '';
    task.status = 'in-progress';
    await task.save();

    await createAuditLog({
      req,
      action: 'start',
      itemType: 'task',
      before: null,
      after: task.toObject()
    });

    res.json({ message: `Task started with ${colourCount} foil scan${colourCount === 1 ? '' : 's'}`, task });
  } catch (err) {
    console.error('tasks start error:', err);
    res.status(500).json({ error: 'Error: ' + err.message });
  }
});


app.post('/tasks/:id/foil-swap', verifyToken, allowRoles('admin', 'manager', 'ceo', 'worker'), async (req, res) => {
  try {
    const { colourNumber, foil_qrPayload, reason } = req.body;
    const company = await getRequestCompany(req);
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if ((task.company || 'bharath') !== company) return res.status(403).json({ error: 'Access denied: Task belongs to different company' });
    if (task.status !== 'in-progress') return res.status(400).json({ error: 'Foil swaps are available only for in-progress tasks' });

    const colour = Number(colourNumber);
    if (!Number.isInteger(colour) || colour < 1 || colour > Number(task.colourCount || 1)) {
      return res.status(400).json({ error: 'Invalid colour number' });
    }

    const matchingAvailable = await Foil.exists({
      company,
      type: task.foil_type,
      size: task.size,
      $or: [{ remainingWeight: { $gt: 0 } }, { weight: { $gt: 0 } }]
    });
    if (!matchingAvailable) {
      return res.status(404).json({ error: 'No matching foil available - contact Supervisor' });
    }

    const validation = await validateFoilForTask({ qrPayload: foil_qrPayload, task, company, colourNumber: colour, allowDuplicate: false });
    await QrScanLog.create({
      company,
      taskId: task._id,
      foilQrPayload: foil_qrPayload || '',
      scannedBy: req.user.id,
      scannedByRole: req.user.role,
      validationResult: validation.ok ? 'valid' : validation.status,
      details: validation.ok ? `Foil swap accepted for Colour ${colour}` : validation.message
    }).catch(() => {});
    if (!validation.ok) return res.status(403).json({ error: validation.message });

    const actorName = await getActorName(req);
    const previous = [...(task.foilUsage || [])].reverse().find((entry) => Number(entry.colourNumber) === colour);
    task.foilUsage.push({
      foilId: validation.foil._id,
      foilQrPayload: validation.foil.qrPayload,
      colourNumber: colour,
      startWeight: validation.balance,
      remainingWeight: validation.balance,
      usedWeight: 0,
      isSwap: true,
      swappedFromFoilId: previous?.foilId,
      scannedAt: new Date(),
      workerName: actorName,
      notes: reason || 'Foil ran out'
    });
    task.foilSwapEvents.push({
      colourNumber: colour,
      oldFoilId: previous?.foilId,
      newFoilId: validation.foil._id,
      reason: reason || 'Foil ran out',
      workerName: actorName
    });
    await task.save();

    await createAuditLog({ req, action: 'swap', itemType: 'task', before: null, after: task.toObject() });
    res.json({ message: `Foil swap recorded for Colour ${colour}`, task });
  } catch (err) {
    console.error('tasks foil-swap error:', err);
    res.status(500).json({ error: 'Error: ' + err.message });
  }
});


app.post('/tasks/:id/consume', verifyToken, allowRoles('admin', 'manager', 'ceo', 'worker'), multer({ dest: './uploads/' }).single('waste_image'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { used_kg, waste_kg, remaining_kg } = req.body;
    const consumptionEntries = parseJsonField(req.body.foilUsage, []);

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const company = await getRequestCompany(req);
    if ((task.company || 'bharath') !== company) return res.status(403).json({ error: 'Access denied: Task belongs to different company' });
    if (task.status === 'completed') return res.status(400).json({ error: 'Task is already completed' });

    const actorName = await getActorName(req);
    if (req.user.role === 'worker') {
      const taskWorkerName = (task.worker_name || '').trim();
      if (taskWorkerName === '') {
        task.worker_name = actorName;
      } else if (actorName !== taskWorkerName) {
        return res.status(403).json({ error: `You can only complete your own tasks. Your name is "${actorName}" but task is assigned to "${taskWorkerName}"` });
      }
    }

    if (!Array.isArray(task.foilUsage) || task.foilUsage.length === 0) {
      return res.status(400).json({ error: 'Task has no scanned foil rolls. Start the task with foil scans first.' });
    }
    if (!Array.isArray(consumptionEntries) || consumptionEntries.length === 0) {
      return res.status(400).json({ error: 'Foil consumption per scanned roll is required' });
    }

    const beforeTask = task.toObject();
    let totalUsed = 0;
    const auditEvents = [];

    for (const entry of consumptionEntries) {
      const usage = task.foilUsage.id(entry.usageId);
      if (!usage) return res.status(400).json({ error: 'Invalid foil usage entry submitted' });

      const usedWeight = Number(entry.usedWeight ?? entry.usedKg ?? 0);
      if (!Number.isFinite(usedWeight) || usedWeight < 0) {
        return res.status(400).json({ error: 'Used foil weight must be zero or greater' });
      }

      const foil = await Foil.findOne({ _id: usage.foilId, company });
      if (!foil) return res.status(404).json({ error: `Foil not found for Colour ${usage.colourNumber}` });

      const beforeBalance = getFoilBalance(foil);
      if (usedWeight > beforeBalance) {
        return res.status(409).json({
          error: `Foil balance insufficient to complete Colour ${usage.colourNumber}. Please scan a new foil roll to continue.`,
          code: 'INSUFFICIENT_FOIL',
          colourNumber: usage.colourNumber,
          foilId: foil._id,
          availableWeight: beforeBalance
        });
      }

      const afterBalance = beforeBalance - usedWeight;
      setFoilBalance(foil, afterBalance);
      await foil.save();

      usage.usedWeight = Number((Number(usage.usedWeight || 0) + usedWeight).toFixed(3));
      usage.remainingWeight = Number(afterBalance.toFixed(3));
      usage.completedAt = new Date();
      totalUsed += usedWeight;

      auditEvents.push({
        action: 'consume',
        itemType: 'foil',
        company,
        itemId: String(foil._id),
        qrPayload: foil.qrPayload,
        changedBy: actorName,
        changedByRole: req.user.role,
        before: {
          taskId: String(task._id),
          colourNumber: usage.colourNumber,
          foilId: String(foil._id),
          weightBefore: beforeBalance
        },
        after: {
          taskId: String(task._id),
          colourNumber: usage.colourNumber,
          foilId: String(foil._id),
          weightUsed: usedWeight,
          weightRemaining: afterBalance,
          workerName: actorName,
          timestamp: new Date()
        }
      });
    }

    task.used_kg = Number(used_kg || totalUsed);
    task.waste_kg = Number(waste_kg || 0);
    task.remaining_kg = Number(remaining_kg || 0);
    task.status = 'completed';
    task.completedAt = new Date();
    if (req.file) task.waste_image_path = await uploadToCloudinary(req.file.path, task.company || company);
    await task.save();

    if (auditEvents.length) await AuditLog.insertMany(auditEvents);
    await createAuditLog({ req, action: 'complete', itemType: 'task', before: beforeTask, after: task.toObject() });

    res.json({ message: 'Task completed', task });
  } catch (err) {
    console.error('tasks consume error:', err);
    res.status(500).json({ error: 'Error: ' + err.message });
  }
});


app.post('/tasks/:id/consume-legacy', verifyToken, allowRoles('admin', 'manager', 'ceo', 'worker'), multer({ dest: './uploads/' }).single('waste_image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { used_kg, waste_kg, remaining_kg } = req.body;

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    const company = await getRequestCompany(req);
    const taskCompany = task.company || 'bharath';
    if (taskCompany !== company) {
      return res.status(403).json({ error: 'Access denied: Task belongs to different company' });
    }

    if (req.user.role === 'worker') {
      const user = await User.findById(req.user.id).select('name');
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const workerName = (user.name || '').trim();
      const taskWorkerName = (task.worker_name || '').trim();
      
      if (taskWorkerName === '') {
        // Claim the unassigned task retroactively
        task.worker_name = workerName;
      } else if (workerName !== taskWorkerName) {
        return res.status(403).json({ 
          error: `You can only complete your own tasks. Your name is "${workerName}" but task is assigned to "${taskWorkerName}"` 
        });
      }
    }

    if (!req.file && req.user.role === 'worker') return res.status(400).json({ error: 'waste_image is required' });
    if (task.status === 'completed') return res.status(400).json({ error: 'Task is already completed' });

    task.used_kg = Number(used_kg);
    task.waste_kg = Number(waste_kg);
    task.remaining_kg = Number(remaining_kg);
    task.status = 'completed';
    task.completedAt = new Date();
    if (req.file) {
      task.waste_image_path = await uploadToCloudinary(req.file.path, task.company || company);
    }

    await task.save();

    // Update Foil Balance
    let newFoilQrPayload = null;
    if (task.foil_qrPayload) {
      const foil = await Foil.findOne({ qrPayload: task.foil_qrPayload });

      if (foil) {
        foil.weight = 0; // Old one is consumed
        await foil.save();

        if (Number(remaining_kg) > 0) {
          const newVersion = (foil.version || 1) + 1;
          newFoilQrPayload = generateFoilQrPayload({
            company: foil.company,
            type: foil.type,
            size: foil.size,
            kg: Number(remaining_kg),
            version: newVersion
          });
          const newFoil = new Foil({
            company: foil.company,
            materialKind: foil.materialKind,
            type: foil.type,
            size: foil.size,
            weight: Number(remaining_kg),
            qrPayload: newFoilQrPayload,
            version: newVersion,
            serial: String(newVersion)
          });
          await newFoil.save();

        }
      }
    }

    await createAuditLog({
      req,
      action: 'complete',
      itemType: 'task',
      before: null,
      after: task.toObject()
    });

    res.json({ message: '✅ Task completed', task, newFoilQrPayload });

  } catch (err) {
    console.error('tasks consume error:', err);
    res.status(500).json({ error: 'Error: ' + err.message });
  }
});

// ========== ATTENDANCE SYSTEM ==========
const Attendance = require("./models/Attendance");

// Standard shift length in hours
const STANDARD_SHIFT_HOURS = Number(process.env.STANDARD_SHIFT_HOURS || 9);

function parseTimeString(timeStr) {
  if (!timeStr) return null;
  const [h, m, s] = timeStr.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { h, m, s: s || 0 };
}

// Helper: calculate hours between two HH:MM:SS strings
function calcHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const start = parseTimeString(checkIn);
  const end = parseTimeString(checkOut);
  if (!start || !end) return 0;
  const startSeconds = start.h * 3600 + start.m * 60 + start.s;
  const endSeconds = end.h * 3600 + end.m * 60 + end.s;
  const diff = Math.max(0, endSeconds - startSeconds);
  return Math.round((diff / 3600) * 100) / 100;
}

// Helper: calculate earnings based on hours, rate, type, date, OT hours, and OT rate
function calcEarnings(hours, rate, type, dateStr, otHours = 0, otRate = 0) {
  if (!rate || rate <= 0) return 0;
  
  let baseEarnings = 0;
  if (type === "hourly") {
    baseEarnings = hours * rate;
  } else if (type === "monthly") {
    const dateObj = dateStr ? new Date(dateStr) : new Date();
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1; // 1-indexed
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const perDayRate = rate / totalDaysInMonth;
    
    if (hours >= 4) baseEarnings = perDayRate;
    else if (hours > 0) baseEarnings = perDayRate / 2;
  } else {
    // daily
    if (hours >= 4) baseEarnings = rate;
    else if (hours > 0) baseEarnings = rate / 2;
  }
  
  const otPay = otHours * otRate;
  return Math.round((baseEarnings + otPay) * 100) / 100;
}

// Helper: get the role of a user by name + company
async function getUserRoleByName(name, company) {
  const user = await User.findOne({ name, company }).select("role");
  return user?.role || "worker";
}

// GET all staff for the company (for attendance dropdown)
app.get(["/workers", "/api/workers"], verifyToken, allowRoles("admin", "manager", "ceo"), async (req, res) => {
  try {
    const company = await getRequestCompany(req);
    const requesterRole = req.user.role;

    let roleFilter;
    if (requesterRole === "ceo") {
      roleFilter = { $in: ["worker", "manager", "admin"] };
    } else if (requesterRole === "admin") {
      roleFilter = { $in: ["worker", "manager"] };
    } else {
      roleFilter = "worker";
    }

    const staff = await User.find({ company, role: roleFilter }).select("name email role company employeeNo department shiftTiming");
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /attendance & /api/attendance (Mark attendance / check-in / check-out)
app.post(["/attendance", "/api/attendance", "/api/attendance/check-in", "/api/attendance/check-out"], verifyToken, async (req, res) => {
  try {
    const { workerName, date, status, notes, checkIn, checkOut, extraHours } = req.body;
    const company = await getRequestCompany(req);
    const requester = await User.findById(req.user.id).select("name role");
    const requesterRole = requester?.role;

    if (!workerName || !date) {
      return res.status(400).json({ error: "workerName and date are required" });
    }

    if (requesterRole === "worker" && workerName !== requester.name) {
      return res.status(403).json({ error: "Workers can only mark their own attendance" });
    }

    // Check authority: Admin cannot mark CEO attendance
    const targetRole = await getUserRoleByName(workerName, company);
    if (requesterRole === "admin" && targetRole === "ceo") {
      return res.status(403).json({ error: "Admin cannot manage CEO attendance" });
    }
    if (requesterRole === "manager" && (targetRole === "ceo" || targetRole === "admin")) {
      return res.status(403).json({ error: "Manager can only manage worker attendance" });
    }

    const now = new Date();
    const currentTime = now.toLocaleTimeString("en-GB", { hour12: false });
    const targetUser = await User.findOne({ name: workerName, company }).select("employeeNo salaryRate salaryType");
    if (targetUser && !targetUser.employeeNo) {
      targetUser.employeeNo = await getNextEmployeeNo(company);
      await targetUser.save();
    }
    const workerSalaryRate = targetUser?.salaryRate || 0;
    const workerSalaryType = targetUser?.salaryType || "daily";
    const empNo = req.body.empNo || targetUser?.employeeNo || "";
    const extra = Number(extraHours || 0);

    const inputStatus = status || "present";
    const normalizedInputStatus = inputStatus.toLowerCase();

    let record = await Attendance.findOne({ workerName, company, date });

    // Helper: calculate check-in status (Early, On Time, Late)
    const calculateCheckInStatus = (timeStr) => {
      const time = parseTimeString(timeStr);
      if (!time) return "Present";
      const checkInMins = time.h * 60 + time.m;
      const shiftStartMins = 9 * 60; // 09:00 AM
      const graceEndMins = 9 * 60 + 10; // 09:10 AM
      if (checkInMins < shiftStartMins) return "Early";
      if (checkInMins <= graceEndMins) return "On Time";
      return "Late";
    };

    // If they want to checkout
    if (normalizedInputStatus === "checkout") {
      if (!record) {
        return res.status(400).json({ error: "Cannot check out. No check-in record found for today." });
      }
      if (record.checkOut) {
        return res.status(400).json({ error: "Attendance already completed for today." });
      }
      const entryCheckOut = checkOut || currentTime;
      record.checkOut = entryCheckOut;
      record.hoursWorked = calcHours(record.checkIn, record.checkOut);
      record.overtime = Math.max(0, record.hoursWorked - STANDARD_SHIFT_HOURS);
      record.otRate = targetUser?.otRate || 0;
      record.totalHours = Math.round((record.hoursWorked + record.extraHours) * 100) / 100;
      record.earnings = calcEarnings(record.hoursWorked, workerSalaryRate, workerSalaryType, record.date, record.overtime, record.otRate);
      
      record.markedBy = requester?.name || "System";
      record.markedByRole = requester?.role || req.user.role;
      await record.save();
      return res.json({ message: "Checked out successfully", record });
    }

    // Otherwise, they are marking check-in (or setting status to absent/leave/half-day)
    if (record) {
      // If a record already exists today, and they are trying to check in again
      if (record.checkIn) {
        return res.status(409).json({ error: "Attendance already marked for this worker on this date" });
      }
      
      // Update check-in or other status
      if (["absent", "leave"].includes(normalizedInputStatus)) {
        record.status = normalizedInputStatus === "absent" ? "Absent" : "Leave";
        record.checkIn = null;
        record.checkOut = null;
        record.extraHours = 0;
        record.hoursWorked = 0;
        record.overtime = 0;
        record.totalHours = 0;
        record.earnings = 0;
      } else {
        const entryCheckIn = checkIn || currentTime;
        record.checkIn = entryCheckIn;
        record.status = normalizedInputStatus === "half-day" ? "Half Day" : calculateCheckInStatus(entryCheckIn);
        record.extraHours = extra;
      }
      if (notes !== undefined) record.remarks = notes;
      record.markedBy = requester?.name || "System";
      record.markedByRole = requester?.role || req.user.role;
      record.workerRole = targetRole;
      record.empNo = empNo;
      record.salaryRate = workerSalaryRate;
      record.salaryType = workerSalaryType;
      await record.save();
      return res.json({ message: "Attendance marked", record });
    }

    // Create a new record
    let finalStatus = "Present";
    let entryCheckIn = null;
    let entryCheckOut = null;

    if (["absent", "leave"].includes(normalizedInputStatus)) {
      finalStatus = normalizedInputStatus === "absent" ? "Absent" : "Leave";
    } else {
      entryCheckIn = checkIn || currentTime;
      finalStatus = normalizedInputStatus === "half-day" ? "Half Day" : calculateCheckInStatus(entryCheckIn);
      entryCheckOut = checkOut || null;
    }

    record = new Attendance({
      empNo,
      workerName,
      company,
      date,
      checkIn: entryCheckIn,
      checkOut: entryCheckOut,
      status: finalStatus,
      extraHours: extra,
      remarks: notes || "",
      markedBy: requester?.name || "System",
      markedByRole: requester?.role || req.user.role,
      workerRole: targetRole,
      salaryRate: workerSalaryRate,
      salaryType: workerSalaryType,
      otRate: targetUser?.otRate || 0
    });

    if (record.checkIn && record.checkOut) {
      record.hoursWorked = calcHours(record.checkIn, record.checkOut);
      record.overtime = Math.max(0, record.hoursWorked - STANDARD_SHIFT_HOURS);
      record.totalHours = Math.round((record.hoursWorked + extra) * 100) / 100;
      record.earnings = calcEarnings(record.hoursWorked, workerSalaryRate, workerSalaryType, record.date, record.overtime, record.otRate);
    } else {
      record.earnings = 0;
    }

    await record.save();
    res.json({ message: "Attendance marked", record });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Attendance already marked for this worker on this date" });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /attendance/:id & /api/attendance/:id - Edit attendance
app.put(["/attendance/:id", "/api/attendance/:id"], verifyToken, async (req, res) => {
  try {
    const requesterRole = req.user.role;
    if (requesterRole !== "admin" && requesterRole !== "ceo") {
      return res.status(403).json({ error: "403 Forbidden: Only Admin or CEO can edit attendance" });
    }

    const { status, checkIn, checkOut, notes, extraHours, empNo } = req.body;
    const record = await Attendance.findById(req.params.id);
    if (!record) return res.status(404).json({ error: "Record not found" });

    const targetRole = await getUserRoleByName(record.workerName, record.company);
    if (requesterRole === "admin" && targetRole === "ceo") {
      return res.status(403).json({ error: "Admin cannot edit CEO attendance" });
    }

    const marker = await User.findById(req.user.id).select("name role");

    if (status) {
      const sLower = status.toLowerCase();
      if (sLower === "present") record.status = "Present";
      else if (sLower === "absent") record.status = "Absent";
      else if (sLower === "leave") record.status = "Leave";
      else if (sLower === "half-day" || sLower === "half day") record.status = "Half Day";
      else if (sLower === "early") record.status = "Early";
      else if (sLower === "on-time" || sLower === "on time") record.status = "On Time";
      else if (sLower === "late") record.status = "Late";
      else record.status = status;
    }
    if (empNo !== undefined) record.empNo = empNo;
    if (checkIn !== undefined) record.checkIn = checkIn;
    if (checkOut !== undefined) record.checkOut = checkOut;
    if (extraHours !== undefined) record.extraHours = Number(extraHours || 0);
    if (notes !== undefined) record.remarks = notes;
    record.markedBy = marker?.name || "System";
    record.markedByRole = marker?.role || req.user.role;

    if (record.status && ["absent", "leave"].includes(record.status.toLowerCase())) {
      record.checkIn = null;
      record.checkOut = null;
      record.hoursWorked = 0;
      record.overtime = 0;
      record.totalHours = 0;
      record.extraHours = 0;
      record.earnings = 0;
    } else if (record.checkIn && record.checkOut) {
      record.hoursWorked = calcHours(record.checkIn, record.checkOut);
      record.overtime = Math.max(0, record.hoursWorked - STANDARD_SHIFT_HOURS);
      record.totalHours = Math.round((record.hoursWorked + (record.extraHours || 0)) * 100) / 100;
      record.earnings = calcEarnings(record.hoursWorked, record.salaryRate, record.salaryType, record.date, record.overtime, record.otRate || 0);
    } else {
      record.earnings = 0;
    }

    await record.save();
    res.json({ message: "Attendance updated", record });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /attendance & /api/attendance
app.get(["/attendance", "/api/attendance"], verifyToken, async (req, res) => {
  try {
    const company = await getRequestCompany(req);
    const { date, from, to, workerName, status, search, empNo } = req.query;

    let query = { company };

    if (search) {
      query.$or = [
        { workerName: { $regex: new RegExp(search, "i") } },
        { empNo: { $regex: new RegExp(search, "i") } }
      ];
    } else {
      if (workerName) query.workerName = workerName;
      if (empNo) query.empNo = empNo;
    }

    if (date) {
      query.date = date;
    } else if (from && to) {
      query.date = { $gte: from, $lte: to };
    }

    if (status && status.toLowerCase() !== "all") {
      if (!["paid leave", "paid-leave", "absent"].includes(status.toLowerCase())) {
        query.status = { $regex: new RegExp(`^${status}$`, "i") };
      }
    }

    if (!["admin", "manager", "ceo"].includes(req.user.role)) {
      const self = await User.findById(req.user.id).select("name");
      query.workerName = self?.name;
    }

    let records = await Attendance.find(query).sort({ date: -1, workerName: 1 });

    // Now let's implement the Sunday & Holiday dynamic Paid Leave injection!
    let usersQuery = { company };
    if (query.workerName) {
      usersQuery.name = query.workerName;
    } else if (search) {
      usersQuery.$or = [
        { name: { $regex: new RegExp(search, "i") } },
        { employeeNo: { $regex: new RegExp(search, "i") } }
      ];
    }
    const users = await User.find(usersQuery).select("name employeeNo role salaryRate salaryType otRate");

    let holidaysQuery = { company };
    if (date) {
      holidaysQuery.date = date;
    } else if (from && to) {
      holidaysQuery.date = { $gte: from, $lte: to };
    }
    const companyHolidays = await Holiday.find(holidaysQuery);
    const holidayDates = new Set(companyHolidays.map(h => h.date));
    const holidayReasons = companyHolidays.reduce((acc, h) => {
      acc[h.date] = h.reason;
      return acc;
    }, {});

    let datesToCheck = [];
    if (date) {
      datesToCheck.push(date);
    } else if (from && to) {
      let current = new Date(from);
      const last = new Date(to);
      while (current <= last) {
        datesToCheck.push(current.toISOString().split("T")[0]);
        current.setDate(current.getDate() + 1);
      }
    } else {
      datesToCheck.push(new Date().toISOString().split("T")[0]);
    }

    let recordsMap = new Map();
    records.forEach(r => {
      recordsMap.set(`${r.workerName}_${r.date}`, r);
    });

    let finalRecords = [...records];

    for (const d of datesToCheck) {
      const dateObj = new Date(d);
      const isSunday = dateObj.getDay() === 0;
      const isHoliday = holidayDates.has(d);

      if (isSunday || isHoliday) {
        const reason = isSunday ? "Sunday Paid Leave" : `Holiday: ${holidayReasons[d]}`;
        
        for (const user of users) {
          const key = `${user.name}_${d}`;
          if (!recordsMap.has(key)) {
            let dailyRate = user.salaryRate || 0;
            if (user.salaryType === "monthly") {
              const year = dateObj.getFullYear();
              const month = dateObj.getMonth() + 1;
              const totalDaysInMonth = new Date(year, month, 0).getDate();
              dailyRate = user.salaryRate / totalDaysInMonth;
            }
            
            const paidLeaveRecord = {
              _id: `temp_${user._id}_${d}`,
              empNo: user.employeeNo || "",
              workerName: user.name,
              company: company,
              date: d,
              checkIn: null,
              checkOut: null,
              status: "Paid Leave",
              hoursWorked: 0,
              overtime: 0,
              totalHours: 0,
              extraHours: 0,
              remarks: reason,
              workerRole: user.role,
              salaryRate: user.salaryRate,
              salaryType: user.salaryType,
              otRate: user.otRate || 0,
              earnings: user.salaryType === "hourly" ? 0 : Math.round(dailyRate * 100) / 100
            };
            
            finalRecords.push(paidLeaveRecord);
          }
        }
      } else {
        // Weekdays dynamic absent generation
        for (const user of users) {
          const key = `${user.name}_${d}`;
          if (!recordsMap.has(key)) {
            const absentRecord = {
              _id: `temp_${user._id}_${d}`,
              empNo: user.employeeNo || "",
              workerName: user.name,
              company: company,
              date: d,
              checkIn: null,
              checkOut: null,
              status: "Absent",
              hoursWorked: 0,
              overtime: 0,
              totalHours: 0,
              extraHours: 0,
              remarks: "No check-in record found",
              workerRole: user.role,
              salaryRate: user.salaryRate,
              salaryType: user.salaryType,
              otRate: user.otRate || 0,
              earnings: 0
            };
            finalRecords.push(absentRecord);
          }
        }
      }
    }

    if (status && status.toLowerCase() !== "all") {
      const sLower = status.toLowerCase();
      finalRecords = finalRecords.filter(r => {
        const rStatus = (r.status || "").toLowerCase();
        if (sLower === "paid leave" || sLower === "paid-leave") {
          return rStatus === "paid leave";
        }
        if (sLower === "present") {
          return ["present", "early", "on time", "late", "on-time"].includes(rStatus);
        }
        return rStatus === sLower;
      });
    }

    finalRecords.sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return a.workerName.localeCompare(b.workerName);
    });

    res.json(finalRecords);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /attendance/export
app.get("/attendance/export", verifyToken, async (req, res) => {
  try {
    const company = await getRequestCompany(req);
    const { type = "xlsx", date, from, to, workerName, status } = req.query;
    let query = { company };
    if (workerName) query.workerName = workerName;
    if (req.query.empNo) query.empNo = req.query.empNo;
    if (status) query.status = status.toLowerCase();
    if (date) query.date = date;
    else if (from && to) query.date = { $gte: from, $lte: to };
    if (!["admin", "manager", "ceo"].includes(req.user.role)) {
      const self = await User.findById(req.user.id).select("name");
      query.workerName = self?.name;
    }
    const records = await Attendance.find(query).sort({ workerName: 1, date: 1 });

    if (type === "pdf") {
      const doc = new PDFDocument({ margin: 40, size: "A4" });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=attendance_report.pdf`);
      doc.fontSize(14).text("Attendance Report", { align: "center" }).moveDown(0.5);
      doc.fontSize(10).text(`Date range: ${from || "All"} to ${to || "All"}`);
      if (workerName) doc.text(`Employee: ${workerName}`);
      doc.moveDown(0.5);

      const tableHeaders = ["Emp No", "Name", "Date", "Day", "Status", "Time In", "Time Out", "OD", "Hours", "OT", "Total"];
      const maxWidth = 520;
      const colWidth = maxWidth / tableHeaders.length;

      tableHeaders.forEach((header, index) => {
        doc.font("Helvetica-Bold").fontSize(8).text(header, 40 + index * colWidth, doc.y, { width: colWidth, continued: index !== tableHeaders.length - 1 });
      });
      doc.moveDown(1);

      records.forEach((rec) => {
        const day = new Date(rec.date).toLocaleDateString("en-GB", { weekday: "short" });
        const row = [rec.empNo || "", rec.workerName, rec.date, day, rec.status, rec.checkIn || "", rec.checkOut || "", rec.extraHours || 0, rec.hoursWorked || 0, rec.overtime || 0, rec.totalHours || 0];
        row.forEach((value, index) => {
          doc.font("Helvetica").fontSize(8).text(String(value), 40 + index * colWidth, doc.y, { width: colWidth, continued: index !== row.length - 1 });
        });
        doc.moveDown(0.8);
      });

      const summary = {};
      records.forEach((rec) => {
        const key = rec.empNo || rec.workerName;
        if (!summary[key]) summary[key] = { empNo: rec.empNo || "", name: rec.workerName, present: 0, absent: 0, od: 0, hours: 0, overtime: 0 };
        if (rec.status === "present") summary[key].present += 1;
        if (rec.status === "absent") summary[key].absent += 1;
        summary[key].od += rec.extraHours || 0;
        summary[key].hours += rec.hoursWorked || 0;
        summary[key].overtime += rec.overtime || 0;
      });

      doc.addPage();
      doc.font("Helvetica-Bold").fontSize(12).text("Summary", { underline: true }).moveDown(0.5);
      Object.values(summary).forEach((item) => {
        doc.fontSize(10).text(`${item.empNo} ${item.name} — Present: ${item.present}, Absent: ${item.absent}, OD Hours: ${item.od}, Working Hours: ${item.hours}, Overtime: ${item.overtime}`);
      });
      doc.pipe(res);
      doc.end();
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Attendance Report");
    sheet.columns = [
      { header: "Emp No", key: "empNo", width: 12 },
      { header: "Employee Name", key: "workerName", width: 24 },
      { header: "Date", key: "date", width: 14 },
      { header: "Day", key: "day", width: 10 },
      { header: "Status", key: "status", width: 12 },
      { header: "Time In", key: "checkIn", width: 12 },
      { header: "Time Out", key: "checkOut", width: 12 },
      { header: "OD Hours", key: "extraHours", width: 12 },
      { header: "Working Hours", key: "hoursWorked", width: 14 },
      { header: "Overtime", key: "overtime", width: 12 },
      { header: "Total Hours", key: "totalHours", width: 14 },
      { header: "Remarks", key: "remarks", width: 24 }
    ];

    records.forEach((rec) => {
      const day = new Date(rec.date).toLocaleDateString("en-GB", { weekday: "short" });
      const row = sheet.addRow({
        empNo: rec.empNo || "",
        workerName: rec.workerName,
        date: rec.date,
        day,
        status: rec.status,
        checkIn: rec.checkIn ? { formula: `TIME(${rec.checkIn.split(":")[0]},${rec.checkIn.split(":")[1]},${rec.checkIn.split(":")[2] || 0})` } : "",
        checkOut: rec.checkOut ? { formula: `TIME(${rec.checkOut.split(":")[0]},${rec.checkOut.split(":")[1]},${rec.checkOut.split(":")[2] || 0})` } : "",
        extraHours: rec.extraHours || 0,
        hoursWorked: rec.hoursWorked || 0,
        overtime: rec.overtime || 0,
        totalHours: rec.totalHours || 0,
        remarks: rec.remarks || ""
      });
      if (rec.checkIn) row.getCell("checkIn").numFmt = "hh:mm:ss";
      if (rec.checkOut) row.getCell("checkOut").numFmt = "hh:mm:ss";
    });

    const summaryHeader = sheet.addRow([]);
    sheet.addRow([]);
    const summaryStart = sheet.addRow(["Summary"]);
    summaryStart.font = { bold: true };
    sheet.addRow(["Emp No", "Employee Name", "Total Present", "Total Absent", "Total OD Hours", "Total Working Hours", "Total Overtime"]);

    const employeeSummary = {};
    records.forEach((rec) => {
      const key = rec.empNo || rec.workerName;
      if (!employeeSummary[key]) {
        employeeSummary[key] = {
          empNo: rec.empNo || "",
          name: rec.workerName,
          present: 0,
          absent: 0,
          odHours: 0,
          workingHours: 0,
          overtime: 0
        };
      }

      if (rec.status === "present") employeeSummary[key].present += 1;
      if (rec.status === "absent") employeeSummary[key].absent += 1;
      employeeSummary[key].odHours += rec.extraHours || 0;
      employeeSummary[key].workingHours += rec.hoursWorked || 0;
      employeeSummary[key].overtime += rec.overtime || 0;
    });

    Object.values(employeeSummary).forEach((employee) => {
      sheet.addRow([
        employee.empNo,
        employee.name,
        employee.present,
        employee.absent,
        employee.odHours,
        employee.workingHours,
        employee.overtime
      ]);
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=attendance_report.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /attendance/:id
// CEO: can delete all. Admin: can delete manager+worker only. Manager: NO delete access.
app.delete("/attendance/:id", verifyToken, allowRoles("admin", "ceo"), async (req, res) => {
  try {
    const record = await Attendance.findById(req.params.id);
    if (!record) return res.status(404).json({ error: "Record not found" });

    const requesterRole = req.user.role;
    const targetRole = await getUserRoleByName(record.workerName, record.company);

    if (requesterRole === "admin" && targetRole === "ceo") {
      return res.status(403).json({ error: "Admin cannot delete CEO attendance" });
    }

    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ message: "Attendance record deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── LEAVE MANAGEMENT ENDPOINTS ──────────────────────────────────────────────────

// GET /api/leave - Fetch leaves
app.get("/api/leave", verifyToken, async (req, res) => {
  try {
    const requesterRole = req.user.role;
    let leaves;
    if (requesterRole === "worker") {
      leaves = await LeaveRequest.find({ workerId: req.user.id }).sort({ createdAt: -1 });
    } else {
      leaves = await LeaveRequest.find({ company: req.user.company }).sort({ createdAt: -1 });
    }
    
    const formattedLeaves = leaves.map(l => ({
      id: l._id,
      _id: l._id,
      worker: l.worker,
      type: l.type,
      from: l.from,
      to: l.to,
      status: l.status,
      remarks: l.remarks,
      reason: l.reason
    }));

    res.json(formattedLeaves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leave - Create a leave request
app.post("/api/leave", verifyToken, async (req, res) => {
  try {
    const { type, from, to, reason } = req.body;
    if (!type || !from || !to) {
      return res.status(400).json({ error: "Type, From date, and To date are required" });
    }

    const newLeave = new LeaveRequest({
      worker: req.user.name,
      workerId: req.user.id,
      type,
      from,
      to,
      reason,
      company: req.user.company,
      status: "Pending",
      remarks: "Submitted"
    });

    await newLeave.save();
    res.status(201).json({
      message: "Leave request submitted successfully",
      leave: {
        id: newLeave._id,
        _id: newLeave._id,
        worker: newLeave.worker,
        type: newLeave.type,
        from: newLeave.from,
        to: newLeave.to,
        status: newLeave.status,
        remarks: newLeave.remarks,
        reason: newLeave.reason
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/leave/:id - Approve or Reject a leave request
app.put("/api/leave/:id", verifyToken, allowRoles("admin", "ceo", "manager"), async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "Status must be Approved or Rejected" });
    }

    const remarks = status === "Approved" ? "Approved by supervisor" : "Rejected by supervisor";

    const updatedLeave = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status, remarks },
      { new: true }
    );

    if (!updatedLeave) {
      return res.status(404).json({ error: "Leave request not found" });
    }

    res.json({
      message: `Leave request successfully ${status.toLowerCase()}`,
      leave: {
        id: updatedLeave._id,
        _id: updatedLeave._id,
        worker: updatedLeave.worker,
        type: updatedLeave.type,
        from: updatedLeave.from,
        to: updatedLeave.to,
        status: updatedLeave.status,
        remarks: updatedLeave.remarks,
        reason: updatedLeave.reason
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🚚 ==================== DISPATCH MODULE ENDPOINTS ====================

function getProductTypeForCompany(company) {
  const norm = normalizeCompany(company);
  if (norm === 'vel' || norm === 'company3') return 'cylinder';
  if (norm === 'shree_ganaapathy' || norm === 'company2') return 'roll';
  return 'foil';
}

// 1️⃣ CREATE DISPATCH (POST /api/dispatch and POST /dispatch)
app.post(["/dispatch", "/api/dispatch"], verifyToken, checkCompanyAccess, async (req, res) => {
  try {
    const requestCompany = await getRequestCompany(req);
    const bodyCompany = normalizeCompany(req.body.company) || requestCompany;
    const productType = req.body.productType || getProductTypeForCompany(bodyCompany);

    const {
      productName, quantity, destinationType, destinationCompany,
      dispatchDate, deliveryMethod, customDeliveryMethod, remarks,
      numberOfColors, size, manufacturer,
      colors, weightKg, dimensions,
      rollColors, rollWeightKg, rollSize
    } = req.body;

    if (!productName || !quantity || !destinationCompany || !deliveryMethod) {
      return res.status(400).json({ error: "Product name, quantity, destination, and delivery method are required." });
    }

    if (productType === 'cylinder' && (!numberOfColors || !size)) {
      return res.status(400).json({ error: "Cylinder dispatch requires Number of Colors and Size (inches)." });
    }
    if (productType === 'foil' && (!weightKg || !dimensions)) {
      return res.status(400).json({ error: "Foil dispatch requires Weight (kg) and Dimensions." });
    }
    if (productType === 'roll' && (!rollWeightKg || !rollSize)) {
      return res.status(400).json({ error: "Roll dispatch requires Weight (kg) and Roll Size." });
    }

    const dispatch = new Dispatch({
      company: bodyCompany,
      productType,
      productName,
      quantity: Number(quantity),
      destinationType: destinationType || 'external',
      destinationCompany,
      dispatchDate: dispatchDate ? new Date(dispatchDate) : new Date(),
      deliveryMethod,
      customDeliveryMethod: customDeliveryMethod || '',
      status: req.body.status || 'dispatched',
      dispatchedBy: req.user.id,
      dispatchedByName: req.user.name || 'Admin',
      remarks: remarks || '',
      numberOfColors: numberOfColors ? Number(numberOfColors) : undefined,
      size: size || '',
      manufacturer: manufacturer || (bodyCompany === 'vel' ? 'Vel Gravure' : ''),
      colors: Array.isArray(colors) ? colors : (colors ? String(colors).split(',').map(s=>s.trim()) : []),
      weightKg: weightKg ? Number(weightKg) : undefined,
      dimensions: dimensions || '',
      rollColors: Array.isArray(rollColors) ? rollColors : (rollColors ? String(rollColors).split(',').map(s=>s.trim()) : []),
      rollWeightKg: rollWeightKg ? Number(rollWeightKg) : undefined,
      rollSize: rollSize || ''
    });

    await dispatch.save();

    await createAuditLog({
      req,
      action: "create",
      itemType: "dispatch",
      before: null,
      after: dispatch.toObject()
    });

    res.status(201).json({ message: "✅ Dispatch record created successfully", dispatch });
  } catch (err) {
    res.status(500).json({ error: "Failed to create dispatch: " + err.message });
  }
});

// 2️⃣ LIST DISPATCHES (GET /api/dispatch and GET /dispatch)
app.get(["/dispatch", "/api/dispatch"], verifyToken, checkCompanyAccess, async (req, res) => {
  try {
    const requestCompany = await getRequestCompany(req);
    const filterCompany = req.query.company ? normalizeCompany(req.query.company) : requestCompany;
    const { productType, from, to, status } = req.query;

    const query = {};
    if (filterCompany && filterCompany !== 'all') {
      query.company = filterCompany;
    }
    if (productType) {
      query.productType = productType;
    }
    if (status) {
      query.status = status;
    }
    if (from || to) {
      query.dispatchDate = {};
      if (from) {
        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);
        query.dispatchDate.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.dispatchDate.$lte = toDate;
      }
    }

    const dispatches = await Dispatch.find(query).sort({ dispatchDate: -1 }).lean();
    res.json(dispatches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3️⃣ DISPATCH REPORT DATA (GET /api/dispatch/report and GET /dispatch/report)
app.get(["/dispatch/report", "/api/dispatch/report"], verifyToken, checkCompanyAccess, async (req, res) => {
  try {
    const requestCompany = await getRequestCompany(req);
    const filterCompany = req.query.company ? normalizeCompany(req.query.company) : requestCompany;
    const { from, to } = req.query;

    const query = {};
    if (filterCompany && filterCompany !== 'all') {
      query.company = filterCompany;
    }
    if (from || to) {
      query.dispatchDate = {};
      if (from) {
        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);
        query.dispatchDate.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.dispatchDate.$lte = toDate;
      }
    }

    const items = await Dispatch.find(query).sort({ dispatchDate: -1 }).lean();

    let totalQuantity = 0;
    const totalByDestination = {};
    const totalByDeliveryMethod = {};
    const totalByProductType = {};

    items.forEach((item) => {
      totalQuantity += Number(item.quantity || 0);

      const destKey = item.destinationCompany || item.destinationType || 'Other';
      totalByDestination[destKey] = (totalByDestination[destKey] || 0) + Number(item.quantity || 0);

      const methodKey = item.deliveryMethod === 'Other' ? (item.customDeliveryMethod || 'Other') : (item.deliveryMethod || 'Standard');
      totalByDeliveryMethod[methodKey] = (totalByDeliveryMethod[methodKey] || 0) + Number(item.quantity || 0);

      const typeKey = item.productType || 'other';
      totalByProductType[typeKey] = (totalByProductType[typeKey] || 0) + Number(item.quantity || 0);
    });

    res.json({
      company: filterCompany,
      fromDate: from || null,
      toDate: to || null,
      count: items.length,
      items,
      summary: {
        totalQuantity,
        totalByDestination,
        totalByDeliveryMethod,
        totalByProductType
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4️⃣ EXPORT DISPATCH REPORT (GET /api/dispatch/report/export and GET /dispatch/report/export)
app.get(["/dispatch/report/export", "/api/dispatch/report/export"], verifyToken, checkCompanyAccess, async (req, res) => {
  try {
    const requestCompany = await getRequestCompany(req);
    const filterCompany = req.query.company ? normalizeCompany(req.query.company) : requestCompany;
    const format = (req.query.format || 'excel').toLowerCase();
    const { from, to } = req.query;

    const query = {};
    if (filterCompany && filterCompany !== 'all') {
      query.company = filterCompany;
    }
    if (from || to) {
      query.dispatchDate = {};
      if (from) {
        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);
        query.dispatchDate.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.dispatchDate.$lte = toDate;
      }
    }

    const items = await Dispatch.find(query).sort({ dispatchDate: -1 }).lean();

    const companyDisplayName = filterCompany === 'vel' ? 'Vel Gravure (Company 3 - Cylinder)'
      : filterCompany === 'shree_ganaapathy' ? 'Shree Ganaapathy Roto Prints (Company 2 - Roll)'
      : filterCompany === 'bharath' ? 'Bharath Enterprises (Company 1 - Foil)'
      : 'All Companies';

    const fromStr = from || 'Start';
    const toStr = to || 'Present';
    const fileName = `Dispatch_Report_${filterCompany}_${fromStr}_to_${toStr}`;

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Dispatch Report');

      worksheet.mergeCells('A1:I1');
      worksheet.getCell('A1').value = `DISPATCH REPORT — ${companyDisplayName.toUpperCase()}`;
      worksheet.getCell('A1').font = { bold: true, size: 14 };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };

      worksheet.mergeCells('A2:I2');
      worksheet.getCell('A2').value = `Date Range: ${fromStr} to ${toStr} | Generated: ${new Date().toLocaleString()}`;
      worksheet.getCell('A2').font = { italic: true, size: 10 };
      worksheet.getCell('A2').alignment = { horizontal: 'center' };

      worksheet.addRow([]);

      let headers = ['S.No', 'Product Name', 'Colors', 'Spec 1', 'Spec 2', 'Qty', 'Destination', 'Delivery Method', 'Status'];
      if (filterCompany === 'vel') {
        headers = ['S.No', 'Product Name', 'Colors', 'Size (Inches)', 'Manufacturer', 'Qty', 'Destination', 'Delivery Method', 'Status'];
      } else if (filterCompany === 'shree_ganaapathy') {
        headers = ['S.No', 'Product Name', 'Colors', 'Weight (kg)', 'Roll Size', 'Qty', 'Destination', 'Delivery Method', 'Status'];
      } else if (filterCompany === 'bharath') {
        headers = ['S.No', 'Product Name', 'Colors', 'Weight (kg)', 'Dimensions', 'Qty', 'Destination', 'Delivery Method', 'Status'];
      }

      const headerRow = worksheet.addRow(headers);
      headerRow.font = { bold: true };
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      });

      let totalQty = 0;
      items.forEach((item, index) => {
        totalQty += Number(item.quantity || 0);
        const colorsStr = Array.isArray(item.colors) && item.colors.length ? item.colors.join(', ')
          : Array.isArray(item.rollColors) && item.rollColors.length ? item.rollColors.join(', ')
          : (item.numberOfColors ? `${item.numberOfColors} colors` : '-');

        const methodStr = item.deliveryMethod === 'Other' ? (item.customDeliveryMethod || 'Other') : (item.deliveryMethod || '-');

        let spec1 = '-';
        let spec2 = '-';

        if (item.productType === 'cylinder') {
          spec1 = item.size ? `${item.size} IN` : '-';
          spec2 = item.manufacturer || 'Vel Gravure';
        } else if (item.productType === 'roll') {
          spec1 = item.rollWeightKg ? `${item.rollWeightKg} kg` : '-';
          spec2 = item.rollSize || '-';
        } else {
          spec1 = item.weightKg ? `${item.weightKg} kg` : '-';
          spec2 = item.dimensions || '-';
        }

        worksheet.addRow([
          index + 1,
          item.productName,
          colorsStr,
          spec1,
          spec2,
          item.quantity,
          item.destinationCompany,
          methodStr,
          item.status
        ]);
      });

      worksheet.addRow([]);
      const summaryHeaderRow = worksheet.addRow(['SUMMARY TOTALS']);
      summaryHeaderRow.font = { bold: true };
      worksheet.addRow(['Total Quantity Dispatched:', totalQty]);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}.xlsx"`);
      await workbook.xlsx.write(res);
      return res.end();
    } else {
      const doc = new PDFDocument({ margin: 30 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}.pdf"`);
      doc.pipe(res);

      doc.fontSize(16).text(`DISPATCH BILL / REPORT`, { align: 'center' });
      doc.fontSize(12).text(companyDisplayName, { align: 'center' });
      doc.fontSize(10).text(`Date: ${fromStr} to ${toStr} | Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown();

      items.forEach((item, index) => {
        doc.fontSize(10).text(`${index + 1}. ${item.productName} — Qty: ${item.quantity} | Dest: ${item.destinationCompany} | Method: ${item.deliveryMethod}`);
      });

      doc.moveDown();
      doc.fontSize(12).text(`Total Quantity Dispatched: ${items.reduce((s, i) => s + (i.quantity || 0), 0)}`);
      doc.end();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔄 PAGINATION HELPER
function getPagination(req) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function broadcastCompanyEvent(company, event, data) {
  if (!io) return;
  const roomName = `room_${normalizeCompany(company)}`;
  io.to(roomName).emit(event, data);
}

// 🔐 AUTH REFRESH & MANDATORY PASSWORD CHANGE
app.post("/api/auth/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: "Refresh Token required" });

    const decoded = jwt.verify(refreshToken, SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.isDeleted || user.refreshToken !== refreshToken) {
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    const newAccessToken = jwt.sign({
      id: user._id,
      role: user.role,
      assignedCompany: user.assignedCompany,
      companyAccess: user.companyAccess
    }, SECRET, { expiresIn: "1h" });

    res.json({ token: newAccessToken });
  } catch (err) {
    res.status(403).json({ error: "Invalid or expired refresh token" });
  }
});

app.post("/api/auth/change-password", verifyToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters long." });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (oldPassword) {
      const match = await bcrypt.compare(oldPassword, user.password);
      if (!match) return res.status(401).json({ error: "Current password does not match" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.isFirstLogin = false;
    await user.save();

    res.json({ message: "Password updated successfully. First login requirement completed." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🏷️ ==================== PRODUCT MASTER ENDPOINTS ====================
app.post("/api/products", verifyToken, checkCompanyAccess, async (req, res) => {
  try {
    const requestCompany = await getRequestCompany(req);
    const company = normalizeCompany(req.body.company) || requestCompany;
    const { productName, size, weightKg, numberOfColors } = req.body;

    if (!productName) {
      return res.status(400).json({ error: "Product Name is required." });
    }

    const product = new Product({
      company,
      productName,
      size: size || "",
      weightKg: weightKg ? Number(weightKg) : 0,
      numberOfColors: numberOfColors ? Number(numberOfColors) : 1,
      createdBy: req.user.id
    });

    await product.save();
    broadcastCompanyEvent(company, "product_added", product);

    res.status(201).json({ message: "✅ Product added to Product Master", product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/products", verifyToken, checkCompanyAccess, async (req, res) => {
  try {
    const requestCompany = await getRequestCompany(req);
    const company = req.query.company ? normalizeCompany(req.query.company) : requestCompany;
    const { page, limit, skip } = getPagination(req);

    const query = { isDeleted: { $ne: true } };
    if (company && company !== "all") {
      query.company = company;
    }

    const [products, total] = await Promise.all([
      Product.find(query).sort({ productName: 1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(query)
    ]);

    res.json({
      data: products,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/products/:id", verifyToken, checkCompanyAccess, async (req, res) => {
  try {
    const { productName, size, weightKg, numberOfColors, isActive } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        ...(productName && { productName }),
        ...(size !== undefined && { size }),
        ...(weightKg !== undefined && { weightKg: Number(weightKg) }),
        ...(numberOfColors !== undefined && { numberOfColors: Number(numberOfColors) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) })
      },
      { new: true }
    );

    if (!product) return res.status(404).json({ error: "Product not found" });

    broadcastCompanyEvent(product.company, "product_updated", product);
    res.json({ message: "Product updated successfully", product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/products/:id", verifyToken, checkCompanyAccess, checkEditDeletePermission, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedBy: req.user.id,
        deletedAt: new Date()
      },
      { new: true }
    );

    if (!product) return res.status(404).json({ error: "Product not found" });

    await logAuditAction(req.user.id, req.user.name, req.user.role, 'delete', 'Product', product._id, product.company, { productName: product.productName });
    broadcastCompanyEvent(product.company, "product_deleted", { id: req.params.id });
    res.json({ message: "Product soft-deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 💰 ==================== INCOME & EXPENSE FINANCIAL TRACKING ====================
app.post("/api/transactions", verifyToken, checkCompanyAccess, async (req, res) => {
  try {
    const requestCompany = await getRequestCompany(req);
    const company = normalizeCompany(req.body.company) || requestCompany;
    const { type, category, amount, description, date, paymentMethod, relatedDispatchId } = req.body;

    if (!type || !category || !amount) {
      return res.status(400).json({ error: "Type, category, and amount are required." });
    }

    const transaction = new Transaction({
      company,
      type,
      category,
      amount: Number(amount),
      description: description || "",
      date: date ? new Date(date) : new Date(),
      addedBy: req.user.id,
      addedByName: req.user.name || "Admin",
      paymentMethod: paymentMethod || "online",
      relatedDispatchId
    });

    await transaction.save();
    broadcastCompanyEvent(company, "transaction_created", transaction);

    res.status(201).json({ message: "✅ Transaction recorded successfully", transaction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/transactions", verifyToken, checkCompanyAccess, async (req, res) => {
  try {
    const requestCompany = await getRequestCompany(req);
    const company = req.query.company ? normalizeCompany(req.query.company) : requestCompany;
    const { type, from, to } = req.query;
    const { page, limit, skip } = getPagination(req);

    const query = { isDeleted: { $ne: true } };
    if (company && company !== "all") {
      query.company = company;
    }
    if (type) {
      query.type = type;
    }
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.date.$lte = toDate;
      }
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(query).sort({ date: -1 }).skip(skip).limit(limit).lean(),
      Transaction.countDocuments(query)
    ]);

    res.json({
      data: transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/transactions/summary", verifyToken, checkCompanyAccess, async (req, res) => {
  try {
    const requestCompany = await getRequestCompany(req);
    const company = req.query.company ? normalizeCompany(req.query.company) : requestCompany;
    const period = req.query.period || "month";

    const query = { isDeleted: { $ne: true } };
    if (company && company !== "all") {
      query.company = company;
    }

    const now = new Date();
    if (period === "day") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      query.date = { $gte: startOfDay, $lte: endOfDay };
    } else {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      query.date = { $gte: startOfMonth, $lte: endOfMonth };
    }

    const transactions = await Transaction.find(query).lean();

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals = {};

    transactions.forEach(t => {
      if (t.type === "income") {
        totalIncome += Number(t.amount || 0);
      } else {
        totalExpense += Number(t.amount || 0);
      }
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.amount || 0);
    });

    const netProfit = totalIncome - totalExpense;

    res.json({
      company,
      period,
      totalIncome,
      totalExpense,
      netProfit,
      categoryTotals,
      transactionCount: transactions.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/transactions/report/export", verifyToken, checkCompanyAccess, async (req, res) => {
  try {
    const requestCompany = await getRequestCompany(req);
    const company = req.query.company ? normalizeCompany(req.query.company) : requestCompany;
    const format = (req.query.format || "excel").toLowerCase();
    const { from, to } = req.query;

    const query = { isDeleted: { $ne: true } };
    if (company && company !== "all") query.company = company;

    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.date.$lte = toDate;
      }
    }

    const items = await Transaction.find(query).sort({ date: -1 }).lean();

    let totalIncome = 0;
    let totalExpense = 0;
    items.forEach(t => {
      if (t.type === "income") totalIncome += Number(t.amount || 0);
      else totalExpense += Number(t.amount || 0);
    });
    const netProfit = totalIncome - totalExpense;

    if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("P&L Report");

      ws.mergeCells("A1:G1");
      ws.getCell("A1").value = `PROFIT & LOSS REPORT — ${company.toUpperCase()}`;
      ws.getCell("A1").font = { bold: true, size: 14 };

      ws.addRow([]);
      ws.addRow(["Date", "Type", "Category", "Description", "Payment Method", "Amount (INR)", "Added By"]).font = { bold: true };

      items.forEach(t => {
        ws.addRow([
          new Date(t.date).toLocaleDateString(),
          t.type.toUpperCase(),
          t.category,
          t.description || "-",
          t.paymentMethod || "online",
          t.amount,
          t.addedByName || "System"
        ]);
      });

      ws.addRow([]);
      ws.addRow(["SUMMARY TOTALS"]).font = { bold: true };
      ws.addRow(["Total Income:", totalIncome]);
      ws.addRow(["Total Expenses:", totalExpense]);
      ws.addRow(["Net Profit / Loss:", netProfit]);

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="PnL_Report_${company}.xlsx"`);
      await workbook.xlsx.write(res);
      return res.end();
    } else {
      const doc = new PDFDocument({ margin: 30 });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="PnL_Report_${company}.pdf"`);
      doc.pipe(res);

      doc.fontSize(16).text(`PROFIT & LOSS STATEMENT`, { align: 'center' });
      doc.fontSize(12).text(`Company: ${company.toUpperCase()}`, { align: 'center' });
      doc.moveDown();

      doc.fontSize(11).text(`Total Income: INR ${totalIncome}`);
      doc.fontSize(11).text(`Total Expenses: INR ${totalExpense}`);
      doc.fontSize(12).text(`Net Profit / Loss: INR ${netProfit}`);
      doc.end();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 5️⃣ UPDATE DISPATCH STATUS (PUT /api/dispatch/:id/status)
app.put(["/dispatch/:id/status", "/api/dispatch/:id/status"], verifyToken, checkCompanyAccess, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "status is required" });
    const doc = await Dispatch.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!doc) return res.status(404).json({ error: "Dispatch not found" });
    res.json({ message: "Dispatch status updated", dispatch: doc });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6️⃣ EDIT DISPATCH RECORD (PUT /api/dispatch/:id)
app.put(["/dispatch/:id", "/api/dispatch/:id"], verifyToken, checkCompanyAccess, async (req, res) => {
  try {
    const allowedFields = ["productName","quantity","destinationCompany","deliveryMethod","remarks","dispatchDate","status"];
    const update = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
    const doc = await Dispatch.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!doc) return res.status(404).json({ error: "Dispatch not found" });
    res.json({ message: "Dispatch updated", dispatch: doc });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 7️⃣ DELETE DISPATCH RECORD (DELETE /api/dispatch/:id)
app.delete(["/dispatch/:id", "/api/dispatch/:id"], verifyToken, checkCompanyAccess, async (req, res) => {
  try {
    const doc = await Dispatch.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: "Dispatch not found" });
    res.json({ message: "Dispatch deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 💰 EDIT TRANSACTION (PUT /api/transactions/:id)
app.put("/api/transactions/:id", verifyToken, checkCompanyAccess, async (req, res) => {
  try {
    const { type, category, amount, description, date, paymentMethod } = req.body;
    const update = {};
    if (type) update.type = type;
    if (category) update.category = category;
    if (amount !== undefined) update.amount = Number(amount);
    if (description !== undefined) update.description = description;
    if (date) update.date = new Date(date);
    if (paymentMethod) update.paymentMethod = paymentMethod;
    const tx = await Transaction.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!tx) return res.status(404).json({ error: "Transaction not found" });
    res.json({ message: "Transaction updated", transaction: tx });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 💰 DELETE TRANSACTION (DELETE /api/transactions/:id)
app.delete("/api/transactions/:id", verifyToken, checkCompanyAccess, async (req, res) => {
  try {
    const tx = await Transaction.findByIdAndDelete(req.params.id);
    if (!tx) return res.status(404).json({ error: "Transaction not found" });
    res.json({ message: "Transaction deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 👥 EDIT STAFF USER (PUT /staff/:id)
app.put("/staff/:id", verifyToken, allowRoles("admin", "ceo"), async (req, res) => {
  try {
    const { name, role, assignedCompany, phone, department, salaryRate, salaryType, employmentType } = req.body;
    const update = {};
    if (name)             update.name             = name;
    if (role)             update.role             = role;
    if (assignedCompany)  update.assignedCompany  = normalizeCompany(assignedCompany);
    if (phone)            update.phone            = phone;
    if (department)       update.department       = department;
    if (salaryRate !== undefined) update.salaryRate = Number(salaryRate);
    if (salaryType)       update.salaryType       = salaryType;
    if (employmentType)   update.employmentType   = employmentType;
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select("-password");
    if (!user) return res.status(404).json({ error: "Staff not found" });
    res.json({ message: "Staff updated", user });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 👥 DELETE STAFF USER (DELETE /staff/:id)
app.delete("/staff/:id", verifyToken, allowRoles("admin", "ceo"), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "Staff not found" });
    res.json({ message: "Staff deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 5001;


connectDatabase().then(() => {
  server.listen(PORT, () => console.log(`Server running on ${PORT}`));
}).catch((err) => {
  console.error("Failed to start server:", err.message || err);
});
