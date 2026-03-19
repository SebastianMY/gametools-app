# Game Companion

A portable game toolkit mobile app built with React Native and Expo. Supports Dice rolling, Score tracking, and a Draw (touch-based winner selection) feature — all **offline-first** on iOS and Android.

> **v1.0.0** — Production-ready release.

## Features

- 🎲 **Dice Roller** — Roll 1–6 configurable dice with animated results and haptic feedback
- 📊 **Score Tracker** — Create and manage named game sessions with persistent player scores (auto-saved via AsyncStorage)
- ✋ **Draw** — Multi-touch winner selection: all players place a finger simultaneously and one is randomly highlighted as the winner with haptic feedback
- ♿ **Accessible** — Full screen reader support (VoiceOver / TalkBack), WCAG AA colour contrast, semantic accessibility labels on all interactive elements
- 📴 **Fully offline** — No network access, no account, no telemetry

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5 |
| Framework | React Native 0.74 + Expo 51 (managed) |
| Navigation | React Navigation v6 (Bottom Tabs) |
| Storage | @react-native-async-storage/async-storage |
| Haptics | expo-haptics |
| Testing | Jest + React Native Testing Library |
| Linting | ESLint + Prettier |
| Builds | Expo EAS Build |

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [npm](https://www.npmjs.com/) v9 or later
- [EAS CLI](https://docs.expo.dev/eas/) for production builds (`npm install -g eas-cli`)
- [Expo Go](https://expo.dev/go) app on your iOS or Android device (for development / QA)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the development server

```bash
npm start
```

Scan the QR code with the **Expo Go** app on your device, or press `i` for iOS Simulator / `a` for Android Emulator.

### 3. Run on specific platform

```bash
# iOS Simulator
npm run ios

# Android Emulator
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
├── __tests__/              # Integration and E2E tests
├── assets/
│   └── images/
├── app.json                # Expo configuration + app store metadata
├── eas.json                # EAS Build profiles (development/preview/production)
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── babel.config.js         # Babel config
├── .eslintrc.js            # ESLint config
└── .prettierrc             # Prettier config
```

## Architecture

This app follows a **modular monolith** architecture with three independent feature modules sharing a common navigation and storage layer. All data is stored locally using AsyncStorage — no backend, no network requests.

Key architectural decisions:
- **React Native + Expo (managed)**: Single shared codebase for iOS and Android (ADR-001)
- **AsyncStorage**: Local persistence for Score Tracker sessions — no SQLite or cloud sync needed for v1.0 (ADR-002)
- **Feature modules**: Dice, Score, and Draw are fully independent with shared services only for Storage, Haptics, and Random (ADR-003)
- **React Native Animated API**: All animations (dice roll, winner highlight) use the built-in API to minimise bundle size and maintain 60 FPS (ADR-004)

See [`docs/architecture/architecture_approved_0001.md`](docs/architecture/architecture_approved_0001.md) for the full architecture document.

## Requirements

- **iOS** 13.0 or later
- **Android** 8.0 or later (API level 26+)
- No internet connection required (fully offline)
- No user account required
- No analytics or telemetry

## Building for Production

### iOS (App Store)

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Log in to your Expo account
eas login

# Build a production IPA for App Store submission
eas build --platform ios --profile production

# Submit to App Store Connect (requires apple credentials in eas.json)
eas submit --platform ios --profile production
```

### Android (Google Play)

```bash
# Build a production AAB for Google Play submission
eas build --platform android --profile production

# Submit to Google Play (requires service account key in eas.json)
eas submit --platform android --profile production
```

### Preview / Internal Testing

```bash
# Build an APK or simulator build for QA
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

Before running production builds, update the placeholder values in `eas.json` (`submit.production.ios`) with your real Apple ID, App Store Connect App ID, and Apple Team ID.

## App Store Compliance

### iOS App Store Review Guidelines

| Requirement | Status |
|-------------|--------|
| No account creation required | ✅ No login/signup |
| Offline-first functionality | ✅ 100% local, no network |
| No hidden features | ✅ All features described in metadata |
| Accessibility support | ✅ VoiceOver labels, contrast AA |
| No third-party analytics | ✅ No SDKs, no telemetry |
| No in-app purchases (v1.0) | ✅ Free, no IAP |

### Google Play Store Policies

| Requirement | Status |
|-------------|--------|
| No dangerous permissions | ✅ `permissions: []` in app.json |
| Privacy policy (offline app) | ✅ Not required for fully offline apps with no PII |
| Target SDK ≥ 26 | ✅ `minSdkVersion: 26` |
| No deceptive behaviour | ✅ App does exactly what it describes |

## Privacy

Game Companion collects **no personal data** and makes **no network requests**. All game data (session names, player names, scores) is stored exclusively on the user's device using AsyncStorage and is never transmitted anywhere.

A formal privacy policy is **not required** for App Store or Google Play submission for apps that do not collect, transmit, or share any personal data. Should a future version add cloud sync or any data collection, a privacy policy must be prepared prior to submission.

## Testing

```bash
# Run all tests (149 tests across 7 suites)
npm test

# Unit + integration + E2E tests cover:
# - Dice feature (roll mechanics, animation state)
# - Score feature (session CRUD, persistence)
# - Draw feature (touch handling, winner selection)
# - Navigation (tab switching, screen rendering)
# - Persistence (AsyncStorage round-trips)
# - End-to-end feature flows
```

## Known Limitations

- **Simulator haptics**: Haptic feedback is silent in iOS Simulator and Android Emulator; test on physical devices for the full experience.
- **AsyncStorage capacity**: Tested up to 50 concurrent sessions (~1 KB each); performance degrades with thousands of sessions (not a practical concern for a board game tool).
- **Portrait-only**: Landscape orientation is locked by design; tablets are not supported in v1.0.
- **No iCloud / Google Drive sync**: Session data lives on the device only; uninstalling the app clears all data.
- **No export**: Score sessions cannot be exported to CSV or shared in v1.0.

## Changelog

### v1.0.0 (2026-03-18)
- Initial production release
- Dice Roller: 1–6 dice, animated roll, haptic feedback
- Score Tracker: named sessions, player management, auto-save, session history
- Draw: multi-touch winner selection with animated highlight and haptics
- Full accessibility support (VoiceOver, TalkBack, WCAG AA contrast)
- 60 FPS animations on 2 GB RAM+ devices
- 149 automated tests (unit, integration, E2E)

## License

MIT — see [LICENSE](LICENSE) for details.
