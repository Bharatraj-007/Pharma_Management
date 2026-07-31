# Implementation Plan

## Priority 1: Fix Critical Broken Features

### 1.1 Fix Android Crash - Alert.prompt in WorkerDashboard
**File:** `mobile/src/screens/dashboard/WorkerDashboard.js`
- Replace `Alert.prompt` (iOS-only) with a visible inline text input field
- Use a Modal or inline input fields for per-colour KG entry
- Add visible feedback (toast/alert) on success/failure

### 1.2 Fix Deprecated expo-file-system in reportExporter.js
**File:** `mobile/src/utils/reportExporter.js`
- Replace `expo-file-system/legacy` with modern `expo-file-system`
- Use `writeAsStringAsync` from the main module with proper encoding
- Test Excel and PDF exports on real device

### 1.3 Add CEO Company Filter for Tasks
**File:** `mobile/src/screens/TasksScreen.js`
- Pass `activeCompany` query param when role is CEO
- Add company filter chips similar to Dispatch/Finance screens

### 1.4 Add Missing Features to Mobile WorkerDashboard
**File:** `mobile/src/screens/dashboard/WorkerDashboard.js`
- Add foil image upload option (using expo-image-picker)
- Add manual QR input text field (not just scan mode)
- Add toggle between manual and scan mode (like website)

## Priority 2: Add Missing Entire Features

### 2.1 CEO Company Selector (Global)
**Files:** 
- `mobile/src/navigation/AppNavigator.js`
- All screens that need company switching

### 2.2 Inline Add Product in Dispatch
**File:** `mobile/src/screens/DispatchScreen.js`
- Add quick product creation inline modal (matching website)

### 2.3 Worker Dashboard Improvements
**File:** `mobile/src/screens/dashboard/WorkerDashboard.js`
- Add image upload for task start
- Add manual QR entry alongside scan

## Priority 3: Enhancements

### 3.1 Add Visible Feedback to All Actions
- Ensure every button press shows success/error via Alert or inline messages
- Audit all screens

### 3.2 CEO Dashboard Live Data
**File:** `mobile/src/screens/dashboard/CEODashboard.js`
- Fetch real data from backend instead of showing "—"

