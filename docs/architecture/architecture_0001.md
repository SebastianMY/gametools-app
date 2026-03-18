# Game Companion Mobile Application — Architecture Document

## 1. Architecture Overview

**Game Companion** is a **client-only mobile application** with no backend infrastructure. The architecture is a **modular monolith** organized around three independent feature modules (Dice, Score, Draw) sharing a common tab-based navigation and a centralized local storage layer.

The application is fundamentally **offline-first**: all data is stored locally on the device using AsyncStorage, and no networking layer exists. Each feature is self-contained and stateless except for the Score Tracker, which requires persistence. The system prioritizes **simplicity and performance** on modest hardware (2GB RAM minimum), using React Native's built-in Animated API for animations rather than heavy external libraries.

## 2. Architecture Decision Records

### ADR-001: Use React Native + Expo as the Application Framework

**Decision:** Build the application using React Native with Expo toolchain (managed service).

**Context:**
- Requirement NFR-C-001 and NFR-C-002 mandate support for both iOS 13+ and Android 8.0+.
- Requirement NFR-C-004 specifies a "single shared codebase for iOS and Android."
- The specification explicitly states "Framework: React Native with Expo" as a technical constraint (Section 7.1).
- No custom native modules are required for v1.0 (all functionality can be achieved with Expo's built-in modules: Haptics, AsyncStorage, PanResponder).

**Alternatives Considered:**
1. **Native development (separate iOS and Android teams):** Would violate the single-codebase requirement and multiply development effort.
2. **Flutter:** Also cross-platform, but the spec explicitly mandates React Native.
3. **Bare React Native (no Expo):** Adds complexity to build pipeline and native code management; Expo's EAS Build simplifies CI/CD and distribution.

**Trade-offs:**
- **Accepted:** Expo's constraints on custom native modules; however, v1.0 has no such requirements, and migration to bare React Native or expo-plugins is possible if future versions require it.
- **Accepted:** Slight performance overhead compared to native code; mitigated by targeting 2GB RAM+ devices and optimizing animations.
- **Benefit:** Single codebase, rapid development, simplified build/deployment via Expo EAS, no need to maintain separate iOS and Android build pipelines.

**Status:** Accepted

---

### ADR-002: Use AsyncStorage for Game Session Persistence

**Decision:** Use React Native's AsyncStorage (or Expo's bundled AsyncStorage) as the sole persistence mechanism for game sessions in v1.0.

**Context:**
- Requirement FR-S-007 demands automatic persistence of game state after every score change.
- Requirement NFR-R-001 mandates persistence after every user action.
- Assumption A-006 estimates < 5MB storage for 50 sessions; AsyncStorage is adequate for this scale.
- Requirement NFR-P-004 requires save operations to complete within 200ms; AsyncStorage achieves this for small datasets.
- The specification explicitly mentions "AsyncStorage or SQLite" with a recommendation for AsyncStorage v1 simplicity.

**Alternatives Considered:**
1. **SQLite:** More robust for structured queries and larger datasets; unnecessary complexity for v1.0 scope. Game sessions are flat JSON objects (player names, scores, timestamp). Introduces additional native dependency overhead in Expo.
2. **Realm:** Powerful local database; overkill for v1.0. Adds significant bundle size and complexity.
3. **WatermelonDB:** Optimized for React Native but designed for large-scale sync scenarios; not applicable to offline-only, single-device scope.

**Trade-offs:**
- **Accepted:** AsyncStorage has known limitations with frequent writes and large datasets. Mitigated by the fact that each game session is small (~1KB), and writes occur at human-interaction speeds (typically 1-2 per second during gameplay).
- **Accepted:** No built-in querying; all sessions stored as flat JSON objects. Acceptable because the app only needs to list sessions and load by ID.
- **Benefit:** Zero additional configuration, part of Expo/React Native base, minimal bundle size overhead, sufficient for projected usage.

**Status:** Accepted

---

### ADR-003: Organize Code as Three Independent Feature Modules with Shared Services

**Decision:** Structure the codebase into discrete feature modules (Dice, Score, Draw), each with its own UI components and logic, sharing only a Navigation component, utility services (Storage, Vibration), and type definitions.

**Context:**
- The specification defines three completely independent features (Dice, Score, Draw) with minimal interaction.
- Requirement NFR-U-004 calls for "straightforward" navigation requiring "minimal cognitive load."
- Each feature has distinct data models (Dice: ephemeral, Score: persistent, Draw: ephemeral).
- Requirement NFR-P-001 and NFR-P-002 demand high animation performance; isolating features by module allows independent optimization.

