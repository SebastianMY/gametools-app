# Game Companion Mobile Application — Architecture Document (FINAL APPROVED)

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

### ADR-011: Touch Stability Tolerance — Allow 5–10mm Position Drift

**Decision:** Allow 5–10mm position drift while detecting touch stability; use a threshold-based check on touch position history rather than requiring exact pixel-perfect stillness.

**Context:**
- Requirement FR-T-004 specifies "touch stability for 3 seconds" but does not define tolerance for natural hand tremor or micro-movement.
- Expecting exact position locking creates poor UX; players struggle to keep fingers completely stationary.
- A 5–10mm tolerance matches typical gaming input standards and is imperceptible to human touch while remaining tight enough to prevent accidental jitter.

**Alternatives Considered:**
1. **Exact position locking (zero drift):** Frustrating UX; typical human hand tremor exceeds 2–3mm.
2. **No stability check, immediate random selection:** Would violate FR-T-004; removes intended fairness mechanism.
3. **Large tolerance (>15mm):** Risks detecting unintended hand movements as stable.

**Trade-offs:**
- **Accepted:** Small amount of hand motion is tolerated, which could theoretically be perceived as "cheating"; however, the app selects a random touch after stability, not based on position, so this does not affect fairness.
- **Implementation:** Requires tracking position history and computing standard deviation or distance-from-mean to detect stability; adds ~20 lines of code.
- **Benefit:** Natural, comfortable UX for players holding fingers steady.

**Status:** Accepted

---

### ADR-012: Undo/Redo Not Implemented in v1.0; Deferred to v1.1

**Decision:** Do not implement undo/redo functionality in v1.0. Deferred to v1.1 or later if user feedback justifies the added complexity.

**Context:**
- Requirement AF-003-B lists "Undo Last Change" as an alternative flow, but the spec does not mandate undo as a primary functional requirement.
- Section 8.6 (Out of Scope) does not explicitly exclude undo, but emphasis on simplicity and minimal cognitive load (NFR-U-004) suggests post-hoc data recovery is not essential for the MVP.
- Storing undo history requires additional storage, increased complexity in Score service, and UI state management.
- The app already provides session deletion, which allows users to abandon a game and start over.

**Alternatives Considered:**
1. **Implement undo with stack of recent changes:** More robust for user error recovery; adds state management complexity.
2. **Single-level undo (last action only):** Simpler; still requires change history tracking.

**Trade-offs:**
- **Accepted:** Users cannot undo an accidental score change; they must delete the session and start fresh if a mistake is made.
- **Benefit:** Simpler Score feature code, no undo state to manage, faster v1.0 release.
- **Path Forward:** Undo can be added to v1.1 with an in-session stack of recent score modifications, storing the last 20 changes.

**Status:** Accepted

---

### ADR-013: Undo History Depth (Deferred, Not Applicable to v1.0)

**Decision:** Not applicable to v1.0. If undo is implemented in v1.1, the history depth shall be limited to the current session only, storing the last 20 score changes in a LIFO stack. History is cleared when the session is closed.

**Context:**
- Depends on ADR-012; if undo is deferred, this decision is also deferred.
- If future undo implementation occurs, depth constraints prevent unbounded memory growth on 2GB RAM devices.
- Storing only the current session's history (not persisted post-session) keeps the feature lightweight.

**Alternatives Considered:**
1. **Unlimited history:** Risk of memory overflow on long sessions.
2. **Per-session persistent history:** Adds storage complexity; unclear if users want historical undo across sessions.
3. **Global redo capability:** Exceeds scope; deferred to future versions.

**Trade-offs:**
- N/A for v1.0.

**Status:** Accepted (Deferred)

---

### ADR-014: No Cross-Device Synchronization; Single-Device, Offline-Only

**Decision:** The application remains single-device and offline-only. No cross-device synchronization, cloud backup, or backend API is implemented in v1.0 or future versions unless explicitly mandated by a new specification.

