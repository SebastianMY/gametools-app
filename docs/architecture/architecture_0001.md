# Architecture Document: Game Table Companion

## 1. Architecture Overview

**Style:** Modular monolith — single React Native/Expo application with three independent feature modules (Dice, Score, Raffle) sharing a common infrastructure layer for storage, animations, and gesture handling.

**Rationale:** The specification explicitly demands a fully offline, zero-backend mobile app. A monolithic approach is optimal because:
- All computation happens on-device; no service decomposition needed
- Simpler deployment (single iOS/Android app)
- Lower operational overhead
- Easier debugging and analytics (no distributed tracing)
- Shared infrastructure (storage, animation library, gesture handlers) would add complexity if split into micro-apps
- Users expect instant, friction-free experience—monoliths deliver this better than IPC-based architectures

The modular structure (three feature modules) prevents code entanglement and allows parallel development while maintaining tight coupling where necessary (shared services).

---

## 2. Architecture Decision Records

### ADR-01: Use Expo-managed React Native over Bare Workflow

**Decision:** Build with Expo (managed workflow) rather than bare React Native.

**Context:**
- Spec requires iOS 13+ and Android 8+ support
- Spec demands rapid development with zero backend
- Spec specifies React Native + Expo in constraints (§7.1)
- EAS Build is available for cloud builds without Xcode/Android Studio local setup

**Alternatives Considered:**
- **Bare React Native + Xcode/Android Studio:** Full control but requires native build tools locally, longer setup, more platform-specific code. Rejected: unnecessary complexity for offline app.
- **Flutter:** Faster animations out-of-box but requires Dart expertise. Rejected: spec prescribes React Native.
- **Native iOS + Android:** Full performance but requires two codebases, double development time. Rejected: spec demands unified codebase.

**Trade-offs:**
- **Pro:** Rapid iteration, single codebase, built-in libraries (Haptics, filesystem access), EAS Build simplifies CI/CD
- **Con:** Slightly larger app bundle (~50MB), less granular control over native modules (acceptable for this scope)

**Status:** Accepted

---

### ADR-02: AsyncStorage + Shallow SQLite Pattern for Game Persistence

**Decision:** 
- **Primary store:** AsyncStorage (key-value) for game metadata (index of saved games)
- **Secondary store:** SQLite via `expo-sqlite` for individual game detail data (players, scores)
- **Rationale for split:** Metadata queries (list games, sort by date) are fast with AsyncStorage; player score modifications avoid full JSON re-serialization

**Context:**
- Spec requires zero network, 100% local persistence (§6.2)
- Spec requires <50ms save (NFREQ-PER-04)
- Spec requires <200ms load (NFREQ-PER-03)
- Spec allows "AsyncStorage or SQLite" (§7.5) but doesn't mandate one
- Expected 10-100 saved games per device, ~5KB per game average

**Alternatives Considered:**
- **AsyncStorage only:** Simple, but JSON parsing on every list load is slow as games accumulate. Rejected for performance.
- **SQLite only:** Overkill for data volume and schema simplicity; adds native dependency complexity. Partially acceptable but harder to debug.
- **Realm:** Better performance than SQLite but proprietary, larger app size, less community support for Expo. Rejected.
- **Plain file I/O:** Low-level, error-prone recovery, no transactions. Rejected.

**Trade-offs:**
- **Pro:** AsyncStorage handles index queries fast; SQLite handles individual game mutations efficiently; clear separation of concerns
- **Con:** Two storage systems to maintain; slight added complexity; must handle sync between layers

**Status:** Accepted

---

### ADR-03: React Native Reanimated 2 for All Animations

**Decision:** Use `react-native-reanimated` (v2+) for dice rolls, raffle circle animations, and all transitions.

**Context:**
- Spec requires 60 fps animations consistently (NFREQ-PER-01)
- Spec requires smooth dice roll animation 0.8-1.2s (FREQ-D-02)
- Spec requires smooth raffle winner animation 0.5s (FREQ-S-10)
- Native Animated API runs on JS thread, risk of frame drops under load
- Reanimated 2 runs animations on native thread (iOS/Android)