**Alternatives Considered:**
1. **Monolithic single file:** Would be unmanageable as features grow; violates separation of concerns.
2. **Heavily coupled service architecture:** Premature abstraction; the three features have minimal shared logic.
3. **Feature-based folder structure with extensive shared business logic layer:** Over-engineered for v1.0; most "shared" logic is either specific to one feature (Score persistence) or simple utilities (Vibration).

**Trade-offs:**
- **Accepted:** Minimal code reuse between features; each has its own state management and rendering logic.
- **Benefit:** Ease of understanding and modifying individual features; clear responsibility boundaries; ability to test and optimize features independently.
- **Benefit:** Scalability for future features (e.g., adding a Timer feature requires only creating a new module, not refactoring shared layers).

**Status:** Accepted

---

### ADR-004: Use React Native's Built-in Animated API for All Animations

**Decision:** Implement all animations (dice rolling, circle enlargement, fade effects) using React Native's core `Animated` API rather than external libraries (Reanimated, Framer Motion, etc.).

**Context:**
- Requirement NFR-P-001 mandates 60 FPS animations on devices with 2GB RAM minimum.
- The specification mentions "React Native Animated API or Reanimated library" as options (Section 7.1).
- Dice rolling and Draw selection are the only complex animations; both are straightforward (rotation, scale, opacity).
- Bundle size and dependency count should be minimized for faster app startup and installation.

**Alternatives Considered:**
1. **Reanimated 2:** More powerful and performant for complex gestures and animations. Introduces a native dependency and adds ~500KB to bundle. Unnecessary complexity for v1.0.
2. **Framer Motion:** JavaScript-only, not optimized for React Native; higher performance overhead.
3. **Lottie:** Excellent for pre-designed animations but adds complexity to asset pipeline; unnecessary for simple rotations and fades.

**Trade-offs:**
- **Accepted:** React Native's Animated API is lower-level and requires more explicit code than Reanimated; justified by simplicity and baseline performance.
- **Accepted:** Limited by native thread constraints; however, the animations in scope (rotation, scale, opacity) are well-supported by Animated.
- **Benefit:** No external dependencies beyond React Native; guaranteed platform support; well-documented.

**Status:** Accepted

---

### ADR-005: Implement Multi-Touch Handling Using React Native's PanResponder

**Decision:** Use React Native's PanResponder API (or GestureHandler if PanResponder proves insufficient) for detecting and tracking simultaneous touch points in the Draw feature.

**Context:**
- Requirement FR-T-001 mandates detection of "up to 10 simultaneous touch points."
- Requirement FR-T-002 requires each touch to be "represented by a colored circle on screen."
- Requirement FR-T-004 specifies monitoring "touch stability" over 3 seconds.
- Requirement NFR-P-002 limits touch latency to 100ms.
- React Native's PanResponder is a built-in API; no external dependency required.

**Alternatives Considered:**
1. **react-native-gesture-handler (GestureHandler):** More sophisticated gesture detection. May be necessary if PanResponder proves unreliable for >5 simultaneous touches. Adds a native dependency.
2. **Custom native code:** Provides maximum control but violates the Expo-managed constraint and adds complexity.
3. **Ignoring touch stability and always using immediate mode:** Would violate FR-T-004; removes the intended user experience (3-second wait for fairness).

**Trade-offs:**
- **Accepted:** PanResponder may struggle with >8 simultaneous touches on some devices; however, Requirement A-010 assumes multi-touch is available on all target devices, and typical gaming scenarios involve 2–6 players.
- **Decision:** If testing reveals PanResponder limitations, migration to GestureHandler is straightforward (API is similar).
- **Benefit:** Zero external dependencies; part of React Native core; sufficient for typical use cases.

**Status:** Accepted

---

### ADR-006: Use Expo Haptics Module for Vibration Feedback

**Decision:** Use the Expo Haptics module (specifically `Haptics.notificationAsync`) for triggering vibration feedback in the Draw feature when the 3-second touch stability timer completes.

**Context:**
- Requirement FR-T-005 specifies "haptic feedback (vibration)" after 3 seconds of touch stability.
- Requirement A-009 states "Haptic feedback (vibration) is available on all target devices; graceful degradation occurs if unavailable."
- Expo's Haptics module provides a simple, high-level API for platform-appropriate haptic feedback.
- No configuration or additional setup is required beyond importing and calling the API.

