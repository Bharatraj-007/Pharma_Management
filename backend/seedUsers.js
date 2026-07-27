const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./models/User");

mongoose.connect("mongodb://127.0.0.1:27017/pharma")
  .then(async () => {
    console.log("DB Connected — seeding users...");

    const users = [
      {
        name: "Admin (bharath)", email: "admin@bharath.com", password: "Admin@123",
        role: "admin", company: "bharath",
        phone: "9876543210", dob: "1990-05-15", joiningDate: "2020-01-10",
        age: "36", address: "12 MG Road, Chennai", emergencyContact: "9876500001"
      },
      {
        name: "CEO (bharath)", email: "ceo@bharath.com", password: "Admin@123",
        role: "ceo", company: "bharath",
        phone: "9876543211", dob: "1985-03-22", joiningDate: "2015-06-01",
        age: "41", address: "88 Anna Nagar, Chennai", emergencyContact: "9876500002"
      },
      {
        name: "Manager (bharath)", email: "manager@bharath.com", password: "Admin@123",
        role: "manager", company: "bharath",
        phone: "9876543212", dob: "1992-11-08", joiningDate: "2021-03-15",
        age: "33", address: "45 T Nagar, Chennai", emergencyContact: "9876500003"
      },
      {
        name: "Worker (bharath)", email: "worker@bharath.com", password: "Admin@123",
        role: "worker", company: "bharath",
        phone: "9876543213", dob: "1998-07-20", joiningDate: "2023-09-01",
        age: "27", address: "67 Adyar, Chennai", emergencyContact: "9876500004"
      },
    ];

    for (const u of users) {
      const hashed = await bcrypt.hash(u.password, 10);
      const existing = await User.findOne({ email: u.email });
      if (existing) {
        Object.assign(existing, { ...u, password: hashed });
        await existing.save();
        console.log(`✅ Updated: ${u.email} (${u.role})`);
      } else {
        await User.create({ ...u, password: hashed });
        console.log(`✅ Created: ${u.email} (${u.role})`);
      }
    }

    console.log("\n🎉 All users seeded!");
    process.exit(0);
  })
  .catch(err => { console.error("DB Error:", err); process.exit(1); });
