# 📱 Smart Pharma Mobile App - Setup & Troubleshooting

## ✅ Current Status

- **Backend Running:** Port 5001
- **Expo Running:** Port 8081  
- **Your Laptop IP:** 192.168.29.127
- **Mobile Config:** `http://192.168.29.127:5001`

## 🚨 Network Request Failed Error

If you see **"Network request failed"** in the app, it means your phone cannot connect to the backend. Here's how to fix it:

### Step 1: Check Wi-Fi Connection

**Both your phone and laptop MUST be on the same Wi-Fi network (192.168.29.x)**

On your phone:
1. Go to **Settings → Wi-Fi**
2. Check the connected network name
3. Tap on the network → Check IP address starts with **192.168.29.x**

On your laptop:
- Already connected to Wi-Fi with IP: **192.168.29.127** ✅

If they're on different networks, connect both to the same Wi-Fi.

### Step 2: Allow Port 5001 Through Windows Firewall

Windows Firewall is blocking incoming connections from your phone.

**Fix (Option A - Easy):**
1. Right-click on `allow-backend-port.bat` file in this folder
2. Select **"Run as administrator"**
3. Click **Yes** when prompted
4. Wait for "Done!" message
5. Close the window

**Fix (Option B - Manual):**
1. Open **Windows Defender Firewall** → Advanced Settings
2. Click **Inbound Rules** → New Rule
3. Select **Port** → Next
4. Select **TCP** → Specific local ports: **5001** → Next
5. Select **Allow the connection** → Next
6. Check all profiles (Domain, Private, Public) → Next
7. Name: **Smart Pharma Backend** → Finish

### Step 3: Test Backend Connection

**From your laptop:**
```powershell
curl http://192.168.29.127:5001
```

You should see: `🚀 Smart Pharma Backend Running Successfully`

**From your phone browser:**
1. Open **Chrome** or any browser
2. Go to: `http://192.168.29.127:5001`
3. You should see the same success message

If this works, the backend is accessible from your phone!

### Step 4: Reload the Mobile App

1. **Shake your phone** or press the **menu button** in Expo Go
2. Tap **"Reload"**
3. Or tap **"Test Network"** button in the app header to diagnose

## 🔧 Alternative: Use Render Backend (If Local Fails)

If you can't fix the firewall/network issue, use the deployed backend:

1. Edit `mobile/src/config.js`:
   ```javascript
   const API_BASE_URL = 'https://backend-u4si.onrender.com';
   ```
2. Reload the app
3. **Note:** Render backend may be slow or unavailable (suspended)

## 📊 Understanding the Errors

### ❌ "Network request failed"
- **Cause:** Phone can't reach the backend server
- **Fix:** Follow Steps 1-4 above

### ⚠️ "Failed to register push token"
- **Cause:** Push notifications don't work in Expo Go (SDK 53+)
- **Impact:** App still works! This is just a warning
- **Fix:** Ignore it, or build a custom dev client with `npx expo run:android`

## 🎯 Quick Test Checklist

- [ ] Laptop connected to Wi-Fi (192.168.29.127)
- [ ] Phone connected to same Wi-Fi (192.168.29.x)
- [ ] Backend running on port 5001
- [ ] Windows Firewall rule added for port 5001
- [ ] Can access `http://192.168.29.127:5001` from phone browser
- [ ] Mobile app reloaded after config change

## 💡 Pro Tips

1. **Test Network Button:** Use the "Test Network" button in the Worker Dashboard header to quickly diagnose connection issues

2. **Check Backend Logs:** Look at the backend terminal - you should see incoming requests when the app tries to connect

3. **IP Address Changed?** If your laptop IP changes (after reconnecting Wi-Fi), update `mobile/src/config.js` with the new IP

4. **Using Mobile Data?** Won't work! Both devices must be on same Wi-Fi

## 🆘 Still Not Working?

Check these common issues:

1. **Antivirus/Firewall software** (Norton, McAfee, etc.) might be blocking - temporarily disable
2. **Router firewall** might block device-to-device communication - check router settings for "AP Isolation" (should be OFF)
3. **VPN running on laptop** - disconnect VPN
4. **Multiple network adapters** - disable other network adapters (Ethernet, Virtual adapters)

---

## 📱 Test Results from App

After tapping "Test Network" button in the app, you'll see:

**✅ Success:**
```
Backend Root: ✅ Connected
http://192.168.29.127:5001

Tasks Endpoint: ✅ Connected  
http://192.168.29.127:5001/tasks
```

**❌ Failure:**
```
Backend Root: ❌ Network request failed
http://192.168.29.127:5001

Tasks Endpoint: ❌ Network request failed
http://192.168.29.127:5001/tasks

⚠️ Troubleshooting:
• Check phone & laptop are on same Wi-Fi
• Backend must be running on laptop
• Windows Firewall may be blocking port 5001
• Try restarting the backend server
```

---

**Need more help?** Check the backend terminal logs to see if requests are coming through.