**Alternatives Considered:**
1. **react-native-vibration:** Open-source, lightweight. Slightly lower-level API; minimal benefit over Expo Haptics.
2. **Custom native implementation:** Unnecessary; Expo Haptics abstracts platform differences (CoreHaptics on iOS, Vibrator on Android).
3. **No vibration:** Violates FR-T-005.

**Trade-offs:**
- **Accepted:** Haptic feedback will vary by device capability; Expo Haptics handles graceful fallback on unsupported devices (requirement A-009).
- **Benefit:** Single API call; no configuration; handled by Expo's SDK.

**Status:** Accepted

---

### ADR-007: Store Game Sessions as Serialized JSON in AsyncStorage; No Database Schema

**Decision:** Store each game session as a serialized JSON object with a unique key in AsyncStorage. Game sessions are simple objects with no relational data.

**Context:**
- Requirement FR-S-009 mandates "multiple concurrent saved game sessions."
- Requirement FR-S-011 calls for displaying a list with "identifiable information (player names, timestamp, etc.)."
- Game sessions have no relationships to other entities; each is independent.
- Requirement NFR-R-004 requires independent storage without interference.
- AsyncStorage is a key-value store; no schema definition is necessary.

**Alternatives Considered:**
1. **Normalized relational schema:** Unnecessary; no foreign key relationships exist.
2. **Separate AsyncStorage entries per player:** Would complicate querying and restoration; flat session objects are simpler.
3. **IndexedDB (if targeting web in future):** Not applicable to current mobile scope; AsyncStorage is the standard for React Native.

**Trade-offs:**
- **Accepted:** No built-in querying; to list all sessions, the app must enumerate all keys and parse JSON. This is acceptable given the low volume (< 50 sessions expected per assumption A-006).
- **Accepted:** No schema validation at persistence layer; the app must validate session structure at runtime.
- **Benefit:** Simplicity; trivial to understand and debug; no migration overhead.

**Status:** Accepted

---

### ADR-008: No State Management Library; Use React Hooks + Local Component State

**Decision:** Manage application state using React Hooks (useState, useContext) and local component state rather than Redux, Zustand, or other state management libraries.

**Context:**
- The application is simple: each feature is largely isolated with minimal shared state.
- The only shared state is Navigation (current tab) and, optionally, theme/colors.
- Requirement NFR-U-004 prioritizes simplicity and minimal cognitive load.
- Adding Redux or similar would introduce boilerplate and mental overhead disproportionate to the app's scope.

**Alternatives Considered:**
1. **Redux:** Standard for larger applications; introduces actions, reducers, middleware. Overkill for three simple features.
2. **Zustand:** Lightweight alternative to Redux; still unnecessary for current scope.
3. **Context API:** Adequate for navigation and theme; no external library required.
4. **MobX:** Adds reactivity and observable pattern; unnecessary complexity.

**Trade-offs:**
- **Accepted:** Lack of centralized state may make debugging harder if scope grows significantly. Mitigated by using Context sparingly and keeping feature state local.
- **Benefit:** Minimal dependencies, faster app startup, smaller bundle size, easier onboarding for new developers.
- **Decision:** If future features require complex shared state (e.g., multiplayer, statistics), introducing Redux is a straightforward migration.

**Status:** Accepted

---

### ADR-009: No Backend API Layer; All Functionality is Client-Side

**Decision:** The application has no backend server, API layer, or networking capability. All three features (Dice, Score, Draw) are implemented entirely on the client device.

**Context:**
- Requirement NFR-O-001 mandates "100% offline functionality with no internet connection required."
- Requirement NFR-O-002 explicitly states the app "shall not attempt to establish network connections."
- No functional requirements reference any server-side logic or data synchronization.
- Requirement FR-S-007 specifies persistence to "local device storage," not a remote backend.
- Assumption A-007 notes "no cloud backup or recovery if the device is reset or lost."

**Alternatives Considered:**
1. **Optional cloud sync:** Would violate NFR-O-001 (100% offline) and add network complexity.
2. **Analytics or telemetry backend:** Explicitly out of scope (Section 8.6); would violate offline-first principle.

**Trade-offs:**
- **Accepted:** No cross-device synchronization or cloud backup. Users' game data is lost if the device is reset or data is deleted. This is acceptable per Assumption A-007.
- **Accepted:** No analytics or usage tracking. Development insights must come from user feedback, not telemetry.
- **Benefit:** No infrastructure to maintain, no privacy concerns, 100% offline reliability, no latency from network requests.

**Status:** Accepted

---

### ADR-010: No Custom Theme or Color Customization in v1.0; Static Design System

**Decision:** Implement a fixed, predefined design system (colors, typography, spacing) rather than allowing users to customize themes or colors.

