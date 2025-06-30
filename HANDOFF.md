# HANDOFF
> June 23, 2025

React Native mobile app for AI-powered skin analysis and personalized skincare routines. This handoff includes a fully functional prototype ready for production migration.

## Setup

### Account Access Required
- **GitHub:** Repository access required
- **Expo:** Project ID `4b079171-23f5-4328-ac18-7c1d9ef3429d`
- **Firebase:** Production and development project instances

### Environment Configuration
See `ENVIRONMENT_SETUP.md` and `README.md` for complete setup instructions.

### Expo Project Details
- **Project ID:** `4b079171-23f5-4328-ac18-7c1d9ef3429d`
- **Platform:** React Native + Expo SDK
- **Deployment:** EAS Preview builds (dev), App Store + Google Play (prod)
- **Development:** Uses Expo Router for file-based routing

### Critical Dependencies
- React Native + Expo SDK
- Firebase v11.9.1 (Firestore, Storage, Functions, Realtime Database)
- expo-camera, expo-image-picker, react-native-gesture-handler

### !Important Note for running locally 
- The firebase development environment exists, but is still buggy. Use prod at first

Use this:
```
npm run prod
```

Intead of this:
```
npm run dev
```



## Current Status

### Firebase Service Architecture

#### 1. **FirebasePhotosService.js** 
**Purpose:** Handles all photo-related operations including storage, analysis tracking, and real-time updates.

**Functions (10 total):**
- `createPhotoDocument(userId, photoId, storageUrl)` - Creates initial photo doc
- `getPhotoData(photoId)` - Retrieves single photo data
- `onPhotosUpdate(userId, callback)` - Real-time photos listener
- `getSnapshot(userId, photoId)` - Gets photo with ID
- `updatePhotoDocument(userId, photoId, data)` - Updates photo doc
- `retryPhotoAnalysis(userId, photoId, batchId)` - Triggers analysis retry
- `deletePhoto(userId, photoId)` - Removes from Storage & Firestore
- `getLatestPhotos(numPhotos)` - Gets recent photos (any status)
- `getLatestCompletedPhotos(numPhotos)` - Gets analyzed photos with metrics
- `getPhotoStatus(photoId)` - Returns analysis status

**Dependencies:** Firestore, Firebase Storage, Realtime Database (analysis queue)

**Data Structure:**
```
users/{userId}/photos/{photoId}/
├── storageUrl: string
├── status: { state, lastUpdated }
├── metrics: { hydrationScore, poresScore, ... }
├── results: { area_results[] }
├── imageQuality: { overall, focus, lighting }
└── meta: { haut: {...} }
```

#### 2. **FirebaseUserService.js** 
**Purpose:** Manages user profiles and skincare routine management.

**Functions (7 total):**
- `createProfile(uid, email)` - Creates initial user profile
- `getProfile(uid)` - Retrieves profile data
- `updateProfile(uid, profileData)` - Updates profile fields
- `addRoutineItem(userId, newItemData)` - Adds routine item
- `updateRoutineItem(userId, updatedItem)` - Updates routine item
- `deleteRoutineItem(userId, itemIdToDelete)` - Removes routine item
- `clearPendingAddItem(userId, threadId, itemData)` - Clears pending items

**Dependencies:** Firestore only (simplest service)

#### 3. **FirebaseThreadsService.js** 
**Purpose:** Handles AI conversation threads and real-time chat updates.

**Functions (6 total):**
- `getThreadById(userId, threadId)` - Retrieves single thread
- `createThread(userId, options)` - Creates new thread with photo linking
- `listenToThread(userId, threadId, callback)` - Real-time thread listener
- `addMessageToThread(userId, threadId, messageData)` - Adds message
- `retryThread(userId, threadId)` - Resets thread status for retry
- `generateThreadSummary(userId, threadId)` - Triggers AI summary

**Dependencies:** Firestore, Realtime Database (AI queue)
**Note:** Has photo coupling - must be migrated after photos service

#### 4. **firebase-utils.js** (Shared Utilities)
- `generateSimpleId(prefix)` - Creates timestamped IDs
- `getRecommendedIngredients()` - Firebase Functions call

### ✅ Code Quality Status

**Current State:**
- All Firebase operations use current service layer
- Modular architecture ready for independent service replacement

### Key Technical Implementation

**Photo Processing:**
- **Camera Settings:** quality: 0.7, base64: true, **exif: false** (critical for Haut.ai)
- **Upload Flow:** Capture → Firebase Storage → Firestore doc → Analysis queue
- **Analysis:** Integrates with Haut.ai API via Realtime Database queues

**Data Architecture:**
- **Users Collection:** Profiles, routines, settings
- **Photos Subcollection:** Analysis results, metrics, status tracking
- **Threads Subcollection:** AI conversations, messages, summaries
- **Real-time Updates:** All screens use Firebase listeners

**AI Integration:**
- **Thread Types:** `snapshot_feedback`, `routine_add_discussion`
- **Message Flow:** User input → Firebase → AI backend → Response
- **Queue System:** RTDB queues for analysis and AI processing

## Migration Strategy

### Recommended Phased Approach

Each service is self-contained with clear function signatures, documented dependencies, and can be replaced independently.

**Phase 1: Replace Photo Services**
- **Target:** `FirebasePhotosService.js` → Your photo middleware
- **Impact:** 10 functions, highest complexity
- **Dependencies:** Storage, Firestore, RTDB queues
- **Team Note:** Your team has middleware ready for this phase

**Phase 2: Replace User Services**
- **Target:** `FirebaseUserService.js` → Your user middleware
- **Impact:** 7 functions, simplest (pure Firestore)
- **Dependencies:** Firestore only

**Phase 3: Replace Thread Services**
- **Target:** `FirebaseThreadsService.js` → Your AI/LLM middleware
- **Impact:** 6 functions, has photo dependencies
- **Dependencies:** Firestore, RTDB queues
- **Important:** Must happen after photos due to thread/photo coupling

### Migration Support

Each service provides:
- **Clear function signatures** and purposes
- **Documented dependencies** and data structures
- **Independent operation** - can be replaced without affecting others
