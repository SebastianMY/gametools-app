# Game Companion Mobile Application - Architecture Document

## 1. Architecture Overview

**Architecture Style:** Single-page modular monolith client application

The Game Companion app is a feature-complete mobile client with three independent feature modules (Dice, Score, Draw) sharing a common data persistence layer. There is no backend infrastructure, API layer, or server-side logic. All state is local to the device and managed through React's built-in state management combined with AsyncStorage for persistence.

The architecture prioritizes simplicity and offline-first design. Each feature is self-contained with minimal cross-feature dependencies. Navigation between features uses React Navigation's bottom tab or drawer pattern. Data persistence is abstracted into a storage service to isolate AsyncStorage details from UI components.

**Why this fits:** The spec demands 100% offline operation, no authentication, and no multi-device synchronization. A monolithic client architecture eliminates unnecessary complexity and deployment overhead. Feature modularity allows independent testing and future enhancement without architectural friction.

---

## 2. Architecture Decision Records

### ADR-001: Use React Native with Expo for Cross-Platform Development

**Decision:** Implement the application using React Native (TypeScript) and Expo for iOS and Android code sharing.

**Context:** The specification explicitly requires iOS 13.0+ and Android 8.0+ support within a single shared codebase. The technical constraints section recommends React Native with Expo.

**Alternatives Considered:**

- **Flutter:** Offers excellent performance and unified codebase but requires learning Dart and differs from the specified tech stack. Rejected.
- **Native development (Swift + Kotlin):** Maximum performance but requires maintaining two separate codebases, doubling development and maintenance cost. Rejected for v1.0.
- **Web-wrapped app (PWA):** Cannot reliably access device haptics API and multi-touch events on iOS. Rejected.

**Trade-offs:**

- **Accepted:** Dependency on Expo infrastructure for builds and distribution (EAS Build/Submit). If Expo becomes unmaintainable, migration to bare React Native is possible but requires rework.
- **Accepted:** React Native performance ceiling is lower than native code, but the app's animation requirements (60 FPS, simple interactions) are well within React Native's capabilities on 2GB+ devices.
- **Gained:** Single TypeScript codebase, fast iteration cycle, access to a mature ecosystem of libraries.

**Status:** Accepted

---

### ADR-002: Use AsyncStorage for Local Persistence, Not SQLite

