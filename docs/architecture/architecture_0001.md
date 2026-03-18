# Game Table Companion - Architecture Document

## 1. Architecture Overview

**Game Table Companion** is a **single-device modular monolith** mobile application. The entire application runs locally on the user's device with no backend services, authentication, or network dependencies. The architecture is organized into three feature-focused modules (Dice, Score Manager, Raffle) that operate independently but share common UI/data infrastructure.

This style is chosen because:
- All requirements are single-device, offline-first scenarios
- No multi-device synchronization or server-driven logic is needed
- Modular organization allows parallel development of features while maintaining a cohesive codebase
- Expo/React Native provides a unified runtime for iOS and Android, eliminating need for platform-specific implementations

---

## 2. Architecture Decision Records (ADRs)

### ADR-001: Use React Native + Expo for Cross-Platform Runtime

**Decision**: Build with React Native (v0.70+) and Expo as the primary framework for both iOS and Android.

**Context**: 
- Specification requires simultaneous iOS 13+ and Android 8+ support
- Single codebase requirement for cost/velocity efficiency
- Complex animations (60 fps dice rolling, smooth multi-touch rendering) require native performance
- Team familiarity with JavaScript/React ecosystem likely higher than native iOS/Android

**Alternatives Considered**:
- Native iOS (Swift) + Native Android (Kotlin): Maximum performance but 2x development cost, harder maintenance
- Flutter: Excellent performance but ecosystem smaller, less mature for haptics/multi-touch
- Capacitor/Cordova: Slower animations, poor multi-touch support
- Web (PWA): Cannot guarantee 60 fps, haptics/multi-touch APIs less mature

