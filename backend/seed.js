const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String
});

const User = mongoose.model("User", UserSchema, "users");

async function seed() {
  await mongoose.connect("mongodb://127.0.0.1:27017/pharma");
  
  const hashedPassword = await bcrypt.hash("Admin@123", 10);
  
  // Create test users for each company
  const companies = ["bharath", "shree_ganaapathy", "vel"];
  const users = [];

  for (const company of companies) {
    const prefix = company === "shree_ganaapathy" ? "shree" : company;
    users.push(
      { name: `Admin (${company})`, email: `admin@${prefix}.com`, password: hashedPassword, role: "admin", company },
      { name: `CEO (${company})`, email: `ceo@${prefix}.com`, password: hashedPassword, role: "ceo", company },
      { name: `Manager (${company})`, email: `manager@${prefix}.com`, password: hashedPassword, role: "manager", company },
      { name: `Worker (${company})`, email: `worker@${prefix}.com`, password: hashedPassword, role: "worker", company }
    );
  }
  
  for (const u of users) {
    const exists = await User.findOne({ email: u.email });
    if (!exists) {
      await User.create(u);
      console.log(`Created: ${u.email} (${u.role} - ${u.company})`);
    } else {
      console.log(`Exists: ${u.email}`);
    }
  }
  
  console.log("\nTest Credentials seeded for all companies:");
  console.log("Password for all: Admin@123");
  console.log("Example Bharath: admin@bharath.com");
  console.log("Example Shree: admin@shree.com");
  console.log("Example Vel: admin@vel.com");
  
  process.exit();
}

seed();