**Context:**
- Requirement NFR-U-002 emphasizes visual metaphors and "game table aesthetic" as part of the out-of-the-box experience.
- Requirement NFR-A-006 mandates "color shall not be the sole indicator of information; text labels and icons shall accompany all colors," which is straightforward to enforce with a fixed palette.
- Requirement Section 10.2 provides a "recommended" color palette for multi-touch circles and interface elements.
- Custom theme support adds complexity to state management, storage, and UI code.
- Customization is explicitly listed as out of scope (Section 8.6: "Theme customization or user-defined color schemes").

**Alternatives Considered:**
1. **Dynamic theming with user preferences:** Violates out-of-scope statement; adds storage and UI complexity.
2. **Theme variants (e.g., light/dark mode):** Could enhance accessibility and reduce eye strain. Deferred to v1.1.

**Trade-offs:**
- **Accepted:** Users cannot personalize the visual appearance. Acceptable per scope constraints.
- **Benefit:** Simpler CSS/styling code, predictable visual consistency, faster development.

**Status:** Accepted

---

## 3. System Components

### Component: Navigation (Tab-Based Router)
**Responsibility:** Manage navigation between the three main feature screens (Dice, Score, Draw). Maintain active tab state and render the appropriate feature component.

**Key Interfaces:**
- **Exposes:** `<Navigation />` component (rendered at app root)
- **Consumes:** Children components (Dice, Score, Draw)
- **State:** currentTab (string: "dice" | "score" | "draw")

**Dependencies:** React, React Native

---

### Component: Dice Feature
**Responsibility:** Render dice quantity selector, animate dice rolls, calculate and display results (individual die values and sum).

**Key Interfaces:**
- **Exposes:** `<DiceScreen />` component; accepts no props.
- **Consumes:** React Native Animated API
- **State:**  diceCount (1–6), isRolling (boolean), diceValues (array of numbers), totalSum (number)
- **Methods:**
  - `selectDiceCount(count: number): void` — Update dice quantity
  - `rollDice(): void` — Trigger animation and generate random values

**Dependencies:** React, React Native (Animated), React Native (no external libraries)

---

### Component: Score Feature
**Responsibility:** Manage game session creation, player score tracking, score modification (+/−), and persistent storage of game state.

**Key Interfaces:**
- **Exposes:** `<ScoreScreen />` component; accepts no props.
- **Consumes:** StorageService (for persistence)
- **State:**  activeSession (GameSession | null), allSessions (GameSession[]), isCreatingGame (boolean)
- **Methods:**
  - `createGameSession(playerNames: string[]): Promise<void>` — Create new session, persist to storage
  - `loadGameSession(sessionId: string): Promise<GameSession>` — Load session from storage
  - `updatePlayerScore(sessionId: string, playerId: string, delta: number): Promise<void>` — Add/subtract points, persist
  - `deleteGameSession(sessionId: string): Promise<void>` — Delete saved game
  - `listAllSessions(): Promise<GameSession[]>` — Retrieve all saved games

**Dependencies:** React, StorageService

---

### Component: Draw Feature
**Responsibility:** Handle multi-touch input, render colored circles for each touch, monitor stability, trigger haptic feedback, and execute random winner selection.

**Key Interfaces:**
- **Exposes:** `<DrawScreen />` component; accepts no props.
- **Consumes:** React Native PanResponder, Expo Haptics, VibrationService
- **State:** activeTouches (Map<touchID, {x, y, color, isWinner}>), stability Timer, selectedWinner (touchID | null)
- **Methods:**
  - `onTouchStart(event): void` — Detect new touch, assign color
  - `onTouchMove(event): void` — Track touch position
  - `onTouchEnd(touchID): void` — Remove touch, reset timer if necessary
  - `checkStability(): void` — Monitor 3-second timer, trigger haptic on completion
  - `selectWinner(): void` — Randomly choose one touch, animate result

**Dependencies:** React, React Native (PanResponder), Expo Haptics

---

### Service: StorageService
**Responsibility:** Abstract all AsyncStorage operations (save, load, delete, list) for game sessions. Provides a clean API for Score feature and future persistence needs.

**Key Interfaces:**
- **Exposes:** `StorageService` (singleton)
  - `saveGameSession(session: GameSession): Promise<void>`
  - `loadGameSession(sessionId: string): Promise<GameSession | null>`
  - `deleteGameSession(sessionId: string): Promise<void>`
  - `listAllGameSessions(): Promise<GameSession[]>`
  - `sessionExists(sessionId: string): Promise<boolean>`