**Trade-offs**:
- Slight performance overhead vs. native (acceptable given Expo's maturity)
- Dependency on Expo SDK updates (Expo is actively maintained, low risk)
- Larger app bundle size (~50-80 MB) vs. native (~20-30 MB)

**Status**: Accepted

---

### ADR-002: AsyncStorage for Local Persistence of Games

**Decision**: Use `@react-native-async-storage/async-storage` as the sole persistence layer for all game data (games, player names, scores, timestamps).

**Context**:
- Data model is simple: games contain players, each player has name/score/timestamp
- No complex queries, joins, or filtering required (games listed in memory after loading)
- Specification requires robust offline persistence with no server sync
- Data volume is low: typical game is <1 KB JSON; even 100 games = <100 KB
- Requirement NFREQ-REL-02 and NFREQ-REL-04 demand simple, reliable persistence

**Alternatives Considered**:
- SQLite via `expo-sqlite`: Overkill for this schema; adds complexity and startup latency
- Realm: Non-standard, higher learning curve, not necessary for this data model
- File system (RNFS): Lower-level, more error-prone than AsyncStorage

**Trade-offs**:
- Entire game history must fit in ~10 MB (AsyncStorage soft limit); acceptable since games are small
- No built-in encryption (AsyncStorage is plaintext in OS storage); users are explicitly not entering sensitive data
- All games loaded on app startup (memory overhead); negligible for typical usage (< 10-20 games)

**Status**: Accepted

---

### ADR-003: Reanimated 2 for 60 fps Animations

**Decision**: Use React Native Reanimated 2 (v2.10+) for all animations (dice rolling, raffle winner scale/fade, score transitions).

**Context**:
- Specification requires NFREQ-PER-01: "60 fps sustained" for animations
- Dice throwing: 0.8-1.2 second rolling animation must not drop frames
- Raffle: simultaneous multi-touch circle rendering + scale/fade animations
- React Native Animated API is synchronous, CPU-bound; can drop frames under load
- Reanimated 2 runs animations on native thread, bypassing JavaScript bridge

**Alternatives Considered**:
- React Native Animated API: Simpler API, but prone to frame drops
- Lottie: Good for pre-rendered sequences, but inflexible for dice (need procedural generation)
- Manual requestAnimationFrame: Low-level, error-prone, hard to coordinate multi-animations

**Trade-offs**:
- Reanimated 2 requires native modules (compiled via Expo EAS Build)
- Slightly larger bundle size (~500 KB)
- Learning curve steeper than Animated API
- Worklet syntax unfamiliar to junior developers

**Status**: Accepted

---

### ADR-004: React Native Gesture Handler for Multi-Touch Raffle Detection

**Decision**: Use `react-native-gesture-handler` (v2.x) for multi-touch point detection and tracking in the Raffle module.

**Context**:
- Specification requires FREQ-S-01: detect 2-10 simultaneous touch points with <50 ms latency
- PanResponder (built-in) has single-pointer focus and doesn't reliably track multiple simultaneous touches
- Raffle requires: detect individual finger down/move/up, assign unique color, track position, handle rapid add/remove of fingers
- Gesture Handler is industry-standard for complex touch patterns in React Native

**Alternatives Considered**:
- PanResponder: Simpler API but unreliable for 10+ simultaneous touches
- Native module (custom Objective-C/Kotlin): Over-engineered; Gesture Handler already solves this
- Expo-managed touch API: Does not exist; would require Expo plugin development

**Trade-offs**:
- Gesture Handler is a native module (dependency on Expo EAS Build)
- Slightly steeper API than PanResponder
- Adds ~300 KB to bundle

**Status**: Accepted

---

### ADR-005: Expo Haptics for Device Vibration Feedback

**Decision**: Use `expo-haptics` for haptic feedback (raffle winner vibration pattern).

**Context**:
- Specification FREQ-S-08 requires: "vibration at winner selection (pattern: 150ms + pause + 100ms)"
- Expo Haptics provides cross-platform haptic API (iOS CoreHaptics, Android Vibrator)
- Simple API: `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)`
- Alternative patterns available for future use

**Alternatives Considered**:
- React Native Vibration (community): Works but less refined, fewer pattern options
- Native modules: Over-engineered; Expo Haptics is sufficient
- No vibration: Reduces immersion; easily implemented with Expo

**Trade-offs**:
- Limited to Expo Haptics patterns (cannot define arbitrary custom patterns)
- Vibration may not work on all devices (some Android low-end devices disable)

**Status**: Accepted

---

### ADR-006: Modular Feature Architecture (Dice, Score, Raffle as Isolated Modules)

**Decision**: Organize code into three independent feature modules, each with its own navigation stack, state, and screens, sharing only common UI components and utilities.

**Context**:
- Three distinct user flows (Dice, Score Manager, Raffle) with minimal interaction
- Specification FREQ-G-01/G-02 requires tab-based navigation between three main sections
- Isolating modules allows parallel development and testing
- Each module has distinct data persistence needs (Dice: stateless; Score: persistent; Raffle: stateless)

**Alternatives Considered**:
- Single monolithic screen component: Hard to maintain, difficult to test independently
- Shared Redux store for all state: Overkill; only Score module needs persistence, others are stateless
- Nested navigation with cross-module routing: Adds complexity; tab bar is natural boundary

**Trade-offs**:
- Module duplication of common state (e.g., tab selection) at top level
- Cross-module communication would be harder (but not required by spec)
- Slightly larger bundle (code duplication) vs. shared library approach

**Status**: Accepted

---

### ADR-007: Tab-Based Navigation with React Navigation

**Decision**: Use React Navigation `Bottom Tab Navigator` for primary navigation between Dice, Score, and Raffle modules.

**Context**:
- Specification FREQ-G-02 requires "tab bar or equivalent menu"
- Tab bar is most intuitive for three permanent sections
- React Navigation is Expo standard, mature, well-documented
- Tab bar remains visible, allowing rapid switching (UX requirement NFREQ-UX-04)

**Alternatives Considered**:
- Drawer navigation: Takes up space, requires extra swipe; less suitable for mobile
- Horizontal tabs (Material Design style): Adds top bar; less natural for mobile
- Stack navigation with persistent back button: Confusing for three coequal sections

**Trade-offs**:
- Bottom tab bar consumes ~50-60 dp of screen height
- Slight bundle size increase (~1 MB for React Navigation)
- Requires Expo safe-area handling for notch devices

**Status**: Accepted

---

### ADR-008: JSON Serialization for AsyncStorage Game Records

**Decision**: Store each game as a JSON object in AsyncStorage with schema: `{ id, createdAt, lastAccessedAt, players: [{ id, name, score }] }`.

**Context**:
- AsyncStorage is key-value store; values must be JSON strings
- Specification requires FREQ-P-15/P-16: createdAt and lastAccessedAt timestamps
- Game restoration (CU-04) requires exact data reload; JSON serialization is idempotent
- Simple schema allows loading games into memory on app startup (< 1 second for typical usage)

**Alternatives Considered**:
- Normalization (separate AsyncStorage keys per player): Adds fragmentation, harder to atomic operations
- Binary encoding (MessagePack): Slightly smaller size, but JSON is human-readable for debugging

**Trade-offs**:
- JSON size is ~5-10% larger than binary (negligible for this scale)
- No schema versioning strategy (v1 only; breaking changes require migration code in v2+)

**Status**: Accepted

---

### ADR-009: Client-Side Date Generation for Timestamps (No Server)

**Decision**: Generate all timestamps (`createdAt`, `lastAccessedAt`) using `new Date().toISOString()` on the device; no server time synchronization.

**Context**:
- Specification explicitly forbids backend: NFREQ-REL-03 "No servers"
- Timestamps are informational only (sorting, display); not used for transaction ordering
- Users cannot modify device time during a game without awareness
- ISO 8601 format allows string sorting equivalent to numeric sorting

**Alternatives Considered**:
- Server timestamp: Violates offline-first requirement
- Milliseconds since epoch: Equivalent to ISO, less human-readable in storage
- No timestamps: Harder to sort games; violates FREQ-P-10

**Trade-offs**:
- Users can manipulate device time to cheat game ordering (acceptable risk; app is for fun, not gambling)
- Timezone handling relies on device setting (unavoidable without server)

**Status**: Accepted

---

### ADR-010: Game ID Generation Using UUID v4

**Decision**: Assign each game a universally unique identifier (UUID v4) generated on the device using a library like `uuid` or `react-native-uuid`.

**Context**:
- Games must be uniquely identifiable across app sessions
- No server to allocate IDs centrally
- UUID v4 provides 2^122 collision space (astronomically unlikely for single device)
- UUID v4 is stateless (no local sequence counter to maintain)

**Alternatives Considered**:
- Timestamp-based IDs: Risk collisions if two games created simultaneously
- Sequential IDs (1, 2, 3...): Requires persistent counter, more fragile
- Device + timestamp + random: Over-complicated; UUID already optimal

**Trade-offs**:
- UUID strings are 36 characters (vs. 10-digit numeric); slightly larger storage footprint

**Status**: Accepted

---

### ADR-011: No State Management Library (useState + useReducer Sufficient)

**Decision**: Use React Hooks (useState, useReducer, useContext) for local state; no Redux, MobX, Zustand, or Jotai.

**Context**:
- Only Score module has persistent state; other modules are stateless
- Game state is loaded once from AsyncStorage on mount, edited in memory, saved on each change
- No cross-component state sharing beyond tab selection (manageable with useContext)
- Specification has no requirements for time-travel debugging, action logging, or complex middleware

**Alternatives Considered**:
- Redux: Industry-standard but overkill for single-module persistence; adds 50 KB
- MobX: Simpler than Redux but still unnecessary for this complexity
- Zustand: Lightweight; could be used but adds learning curve for no clear benefit
- useContext + useReducer: Built-in, sufficient for this app's state

**Trade-offs**:
- Prop drilling for deeply nested components (mitigated by useContext)
- No time-travel debugging (not required; offline app with simple state)
- Less structure than Redux (team discipline required to avoid spaghetti)

**Status**: Accepted

---

### ADR-012: TypeScript for Type Safety

**Decision**: Write entire codebase in TypeScript (strict mode) instead of JavaScript.

**Context**:
- Specification NFREQ-ACC: Complex multi-touch detection and state management benefit from static typing
- React Native + TypeScript is industry standard; Expo has excellent support
- Type checking prevents common mobile app bugs (null reference, type coercion)
- Team productivity increases with autocomplete and compile-time error detection

**Alternatives Considered**:
- JavaScript + JSDoc: Less rigorous; comments easily become stale
- JavaScript without types: Error-prone; multi-touch logic has many edge cases

**Trade-offs**:
- Compilation step (~5 seconds) adds to development loop
- Slightly steeper onboarding for developers new to TypeScript
- tsc strict mode catches legitimate but unusual patterns (requires pragmatic exemptions)

**Status**: Accepted

---

### ADR-013: Expo SDK 48+ for Baseline Compatibility

**Decision**: Target Expo SDK 48+ (released late 2022) for all development and builds.

**Context**:
- Specification requires iOS 13+ and Android 8+ (API 26+)
- Expo SDK 48 supports these minimums
- SDK 48 is mature, well-documented, receives patches
- React Native 0.71 (bundled with Expo 48) has excellent animation and gesture support

**Alternatives Considered**:
- Expo SDK 49+: More recent features, but not necessary for this feature set
- Expo SDK 47 or older: Reaches EOL soon; less future-proof

**Trade-offs**:
- Forgoing newest features (e.g., New Architecture support in SDK 49+) doesn't affect v1 spec
- Upgrade path required for v2

**Status**: Accepted

---

## 3. System Components

### Component: Dice Module
**Responsibility**: Present dice roller UI, generate random numbers, animate rolling, display results.

**Key Interfaces**:
- **Input**: User selects quantity (1-6) via Stepper, taps "Roll" button
- **Output**: Animated dice roll, final numbers displayed, sum calculated
- **Dependencies**: 
  - Reanimated 2 (animation engine)
  - React Native (UI framework)
  - Expo (platform abstraction)
- **State**: Quantity selected, current roll results (temporary, not persisted)

---

### Component: Score Module
**Responsibility**: Manage multi-player games, persist games to AsyncStorage, handle UI for creating/resuming/editing games.

**Key Interfaces**:
- **Input**: 
  - Create game: player names (2-8)
  - Modify score: player ID + delta (+1 or -1 or manual value)
  - Load game: game ID from list
- **Output**: 
  - List of saved games
  - Current game state (players, scores)
  - Persistence to AsyncStorage
- **Dependencies**:
  - AsyncStorage (persistence)
  - React Hooks (state management)
  - Expo (platform APIs)
- **State**: Current game (if any), list of all games, edit mode flags

---

### Component: Raffle Module
**Responsibility**: Detect multi-touch inputs, render circles for each touch, implement 3-second stability countdown, select winner, animate result.

**Key Interfaces**:
- **Input**: Multi-touch point data (x, y, id, event type: down/move/up)
- **Output**: Animated circles for each touch, countdown timer, winner animation, vibration on completion
- **Dependencies**:
  - Gesture Handler (multi-touch detection)
  - Reanimated 2 (animation engine)
  - Expo Haptics (vibration feedback)
  - React Native (UI)
- **State**: Active touches (map of touch ID → { position, color }), countdown timer, winner ID

---

### Component: Shared UI Components Library
**Responsibility**: Reusable buttons, input fields, layout primitives, color palette, typography.

**Key Interfaces**:
- **Exports**: 
  - `Button` (primary, secondary styles)
  - `TextInput` (bordered, inline variants)
  - `Card` (game list item container)
  - `Colors` (theme constants)
  - `Typography` (font sizes, weights)
- **Dependencies**: React Native, React Native Reanimated (for animated components)

---

### Component: Navigation Container
**Responsibility**: Define app-level navigation structure (tab bar, screen routing).

**Key Interfaces**:
- **Structure**: 
  - Bottom Tab Navigator with 3 tabs
  - Tab 1: Dice Stack Navigator
  - Tab 2: Score Stack Navigator  
  - Tab 3: Raffle Stack Navigator
- **Dependencies**: React Navigation, all three modules

---

### Component: App Root
**Responsibility**: Initialize AsyncStorage, load persisted games, set up error boundaries, wrap app in providers.

**Key Interfaces**:
- **Lifecycle**:
  1. Load games from AsyncStorage on mount
  2. Initialize Reanimated 2 and Gesture Handler
  3. Render Navigation Container
  4. Handle app-level errors (storage failures, crashes)
- **Dependencies**: All modules, AsyncStorage, error boundary library

---

## 4. Tech Stack

| Layer | Technology | Justification |
|-------|-----------|--------------|
| **Runtime** | React Native 0.71+ | Cross-platform iOS/Android with native performance; Expo simplifies setup |
| **Build Tool** | Expo EAS Build | Managed cloud builds for iOS (Xcode compilation) and Android (Gradle compilation) |
| **Language** | TypeScript 4.9+ | Static typing prevents bugs in complex state/animations; strict mode enforces discipline |
| **Framework** | React 18.2+ | Hooks API mature, excellent for managing component state; Re-render optimization via useMemo |
| **Navigation** | React Navigation 6.x | Mature, well-documented; bottom-tab pattern is standard for mobile |
| **State** | React Hooks (useState, useReducer, useContext) | Built-in; sufficient for single-module persistence and temp multi-module state |
| **Animations** | React Native Reanimated 2 | 60 fps guaranteed; runs on native thread; non-blocking |
| **Gesture Handling** | React Native Gesture Handler 2.x | Multi-touch detection, event deduplication, low latency |
| **Haptics** | Expo Haptics | Cross-platform haptic patterns (iOS CoreHaptics, Android Vibrator) |
| **Persistence** | AsyncStorage (@react-native-async-storage/async-storage) | Key-value JSON storage, built-in, reliable, sufficient for <100 games |
| **UUID** | uuid (library) | Generate collision-free game IDs client-side |
| **HTTP Client** | Axios (not used; included for future v2) | Prepared for future backend integration |
| **Testing** | Jest + React Native Testing Library | Built into Expo; good for unit + component tests |
| **Linting** | ESLint + Prettier | TypeScript lint rules; Prettier enforces consistent style |
| **Version Control** | Git + GitHub | Standard; enables CI/CD via GitHub Actions |
| **Icons** | Expo Vector Icons (Feather set) | Lightweight, scalable, built-in to Expo |
| **Fonts** | System fonts + Roboto (via Expo Font) | System fonts for accessibility; Roboto as secondary for design flexibility |

---

## 5. Folder Structure

```
game-table-companion/
├── .github/
│   └── workflows/
│       ├── build-ios.yml          # EAS Build trigger for iOS on release tag
│       ├── build-android.yml      # EAS Build trigger for Android on release tag
│       └── lint.yml               # ESLint + TypeScript check on PR
├── app.json                       # Expo config (version, bundleId, permissions)
├── eas.json                       # EAS Build profiles (release, preview)
├── package.json                   # Dependencies, scripts
├── tsconfig.json                  # TypeScript strict mode config
├── jest.config.js                 # Jest testing setup
├── .eslintrc.json                 # ESLint rules (Airbnb + TypeScript)
├── .prettierrc.json               # Prettier formatting
├── src/
│   ├── index.ts                   # App entry point, AsyncStorage initialization
│   ├── navigation/
│   │   ├── RootNavigator.tsx      # Tab bar + nested stack navigators
│   │   ├── DiceNavigator.tsx      # Dice module stack (if nested screens needed)
│   │   ├── ScoreNavigator.tsx     # Score module stack (game list, game detail)
│   │   └── RaffleNavigator.tsx    # Raffle module stack (if nested screens needed)
│   ├── modules/
│   │   ├── dice/
│   │   │   ├── screens/
│   │   │   │   └── DiceScreen.tsx       # Main dice UI
│   │   │   ├── components/
│   │   │   │   ├── DiceRoller.tsx       # Dice animation + display
│   │   │   │   ├── QuantitySelector.tsx # 1-6 dice picker
│   │   │   │   └── RollButton.tsx       # Primary action button
│   │   │   ├── hooks/
│   │   │   │   └── useDiceRoll.ts       # Random generation, animation state
│   │   │   └── utils/
│   │   │       └── generateRoll.ts      # Pure random number logic
│   │   ├── score/
│   │   │   ├── screens/
│   │   │   │   ├── GameListScreen.tsx    # Saved games list
│   │   │   │   ├── CreateGameScreen.tsx  # Player name input form
│   │   │   │   └── GameDetailScreen.tsx  # Active game, +/- buttons
│   │   │   ├── components/
│   │   │   │   ├── PlayerRow.tsx         # Single player + score + buttons
│   │   │   │   ├── GameCard.tsx          # List item for saved game
│   │   │   │   ├── ScoreInput.tsx        # Inline score editor
│   │   │   │   └── ConfirmDialog.tsx     # Delete game confirmation
│   │   │   ├── hooks/
│   │   │   │   ├── useGameManager.ts     # CRUD games, load/save AsyncStorage
│   │   │   │   └── useGameDetail.ts      # Modify score, manage active game
│   │   │   ├── types/
│   │   │   │   └── Game.ts               # Game, Player interfaces
│   │   │   └── utils/
│   │   │       └── gameStorage.ts        # AsyncStorage key names, serialization
│   │   └── raffle/
│   │       ├── screens/
│   │       │   └── RaffleScreen.tsx      # Main raffle UI
│   │       ├── components/
│   │       │   ├── TouchCanvas.tsx       # Multi-touch touch detection + rendering
│   │       │   ├── CountdownTimer.tsx    # 3-second countdown display
│   │       │   ├── WinnerAnimation.tsx   # Scale + fade animations
│   │       │   └── RaffleReset.tsx       # New round button
│   │       ├── hooks/
│   │       │   ├── useTouchDetection.ts  # Gesture Handler wrapper
│   │       │   ├── useWinnerSelection.ts # Random selection logic
│   │       │   └── useStabilityCounter.ts# 3-second countdown state
│   │       ├── types/
│   │       │   └── Touch.ts              # TouchPoint interface
│   │       └── utils/
│   │           ├── colorPalette.ts       # 10+ unique colors for touches
│   │           └── randomSelection.ts    # Uniform random winner
│   ├── components/
│   │   ├── shared/
│   │   │   ├── Button.tsx                # Reusable button component
│   │   │   ├── TextInput.tsx             # Reusable text input
│   │   │   ├── Card.tsx                  # Container/list item
│   │   │   ├── SafeAreaView.tsx          # Notch-aware wrapper
│   │   │   └── Divider.tsx               # Visual separator
│   │   └── ErrorBoundary.tsx             # Catch and display errors
│   ├── styles/
│   │   ├── colors.ts                     # WCAG AA compliant palette
│   │   ├── typography.ts                 # Font sizes, weights, line heights
│   │   ├── spacing.ts                    # Consistent padding/margin scale
│   │   └── dimensions.ts                 # Screen sizes, safe area
│   ├── utils/
│   │   ├── logger.ts                     # Error/debug logging
│   │   ├── dateFormatting.ts             # ISO date to readable format
│   │   └── validation.ts                 # Input validation (player names, etc)
│   └── hooks/
│       ├── useAppInitialization.ts       # Load games on app start
│       ├── useSafeAreaInsets.ts          # Notch + safe area management
│       └── useKeyboardAvoiding.tsx       # Keyboard height tracking
├── __tests__/
│   ├── modules/
│   │   ├── dice/
│   │   │   └── useDiceRoll.test.ts
│   │   ├── score/
│   │   │   ├── gameStorage.test.ts
│   │   │   └── GameDetailScreen.test.tsx
│   │   └── raffle/
│   │       └── randomSelection.test.ts
│   └── utils/
│       └── validation.test.ts
├── assets/
│   ├── fonts/                           # Custom fonts if needed
│   ├── images/                          # Splash, icons (vector preferred)
│   └── illustrations/                   # App Store preview images
└── README.md                            # Development setup, architecture notes
```

**Folder Rationale**:
- **modules/**: Feature isolation; each module self-contained (screens, components, hooks, types, utils)
- **navigation/**: Central routing logic; separates from feature code
- **components/shared/**: Reusable across modules; single source of truth for design
- **styles/**: Centralized theme; easier to adapt for accessibility (font scaling, contrast)
- **hooks/**: Custom hooks isolated from components; reusable state logic
- **utils/**: Pure functions (no React); easy to test and reuse
- **__tests__/**: Mirror src structure; tests colocated by feature
- **assets/**: Images, fonts, illustrations for App Store

---

## 6. High-Level Data Model

| Entity | Attributes | Storage | Relationships | Notes |
|--------|-----------|---------|---------------|-------|
| **Game** | id (UUID), createdAt (ISO 8601), lastAccessedAt (ISO 8601) | AsyncStorage | 1 → N Players | Represents one saved game session |
| **Player** | id (UUID), name (string 1-30 chars), score (integer ≥ 0) | Nested in Game | N → 1 Game | Participant in a game; score persisted |
| **DiceRoll** | (none) | None | N/A | Stateless; results not persisted |
| **RaffleResult** | winner (touch color identifier) | None | N/A | Stateless; results not persisted |

**Storage Format (AsyncStorage)**:
```
Key: "game:<uuid>"
Value: {
  id: string (UUID v4),
  createdAt: string (ISO 8601),
  lastAccessedAt: string (ISO 8601),
  players: [
    { id: string (UUID v4), name: string, score: number },
    ...
  ]
}
```

**Rationale**:
- Simple flat schema (no nested queries needed)
- Players stored inline in Game (avoid join complexity)
- Timestamps as ISO strings (human-readable in storage, sortable lexicographically)
- Score stored as integer (JS number sufficient up to 2^53-1)
- No encryption (users not entering sensitive data; offline-only)

---

## 7. API / Interface Boundaries

### Dice Module Public Interface

| Route | Method | Purpose | Request | Response |
|-------|--------|---------|---------|----------|
| (no routing) | Component props | Dice Screen shown on Dice tab | None | `{ quantity: 1-6, onRoll: () => void }` |
| (internal) | useDiceRoll() hook | Trigger roll animation + random generation | `{ quantity: 1-6 }` | `{ results: [1-6][], total: number, isAnimating: boolean }` |

---

### Score Module Public Interface

| Route | Method | Purpose | Request | Response |
|-------|--------|---------|---------|----------|
| `score/` | GET (implicit on mount) | Load all games from AsyncStorage | None | `{ games: Game[] }` |
| `score/create` | POST | Create new game with players | `{ playerNames: string[] }` | `{ game: Game }` |
| `score/:gameId/resume` | GET | Load saved game by ID | `gameId: UUID` | `{ game: Game }` |
| `score/:gameId/update-score` | PATCH | Modify player score | `{ gameId, playerId, delta: ±1 }` | `{ updatedGame: Game }` |
| `score/:gameId/delete` | DELETE | Remove game (after confirm) | `{ gameId }` | `{ success: boolean }` |

---

### Raffle Module Public Interface

| Route | Method | Purpose | Request | Response |
|-------|--------|---------|---------|----------|
| (no routing) | Component props | Raffle Screen shown on Raffle tab | None | None (side effects: vibration, animation) |
| (internal) | useTouchDetection() hook | Subscribe to multi-touch events | None | `{ touches: Map<touchId, { x, y, color }> }` |
| (internal) | useWinnerSelection() hook | Select random winner after 3s stability | `{ touches: Map }` | `{ winnerId: string }` |

---

### Shared Component Interface (Examples)

```typescript
// Button.tsx
interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}

// TextInput.tsx
interface TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
  maxLength?: number;
}

// Colors.ts
export const Colors = {
  primary: "#2E7D32",      // Game table green
  text: "#212121",         // Dark gray (WCAG AA)
  surface: "#F5F5F5",      // Light background
  error: "#C62828",        // Red for errors
  touch: [/*10+ colors*/], // For raffle circles
};
```

---

## 8. Open Questions

1. **Score Negative Handling (FA-03.2)**: 
   - Specification provides two options for allowing/disallowing negative scores. Which is preferred for v1?
   - Recommendation: Disallow negatives (prevent accidental taps, match table game behavior) with visual feedback when user tries to go below 0.
   - **Action**: Confirm with product owner before development.

2. **New Finger During Raffle Countdown (FA-05.2)**:
   - When a player adds a finger after the 3-second countdown has started, should the timer restart (allow flexible join) or ignore the new finger (fixed participant set)?
   - Recommendation: Restart timer (more flexible, matches casual game behavior).
   - **Action**: Confirm during implementation.

3. **Manual Score Edit UX (FREQ-P-06)**:
   - Specification says "tap directly on the number to edit"; should this be:
     - Inline numeric input (appears in-place)?
     - Modal dialog?
     - Keyboard entry (number pad)?
   - Recommendation: Modal dialog with numeric keyboard for clarity and error prevention.
   - **Action**: Clarify during design phase.

4. **App Launch Behavior (Not Explicit in Spec)**:
   - Should the app auto-open the most recently accessed game (if any) or always show the tab bar?
   - Recommendation: Show tab bar; let user explicitly choose. If a game is in progress, auto-show it only on second launch.
   - **Action**: Define in UX design document.

5. **Game Deletion Soft Delete vs. Hard Delete (FA-04.2)**:
   - Should deleted games be archived (recoverable) or immediately purged?
   - Recommendation: Immediate purge (no trash bin); requires confirmation dialog to prevent accidents.
   - **Action**: Confirm with product owner.

6. **Dice 3D Visual Implementation (FREQ-D-07)**:
   - Should dice be rendered as 2D flat designs with rotation effect, or 3D models (Three.js)?
   - Recommendation: 2D SVG dice with perspective rotation (simpler, 60 fps guaranteed, smaller bundle).
   - **Action**: Confirm during design phase.

7. **AsyncStorage Backup Strategy (Not in Spec)**:
   - Should games be automatically exported to cloud or local file system for user backup?
   - Recommendation: v1 does not include; v2 backlog item.
   - **Action**: Document as future feature.

8. **Maximum Game History (Not Specified)**:
   - Should there be a limit on number of saved games (e.g., last 50)?
   - Recommendation: No hard limit in v1; users with >100 games are edge cases. Monitor performance.
   - **Action**: Revisit if storage becomes issue.

9. **Accessibility: Screen Reader Support (NFREQ-ACC)**:
   - Specification requires WCAG AA but does not explicitly mention screen reader support. Should we implement?
   - Recommendation: Yes, add React Native accessibility labels and roles; required by app stores.
   - **Action**: Implement as part of development, not separate phase.

10. **Internationalization (Not in Spec, Spanish Mentioned)**:
    - Specification is in Spanish; should app UI be Spanish, English, or both?
    - Recommendation: English for v1 (broader audience); Spanish as v1.1.
    - **Action**: Confirm with product owner.

---

## Summary

**Game Table Companion** is a straightforward offline-first mobile app with three independent feature modules. The architecture prioritizes simplicity (no backend, no authentication) while maintaining performance (60 fps animations, <100 ms touch response) and accessibility (WCAG AA). React Native + Expo provide a single codebase for iOS and Android, with modular organization enabling parallel feature development. AsyncStorage persistence is robust and sufficient for the data scale. The main technical risks are animation frame drops (mitigated by Reanimated 2) and multi-touch detection latency (mitigated by Gesture Handler); both have proven track records in production apps.