# 💊 Smart Pharma System — Architecture & Run Guide

Unified pharmaceutical manufacturing control panel for **Bharath Enterprises**, **Shree Ganaapathy Roto Prints**, and **Vel Gravure**.

## 🏗️ Project Architecture

```
/smart-pharma-system
│
├── /backend            (Express API backend — routes, controllers, models, config)
├── /shared             (Headless React hooks — useDashboardData, useDispatchForm, useAttendance, etc.)
├── /frontend-webui     (Expo Web Portal built with React Native Web — matches desktop UI)
├── /mobile             (Expo Mobile App — untouched native drawer/bottom-tab navigation)
└── README.md
```

## 🚀 Running the Services

### 1. Backend API Server
```bash
cd backend
npm install
npm start
```

### 2. Expo Web Portal (Replacing Old Website)
```bash
npm run start:web
# or
cd mobile && npx expo start --web
```

### 3. Expo Mobile App
```bash
npm run start:mobile
# or
cd mobile && npx expo start
```