- **Consumes:** React Native AsyncStorage

**Dependencies:** React Native, AsyncStorage

---

### Service: VibrationService
**Responsibility:** Encapsulate platform-specific haptic feedback, providing a simple API for triggering vibrations when needed (e.g., Draw feature timer completion).

**Key Interfaces:**
- **Exposes:** `VibrationService` (singleton)
  - `triggerNotification(): Promise<void>` — Trigger a single haptic pulse
  - `triggerSuccess(): Promise<void>` — Optional: multi-pulse for success feedback
  - `triggerError(): Promise<void>` — Optional: multi-pulse for error feedback
- **Consumes:** Expo Haptics

**Dependencies:** Expo Haptics

---

### Service: RandomService
**Responsibility:** Provide a centralized, testable random number generation function for dice rolls and winner selection in the Draw feature.

**Key Interfaces:**
- **Exposes:** `RandomService` (singleton)
  - `rollDice(count: number, sides: number = 6): number[]` — Generate array of random die values
  - `selectRandomItem<T>(items: T[]): T` — Select one random item from array (used for Draw winner selection)

**Dependencies:** None (uses JavaScript Math.random)

---

## 4. Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Runtime** | Node.js 16+ | JavaScript/TypeScript toolchain for development and build. |
| **Language** | TypeScript | Type safety for a mobile app codebase; prevents runtime errors; improves IDE experience. |
| **Framework** | React Native | Single codebase for iOS and Android; mandated by NFR-C-004; managed by Meta and community. |
| **Build/Deploy** | Expo (EAS) | Simplified CI/CD, app store submission, and managed native builds; no custom native code needed for v1.0. |
| **UI Components** | React Native built-in | No external component library; built-in components (View, Text, Button, ScrollView) are sufficient. Reduces bundle size. |
| **Animations** | React Native Animated API | Built-in, performant for simple animations (rotation, scale, opacity); 60 FPS achievable on target devices. |
| **Touch Handling** | React Native PanResponder | Built-in multi-touch tracking; adequate for 10 simultaneous touches; no external dependency. |
| **Gestures (if needed)** | react-native-gesture-handler | Fallback if PanResponder proves insufficient; provides advanced gesture detection. TBD post-testing. |
| **Local Storage** | AsyncStorage | Bundled with Expo; sufficient for small datasets (~1KB per session); simple key-value interface. |
| **Persistence Logic** | Custom StorageService | Wraps AsyncStorage; provides abstraction for potential future migration to SQLite. |
| **Haptics** | Expo Haptics | Abstracts iOS CoreHaptics and Android Vibrator; single API for cross-platform feedback. |
| **Random Numbers** | Math.random (JavaScript) | Built-in; sufficient for game randomness (not cryptographic). |
| **Styling** | React Native StyleSheet | Built-in; use of constants for colors, spacing, typography. Alternative: Tailwind CSS (TailwindCSS-RN) deferred to v1.1. |
| **Navigation** | React Navigation | Industry-standard for React Native routing; handles tab navigation, stack navigation if needed. |
| **Testing** | Jest + React Native Testing Library | Standard test framework for React Native; built into Expo. |
| **Linting** | ESLint + Prettier | Code quality and formatting; standard JavaScript tooling. |
| **Version Control** | Git | Source code management; platform-agnostic. |

---

## 5. Folder Structure