**Context:**
- Requirement NFR-O-001 and NFR-O-002 are absolute: "100% offline functionality" and "shall not attempt to establish network connections."
- ADR-009 confirms no backend API.
- Assumption A-007 explicitly accepts "no cloud backup or recovery if the device is reset or lost."
- Adding a backend for cloud sync would violate non-negotiable offline-first constraints and introduce operational complexity.

**Alternatives Considered:**
1. **Optional cloud sync:** Would violate NFR-O-001 and add infrastructure burden.
2. **Peer-to-peer sync via Bluetooth:** Interesting but out of scope; adds complexity and dependency on BLE capabilities.
3. **Cross-device file export/import:** Possible future feature; deferred to v1.1 and would be manual (not automatic sync).

**Trade-offs:**
- **Accepted:** Users cannot access game sessions across devices; data is trapped on a single device.
- **Accepted:** No automatic backup; users must manually export sessions to preserve data.
- **Benefit:** Simplicity, no infrastructure cost, absolute offline reliability, strong privacy (data never leaves device).

**Status:** Accepted

---

### ADR-015: Player Name Constraints — 1–20 Characters, Alphanumeric + Spaces/Hyphens

**Decision:** Enforce a strict 1–20 character limit for player names. Allow only alphanumeric characters (a-z, A-Z, 0-9), spaces, and hyphens. Reject names with emojis, special characters (#, @, &, etc.), or Unicode scripts beyond Latin.

**Context:**
- Section 4.2 specifies "up to 20 characters per name."
- Strict character whitelisting prevents rendering issues (emoji width variability, unsupported Unicode scripts), simplifies storage, and reduces security risks (injection).
- Spaces and hyphens are common in names (e.g., "Alice-Bob", "John Smith") and are safe.
- The 1-character minimum enforces non-empty names.

**Alternatives Considered:**
1. **Allow all Unicode:** Supports international names (e.g., Chinese, Arabic) but risks rendering inconsistencies and storage complexity; deferred to v1.1 i18n.
2. **Allow special characters (#, @, $):** Simplifies validation; risks injection attacks or unexpected rendering behavior.
3. **No length limit:** Allows very long names that break UI layout; requires dynamic text sizing.

**Trade-offs:**
- **Accepted:** Players with non-Latin names (Chinese, Arabic, Cyrillic, etc.) cannot use their native scripts in v1.0. Localization limitation; mitigated in v1.1.
- **Accepted:** Hyphens and spaces reduce the maximum effective length (e.g., "Mary-Jane Watson" = 16 characters).
- **Benefit:** Predictable rendering, simple validation, reduced security surface.

**Status:** Accepted

---

### ADR-016: Draw Feature Touch Color Cycling Beyond 8 Touches

**Decision:** Cycle through the 8-color palette when more than 8 simultaneous touches are detected. The 9th touch reuses the color of the 1st touch, the 10th reuses the 2nd, etc. (color = palette[touchIndex % 8]).

**Context:**
- Requirement FR-T-001 mandates support for "up to 10 simultaneous touch points."
- The spec provides 8 predefined colors (Section 10.2) but does not address >8 touches.
- Cycling through the palette is the simplest implementation (single modulo operation).

**Alternatives Considered:**
1. **Reject touches >8:** Violates 10-player support requirement (FR-T-001).
2. **Generate new colors dynamically:** Risks palette incoherence and visual confusion.
3. **Reuse colors randomly:** Unpredictable; harder to debug.

**Trade-offs:**
- **Accepted:** Color uniqueness is lost beyond 8 touches; two different touch points may share the same color. This makes visual distinction harder in crowded 9–10 player games.
- **Benefit:** Simple implementation, supports full 10-touch requirement, predictable behavior.
- **Note:** The random winner selection is independent of color and position, so color sharing does not affect fairness.

**Status:** Accepted

---

### ADR-017: Multi-Touch Handler Primary/Fallback Selection Strategy

**Decision:** Use React Native's PanResponder as the primary multi-touch handler for v1.0. If testing reveals unreliable behavior with >6 simultaneous touches on target devices, migrate to `react-native-gesture-handler` during the QA phase.

**Context:**
- Requirement FR-T-001 mandates support for up to 10 touches; typical gaming scenarios involve 2–6 players.
- PanResponder is built-in (no external dependency), aligning with ADR-005's preference for simplicity.
- GestureHandler is a proven alternative with proven multi-touch reliability; API is similar enough for straightforward migration.

**Alternatives Considered:**
1. **Preemptively adopt GestureHandler:** Adds external dependency and native code complexity; unnecessary without evidence of PanResponder failure.
2. **Ignore multi-touch testing:** Risk of discovering critical failures late in development.

**Trade-offs:**
- **Accepted:** Defers the handler decision, adding testing risk. If PanResponder fails, touch handling code must be rewritten mid-development.
- **Benefit:** Simpler v1.0 with fewer dependencies; straightforward migration path if needed.
- **Timeline:** Multi-touch testing should be prioritized early (Week 2–3 of development) to allow time for migration if necessary.

**Status:** Accepted

---

### ADR-018: AsyncStorage Cleanup Mechanism — 60-Day Auto-Delete

**Decision:** Implement automatic cleanup on app startup: delete game sessions older than 60 days. Additionally, monitor AsyncStorage enumeration time during testing; if listing >100 sessions takes >500ms, implement session archiving or migrate to SQLite post-v1.0.

**Context:**
- Assumption A-006 estimates <50 sessions per device, but power users could accumulate 200+ sessions in 1–2 years.
- AsyncStorage enumeration is O(n) with no built-in indexing; large session counts can slow app startup.
- The 60-day cutoff balances retaining relevant recent games while preventing storage bloat.
- Migration to SQLite is straightforward if needed (see ADR-002).

**Alternatives Considered:**
1. **Unlimited session storage:** Risk of performance degradation; no cleanup overhead.
2. **User-controlled retention period:** More flexible; adds settings UI complexity.
3. **Immediate SQLite migration:** Premature optimization; AsyncStorage is adequate for 50–100 sessions.

**Trade-offs:**
- **Accepted:** Users' old game sessions are automatically deleted without warning, removing historical records. Acceptable for simplicity; users can manually export important sessions in v1.1.
- **Implementation:** ~30 lines of code in StorageService startup logic; minimal performance impact.
- **Future Enhancement:** A settings option in v1.1 could allow customizing the retention period (30–90 days).

**Status:** Accepted

---

### ADR-019: Animation Frame Rate Degradation — Target 60 FPS, Accept 30 FPS Fallback

**Decision:** Target 60 FPS animations on all devices as per NFR-P-001. If testing reveals 60 FPS is unachievable on minimum-spec devices (2GB RAM, Android 8.0), reduce animation complexity: shorten duration from 1s to 500ms, reduce particle count, and accept graceful degradation to 30 FPS rather than removing the feature.

**Context:**
- Requirement NFR-P-001 mandates "60 FPS animations on devices with 2GB RAM minimum."
- Older Android devices with 2GB RAM and system bloat may not sustain 60 FPS.
- React Native's Animated API is optimized for 60 FPS but depends on platform performance.
- Testing on actual target devices (not emulators) will reveal baseline performance.

**Alternatives Considered:**
1. **Strict 60 FPS requirement, disable animations on slower devices:** Harms UX; removes visual appeal for budget-conscious users.
2. **Optimize to unnecessary extremes:** Premature optimization; test first, optimize only if needed.

**Trade-offs:**
- **Accepted:** Animations may appear less smooth on low-end devices; dice rolls may feel "snappier" (500ms vs 1s) rather than dramatic.
- **Benefit:** Animations remain present and functional on all devices; 30 FPS is still smooth enough for human perception.
- **Testing Strategy:** Prioritize real device testing in Week 4–5 of development; establish performance baseline early.

**Status:** Accepted

---

### ADR-020: Haptic Feedback Graceful Degradation — Rely on Expo Haptics Fallback

**Decision:** Rely on Expo Haptics' built-in fallback behavior; the `triggerNotification()` call is silently no-op on devices without vibration hardware or if the user has disabled vibration in OS settings. No app-level error handling or fallback UI is required.

**Context:**
- Requirement A-009 explicitly states "Haptic feedback (vibration) is available on all target devices; graceful degradation occurs if unavailable."
- Expo's Haptics module abstracts platform differences (iOS CoreHaptics, Android Vibrator) and handles fallback automatically.
- iOS devices with Haptic Engine and modern Android devices support vibration; older devices or accessibility settings will silently skip feedback.

**Alternatives Considered:**
1. **Custom fallback (e.g., flash screen on no vibration):** Over-engineered; Expo's built-in handling is sufficient.
2. **Emit errors on unsupported devices:** Violates A-009's graceful degradation expectation.

**Trade-offs:**
- **Accepted:** Users on unsupported devices receive no haptic feedback for the 3-second stability completion event.
- **Mitigation:** Provide visual feedback (e.g., "Ready!" text change or animation) in parallel with haptics, ensuring the event is perceivable without vibration.
- **Benefit:** No additional code required; Expo handles platform differences.

**Status:** Accepted

---

### ADR-021: Accessibility — Screen Reader Annotations for Critical Elements

**Decision:** Annotate all interactive elements with `accessibilityLabel` and `accessibilityHint` properties. Prioritize annotations in this order: (1) Roll Dice button, (2) Score +/− buttons, (3) New Game button, (4) Delete Session button, (5) Draw Canvas touch area. Secondary UI elements (headers, status text) are labeled but may be lower priority for extensive testing.

**Context:**
- Requirement NFR-A-005 specifies support for VoiceOver (iOS) and TalkBack (Android) on "critical interface elements."
- Critical elements are those directly affecting game logic and user actions.
- Labels must be concise and action-oriented (e.g., "Roll dice button, activates dice roll animation").

**Alternatives Considered:**
1. **No accessibility annotations:** Violates NFR-A-005.
2. **Comprehensive annotations for all UI elements:** Higher priority; appropriate for v1.0 to ensure inclusivity.

**Trade-offs:**
- **Accepted:** Secondary UI elements may have inconsistent screen reader behavior if not tested extensively.
- **Enhancement:** Comprehensive accessibility testing and refinement for all elements can occur in v1.1.
- **Benefit:** Ensures critical gameplay is accessible to visually impaired users.

**Status:** Accepted

---

### ADR-022: English-Only Localization for v1.0; i18n Deferred to v1.1

**Decision:** Implement all UI strings in English only for v1.0. Internationalization (i18n) support is deferred to v1.1 or later.

**Context:**
- The specification is in English; primary audience is English-speaking users.
- Implementing i18n requires tooling (i18next, react-i18next), translation management, and testing for each supported language.
- Adds complexity and bundle size without addressing MVP scope.

**Alternatives Considered:**
1. **Implement i18n in v1.0:** Provides immediate multilingual support; adds development overhead.
2. **Plan i18n architecture for future:** Risk of architectural changes if i18n is bolted on later; mitigated by using simple string constants (not hardcoded strings) from the start.

**Trade-offs:**
- **Accepted:** Non-English speakers cannot use the app in their preferred language.
- **Future:** If the app is released in markets with non-English speakers, i18n becomes urgent and should be prioritized in v1.1.
- **Implementation Tip:** Structure strings as constants in `src/strings/en.ts` (not hardcoded inline) to simplify future i18n migration.

**Status:** Accepted

---

### ADR-023: Static Light Theme Only; Dark Mode Deferred to v1.1

**Decision:** Implement a fixed light color palette for v1.0 with no dark mode variant. Dark mode support is deferred to v1.1.

**Context:**
- Implementing dark mode requires defining a second color palette, detecting system theme preference, managing theme state, and testing on iOS and Android.
- Doubles visual design work; complicates the styling layer.
- Light theme is suitable for table-top gaming scenarios (typically well-lit environments or focused screen time).
- ADR-010 already commits to a static design system; dark mode is orthogonal to v1.0 scope.

**Alternatives Considered:**
1. **Implement dark mode in v1.0:** Improves accessibility (reduced eye strain for low-light use); adds development overhead.
2. **Detect system dark mode preference and apply auto-theme:** Useful but deferred; UI design for both themes requires upfront work.

**Trade-offs:**
- **Accepted:** Users who prefer dark mode for accessibility (e.g., astigmatism, low-light use) cannot enable it in v1.0.
- **Mitigation:** Ensure sufficient color contrast in light palette (per NFR-A-006 WCAG AA standards) to support low-vision users.
- **Path Forward:** If accessibility feedback indicates dark mode is essential, prioritize in v1.0.1 patch or v1.1.

**Status:** Accepted

---

### ADR-024: No Analytics or Crash Reporting; Offline-First Constraint

**Decision:** Do not integrate analytics, crash reporting, or telemetry tools that require internet connectivity in v1.0. Use only local console logging (`console.log`, `console.error`) for debugging during development. Sentry, Firebase Crashlytics, Amplitude, or similar services are explicitly out of scope.

**Context:**
- Requirement NFR-O-002 is absolute: "the app shall not attempt to establish network connections."
- Any analytics or crash reporting service inherently requires network access to send data to a remote server, violating this constraint.
- Offline-first design is a core feature (Assumption A-007); no exceptions.
- Crash reporting can be deferred to v1.1 if a backend is added, but only if it respects offline-first constraints.

**Alternatives Considered:**
1. **Local crash logging (no network):** Possible but requires users to manually retrieve logs; limited utility.
2. **Optional telemetry with explicit user consent:** Could work if framed as opt-in and respects offline constraint (queue data, send only with permission and connectivity); deferred to v1.1.

**Trade-offs:**
- **Accepted:** The development team has no visibility into production crashes or user behavior; debugging relies on user error reports and local testing.
- **Accepted:** No usage analytics to inform feature prioritization or user research.
- **Benefit:** Simplicity, no privacy concerns, 100% offline reliability.
- **Path Forward:** Post-launch, consider local crash logging to file (queued for manual upload) or opt-in telemetry for v1.1.

**Status:** Accepted

---

### ADR-025: Dice Roll History Ephemeral; Not Persisted in v1.0

**Decision:** Dice rolls are ephemeral in v1.0. Each time the Dice feature is exited or the app is restarted, all roll history is cleared. No roll history is persisted to AsyncStorage or any other storage.

**Context:**
- The specification explicitly states "No data persistence is required for dice rolls" (implied by ADR-002's scope: only game sessions in Score feature are persisted).
- Keeping in-memory roll history during a Dice session adds marginal UX value but complicates state management.
- The Dice feature's purpose is to generate random values on-demand; users needing roll tracking can use the Score feature.

**Alternatives Considered:**
1. **In-memory history during session:** Keep last 10 rolls in component state; cleared on exit. Simple; adds state complexity.
2. **Persist roll history to AsyncStorage:** Allows users to review past rolls; adds storage overhead and complicates ScoreService.
3. **Export rolls as CSV:** Advanced feature; deferred to v1.1.

**Trade-offs:**
- **Accepted:** Users cannot review past rolls or verify fairness after a session; each roll is independent.
- **Benefit:** Simpler state management, no storage overhead, faster feature implementation.
- **Path Forward:** If players request roll history in v1.1, implement in-session history (last 10 rolls in component state, not persisted).

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
**Responsibility:** Abstract all AsyncStorage operations (save, load, delete, list) for game sessions. Provides a clean API for Score feature and future persistence needs. Implements 60-day cleanup on startup (per ADR-018).

**Key Interfaces:**
- **Exposes:** `StorageService` (singleton)
  - `saveGameSession(session: GameSession): Promise<void>`
  - `loadGameSession(sessionId: string): Promise<GameSession | null>`
  - `deleteGameSession(sessionId: string): Promise<void>`
  - `listAllGameSessions(): Promise<GameSession[]>`
  - `sessionExists(sessionId: string): Promise<boolean>`
  - `cleanupOldSessions(retentionDays: number = 60): Promise<number>` — Auto-delete sessions older than N days; return count deleted
- **Consumes:** React Native AsyncStorage

**Dependencies:** React Native, AsyncStorage

---

### Service: VibrationService
**Responsibility:** Encapsulate platform-specific haptic feedback, providing a simple API for triggering vibrations when needed (e.g., Draw feature timer completion). Graceful degradation on unsupported devices (per ADR-020).

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
| **Animations** | React Native Animated API | Built-in, performant for simple animations (rotation, scale, opacity); 60 FPS achievable on target devices (per ADR-019). |
| **Touch Handling** | React Native PanResponder | Built-in multi-touch tracking; adequate for 10 simultaneous touches (per ADR-017); no external dependency. |
| **Gestures (if needed)** | react-native-gesture-handler | Fallback if PanResponder proves insufficient; provides advanced gesture detection. TBD post-testing (per ADR-017). |
| **Local Storage** | AsyncStorage | Bundled with Expo; sufficient for small datasets (~1KB per session); simple key-value interface. |
| **Persistence Logic** | Custom StorageService | Wraps AsyncStorage; provides abstraction for potential future migration to SQLite. Implements 60-day cleanup (per ADR-018). |
| **Haptics** | Expo Haptics | Abstracts iOS CoreHaptics and Android Vibrator; single API for cross-platform feedback; graceful degradation (per ADR-020). |
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
│   │   ├── StorageService.ts             # AsyncStorage wrapper for game sessions; includes 60-day cleanup (ADR-018)
│   │   ├── VibrationService.ts           # Expo Haptics wrapper; graceful degradation (ADR-020)
│   │   └── RandomService.ts              # Centralized random number generation
│   ├── types/
│   │   └── index.ts                      # Shared TypeScript interfaces (GameSession, Player, etc.)
│   ├── styles/
│   │   ├── theme.ts                      # Color palette, typography, spacing constants
│   │   ├── colors.ts                     # Centralized color definitions
│   │   └── globalStyles.ts               # Shared styles (e.g., standard button, card)
│   ├── utils/
│   │   ├── validation.ts                 # Input validation (player names per ADR-015, etc.)
│   │   └── formatters.ts                 # Utility functions (format timestamps, etc.)
│   ├── strings/
│   │   └── en.ts                         # English-only UI strings; prepared for future i18n (ADR-022)
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
- **src/components/Draw:** Multi-touch drawing feature. TouchCanvas renders circles and handles visualization; useTouchHandling manages PanResponder and touch tracking with stability tolerance (ADR-011); useWinnerSelection manages the 3-second timer and haptic feedback.
- **src/services:** Isolated, testable service classes. Each wraps a native/external API and provides a simple interface. StorageService implements 60-day cleanup (ADR-018). VibrationService handles graceful degradation (ADR-020).
- **src/types:** Shared TypeScript interfaces (GameSession, Player, etc.) to maintain consistency across components.
- **src/styles:** Centralized design tokens. Ensures consistent colors (light theme per ADR-023), spacing, and typography across the app. All strings centralized for future i18n (ADR-022).
- **src/strings:** Centralized English-only UI strings; prepared for future i18n migration (ADR-022).
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
| `name` | string | Display name (1–20 characters, alphanumeric + spaces/hyphens per ADR-015) |

**Storage Type:** Local device storage (AsyncStorage). Each GameSession is serialized as JSON and stored with key `game_session_{sessionId}`. All sessions are listed by enumerating keys prefixed with `game_session_`. Old sessions (>60 days) are auto-deleted on app startup (per ADR-018).

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

**Note on Dice and Draw:** These features are stateless in terms of persistent data. Dice rolls are ephemeral (not persisted per ADR-025). Draw selections are immediate and not stored. Both features may optionally track history in-memory during a session, but this is not persisted beyond app lifetime.

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

**Note:** Dice rolls are ephemeral; no history is retained post-session (per ADR-025).

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

**Note:** Undo/redo is not implemented in v1.0 (per ADR-012); users must delete and recreate a session if a mistake is made.

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

**Notes:**
- Touch positions are tracked with 5–10mm drift tolerance (per ADR-011).
- Colors cycle through 8-color palette; 9th+ touches reuse earlier colors (per ADR-016).
- Haptic feedback is provided on stability completion with graceful degradation (per ADR-020).

---

### StorageService – Public Interface

| Method | Purpose | Returns |
|--------|---------|---------|
| `saveGameSession(session: GameSession): Promise<void>` | Persist session to AsyncStorage | (no return; void promise) |
| `loadGameSession(sessionId: string): Promise<GameSession \| null>` | Retrieve session by ID | GameSession or null if not found |
| `deleteGameSession(sessionId: string): Promise<void>` | Remove session from storage | (no return; void promise) |
| `listAllGameSessions(): Promise<GameSession[]>` | Enumerate all saved sessions | Array of GameSession objects |
| `sessionExists(sessionId: string): Promise<boolean>` | Check if session exists | boolean |
| `cleanupOldSessions(retentionDays?: number): Promise<number>` | Auto-delete sessions older than N days (default 60) | Count of deleted sessions |

**Note:** Cleanup is called on app startup; users are not warned before deletion (per ADR-018).

---

### VibrationService – Public Interface

| Method | Purpose | Feedback Pattern |
|--------|---------|------------------|
| `triggerNotification(): Promise<void>` | Single haptic pulse | Single, brief vibration (~50ms) |
| `triggerSuccess(): Promise<void>` | Multi-pulse success pattern | Two short pulses (~75ms apart) |
| `triggerError(): Promise<void>` | Multi-pulse error pattern | Three quick pulses (~50ms apart) |

**Note:** All calls are no-op on unsupported devices (per ADR-020); no error handling required.

---

## 8. Open Questions

None — all questions resolved.

All 15 open questions from the initial architecture document have been addressed in Architecture Decision Records ADR-011 through ADR-025:

- **ADR-011:** Touch Stability Tolerance (5–10mm drift)
- **ADR-012:** Undo/Redo (not in v1.0)
- **ADR-013:** Undo History Depth (deferred with plan for v1.1)
- **ADR-014:** Cross-Device Sync (none)
- **ADR-015:** Player Name Constraints (1–20 chars, alphanumeric + spaces/hyphens)
- **ADR-016:** Touch Color Cycling (cycle through 8-color palette)
- **ADR-017:** Multi-Touch Handler (PanResponder primary, GestureHandler fallback)
- **ADR-018:** AsyncStorage Cleanup (60-day auto-delete)
- **ADR-019:** Animation Frame Rate (target 60 FPS, accept 30 FPS graceful degradation)
- **ADR-020:** Haptic Fallback (rely on Expo Haptics no-op)
- **ADR-021:** Accessibility (screen reader annotations for critical elements)
- **ADR-022:** Localization (English-only in v1.0; i18n deferred)
- **ADR-023:** Dark Mode (static light theme; deferred)
- **ADR-024:** Analytics (none; offline-first constraint)
- **ADR-025:** Dice Roll History (ephemeral; not persisted)

---

**End of Architecture Document — FINAL APPROVED**