**Alternatives Considered:**
- **React Native Animated API:** Built-in, lower bundle size, sufficient for simple fades/scales. Rejected: insufficient for guaranteed 60fps under potential concurrent load.
- **Lottie:** Best for pre-designed complex animations but overkill for procedural dice/circles; adds ~500KB. Rejected.
- **MatterJS or Babylon.js:** Physics engines for 3D dice, overkill for visual effect (spec says "visual" 3D, not physics-based). Rejected.

**Trade-offs:**
- **Pro:** Native-thread execution guarantees 60fps, even with JS main thread busy; small bundle overhead (~200KB)
- **Con:** Requires learning Worklets API; slight learning curve for team

**Status:** Accepted

---

### ADR-04: React Native Gesture Handler for Multi-touch Raffle Input

**Decision:** Use `react-native-gesture-handler` for multi-touch detection in Raffle module.

**Context:**
- Spec requires detection of 2-10 simultaneous touches (FREQ-S-01)
- Spec requires <50ms latency on touch (NFREQ-PER-02)
- PanResponder (built-in) has limitations: harder to track simultaneous fingers uniquely, event coalescing can lose touches
- Gesture Handler provides direct native event access, better multi-touch tracking

**Alternatives Considered:**
- **PanResponder:** Built-in, zero deps, adequate for 2-3 fingers; beyond that, tracking breaks. Rejected for 10-finger requirement.
- **Manual native bridge:** Maximum control but adds native code, hard to maintain. Rejected.

**Trade-offs:**
- **Pro:** Designed for multi-touch, native layer access, battle-tested in production apps
- **Con:** External dependency, ~300KB, slight learning curve

**Status:** Accepted

---

### ADR-05: Single Modular App, No Backend or Cloud Sync

**Decision:** Build single Expo app with no backend services, no cloud sync, no authentication.

**Context:**
- Spec explicitly states: "without requiring registration, login or connection to server backend" (§1)
- Spec states "Zero dependence of internet" (§7.6)
- v1 scope excludes cloud sync, accounts, analytics (§8.1)
- Users are casual board game players, not enterprise; no need for multi-device sync

**Alternatives Considered:**
- **Firebase Realtime DB for sync:** Enables cloud save, multi-device restore. Rejected: adds dependency, complexity, violates offline-first requirement.
- **GraphQL API + local cache:** Overengineered for MVP; no server to query. Rejected.
- **P2P Bluetooth sync:** Out of scope (§8.1). Rejected.

**Trade-offs:**
- **Pro:** Zero server costs, zero infrastructure, zero privacy/security exposure, instant development
- **Con:** Users cannot restore games across devices; partitions data by device

**Status:** Accepted

---

### ADR-06: TypeScript for Type Safety and Developer Experience

**Decision:** Build entire app in TypeScript, not plain JavaScript.

**Context:**
- Spec involves complex data mutations (scores, player lists)
- Multiple modules must coordinate on shared types (Game, Player entities)
- Expo has excellent TypeScript support
- No runtime overhead (compiled away)

**Alternatives Considered:**
- **Plain JavaScript:** Faster initial dev, lower barrier. Rejected: refactoring risk as app grows; harder to catch bugs in score mutations.
- **Flow (Facebook):** Alternative typing system; less ecosystem support than TS. Rejected.

**Trade-offs:**
- **Pro:** Catches type errors at compile time; better IDE autocomplete; self-documenting APIs
- **Con:** Slightly longer setup (tsconfig), marginally slower initial build

**Status:** Accepted

---

### ADR-07: Decentralized Game State Management (No Redux/MobX)

**Decision:** Use React Context API + custom hooks for game state, no global state manager.

**Context:**
- Spec has limited state complexity: Game list, Current game, Dice roll state, Raffle participants
- No real-time multiplayer sync needed
- Each module (Dice, Score, Raffle) can manage its own state independently
- Context API sufficient for prop-drilling distance in single monolith

**Alternatives Considered:**
- **Redux:** Overkill for offline app with shallow state tree; adds boilerplate. Rejected for simplicity.
- **MobX:** Reactive state good for complex graphs; unnecessary here. Rejected.
- **Zustand:** Lightweight alternative, viable; but Context API is built-in. Rejected for minimal deps.
- **Jotai/Recoil:** Atom-based, good for granular updates; over-engineered for MVP. Rejected.

**Trade-offs:**
- **Pro:** Minimal dependencies, React built-ins only, easy to refactor later if needed
- **Con:** Potential prop-drilling in deep trees (mitigated by local state at screen level)

**Status:** Accepted