```
game-companion/
├── .github/
│   └── workflows/
│       └── eas-build.yml                 # CI/CD for Expo EAS Build trigger
├── src/
│   ├── components/
│   │   ├── Navigation/
│   │   │   ├── BottomTabNavigator.tsx   # Main tab navigation component
│   │   │   └── useNavigation.ts          # Custom hook for tab state management
│   │   ├── Dice/
│   │   │   ├── DiceScreen.tsx            # Main Dice feature component
│   │   │   ├── DiceSelector.tsx          # Quantity selector (1-6)
│   │   │   ├── DiceAnimation.tsx         # Animated dice display
│   │   │   ├── useRollDice.ts            # Custom hook: roll logic and state
│   │   │   └── DiceScreen.styles.ts      # Styles for Dice feature
│   │   ├── Score/
│   │   │   ├── ScoreScreen.tsx           # Main Score feature component
│   │   │   ├── GameSessionList.tsx       # List of saved games
│   │   │   ├── GameSessionForm.tsx       # Create new game dialog/form
│   │   │   ├── ScoreBoard.tsx            # Active game display (player names, scores)
│   │   │   ├── PlayerScoreItem.tsx       # Individual player row with +/− buttons
│   │   │   ├── useGameSession.ts         # Custom hook: session creation, loading, saving
│   │   │   └── ScoreScreen.styles.ts     # Styles for Score feature
│   │   └── Draw/
│   │       ├── DrawScreen.tsx            # Main Draw feature component
│   │       ├── TouchCanvas.tsx           # Multi-touch detection and circle rendering
│   │       ├── useTouchHandling.ts       # Custom hook: PanResponder, touch tracking
│   │       ├── useWinnerSelection.ts     # Custom hook: stability timer, selection logic
│   │       └── DrawScreen.styles.ts      # Styles for Draw feature
│   ├── services/
│   │   ├── StorageService.ts             # AsyncStorage wrapper for game sessions
│   │   ├── VibrationService.ts           # Expo Haptics wrapper
│   │   └── RandomService.ts              # Centralized random number generation
│   ├── types/
│   │   └── index.ts                      # Shared TypeScript interfaces (GameSession, Player, etc.)
│   ├── styles/
│   │   ├── theme.ts                      # Color palette, typography, spacing constants
│   │   ├── colors.ts                     # Centralized color definitions
│   │   └── globalStyles.ts               # Shared styles (e.g., standard button, card)
│   ├── utils/
│   │   ├── validation.ts                 # Input validation (player names, etc.)
│   │   └── formatters.ts                 # Utility functions (format timestamps, etc.)
│   ├── App.tsx                           # Root component: Navigation + setup
│   └── index.tsx                         # App entry point
├── assets/
│   └── images/                           # Future: icons, background textures (if not using emoji/icons)
├── .env.example                          # Environment variables (e.g., API_URL if future backend added)
├── .gitignore                            # Git ignore rules
├── .prettierrc                           # Prettier configuration
├── .eslintrc.js                          # ESLint configuration
├── app.json                              # Expo app configuration (name, version, platforms, etc.)
├── package.json                          # Dependencies and scripts
├── tsconfig.json                         # TypeScript configuration
├── babel.config.js                       # Babel configuration (Expo default)
├── eas.json                              # Expo EAS Build configuration (iOS/Android builds)
├── README.md                             # Project overview and setup instructions
└── ARCHITECTURE.md                       # This file

```

**Folder Annotations:**

- **src/components/Navigation:** Manages tab switching between Dice, Score, Draw. Minimal logic; mostly routing.
- **src/components/Dice:** Dice rolling feature. DiceAnimation handles the spinning effect; DiceSelector manages quantity selection. useRollDice isolates the roll logic (random value generation, animation control).
- **src/components/Score:** Score tracking feature. GameSessionList displays saved games; GameSessionForm creates new games; ScoreBoard shows the active game. useGameSession encapsulates storage interaction and session state management.
- **src/components/Draw:** Multi-touch drawing feature. TouchCanvas renders circles and handles visualization; useTouchHandling manages PanResponder and touch tracking; useWinnerSelection manages the 3-second timer and haptic feedback.
- **src/services:** Isolated, testable service classes. Each wraps a native/external API and provides a simple interface.
- **src/types:** Shared TypeScript interfaces (GameSession, Player, etc.) to maintain consistency across components.
- **src/styles:** Centralized design tokens. Ensures consistent colors, spacing, and typography across the app.
- **assets/:** Images, icons, and other static assets (empty in v1.0; placeholder for future visual assets).
- **Root files:** app.json (Expo config), package.json (dependencies), tsconfig.json, babel.config.js, eas.json (build config).

---

## 6. High-Level Data Model

### Primary Entity: GameSession

| Field | Type | Description | Storage |
|-------|------|-------------|---------|
| `sessionId` | UUID (string) | Unique identifier for the session | Derived from `Date.now()` + UUID lib or similar |
| `players` | Player[] | Array of participating players (1–8) | Nested in GameSession |
| `scores` | { [playerId: string]: number } | Current score for each player | Nested in GameSession |
| `createdAt` | ISO 8601 timestamp (string) | Session creation time | Set at creation, immutable |
| `lastModifiedAt` | ISO 8601 timestamp (string) | Last time scores were updated | Updated on every score change |

### Secondary Entity: Player

| Field | Type | Description |
|-------|------|-------------|
| `playerId` | UUID (string) | Unique identifier within the session |
| `name` | string | Display name (1–20 characters) |

**Storage Type:** Local device storage (AsyncStorage). Each GameSession is serialized as JSON and stored with key `game_session_{sessionId}`. All sessions are listed by enumerating keys prefixed with `game_session_`.

**Relationships:** None. Each GameSession is independent; players exist only within the session context.

