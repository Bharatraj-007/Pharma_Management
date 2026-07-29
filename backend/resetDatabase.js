require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const modelsToClear = [
  "tasks",
  "auditlogs",
  "foils",
  "cylinders",
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
  // Super Admin (Cross-company access)
  { name: "Super Admin (Owner/CEO)", email: "superadmin@system.com", role: "super_admin", company: "bharath", assignedCompany: "bharath", companyAccess: ["bharath", "shree_ganaapathy", "vel"], phone: "9999999999" },

  // Bharath Enterprises (Company 1)
  { name: "Admin (bharath)", email: "admin@bharath.com", role: "admin", company: "bharath", assignedCompany: "bharath", companyAccess: ["bharath"], phone: "9876543210" },
  { name: "CEO (bharath)", email: "ceo@bharath.com", role: "super_admin", company: "bharath", assignedCompany: "bharath", companyAccess: ["bharath", "shree_ganaapathy", "vel"], phone: "9876543211" },
  { name: "Manager (bharath)", email: "manager@bharath.com", role: "manager", company: "bharath", assignedCompany: "bharath", companyAccess: ["bharath"], phone: "9876543212" },
  { name: "Worker (bharath)", email: "worker@bharath.com", role: "worker", company: "bharath", assignedCompany: "bharath", companyAccess: ["bharath"], phone: "9876543213" },

  // Shree Ganaapathy (Company 2)
  { name: "Admin (shree_ganaapathy)", email: "admin@shree.com", role: "admin", company: "shree_ganaapathy", assignedCompany: "shree_ganaapathy", companyAccess: ["shree_ganaapathy"], phone: "9876543220" },
  { name: "CEO (shree_ganaapathy)", email: "ceo@shree.com", role: "ceo", company: "shree_ganaapathy", assignedCompany: "shree_ganaapathy", companyAccess: ["shree_ganaapathy"], phone: "9876543221" },
  { name: "Manager (shree_ganaapathy)", email: "manager@shree.com", role: "manager", company: "shree_ganaapathy", assignedCompany: "shree_ganaapathy", companyAccess: ["shree_ganaapathy"], phone: "9876543222" },
  { name: "Worker (shree_ganaapathy)", email: "worker@shree.com", role: "worker", company: "shree_ganaapathy", assignedCompany: "shree_ganaapathy", companyAccess: ["shree_ganaapathy"], phone: "9876543223" },

  // Vel Gravure (Company 3)
  { name: "Admin (vel)", email: "admin@vel.com", role: "admin", company: "vel", assignedCompany: "vel", companyAccess: ["vel"], phone: "9876543230" },
  { name: "CEO (vel)", email: "ceo@vel.com", role: "ceo", company: "vel", assignedCompany: "vel", companyAccess: ["vel"], phone: "9876543231" },
  { name: "Manager (vel)", email: "manager@vel.com", role: "manager", company: "vel", assignedCompany: "vel", companyAccess: ["vel"], phone: "9876543232" },
  { name: "Worker (vel)", email: "worker@vel.com", role: "worker", company: "vel", phone: "9876543233" },
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
