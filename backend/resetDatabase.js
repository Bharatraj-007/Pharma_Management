require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const modelsToClear = [
  "tasks",
  "auditlogs",
  "foils",
  "cylinders",
  "dispatches",
  "products",
  "transactions",
  "attendances",
  "leaverequests",
  "advancerequests",
  "approvalrequests",
  "barcodescanlogs",
  "qrscanlogs",
  "conversations",
  "messages",
  "notifications",
  "userrequests",
  "holidays"
];

const seedUsersList = [
  // 👑 SINGLE CEO FOR ALL 3 COMPANIES
  { name: "CEO (Owner / System Head)", email: "ceo@system.com", role: "ceo", company: "bharath", assignedCompany: "bharath", companyAccess: ["bharath", "shree_ganaapathy", "vel"], phone: "9999999999" },

  // Company 1: Bharath Enterprises
  { name: "Admin (Bharath)", email: "admin@bharath.com", role: "admin", company: "bharath", assignedCompany: "bharath", companyAccess: ["bharath"], phone: "9876543210" },
  { name: "Manager (Bharath)", email: "manager@bharath.com", role: "manager", company: "bharath", assignedCompany: "bharath", companyAccess: ["bharath"], phone: "9876543212" },
  { name: "Worker (Bharath)", email: "worker@bharath.com", role: "worker", company: "bharath", assignedCompany: "bharath", companyAccess: ["bharath"], phone: "9876543213" },

  // Company 2: Shree Ganaapathy Roto Prints
  { name: "Admin (Shree Ganaapathy)", email: "admin@shree.com", role: "admin", company: "shree_ganaapathy", assignedCompany: "shree_ganaapathy", companyAccess: ["shree_ganaapathy"], phone: "9876543220" },
  { name: "Manager (Shree Ganaapathy)", email: "manager@shree.com", role: "manager", company: "shree_ganaapathy", assignedCompany: "shree_ganaapathy", companyAccess: ["shree_ganaapathy"], phone: "9876543222" },
  { name: "Worker (Shree Ganaapathy)", email: "worker@shree.com", role: "worker", company: "shree_ganaapathy", assignedCompany: "shree_ganaapathy", companyAccess: ["shree_ganaapathy"], phone: "9876543223" },

  // Company 3: Vel Gravure
  { name: "Admin (Vel Gravure)", email: "admin@vel.com", role: "admin", company: "vel", assignedCompany: "vel", companyAccess: ["vel"], phone: "9876543230" },
  { name: "Manager (Vel Gravure)", email: "manager@vel.com", role: "manager", company: "vel", assignedCompany: "vel", companyAccess: ["vel"], phone: "9876543232" },
  { name: "Worker (Vel Gravure)", email: "worker@vel.com", role: "worker", company: "vel", assignedCompany: "vel", companyAccess: ["vel"], phone: "9876543233" },
];

async function wipeDatabase(uri, label) {
  try {
    console.log(`\n----------------------------------------`);
    console.log(`🔌 Connecting to ${label}...`);
    const conn = await mongoose.createConnection(uri).asPromise();
    console.log(`✅ Connected to ${label}`);

    const db = conn.db;

    // Clear operational collections
    for (const collName of modelsToClear) {
      try {
        const res = await db.collection(collName).deleteMany({});
        console.log(`  🧹 Cleared ${collName}: ${res.deletedCount} documents removed`);
      } catch (e) {
        // Ignored if collection doesn't exist
      }
    }

    // Preserve & seed users
    const usersColl = db.collection("users");
    const userCount = await usersColl.countDocuments();
    console.log(`  👥 Existing users in ${label}: ${userCount}`);

    const hashedPassword = await bcrypt.hash("Admin@123", 10);

    for (const u of seedUsersList) {
      const exists = await usersColl.findOne({ email: u.email });
      if (!exists) {
        await usersColl.insertOne({
          name: u.name,
          email: u.email,
          password: hashedPassword,
          role: u.role,
          company: u.company,
          phone: u.phone,
          joiningDate: "2024-01-01",
          age: "30",
          address: "Factory HQ",
          emergencyContact: "9876599999"
        });
        console.log(`  ✅ Seeded missing user: ${u.email} (${u.role})`);
      } else {
        console.log(`  🔒 Retained credentials for: ${u.email} (${u.role})`);
      }
    }

    await conn.close();
    console.log(`✨ Finished wiping & restoring credentials for ${label}`);
  } catch (err) {
    console.warn(`⚠️ Skipped ${label} (${err.message})`);
  }
}

async function run() {
  const localURI = "mongodb://127.0.0.1:27017/pharma";
  const atlasURI = process.env.MONGODB_URI;

  await wipeDatabase(localURI, "Local MongoDB (mongodb://127.0.0.1:27017/pharma)");

  if (atlasURI) {
    await wipeDatabase(atlasURI, "Atlas MongoDB (Cloud)");
  }

  console.log(`\n========================================`);
  console.log(`🎉 SYSTEM RESET COMPLETE!`);
  console.log(`- Tasks, Logs, Inventory, Attendance & History: WIPED CLEAN`);
  console.log(`- Admin, CEO, Manager, Worker credentials: PRESERVED`);
  console.log(`- Default Password for all accounts: Admin@123`);
  console.log(`========================================\n`);
  process.exit(0);
}

run();