**Example GameSession object:**
```json
{
  "sessionId": "1710770400000-abc123",
  "players": [
    { "playerId": "p1", "name": "Alice" },
    { "playerId": "p2", "name": "Bob" }
  ],
  "scores": {
    "p1": 25,
    "p2": 30
  },
  "createdAt": "2026-03-18T14:00:00Z",
  "lastModifiedAt": "2026-03-18T14:15:30Z"
}
```

**Note on Dice and Draw:** These features are stateless in terms of persistent data. Dice rolls are ephemeral (not persisted). Draw selections are immediate and not stored. Both features may optionally track history in-memory during a session, but this is not persisted beyond app lifetime.

---

## 7. API / Interface Boundaries

### Dice Feature – Public Interface

**No HTTP API.** The Dice feature is entirely self-contained with no external API. Internal interface:

| Method | Purpose |
|--------|---------|
| `selectDiceCount(count: number): void` | Set the number of dice (1–6) |
| `rollDice(): void` | Initiate animation and generate random values |

**State Output:**
```typescript
{
  diceCount: number;           // 1–6
  isRolling: boolean;          // true during animation
  diceValues: number[];        // [3, 5, 2] (one value per die)
  totalSum: number;            // Sum of all dice values
}
```

---

### Score Feature – Public Interface

| Method | Purpose | Returns |
|--------|---------|---------|
| `createGameSession(playerNames: string[]): Promise<GameSession>` | Create and persist a new game | GameSession object |
| `loadGameSession(sessionId: string): Promise<GameSession>` | Load a saved game from storage | GameSession object |
| `updatePlayerScore(sessionId: string, playerId: string, delta: number): Promise<void>` | Modify a player's score and persist | (no return; state updated) |
| `deleteGameSession(sessionId: string): Promise<void>` | Delete a saved game | (no return) |
| `listAllGameSessions(): Promise<GameSession[]>` | Retrieve all saved games | Array of GameSession objects |

**State Output:**
```typescript
{
  activeSession: GameSession | null;     // Currently loaded game
  allSessions: GameSession[];            // All saved games
  isCreatingGame: boolean;               // UI loading state
  selectedSessionId: string | null;      // ID of active session
}
```

---

### Draw Feature – Public Interface

| Method/Event | Purpose |
|--------------|---------|
| `onTouchStart(event)` | Handle touch contact; assign color and register touch point |
| `onTouchMove(event)` | Update touch position (visual feedback) |
| `onTouchEnd(touchId)` | Remove touch point; reset timer if needed |
| `selectWinner()` | Force immediate selection (or called by timer) |

**State Output:**
```typescript
{
  activeTouches: Map<string, {x: number, y: number, color: string}>;
  isStable: boolean;                    // true if 3 seconds elapsed without release
  selectedWinnerId: string | null;      // ID of the winning touch (if any)
  touchCount: number;                   // Current active touch points
}
```

---

### StorageService – Public Interface

| Method | Purpose | Returns |
|--------|---------|---------|
| `saveGameSession(session: GameSession): Promise<void>` | Persist session to AsyncStorage | (no return; void promise) |
| `loadGameSession(sessionId: string): Promise<GameSession \| null>` | Retrieve session by ID | GameSession or null if not found |
| `deleteGameSession(sessionId: string): Promise<void>` | Remove session from storage | (no return; void promise) |
| `listAllGameSessions(): Promise<GameSession[]>` | Enumerate all saved sessions | Array of GameSession objects |
| `sessionExists(sessionId: string): Promise<boolean>` | Check if session exists | boolean |

---

### VibrationService – Public Interface

| Method | Purpose | Feedback Pattern |
|--------|---------|------------------|
| `triggerNotification(): Promise<void>` | Single haptic pulse | Single, brief vibration (~50ms) |
| `triggerSuccess(): Promise<void>` | Multi-pulse success pattern | Two short pulses (~75ms apart) |
| `triggerError(): Promise<void>` | Multi-pulse error pattern | Three quick pulses (~50ms apart) |

---

## 8. Open Questions

1. **Touch Stability Tolerance:** Requirement FR-T-004 specifies "touch stability for 3 seconds." Should minimal drift (e.g., 2–3mm) be tolerated, or must the touch be completely stationary? This affects UX when players hold fingers steady.
   - **Recommendation:** Allow 5–10mm tolerance; detect stationary touches via a threshold check, not exact position locking.

