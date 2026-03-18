# Game Companion

A portable game toolkit mobile app built with React Native and Expo. Supports Dice rolling, Score tracking, and a Draw (touch-based winner selection) feature — all offline-first on iOS and Android.

## Features

- 🎲 **Dice Roller** — Roll 1–6 dice with animated results
- 📊 **Score Tracker** — Create and manage game sessions with persistent player scores
- ✋ **Draw** — Multi-touch winner selection with haptic feedback

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript |
| Framework | React Native + Expo (managed) |
| Navigation | React Navigation (Bottom Tabs) |
| Storage | AsyncStorage |
| Haptics | Expo Haptics |
| Testing | Jest + React Native Testing Library |
| Linting | ESLint + Prettier |

## Prerequisites

- [Node.js](https://nodejs.org/) v16 or later
- [npm](https://www.npmjs.com/) v8 or later
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo-cli`)
- [Expo Go](https://expo.dev/go) app on your iOS or Android device (for development)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the development server

```bash
npm start
```

This launches the Expo development server. Scan the QR code with the Expo Go app on your device, or press `i` for iOS Simulator / `a` for Android Emulator.

### 3. Run on specific platform

```bash
# iOS
npm run ios

# Android
npm run android
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start Expo development server |
| `npm run ios` | Start on iOS Simulator |
| `npm run android` | Start on Android Emulator |
| `npm run lint` | Run ESLint on source files |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run format` | Format source files with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm run test` | Run Jest test suite |
| `npm run type-check` | Run TypeScript compiler check |

## Project Structure

```
game-companion/
├── src/
│   ├── components/
│   │   ├── Navigation/     # Tab navigation
│   │   ├── Dice/           # Dice roller feature
│   │   ├── Score/          # Score tracking feature
│   │   └── Draw/           # Multi-touch draw feature
│   ├── services/
│   │   ├── StorageService.ts    # AsyncStorage wrapper
│   │   ├── VibrationService.ts  # Haptics wrapper
│   │   └── RandomService.ts     # Random number generation
│   ├── types/
│   │   └── index.ts        # Shared TypeScript interfaces
│   ├── styles/
│   │   ├── theme.ts        # Color palette, typography, spacing
│   │   ├── colors.ts       # Color definitions
│   │   └── globalStyles.ts # Shared styles
│   ├── utils/
│   │   ├── validation.ts   # Input validation
│   │   └── formatters.ts   # Utility formatters
│   ├── App.tsx             # Root component
│   └── index.tsx           # Entry point
├── assets/
│   └── images/
├── app.json                # Expo configuration
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── babel.config.js         # Babel config
├── .eslintrc.js            # ESLint config
└── .prettierrc             # Prettier config
```

## Architecture

This app follows a **modular monolith** architecture with three independent feature modules sharing a common navigation and storage layer. All data is stored locally using AsyncStorage — no backend, no network requests.

See [`docs/architecture/architecture_approved_0001.md`](docs/architecture/architecture_approved_0001.md) for full architecture documentation.

## Requirements

- iOS 13+
- Android 8.0+ (API 26+)
- No internet connection required (fully offline)
