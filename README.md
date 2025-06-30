# Magic Mirror - AI Skincare Analysis App

A React Native mobile app that combines AI-powered skin analysis, personalized skincare routines, and intelligent chat to help users optimize their skincare regimen.

## Core Features

- **AI Skin Analysis**: Face-guided photo capture with professional-grade analysis via Haut.ai
- **Smart Routines**: Track skincare products and activities with AI-powered recommendations  
- **Contextual AI Chat**: Personalized conversations about skin analysis and routine optimization
- **Real-time Sync**: Firebase-powered data synchronization across devices

## Tech Stack

- **Frontend**: React Native + Expo SDK, Expo Router, Context API
- **Backend**: Firebase (Firestore, Storage, Functions), Haut.ai API
- **Key Dependencies**: expo-camera, firebase v11.9.1, react-native-gesture-handler

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment setup**  
   See [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for complete setup instructions.
   
   Quick setup:
   ```bash
   # Install EAS CLI and login
   npm install -g eas-cli@latest
   eas login
   
   # Set up environment variables
   node scripts/setup-env.js
   ```

3. **Run Locally**

**Development environment (default):**
```bash
npm run dev
```

**Production environment:**
```bash
npm run prod
```

**Run on device**
   - iOS Simulator: Press  `s` to switch from dev build to expo go, then `i` to open simulator
   - Android Emulator: Press `a`  (may need to use --tunnel)
   - Physical device: Scan QR code with Expo Go, or install development build


**Note:** If you run `npx expo start` directly, it will use whatever environment was last set by the npm scripts above.

## Project Structure

```
app/                    # Expo Router screens
├── (authenticated)/    # Protected routes (home, camera, chat, etc.)
└── auth/              # Authentication screens

src/
├── components/        # Reusable UI components
├── contexts/          # React Context providers
├── services/          # Firebase and API integrations
├── styles/           # Design system and themes
└── utils/            # Helper functions

secrets/              # Environment configs (not in git)
```

## Development Notes

- Uses file-based routing with Expo Router
- Firebase security rules configured for authenticated users
- Image processing includes EXIF handling and quality validation
- AI analysis includes comprehensive skin metrics and recommendations
- Real-time listeners for live data updates across all screens

## Deployment

- **Development**: EAS Preview builds
- **Production**: App Store + Google Play via EAS Submit
- **Project ID**: `4b079171-23f5-4328-ac18-7c1d9ef3429d`

## Testing

```bash
npm test
```