2. **Undo/Redo for Score Tracking:** Requirement AF-003-B mentions an "Undo Last Change" alternative flow, but is this a v1.0 requirement or nice-to-have? The spec does not mandate it as a functional requirement.
   - **Recommendation:** Defer to v1.1 unless explicitly prioritized. Storage of undo history would add complexity.

3. **Undo History Depth:** If undo is implemented, how many actions should be stored in the undo stack? Recent changes only, or entire session history?
   - **Recommendation:** Not applicable to v1.0; defer.

4. **Multiple Device Support / Cross-Device Sync:** While the spec mandates offline-only for v1.0, should the architecture anticipate a future backend for cloud sync?
   - **Recommendation:** No. The absence of a networking layer is intentional and simplifies the design. Future versions can add an optional sync service without refactoring the core.

5. **Player Name Constraints:** Requirement FR-S-002 specifies "input names for participating players" but does not define character limits or special character handling. Section 4.2 mentions "minimum 48x48dp touch target" and input field supports "up to 20 characters per name." Are these constraints final?
   - **Recommendation:** Enforce 20-character limit and alphanumeric + spaces; reject names with emojis or special characters to avoid rendering issues.

6. **Draw Feature Touch Colors:** The spec provides 8 predefined colors (Section 10.2) but does not specify behavior if >8 touches are detected. Should colors cycle/repeat, or should the app reject additional touches?
   - **Recommendation:** Cycle through the color palette. If 9 touches detected, the 9th reuses the color of the 1st, etc. This prevents visual confusion and simplifies the code.

7. **Multi-touch Testing on Real Devices:** PanResponder may have limitations with >8 simultaneous touches on some devices. What is the fallback if testing reveals unreliable behavior?
   - **Recommendation:** Migrate to react-native-gesture-handler if PanResponder is insufficient. Tested during QA phase.

8. **AsyncStorage Performance at Scale:** Assumption A-006 estimates <50 game sessions per device. If a power user accumulates 200+ sessions, will AsyncStorage performance degrade? At what point is migration to SQLite necessary?
   - **Recommendation:** Monitor performance during testing. Consider adding a cleanup mechanism (e.g., archive sessions older than 30 days) to prevent storage bloat.

9. **Animation Frame Rate on Low-End Devices:** Requirement NFR-P-001 mandates 60 FPS, but what is the fallback for devices that cannot sustain 60 FPS (e.g., older Android phones)? Should the app degrade gracefully or require 60 FPS capability?
   - **Recommendation:** Test on target minimum devices (2GB RAM). If 60 FPS is not achievable, reduce animation complexity (shorter duration, fewer simultaneous animations). Accept graceful degradation to 30 FPS on low-end devices rather than failing.

10. **Haptic Feedback on Devices Without Vibration:** Requirement A-009 states "Haptic feedback (vibration) is available on all target devices; graceful degradation occurs if unavailable." How should the app behave if the device lacks vibration hardware or the user has disabled it?
    - **Recommendation:** Expo Haptics handles this automatically; the triggerNotification() call is a no-op on unsupported devices. No app-level handling required.

11. **Accessibility: Screen Reader Support:** Requirement NFR-A-005 specifies support for VoiceOver (iOS) and TalkBack (Android) for "critical interface elements." Which elements are "critical"? Are all buttons, or only primary actions?
    - **Recommendation:** Annotate all interactive elements (buttons, touch targets) with `accessibilityLabel` and `accessibilityHint`. Prioritize: Roll button, Score +/− buttons, New Game button, Draw area.

12. **Localization / Internationalization:** The spec is in English. Should the app support multiple languages or be English-only for v1.0?
    - **Recommendation:** English-only for v1.0. Defer i18n to v1.1 unless mandated by distribution strategy.

13. **Dark Mode Support:** Should the app support iOS Dark Mode and Android Dark Theme?
    - **Recommendation:** Static light theme for v1.0 (simpler). Add dark mode toggle in v1.1 if desired.

14. **Analytics or Crash Reporting:** Requirement NFR-O-002 forbids network requests. Should the app use a crash reporting tool (Sentry, Firebase Crashlytics) that requires internet?
    - **Recommendation:** No. Use local console logging for debugging. Any crash reporting must be deferred to v1.1 and must respect offline-first constraints (queue reports locally, send only if user opts in and has connectivity).

15. **Dice Values in Roll History:** Should the app retain a history of the last N dice rolls within a single session, or are rolls always ephemeral (cleared when the user leaves the Dice screen)?
    - **Recommendation:** Rolls are ephemeral for v1.0. User closes the Dice feature, re-opens, and history is gone. Simple and matches the spec's statement "No data persistence is required for dice rolls."

---

**End of Architecture Document**