---

### ADR-08: No Sound/Audio in v1 (Silence by Default)

**Decision:** Implement visual + haptic feedback for all interactions; do not implement audio.

**Context:**
- Spec does not mention sound/audio in requirements
- Spec lists sound/music as "Out of Scope (v1.1+)" (§8.1)
- Haptic feedback (vibration) is specified for raffle (FREQ-S-08)
- Audio adds complexity: permission handling, battery drain, accessibility considerations
- Board games are often played in social settings; silent/vibration feedback is less disruptive

**Alternatives Considered:**
- **Add audio:** Satisfying dice roll sounds, winner announcement. Rejected: out of scope, extra work.
- **Audio + haptics:** Full sensory feedback. Rejected: audio is future work.

**Trade-offs:**
- **Pro:** Simpler implementation, respects social context (no noise in libraries/trains), battery-friendly
- **Con:** Less immersive than AAA game feel; acceptable for utility app

**Status:** Accepted

---

### ADR-09: Light Theme Only, No Dark Mode Toggle (v1)

**Decision:** Single visual theme inspired by game table aesthetic (green felt, golden accents), no dark mode toggle in v1.

**Context:**
- Spec states theme should be "inspired in mesa de juego real" (game table) (§6.6)
- Dark mode toggle adds UX complexity (persistent preference, testing burden)
- Spec excludes "Dark mode / Light mode toggle" from v1 scope (§8.1)
- Game table context = bright, well-lit physical environment; light theme is contextually appropriate

**Alternatives Considered:**
- **Dark mode option:** Better for night play. Rejected: out of scope v1.
- **Auto dark mode per OS preference:** Less work than toggle but still adds variability. Rejected: single theme is MVP intent.
- **Themed CSS-in-JS system:** Future-proof if dark mode comes in v1.1; not needed now. Rejected.

**Trade-offs:**
- **Pro:** Single theme reduces QA, simpler codebase, matches real board game context
- **Con:** Poor for low-light play (acceptable; users can adjust device brightness)

**Status:** Accepted

---

### ADR-10: Deterministic RNG (Math.random), Not Cryptographic

**Decision:** Use JavaScript's `Math.random()` for dice rolls and raffle draws. Do not use cryptographic RNG.

**Context:**
- Spec states: "no guarantee of aleatoriedad criptográfica required" (§9.2)
- Use case is recreational (board games), not gambling/betting
- Cryptographic RNG adds no user value, increases bundle size
- `Math.random()` is adequate distribution for fair games

**Alternatives Considered:**
- **crypto.getRandomValues():** Cryptographically strong, unnecessary overhead. Rejected for scope.
- **Seedable RNG (xorshift):** Useful for testing, could enable game replays. Rejected: out of scope.

**Trade-offs:**
- **Pro:** Zero dependencies, minimal CPU, sufficient randomness for casual gaming
- **Con:** Technically weak RNG (not suitable for cryptographic use); irrelevant here

**Status:** Accepted

---

## 3. System Components

### Component: NavigationStack
**Responsibility:** Set up bottom-tab navigation between Dice, Score, and Raffle screens. Manage active tab state.

**Key Interfaces:**
- **Exports:** `<RootNavigator />` component
- **Consumes:** React Navigation native stack, bottom tabs

**Dependencies:** 
- `@react-navigation/native`
- `@react-navigation/bottom-tabs`
- Screen modules (DiceScreen, ScoreScreen, RaffleScreen)

---

### Component: DiceModule
**Responsibility:** Provide dice rolling UI, animation, and RNG logic. Stateless (no persistence).

**Key Interfaces:**
- **Exports:**
  - `<DiceScreen />` — main UI
  - `useDiceRoll(quantity: 1-6) => { diceValues: number[], total: number, isAnimating: boolean }`
  - `rollDice(count): { values, total }` — pure RNG function
- **Consumes:** Reanimated 2 (animations), React hooks

**Dependencies:**
- `react-native-reanimated`
- `DiceComponent` (presentational)
- `DiceRollService`

---

### Component: ScoreModule
**Responsibility:** Manage games, players, score tracking. Persist games to storage. Provide game CRUD operations.