**Decision:** Use `AsyncStorage` (Expo's key-value store) for persisting game sessions. Do not use SQLite.

**Context:** The specification requires persisting game sessions (player names, scores) to device storage with automatic save on score modification. The data model is simple: a flat list of game sessions, each containing an array of players with names and scores. No complex relational queries, filtering, or joins are required. The expected volume is modest (50 sessions × ~1KB per session = 50KB storage).

**Alternatives Considered:**

- **SQLite:** Provides more structured storage and queryability but introduces additional dependencies and complexity. For v1.0, the added capability is not justified.
- **Filesystem (raw JSON):** Lower-level control but less reliable for concurrent access and requires manual serialization logic.
- **Redux Persist:** Adds state management overhead; the app's state is simple enough to manage locally.

**Trade-offs:**

- **Accepted:** AsyncStorage lacks built-in query capabilities. Filtering/searching game sessions must happen in-memory in JavaScript.
- **Accepted:** No transactional guarantees; concurrent writes could theoretically corrupt data. Mitigation: serialize all writes through a single storage service and avoid parallel operations.
- **Gained:** Minimal dependencies, fast startup (no database initialization), familiar to React developers.

**Rationale:** If performance or data volume requirements grow significantly in future versions, migration to SQLite is straightforward (same persistence interface, different implementation).

**Status:** Accepted

---

### ADR-003: Use Local State (useState/useContext) for State Management, Not Redux

**Decision:** Manage application state using React's built-in `useState` and `useContext` hooks. Do not introduce Redux or MobX.

**Context:** The application has three independent features with minimal cross-feature state sharing. Global state needed: current game session, list of saved sessions. This can be managed through a context provider without the ceremony of Redux actions, reducers, and middleware.

**Alternatives Considered:**

- **Redux:** Industry standard for large applications but introduces boilerplate (actions, reducers, selectors) disproportionate to the app's state complexity.
- **MobX:** Simpler than Redux but still unnecessary for an app with ~5 pieces of global state.
- **Prop drilling:** Passing state down through components; acceptable but leads to less maintainable code as features grow.

**Trade-offs:**

- **Accepted:** No time-travel debugging or Redux DevTools. Mitigated by simplicity of state logic.
- **Accepted:** Manual optimization needed to prevent unnecessary re-renders (memo, useMemo). For this app's scale, not a concern.
- **Gained:** Minimal boilerplate, faster developer velocity, easier for new team members to understand.

**Status:** Accepted

---

### ADR-004: Use React Native's Built-In Animated API for Animations, Not Reanimated

**Decision:** Implement all animations (dice rolling, circle enlargement, fade effects) using React Native's `Animated` API. Consider migration to Reanimated only if performance testing reveals frame drops below 60 FPS on target devices.

**Context:** The specification requires smooth 60 FPS animations for dice rolling (0.5–1.5s), circle scaling, and fade effects. React Native's Animated API is built into the framework and sufficient for these use cases. Reanimated is a heavier dependency offering worklet-based performance but adds complexity.

**Alternatives Considered:**

- **Reanimated:** More powerful and potentially faster on low-end Android devices but requires additional setup (Babel plugin, native module integration through Expo plugins).
- **CSS-in-JS animation libraries:** Not applicable to React Native.
- **Manual frame-by-frame updates (requestAnimationFrame):** Lower level and error-prone; Animated API is the standard abstraction.

**Trade-offs:**

- **Accepted:** Animated API has slightly higher frame overhead than Reanimated on very old devices. Performance testing will validate whether this is acceptable.
- **Accepted:** If animations perform poorly, migration to Reanimated requires refactoring animation code but can be done without changing the component architecture.
- **Gained:** Zero additional dependencies at startup, familiar API, less configuration.

**Status:** Accepted

---

### ADR-005: Use PanResponder for Multi-Touch Detection, Not react-native-gesture-handler

**Decision:** Use React Native's `PanResponder` API for multi-touch detection in the Draw feature. Do not introduce `react-native-gesture-handler` for v1.0.

**Context:** The Draw feature requires detecting up to 10 simultaneous touch points and assigning colors to each. React Native's PanResponder is a built-in, low-level API sufficient for this use case. Gesture Handler is more powerful but adds complexity and native code dependencies.

**Alternatives Considered:**

- **react-native-gesture-handler:** Industry standard for complex gesture recognition but overkill for simultaneous touch point tracking.
- **Raw touchStart/touchMove/touchEnd events via a custom native module:** Possible but unnecessarily low-level.

**Trade-offs:**

- **Accepted:** PanResponder operates at the responder level, which may conflict with other gesture handlers if the app expands. Mitigation: isolate gesture handling to the Draw screen.
- **Accepted:** PanResponder does not provide built-in gesture semantics (pinch, rotate, etc.); we only need touch point tracking, so this is not a limitation.
- **Gained:** No additional native dependencies, simpler implementation, part of React Native core.

**Status:** Accepted

---

### ADR-006: No Backend API Layer; Offline-First Client-Only Architecture

**Decision:** The application has no backend server, API endpoints, or cloud services. All state is stored locally on the device using AsyncStorage. The app makes zero network requests.

**Context:** The specification explicitly requires 100% offline functionality (NFR-O-001) with no authentication, cloud synchronization, or multi-device coordination. A backend would add operational complexity, hosting costs, and potential points of failure without providing value for v1.0.

**Alternatives Considered:**

- **Optional cloud sync:** Provide a backend for optional backup/sync. Scope creep; not in spec.
- **Hybrid approach (client-first, optional server later):** Complicates initial architecture. Better to start simple and add server support if justified.

**Trade-offs:**

- **Accepted:** No cloud backup; if the device is lost or reset, all game sessions are lost. This is acceptable per assumption A-007.
- **Accepted:** No multi-device synchronization or cross-device session sharing. Acceptable per scope.
- **Gained:** Zero operational overhead, zero latency for all operations, zero network dependencies.

**Status:** Accepted

---

### ADR-007: Modular Feature-Based Component Structure

**Decision:** Organize the codebase into three independent feature modules (Dice, Score, Draw), each with its own folder containing all related components, logic, and types. Shared code (storage, navigation, UI primitives) is centralized in separate folders.

**Context:** The three features (Dice, Score, Draw) are functionally independent. Organizing code by feature (not by layer) allows each feature to evolve independently and makes the app easier to test, document, and hand off to collaborators.

**Alternatives Considered:**

- **Layer-based structure (components/, screens/, logic/, storage/):** Encourages coupling of unrelated features; harder to navigate and test features in isolation.
- **Flat structure:** No organization; becomes unwieldy as the app grows.

**Trade-offs:**

- **Accepted:** Some shared types and utilities must live outside feature folders. Clear naming conventions mitigate confusion.
- **Gained:** Features can be tested, demoed, and documented independently. A new developer can understand one feature without understanding the entire app.

**Status:** Accepted

---

### ADR-008: No Undo/Redo Persistence for Score Changes

**Decision:** Score modification undo/redo history is computed only during the current session and is not persisted to AsyncStorage. When the app is closed and reopened, the undo history is lost.

**Context:** The specification (UC-003-B) mentions undo functionality as a "nice-to-have" alternative flow with "implementation-specific" limits. Persisting the full history of every score change would bloat storage and complicate the data model without clear user value. The use case is casual gaming, not financial ledger reconciliation.

**Alternatives Considered:**

- **Persist full history:** Each score change is logged; history is restored on app reopen. Adds ~10KB per game for a moderately active session.
- **Limit in-memory history:** Keep last N changes in memory during session; discard on exit. Simpler and sufficient for typical use.

**Trade-offs:**

- **Accepted:** Users cannot undo/redo after closing the app. Acceptable for casual gameplay.
- **Gained:** Simpler data model, faster persistence (no history table).

**Status:** Accepted

---

### ADR-009: No Device Orientation Constraint; Responsive UI

**Decision:** The app supports both portrait and landscape orientations on phones and tablets. The UI layout is responsive and adapts to the current orientation and screen size.

**Context:** The specification requires supporting "a variety of screen sizes: phones (5–7 inches) and tablets (7–12 inches)" (NFR-C-003). Modern mobile UX expects apps to adapt to orientation changes without forcing portrait mode.

**Alternatives Considered:**

- **Portrait-only:** Simpler implementation but poor user experience on tablets and limits accessibility.
- **Landscape-only:** Not practical for phones.

**Trade-offs:**

- **Accepted:** Additional testing and QA for multiple layout states. Mitigated by responsive design libraries and thorough device testing.
- **Gained:** Better user experience, meets modern accessibility expectations.

**Status:** Accepted

---

## 3. System Components

### 3.1 Navigation / App Shell

**Responsibility:** Top-level navigation between the three features (Dice, Score, Draw). Provides a consistent root layout with tab or drawer navigation.

**Exposes:**
- Root navigation structure (stack, tab, or drawer navigator)
- Deep linking routes (if applicable in future)

**Consumes:**
- React Navigation library
- Three feature modules (Dice, Score, Draw)

**Key Files:**
- `src/navigation/RootNavigator.tsx` - Main navigator configuration

---

### 3.2 Dice Feature Module

**Responsibility:** Dice rolling interface, animation, calculation, and display. No persistence required.

**Exposes:**
- `DiceScreen` component - The main UI for the Dice feature
- Hooks: `useDiceRoll()` for rolling logic

**Consumes:**
- React Native's `Animated` API
- Expo Haptics (optional vibration feedback on roll)

**Key Files:**
- `src/features/dice/DiceScreen.tsx` - Main screen component
- `src/features/dice/useDiceRoll.ts` - Hook managing roll state and animation
- `src/features/dice/DiceAnimationController.ts` - Isolated animation logic
- `src/features/dice/types.ts` - TypeScript types (RollResult, DiceConfig)

---

### 3.3 Score Tracking Feature Module

**Responsibility:** Game session management, player management, score modification, persistence, and display.

**Exposes:**
- `ScoreScreen` component - Main score tracking UI
- `GameListScreen` component - List of saved games
- Hooks: `useGameSession()`, `useGameList()`

**Consumes:**
- Storage Service (for persistence)
- React Native UI components

**Key Files:**
- `src/features/score/ScoreScreen.tsx` - Active game session display and controls
- `src/features/score/GameListScreen.tsx` - List of saved games
- `src/features/score/useGameSession.ts` - Hook for active session state
- `src/features/score/useGameList.ts` - Hook for fetching saved games
- `src/features/score/types.ts` - GameSession, Player types

---

### 3.4 Draw Feature Module

**Responsibility:** Multi-touch detection, visual representation of touch points, random selection, and animations.

**Exposes:**
- `DrawScreen` component - The multi-touch drawing interface
- Hooks: `useMultiTouchDetection()`, `useDrawSelection()`

**Consumes:**
- React Native's `PanResponder` API
- React Native's `Animated` API
- Expo Haptics

**Key Files:**
- `src/features/draw/DrawScreen.tsx` - Main screen
- `src/features/draw/useMultiTouchDetection.ts` - Gesture handling and state
- `src/features/draw/useDrawSelection.ts` - Logic for selection and animation
- `src/features/draw/TouchCircle.tsx` - Reusable component for individual touch point
- `src/features/draw/types.ts` - TouchPoint, DrawState types

---

### 3.5 Storage Service

**Responsibility:** Abstract local persistence using AsyncStorage. All read/write operations to device storage go through this layer.

**Exposes:**
- `saveGameSession(session: GameSession): Promise<void>`
- `loadGameSession(id: string): Promise<GameSession | null>`
- `listGameSessions(): Promise<GameSession[]>`
- `deleteGameSession(id: string): Promise<void>`

**Consumes:**
- `@react-native-async-storage/async-storage` library

**Key Files:**
- `src/services/storage/storageService.ts` - Main service
- `src/services/storage/types.ts` - Interface definitions

---

### 3.6 Shared UI Components

**Responsibility:** Reusable UI primitives (buttons, input fields, layouts) used across features.

**Components:**
- `PrimaryButton` - Styled action button
- `PlayerScoreCard` - Displays player name and score with +/− controls
- `GameSessionForm` - Modal/dialog for creating a new game session
- `ConfirmationDialog` - Reusable confirm/cancel dialog
- `SafeAreaContainer` - Handles safe area (notches, etc.)

**Key Files:**
- `src/components/buttons/PrimaryButton.tsx`
- `src/components/buttons/SecondaryButton.tsx`
- `src/components/cards/PlayerScoreCard.tsx`
- `src/components/dialogs/GameSessionForm.tsx`
- `src/components/dialogs/ConfirmationDialog.tsx`
- `src/components/layout/SafeAreaContainer.tsx`

---

### 3.7 Styling & Theme

**Responsibility:** Centralized colors, typography, spacing, and design tokens to maintain visual consistency.

**Exposes:**
- `useTheme()` hook for accessing current theme
- Theme object with colors, spacing, fonts, touch target sizes

**Key Files:**
- `src/styles/theme.ts` - Color palette, spacing, typography
- `src/styles/constants.ts` - Magic numbers (TOUCH_TARGET_SIZE = 48, etc.)
- `src/styles/globalStyles.ts` - Global style utilities

---

## 4. Tech Stack

| Layer | Technology | Justification |
|-------|-----------|----------------|
| **Language** | TypeScript | Type safety; catches errors at development time. Strongly recommended for React Native projects. |
| **Framework** | React Native (Expo) | Per specification requirement. Single codebase for iOS and Android. Expo simplifies build/deployment. |
| **State Management** | React's useState + useContext | Simple app state; no need for Redux complexity. Context avoids prop drilling. |
| **Navigation** | React Navigation (v6+) | Industry standard for React Native. Supports bottom tabs, drawers, stacks. |
| **Local Storage** | AsyncStorage | Per specification. Simple key-value persistence sufficient for game sessions. |
| **Animation** | React Native Animated API | Built-in; sufficient for 60 FPS animations required by spec. Reanimated considered only if performance testing proves necessary. |
| **Multi-Touch** | React Native PanResponder | Built-in gesture responder system. No external dependencies needed. |
| **Haptics** | Expo Haptics | Provides vibration/haptic feedback. Built into Expo. Gracefully degrades if unavailable. |
| **Styling** | React Native StyleSheet + custom theme | No external UI library; minimal dependencies. Tailored to game table aesthetic. |
| **Accessibility** | React Native built-ins + manual testing | Use `accessible`, `accessibilityLabel`, `accessibilityRole` props. Test with VoiceOver/TalkBack. |
| **Build / Distribution** | Expo EAS Build + Expo EAS Submit | Managed build infrastructure. Simplifies CI/CD and app store submission. |
| **Testing** | Jest + React Native Testing Library | Standard testing stack for React Native. No special justification needed. |
| **Linting / Formatting** | ESLint + Prettier | Standard tooling. Enforces TypeScript best practices and consistent code style. |

---

## 5. Folder Structure

```
game-companion/
│
├── src/
│   ├── navigation/
│   │   ├── RootNavigator.tsx          # Main navigation setup
│   │   └── types.ts                   # Navigation param types
│   │
│   ├── features/
│   │   ├── dice/
│   │   │   ├── DiceScreen.tsx         # Main screen component
│   │   │   ├── useDiceRoll.ts         # State hook for rolling
│   │   │   ├── DiceAnimationController.ts  # Animation logic
│   │   │   └── types.ts               # RollResult, DiceConfig
│   │   │
│   │   ├── score/
│   │   │   ├── ScoreScreen.tsx        # Active game session
│   │   │   ├── GameListScreen.tsx     # List of saved games
│   │   │   ├── useGameSession.ts      # Active session state
│   │   │   ├── useGameList.ts         # Saved games state
│   │   │   ├── useScoreHistory.ts     # Undo/redo history (in-memory)
│   │   │   └── types.ts               # GameSession, Player
│   │   │
│   │   └── draw/
│   │       ├── DrawScreen.tsx         # Main multi-touch interface
│   │       ├── useMultiTouchDetection.ts  # PanResponder + state
│   │       ├── useDrawSelection.ts    # Winner selection logic
│   │       ├── TouchCircle.tsx        # Individual touch point component
│   │       ├── DrawAnimationController.ts # Animation logic
│   │       └── types.ts               # TouchPoint, DrawState
│   │
│   ├── components/
│   │   ├── buttons/
│   │   │   ├── PrimaryButton.tsx
│   │   │   └── SecondaryButton.tsx
│   │   ├── cards/
│   │   │   └── PlayerScoreCard.tsx    # Score +/− controls
│   │   ├── dialogs/
│   │   │   ├── GameSessionForm.tsx    # Create game modal
│   │   │   ├── ConfirmationDialog.tsx
│   │   │   └── PlayerInputForm.tsx    # Input names on game creation
│   │   ├── layout/
│   │   │   ├── SafeAreaContainer.tsx  # Handles notches, etc.
│   │   │   └── ScreenContainer.tsx    # Common screen wrapper
│   │   └── index.ts                   # Barrel export
│   │
│   ├── services/
│   │   ├── storage/
│   │   │   ├── storageService.ts      # AsyncStorage wrapper
│   │   │   ├── types.ts               # Storage interface
│   │   │   └── serialization.ts       # JSON serialization helpers
│   │   └── index.ts
│   │
│   ├── styles/
│   │   ├── theme.ts                   # Colors, spacing, fonts
│   │   ├── constants.ts               # Magic numbers (TOUCH_TARGET_SIZE, etc.)
│   │   └── globalStyles.ts            # Utility functions
│   │
│   ├── utils/
│   │   ├── randomizer.ts              # Random number generation for dice, selection
│   │   ├── uuidGenerator.ts           # Generate session/player IDs
│   │   ├── validation.ts              # Input validation (player names, etc.)
│   │   └── formatting.ts              # Format dates, scores, etc.
│   │
│   ├── types/
│   │   └── global.ts                  # Global type definitions
│   │
│   ├── hooks/
│   │   ├── useAsync.ts                # Generic async operations
│   │   ├── useDebounce.ts             # Debounce utilities
│   │   └── index.ts
│   │
│   └── App.tsx                        # Root component
│
├── __tests__/
│   ├── features/
│   │   ├── dice/
│   │   ├── score/
│   │   └── draw/
│   ├── services/
│   ├── utils/
│   └── setup.ts                       # Jest configuration
│
├── app.json                           # Expo app config
├── eas.json                           # EAS Build/Submit config
├── babel.config.js                    # Babel configuration
├── tsconfig.json                      # TypeScript configuration
├── .eslintrc.js                       # ESLint rules
├── .prettierrc                        # Prettier formatting
├── package.json
├── package-lock.json (or yarn.lock)
├── .gitignore
└── README.md                          # Project documentation
```

**Folder Rationale:**

- **src/navigation:** Centralized navigation setup. Single source of truth for app routing.
- **src/features/{feature}:** Each feature is self-contained with no cross-feature imports (except from shared components/services).
- **src/components:** Shared, reusable UI components used across multiple features.
- **src/services:** Business logic and integrations (storage, haptics, etc.). Not tied to any feature.
- **src/styles:** Centralized design tokens. Changes to colors, spacing, or fonts happen in one place.
- **src/utils:** Utility functions used across the app (random generation, validation, etc.).
- **__tests__:** Mirror of src structure for unit and integration tests.

---

## 6. High-Level Data Model

### Entities

| Entity | Purpose | Storage | Key Fields |
|--------|---------|---------|-----------|
| **GameSession** | Represents a single game with multiple players | AsyncStorage (JSON) | `id` (UUID), `playerIds` (FK to Player), `createdAt`, `lastModifiedAt`, `status` (active, completed) |
| **Player** | A participant in a game | Embedded in GameSession | `id` (UUID), `name` (string, max 20 chars), `score` (number) |
| **ScoreHistory** (in-memory only) | Undo/redo stack for current session | In-memory array | `timestamp`, `playerId`, `oldScore`, `newScore` |
| **DiceRoll** | Result of a single dice roll | Ephemeral (not persisted) | `quantity`, `results` (array of 1–6 values), `sum`, `timestamp` |
| **TouchPoint** (in Draw feature) | A single finger touching the screen | Ephemeral (not persisted) | `id`, `x`, `y`, `color`, `isWinner`, `startTime` |

### Key Relationships

```
GameSession (1) ──── (many) Player
    ↓
  persisted in AsyncStorage
  key: "gameSession_{id}"

GameSession[] ──── list stored at
  key: "gameSessions"  (array of session IDs or full sessions)
```

### Storage Keys (AsyncStorage)

| Key | Value Type | Purpose |
|-----|-----------|---------|
| `gameSessions` | `JSON array of GameSession objects` | Master list of all saved games |
| `gameSession_{id}` | `JSON object (GameSession)` | Individual session data (optional redundant storage; could be included in master list) |
| `appVersion` | `string` | Track version for migrations |

### No Relational Model Needed

This app does not require a relational database. All data fits comfortably into a flat JSON structure. AsyncStorage is sufficient.

---

## 7. API / Interface Boundaries

### Intra-App Component Interfaces

#### 7.1 Storage Service Interface

```typescript
// src/services/storage/types.ts

interface IGameSessionStorage {
  // Save a game session (creates or updates)
  saveGameSession(session: GameSession): Promise<void>;
  
  // Load a specific game by ID
  loadGameSession(sessionId: string): Promise<GameSession | null>;
  
  // List all saved games
  listGameSessions(): Promise<GameSession[]>;
  
  // Delete a game
  deleteGameSession(sessionId: string): Promise<void>;
  
  // Clear all data (for testing or app reset)
  clearAllSessions(): Promise<void>;
}
```

#### 7.2 Dice Feature Hook Interface

```typescript
// src/features/dice/useDiceRoll.ts

interface DiceRollState {
  quantity: number;
  isRolling: boolean;
  results: number[] | null;
  sum: number | null;
}

interface DiceRollActions {
  setQuantity(newQuantity: number): void;
  roll(): void; // Triggers animation
}

function useDiceRoll(): [DiceRollState, DiceRollActions]
```

#### 7.3 Score Feature Hook Interface

```typescript
// src/features/score/useGameSession.ts

interface GameSessionState {
  currentSession: GameSession | null;
  isLoading: boolean;
  error: string | null;
}

interface GameSessionActions {
  createSession(playerNames: string[]): Promise<void>;
  loadSession(sessionId: string): Promise<void>;
  updateScore(playerId: string, delta: number): Promise<void>;
  resetScores(): Promise<void>;
  undo(): void;
  redo(): void;
}

function useGameSession(): [GameSessionState, GameSessionActions]
```

```typescript
// src/features/score/useGameList.ts

interface GameListState {
  games: GameSession[];
  isLoading: boolean;
  error: string | null;
}

interface GameListActions {
  refreshList(): Promise<void>;
  deleteGame(sessionId: string): Promise<void>;
}

function useGameList(): [GameListState, GameListActions]
```

#### 7.4 Draw Feature Hook Interface

```typescript
// src/features/draw/useMultiTouchDetection.ts

interface TouchPoint {
  id: string;
  x: number;
  y: number;
  color: string;
  isActive: boolean;
}

interface MultiTouchState {
  touches: TouchPoint[];
  timerSeconds: number;
  isLocked: boolean; // True when waiting for 3 seconds
}

interface MultiTouchActions {
  forceSelect(): void;
  reset(): void;
}

function useMultiTouchDetection(): [MultiTouchState, MultiTouchActions]
```

```typescript
// src/features/draw/useDrawSelection.ts

interface DrawSelectionState {
  winnerTouchId: string | null;
  isAnimating: boolean;
}

interface DrawSelectionActions {
  selectWinner(touchId: string): void;
  reset(): void;
}

function useDrawSelection(): [DrawSelectionState, DrawSelectionActions]
```

#### 7.5 Shared Components

```typescript
// PrimaryButton component
interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
}

// PlayerScoreCard component
interface PlayerScoreCardProps {
  player: Player;
  onIncrement: () => void;
  onDecrement: () => void;
  onLongPress?: () => void; // For direct score input
}

// GameSessionForm (modal for creating a game)
interface GameSessionFormProps {
  visible: boolean;
  onCreate: (playerNames: string[]) => void;
  onCancel: () => void;
}
```

### No External HTTP APIs

Per the specification, this application makes **zero HTTP requests**. All communication is local to the device.

---

## 8. Open Questions

The following items could not be decided definitively based on the specification. These should be resolved during the design review or early development phase.

### 8.1 Device Orientation & Screen Layout

**Question:** Should the app force portrait orientation on phones and support both orientations on tablets? Or should it support both orientations on all devices?

**Impact:** Affects layout complexity, test coverage, and UI responsiveness.

**Recommendation from spec:** Not explicitly specified. Assume responsive UI supporting both orientations.

---

### 8.2 Undo/Redo Depth

**Question:** How many undo steps should be supported? Infinite (limited by memory) or a fixed number (e.g., last 10 changes)?

**Spec reference:** UC-003-B mentions undo but says "implementation-specific."

**Impact:** Affects in-memory state size and UX.

**Recommendation:** Start with last 20 score modifications per session. Not persisted; cleared when app closes.

---

### 8.3 Player Name Validation

**Question:** Should player names be required to be non-empty? Can two players have the same name?

**Spec reference:** Input field supports up to 20 characters, but no uniqueness requirement stated.

**Impact:** Affects validation logic and edge cases.

**Recommendation:** Player names are optional (can be blank, defaults to "Player N"). Allow duplicates.

---

### 8.4 Game Session List Ordering

**Question:** Should saved games be ordered by creation date, last modified date, or alphabetically?

**Spec reference:** No explicit ordering requirement.

**Impact:** Affects sorting logic in GameListScreen.

**Recommendation:** Order by `lastModifiedAt` descending (most recent first).

---

### 8.5 Multi-Touch Minimum/Maximum Participants

**Question:** The Draw feature supports up to 10 simultaneous touches. Should there be a UI warning if fewer than 2 people try to play? Or if more than expected touch the screen?

**Spec reference:** UC-005 and FR-T-001 specify up to 10 simultaneous touches but don't mandate a minimum or maximum for gameplay.

**Impact:** Affects UX polish.

**Recommendation:** No hard limit. App selects a winner from whatever touches are present (minimum 1). Display on-screen instructions clearly.

---

### 8.6 Storage Backup Strategy

**Question:** If AsyncStorage becomes corrupted or the device storage is full, how should the app gracefully degrade?

**Spec reference:** NFR-R-002 requires no data loss on forced termination, but doesn't address storage failures.

**Impact:** Affects error handling and resilience.

**Recommendation:** Implement try-catch around all storage operations. If a save fails, display a non-blocking toast notification. On app startup, validate the JSON structure of persisted data.

---

### 8.7 Animation Curve Choices

**Question:** For dice spinning, circle enlargement, and fade animations, which easing curves should be used (easeOut, easeInOut, cubic, linear)?

**Spec reference:** Only specifies animation duration and frame rate; no easing curve specified.

**Impact:** Affects visual polish and feel.

**Recommendation:** Dice roll: `easeOut` (deceleration). Winner circle: `easeInOut` (smooth scaling). Fade: `linear`. Refine based on visual prototyping.

---

### 8.8 Haptic Feedback Configuration

**Question:** Should there be multiple haptic patterns (e.g., different vibration for winning vs. locking touches)? Or just a single vibration on 3-second timer completion in Draw?

**Spec reference:** NFR-P-002 mentions haptic feedback but only specifies timing for the Draw feature (50–200ms on selection).

**Impact:** Affects app feel and user feedback quality.

**Recommendation:** Start with a single standard vibration on Draw selection. Can expand to multiple patterns (short burst for touch lock, longer buzz for winner) if time permits.

---

### 8.9 Offline Sync on App Update

**Question:** If the app is updated (new version), should it attempt to migrate AsyncStorage data format or validate existing sessions?

**Spec reference:** Not addressed.

**Impact:** Affects upgrade path and data compatibility.

**Recommendation:** Store an `appVersion` key in AsyncStorage. On startup, check if stored version matches current version. If different, validate all sessions and perform any needed migrations. For v1.0, no migration needed; future versions can use this pattern.

---

### 8.10 Maximum Game Session Size

**Question:** The spec allows up to 8 players per session. Is there any limit on the total number of saved sessions per device?

**Spec reference:** Assumption A-006 estimates "< 5MB per 50 sessions."

**Impact:** Affects storage optimization and warnings.

**Recommendation:** No hard limit in code. If AsyncStorage quota approaches 5MB, display a warning to the user. Typical device storage (> 64GB) supports thousands of sessions at this data size.

---

## 9. Deployment and Build Considerations

### Build Pipeline

1. **Local development:** `expo start` for development server
2. **Testing:** `npm test` runs Jest test suite
3. **Production build:** Expo EAS Build (`eas build`)
4. **App submission:** Expo EAS Submit (`eas submit`)

### iOS Build

- Minimum deployment target: iOS 13.0
- Requires Apple Developer account and app signing certificate
- EAS handles certificate management and submission to App Store

### Android Build

- Minimum API level: 26 (Android 8.0)
- Requires Google Play Developer account
- EAS handles keystore management and submission to Play Store

### Configuration Files

- **app.json:** Expo app configuration, version, build settings
- **eas.json:** EAS Build/Submit profiles
- **tsconfig.json:** TypeScript strict mode enabled
- **babel.config.js:** Babel presets for Expo

---

## 10. Testing Strategy

### Unit Tests

- **Storage service:** Mocked AsyncStorage, test CRUD operations
- **Utilities:** Random selection logic, validation, formatting
- **Hooks:** useDiceRoll, useGameSession, useMultiTouchDetection (with mocked components)

### Integration Tests

- **Game session lifecycle:** Create → Modify → Save → Close → Reload
- **Score feature:** Create game, update scores, verify persistence
- **Draw feature:** Multi-touch detection, winner selection, animation (mocked)

### E2E Tests (Optional for v1)

- User workflow: Launch → Create game → Roll dice → Modify scores → Resume after close

### Manual Testing (Required)

- **Device testing:** iOS 13+ (phone, tablet) and Android 8.0+ (phone, tablet)
- **Accessibility:** VoiceOver (iOS) and TalkBack (Android) with critical features
- **Orientation changes:** Portrait ↔ Landscape on all screens
- **Performance:** Animation frame rate on low-end devices (2GB RAM)
- **Multi-touch:** Up to 10 simultaneous touch points on supported devices

---

## 11. Monitoring and Logging

### No Analytics or Telemetry

Per the specification, the app sends no telemetry, usage data, or error reports to external services.

### Local Logging

Optional: Use a simple in-memory or console logger during development. Can be disabled in production builds to save performance.

---

## 12. Future Extensibility

The architecture is designed to accommodate future features without major refactoring:

- **Additional game features:** Add new folder under `src/features/`
- **User preferences:** Add a `PreferencesService` mirroring `StorageService` pattern
- **Cloud sync (v2):** Replace `StorageService` implementation with cloud-backed alternative
- **Multiplayer networking:** Create a `SyncService` for Bluetooth/WiFi coordination (independent of current features)
- **Advanced animations:** Migrate from Animated API to Reanimated (module-agnostic if animation code is isolated)

---

## 13. Summary

The Game Companion app is a **simple, feature-complete offline mobile client** with three independent features (Dice, Score, Draw) sharing a lightweight persistence layer. The architecture prioritizes:

- **Simplicity:** No backend, no authentication, no external APIs
- **Modularity:** Features are self-contained; shared code is clearly separated
- **Type safety:** TypeScript throughout
- **User experience:** Responsive UI, accessibility built-in, offline-first
- **Developer experience:** Familiar tools (React, React Native, Expo), easy to test and extend

The tech stack is unopinionated and uses Expo's managed infrastructure to eliminate operational complexity. Persistence is handled via AsyncStorage, sufficient for the app's data model. No decision in this architecture requires a backend service, database cluster, or cloud infrastructure.

---

**Document Version:** 1.0  
**Architecture Status:** Ready for Implementation  
**Last Updated:** March 18, 2026