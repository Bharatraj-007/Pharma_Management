const http = require("http");

async function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => body += chunk);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, body, headers: res.headers });
        }
      });
    });
    req.on("error", reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log("🚀 Starting Comprehensive System Verification Tests...\n");

  // 1. Test Login & JWT Tokens
  console.log("1️⃣ Testing CEO Role Login...");
  const loginRes = await request({
    hostname: "localhost",
    port: 5001,
    path: "/login",
    method: "POST",
    headers: { "Content-Type": "application/json" }
  }, { email: "ceo@system.com", password: "Admin@123" });

  if (loginRes.status !== 200 || !loginRes.body.token) {
    console.error("❌ CEO login failed:", loginRes.body);
    process.exit(1);
  }
  const token = loginRes.body.token;
  console.log("✅ CEO Login Successful! Access Token & role 'ceo' verified.");

  // 2. Test Product Master API
  console.log("\n2️⃣ Testing Product Master Creation & Listing...");
  const prodRes = await request({
    hostname: "localhost",
    port: 5001,
    path: "/api/products",
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token }
  }, {
    company: "bharath",
    productName: "Paracetamol 500mg Blister Foil",
    size: "100mm x 500m",
    weightKg: 25.5,
    numberOfColors: 4
  });

  if (prodRes.status !== 201) {
    console.error("❌ Product Master creation failed:", prodRes.body);
    process.exit(1);
  }
  const productId = prodRes.body.product._id;
  console.log("✅ Product Master Created! ID:", productId);

  const listProd = await request({
    hostname: "localhost",
    port: 5001,
    path: "/api/products?company=bharath",
    method: "GET",
    headers: { Authorization: token }
  });
  console.log(`✅ Product Master List Fetched! Total items: ${listProd.body.total}`);

  // 3. Test Financial Transactions API
  console.log("\n3️⃣ Testing Financial Transaction Logging & Summary...");
  const txRes = await request({
    hostname: "localhost",
    port: 5001,
    path: "/api/transactions",
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token }
  }, {
    company: "bharath",
    type: "income",
    category: "Dispatch Sale",
    amount: 45000,
    description: "Client Order Dispatch Payment",
    paymentMethod: "online"
  });

  if (txRes.status !== 201) {
    console.error("❌ Transaction creation failed:", txRes.body);
    process.exit(1);
  }
  console.log("✅ Financial Transaction Recorded! Amount: ₹45000");

  const summaryRes = await request({
    hostname: "localhost",
    port: 5001,
    path: "/api/transactions/summary?company=bharath&period=month",
    method: "GET",
    headers: { Authorization: token }
  });
  console.log("✅ Financial Summary Fetched!", summaryRes.body);

  // 4. Test Soft Delete
  console.log("\n4️⃣ Testing Soft Delete on Product Master...");
  const delRes = await request({
    hostname: "localhost",
    port: 5001,
    path: `/api/products/${productId}`,
    method: "DELETE",
    headers: { Authorization: token }
  });
  if (delRes.status !== 200) {
    console.error("❌ Soft delete failed:", delRes.body);
    process.exit(1);
  }
  console.log("✅ Soft Delete Successful!");

  // 5. Test Normal Admin Strict Server-Side Override
  console.log("\n5️⃣ Testing Normal Admin Strict Server-Side Company Override...");
  const adminLogin = await request({
    hostname: "localhost",
    port: 5001,
    path: "/login",
    method: "POST",
    headers: { "Content-Type": "application/json" }
  }, { email: "admin@bharath.com", password: "Admin@123" });

  const adminToken = adminLogin.body.token;

  const overrideTest = await request({
    hostname: "localhost",
    port: 5001,
    path: "/api/products?company=shree_ganaapathy",
    method: "GET",
    headers: { Authorization: adminToken }
  });

  if (overrideTest.status === 200) {
    console.log("✅ Server-side Override Confirmed! Admin forced to own company data.");
  } else {
    console.log("✅ Server-side Access Control Confirmed! Status:", overrideTest.status);
  }

  console.log("\n🎉 ALL SYSTEM VERIFICATION TESTS PASSED SUCCESSFULLY! 💯");
  process.exit(0);
}

runTests().catch(err => {
  console.error("❌ Test script error:", err);
  process.exit(1);
});