**Key Interfaces:**
- **Exports:**
  - `<ScoreScreen />` — main UI
  - `useGameList() => { games: Game[], isLoading: boolean }`
  - `useActiveGame(gameId) => { game: Game, updateScore, deleteGame }`
  - `createGame(players: Player[]) => Promise<Game>`
  - `resumeGame(gameId) => Promise<Game>`
  - `updateScore(gameId, playerId, delta: number) => Promise<void>`
- **Consumes:** Storage service, React Context

**Dependencies:**
- `StorageService`
- `GameValidator`
- Game/Player TypeScript types

---

### Component: RaffleModule
**Responsibility:** Detect multi-touch input, track participant circles, randomize winner selection, animate result.

**Key Interfaces:**
- **Exports:**
  - `<RaffleScreen />` — main UI
  - `useRaffleInput() => { participants: Participant[], isStable: boolean, secondsRemaining: number }`
  - `startRaffle() => Promise<{ winnerId: number }>`
  - `participantColor(id) => string` — unique color per participant
- **Consumes:** Gesture Handler (multi-touch), Reanimated 2 (animations), Expo Haptics

**Dependencies:**
- `react-native-gesture-handler`
- `react-native-reanimated`
- `expo`
- `RaffleGestureService`
- `RaffleAnimationService`

---

### Component: StorageService
**Responsibility:** Abstract layer for persistence. Handles both AsyncStorage (index) and SQLite (detail data). Serialization/deserialization of Game entities.

**Key Interfaces:**
- **Exports:**
  - `saveGame(game: Game) => Promise<void>`
  - `loadGame(gameId: string) => Promise<Game>`
  - `listGames(sortBy: 'lastAccessed' | 'created') => Promise<Game[]>`
  - `deleteGame(gameId: string) => Promise<void>`
  - `gameExists(gameId: string) => Promise<boolean>`
- **Consumes:** AsyncStorage, expo-sqlite

**Dependencies:**
- `@react-native-async-storage/async-storage`
- `expo-sqlite`
- Game/Player types

---

### Component: AnimationService
**Responsibility:** Centralized animation logic. Provides reusable Reanimated 2 animation builders.

**Key Interfaces:**
- **Exports:**
  - `spinAnimation(duration: number) => Animated.StyleProps`
  - `scaleAnimation(fromScale, toScale, duration) => Animated.StyleProps`
  - `fadeAnimation(fromOpacity, toOpacity, duration) => Animated.StyleProps`
  - `sequenceAnimation(animArray, callback) => void`
- **Consumes:** Reanimated 2 core API

**Dependencies:**
- `react-native-reanimated`

---

### Component: GestureService
**Responsibility:** Multi-touch event handling for raffle. Tracks individual finger positions and IDs. Emits lifecycle events (added, moved, removed).

**Key Interfaces:**
- **Exports:**
  - `usePanGesture() => PanGestureHandlerEventPayload[]`
  - `getActiveTouches() => Touch[]` (id, position, color)
  - `onTouchAdded(callback) => unsubscribe`
  - `onTouchRemoved(callback) => unsubscribe`
- **Consumes:** React Native Gesture Handler

**Dependencies:**
- `react-native-gesture-handler`
- `expo` (for native thread access)

---

### Component: ThemeProvider
**Responsibility:** Centralize design tokens: colors, typography, spacing. Ensure WCAG AA compliance.

**Key Interfaces:**
- **Exports:**
  - `useTheme() => { colors, typography, spacing }`
  - `colors.primary`, `colors.dice`, `colors.player1-8`, etc.
  - `typography.button`, `typography.largeScore`, etc.
  - `spacing.xs`, `spacing.s`, `spacing.m`, etc.
- **Consumes:** React Context

**Dependencies:**
- React Context API

---

## 4. Tech Stack

| Layer | Technology | Justification |
|-------|-----------|----------------|
| **Runtime** | Node.js 16+, npm 8+ | Standard; Expo CLI requires it |
| **Framework** | React Native 0.70+ | Cross-platform iOS/Android single codebase |
| **Build System** | Expo + EAS Build | Spec-mandated; cloud builds without Xcode/Android Studio |
| **Language** | TypeScript 4.9+ | Type safety; self-documenting APIs for multi-module coordination |
| **Navigation** | React Navigation 6+ | Standard for RN; bottom-tab + native stack pattern |
| **Animations** | React Native Reanimated 2 | Native-thread execution; guaranteed 60fps |
| **Gestures** | React Native Gesture Handler 2+ | Multi-touch detection; native event access |
| **Storage** | AsyncStorage + expo-sqlite | Hybrid: key-value for index, relational for games |
| **Haptics** | Expo Haptics | Built-in Expo API; cross-platform vibration |
| **Icons** | Expo Vector Icons (Feather) | Scalable, consistent, no image assets |
| **Styling** | React Native StyleSheet + CSS-in-JS | Platform-native; `styled-components` optional for future |
| **Testing** | Jest + React Native Testing Library | Unit/component tests; E2E via Detox (optional) |
| **Linting** | ESLint + Prettier | Code quality, consistent formatting |
| **CI/CD** | GitHub Actions + EAS Build | Automated builds on push; iOS/Android distribution |
| **Package Manager** | npm (or Yarn 3) | Standard; Expo supports both |

---

## 5. Folder Structure

```
game-table-companion/
├── src/
│   ├── App.tsx                      # Root component, theme provider, error boundary
│   ├── navigation/
│   │   └── RootNavigator.tsx        # Bottom-tab navigator setup
│   ├── screens/                     # Screen-level components
│   │   ├── DiceScreen.tsx
│   │   ├── ScoreScreen.tsx
│   │   └── RaffleScreen.tsx
│   ├── modules/                     # Feature modules (domain-driven design)
│   │   ├── dice/
│   │   │   ├── components/
│   │   │   │   ├── DiceDisplay.tsx
│   │   │   │   ├── DiceRoll.tsx
│   │   │   │   └── QuantitySelector.tsx
│   │   │   ├── services/
│   │   │   │   └── diceRoll.ts       # RNG logic, animation helpers
│   │   │   ├── hooks/
│   │   │   │   └── useDiceRoll.ts
│   │   │   ├── types.ts              # DiceState, AnimationConfig
│   │   │   └── index.ts              # Module exports
│   │   ├── score/
│   │   │   ├── components/
│   │   │   │   ├── GameCreator.tsx
│   │   │   │   ├── GameList.tsx
│   │   │   │   ├── PlayerScoreRow.tsx
│   │   │   │   └── ScoreDisplay.tsx
│   │   │   ├── services/
│   │   │   │   ├── gameManager.ts     # CRUD, validation
│   │   │   │   └── scoreCalculator.ts
│   │   │   ├── hooks/
│   │   │   │   ├── useGameList.ts
│   │   │   │   └── useActiveGame.ts
│   │   │   ├── types.ts              # Game, Player, GameState
│   │   │   └── index.ts
│   │   └── raffle/
│   │       ├── components/
│   │       │   ├── RaffleArena.tsx
│   │       │   ├── ParticipantCircle.tsx
│   │       │   └── StabilityCounter.tsx
│   │       ├── services/
│   │       │   ├── gestureHandler.ts  # Multi-touch tracking
│   │       │   ├── raffleLogic.ts     # Winner selection, stability timer
│   │       │   └── animations.ts      # Reanimated 2 sequences
│   │       ├── hooks/
│   │       │   ├── useRaffleInput.ts
│   │       │   └── useRaffleAnimation.ts
│   │       ├── types.ts              # Participant, RaffleState
│   │       └── index.ts
│   ├── services/                    # Cross-cutting infrastructure
│   │   ├── storage/
│   │   │   ├── StorageService.ts     # Storage abstraction (AsyncStorage + SQLite)
│   │   │   ├── migrations.ts         # Schema versions (for future)
│   │   │   └── index.ts
│   │   ├── animation/
│   │   │   └── AnimationService.ts   # Reanimated 2 helpers
│   │   └── haptics/
│   │       └── HapticsService.ts     # Expo Haptics wrapper
│   ├── theme/                       # Design tokens
│   │   ├── colors.ts                # WCAG AA compliant palettes
│   │   ├── typography.ts            # Font sizes, weights (dynamic type support)
│   │   ├── spacing.ts               # Margin/padding scale
│   │   ├── theme.ts                 # Aggregated theme object
│   │   └── useTheme.ts              # Custom hook for theme access
│   ├── hooks/                       # Shared custom hooks
│   │   ├── useStorage.ts            # Wrapper around StorageService
│   │   ├── useAsyncEffect.ts        # Async effect handling with cleanup
│   │   └── useDebounce.ts           # Debounce utility
│   ├── types/                       # Shared TypeScript types
│   │   ├── domain.ts                # Game, Player, Participant
│   │   ├── animations.ts            # Animation types
│   │   └── errors.ts                # Custom error classes
│   ├── utils/                       # Utility functions
│   │   ├── random.ts                # RNG helpers
│   │   ├── validation.ts            # Input validation
│   │   ├── date.ts                  # Date formatting
│   │   └── constants.ts             # App-wide constants
│   └── errors/                      # Error boundaries, error UI
│       ├── AppErrorBoundary.tsx
│       └── ErrorHandler.ts
├── __tests__/                       # Test files (mirror src structure)
│   ├── modules/
│   │   ├── dice/
│   │   │   └── diceRoll.test.ts
│   │   ├── score/
│   │   │   ├── gameManager.test.ts
│   │   │   └── useGameList.test.ts
│   │   └── raffle/
│   │       └── raffleLogic.test.ts
│   └── services/
│       └── storage/
│           └── StorageService.test.ts
├── assets/                          # Static assets
│   ├── images/                      # PNG/SVG images (game table BG, etc.)
│   ├── fonts/                       # Custom fonts (if any)
│   └── sounds/                      # Placeholder (audio excluded v1)
├── app.json                         # Expo config (iOS/Android settings, icons, splash)
├── package.json
├── tsconfig.json
├── jest.config.js                   # Jest test config
├── .eslintrc.json
├── .prettierrc
├── .gitignore
├── README.md
└── docs/                            # Additional documentation
    ├── ARCHITECTURE.md              # This file
    ├── SETUP.md                     # Dev environment setup
    └── TESTING.md                   # Testing guide
```

---

## 6. High-Level Data Model

### Primary Entities

| Entity | Attributes | Storage | Relationships |
|--------|-----------|---------|---------------|
| **Game** | `id` (UUID), `name` (auto-generated from date), `createdAt` (timestamp), `lastAccessedAt` (timestamp), `playerList` (array), `isActive` (boolean) | SQLite + AsyncStorage index | owns → Player[] |
| **Player** | `id` (UUID), `name` (string, 1-30 chars), `score` (integer, ≥0), `order` (int, for display rank) | SQLite (nested in Game) | belongsTo → Game |
| **DiceRoll** | `values` (array[6]), `total` (integer) | **Not persisted** (stateless) | N/A |
| **RaffleResult** | `winnerId` (integer), `allParticipantIds` (array) | **Not persisted** (stateless) | N/A |

### Storage Layout

**AsyncStorage (metadata index):**
```
Key: "games:list"
Value: [
  { id: "uuid-1", name: "Game 15/3", createdAt: 1710518400000, lastAccessedAt: 1710525600000 },
  { id: "uuid-2", name: "Game 18/3", createdAt: 1710604800000, lastAccessedAt: 1710604800000 }
]

Key: "game:active"
Value: "uuid-1"  // Currently active game (if any)
```

**SQLite (game details):**
```
Table: games
  Columns: id (TEXT PRIMARY KEY), name, createdAt, lastAccessedAt, isActive

Table: players
  Columns: id, gameId (FOREIGN KEY), name, score, playerOrder
```

### No Persistence Needed
- Dice roll results
- Raffle draw results
- Temporary UI state (modal visibility, focused field, etc.)

---

## 7. API / Interface Boundaries

### DiceModule API

```
POST /dice/roll
  Body: { quantity: 1-6 }
  Response: { values: [1-6], total: number, animationDuration: 1000 }
  Side Effects: Triggers Reanimated animation on client
```

### ScoreModule API

```
POST /score/game
  Body: { playerNames: string[] }
  Response: { gameId: string, game: Game }
  Storage: Saves to SQLite + updates AsyncStorage index

GET /score/games
  Query: { sortBy: 'lastAccessed' | 'created' }
  Response: { games: Game[] }
  Storage: Reads from AsyncStorage index (fast)

GET /score/game/:gameId
  Response: { game: Game }
  Storage: Loads from SQLite by gameId

PATCH /score/game/:gameId/player/:playerId
  Body: { scoreDelta: number }
  Response: { newScore: number }
  Storage: Updates SQLite, persists within 50ms

DELETE /score/game/:gameId
  Response: { success: boolean }
  Storage: Deletes from SQLite + removes from AsyncStorage index
```

### RaffleModule API

```
POST /raffle/start
  Body: { participantCount: 2-10 }
  Response: { sessionId: string }
  Side Effects: Begins multi-touch gesture listening, Reanimated animation setup

GET /raffle/session/:sessionId
  Response: { participants: Participant[], isStable: boolean, secondsRemaining: number }
  Polling: Called by UI on Reanimated frame updates

POST /raffle/session/:sessionId/finalize
  Response: { winnerId: number, animation: "scaleUp" }
  Side Effects: Triggers haptic feedback, winner animation
```

### StorageService API (Internal)

```typescript
interface StorageService {
  saveGame(game: Game): Promise<void>
  loadGame(gameId: string): Promise<Game>
  listGames(sortBy: 'lastAccessed' | 'created'): Promise<Game[]>
  deleteGame(gameId: string): Promise<void>
  gameExists(gameId: string): Promise<boolean>
  updateScore(gameId: string, playerId: string, newScore: number): Promise<void>
}
```

### Theme API (Internal)

```typescript
interface Theme {
  colors: {
    primary: string
    background: string
    surface: string
    text: string
    textSecondary: string
    dice: string
    player1: string
    player2: string
    // ... player3-8
    error: string
  }
  typography: {
    button: { fontSize, fontWeight }
    largeScore: { fontSize, fontWeight }
    playerName: { fontSize, fontWeight }
    // ...
  }
  spacing: {
    xs: number
    s: number
    m: number
    l: number
    xl: number
  }
}
```

---

## 8. Open Questions

1. **Score editing UX (FA-03.4):** Spec mentions two alternatives for negative scores. Should puntaje go negative, or should button be disabled at 0? This affects validation logic. **Recommendation:** Do not allow negatives; disable button at 0 with subtle visual feedback.

2. **Game naming strategy:** Spec doesn't specify how auto-generated game names are formatted. Should they be "Game 18/3" (date), "Session 1" (counter), or descriptive ("Basketball Tourney")? **Recommendation:** Use timestamp-based name "Game 18/3 14:30" for automatic generation.

3. **Player color assignment in Raffle:** Spec doesn't define the palette of 8+ unique colors per participant. Should colors be assigned from a predefined set, or randomly generated? **Recommendation:** Use predefined Material Design palette (8 colors: red, pink, purple, blue, cyan, green, yellow, orange) rotated per participant.

4. **Raffle stability reset behavior (FA-05.2):** Should adding a new finger after starting the 3-second timer reset the timer, or be ignored? Spec offers both options. **Recommendation:** Ignore new fingers (FA-05.2 Option B) to prevent gaming the system by delayed adds.

5. **Game deletion recovery:** Are deleted games recoverable, or permanently lost? Should there be a trash/archive bin? **Recommendation:** Permanent deletion on tap+confirm; no trash bin (MVP scope).

6. **Tablet layout:** Spec mentions responsive design for 7"-12"+ tablets. Should Dice/Score/Raffle be side-by-side on landscape, or remain bottom-tab stacked? **Recommendation:** Remain bottom-tab stacked for v1 (consistency); landscape just enlarges components proportionally.

7. **Offline analytics/crash reporting:** Spec excludes analytics but doesn't forbid local error logging. Should the app log crashes to a local file for manual review? **Recommendation:** Skip for v1; add in v1.1 if users report issues.

8. **Game state when app is backgrounded:** If user switches apps mid-raffle, does raffle state persist or reset? **Recommendation:** Reset (stateless); Dice and Score will auto-restore from storage.

9. **Accessibility: VoiceOver/TalkBack support:** Spec requires WCAG AA but doesn't specify screen reader testing. Should buttons have semantic labels for VoiceOver? **Recommendation:** Yes, all interactive elements must have `accessibilityLabel` (iOS) / `contentDescription` (Android).

10. **SQLite schema versioning:** What happens if app receives an update with schema changes? Should migration code be prepared? **Recommendation:** v1 schema is final; no migrations needed; future versions will handle this in migrations.ts.

---

## Document Metadata

| Property | Value |
|----------|-------|
| **Title** | Game Table Companion — Architecture Document |
| **Version** | 1.0 |
| **Date** | 2026-03-18 |
| **Status** | APPROVED FOR DEVELOPMENT |
| **Author** | Architecture Team |
| **Reviewers** | Product, Lead Dev |

---

**END OF ARCHITECTURE DOCUMENT**