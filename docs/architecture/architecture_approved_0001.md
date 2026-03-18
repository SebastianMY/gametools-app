# Game Companion Mobile Application — Architecture Document (Final Approved)

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

### ADR-011: Touch Stability Tolerance Threshold (Requirement FR-T-004)

**Decision:** Allow 5–10mm position drift when detecting touch stability; use a threshold-based check rather than requiring exact pixel-perfect stillness.

**Context:**
- Requirement FR-T-004 specifies "touch stability for 3 seconds" but does not define tolerance for natural hand tremor or micro-movement.
- Expecting exact stillness creates poor UX; players struggle to maintain perfectly stationary fingers for 3 seconds.
- A 5–10mm tolerance matches typical gaming input standards and is imperceptible to the human eye while remaining tight enough to prevent accidental jitter.
- The Draw feature's purpose is fair random winner selection; minor hand motion does not affect fairness.

**Alternatives Considered:**
1. **Exact position locking (zero tolerance):** Frustrating for users; unachievable in practice due to natural hand tremor.
2. **Large tolerance (>20mm):** May permit intentional movement; reduces reliability of "stability" detection.
3. **Adaptive tolerance based on device DPI:** Over-complicated for v1.0.

**Trade-offs:**
- **Accepted:** A small amount of hand motion is tolerated, which could theoretically permit players to deliberately drift; however, the app selects a random winner regardless of final position, so movement does not affect the outcome.
- **Implementation:** Requires tracking position history and computing standard deviation or distance-from-mean to detect stability (~20 lines of code).
- **Benefit:** Natural, non-frustrating UX; fair randomness maintained.

**Status:** Accepted

---

### ADR-012: Undo/Redo Not Implemented in v1.0

**Decision:** The "Undo Last Change" feature mentioned in Requirement AF-003-B is not implemented for v1.0. Users cannot undo accidental score changes; they must delete the session and start over or manually adjust scores.

**Context:**
- Requirement AF-003-B lists "Undo Last Change" as an *alternative flow*, not a mandatory functional requirement.
- Section 8.6 (Out of Scope) does not explicitly exclude undo, but the emphasis on simplicity and minimal cognitive load (NFR-U-004) suggests post-hoc data recovery is not essential for the MVP.
- Storing undo history requires additional storage, increased complexity in ScoreService, and additional UI state management.
- The app already provides session deletion, allowing users to restart; this is an acceptable workaround for v1.0.

**Alternatives Considered:**
1. **Implement full undo/redo stack:** Adds complexity and storage overhead; not prioritized for MVP.
2. **Provide "revert to last save" option:** Unnecessary given session deletion option.

**Trade-offs:**
- **Accepted:** Users cannot undo accidental score changes; they must delete the session and start over.
- **Benefit:** Simpler Score feature implementation, reduced state management complexity, smaller bundle.
- **Future:** Undo can be added to v1.1 with a stack of recent score modifications stored in-memory during a session (cleared when session is closed).

**Status:** Accepted

---

### ADR-013: Undo History Depth Deferred to v1.1

**Decision:** Undo history depth is not applicable to v1.0 (see ADR-012). If undo is implemented in v1.1, the history depth shall be limited to the current session only, storing the last 20 score changes in a stack.

**Context:**
- Depends on ADR-012; undo is not implemented in v1.0.
- If v1.1 implements undo, a bounded stack is preferable to unbounded history to manage memory on 2GB RAM devices.
- Limiting history to the current session (cleared when the session is closed) balances usability with memory constraints.

**Alternatives Considered:**
1. **Unbounded undo history:** Consumes memory; increases storage requirements.
2. **Persistent undo history across sessions:** Violates simplicity goal; adds significant complexity.
3. **No undo in v1.1:** Acceptable but limits feature completeness based on user feedback.

**Trade-offs:**
- N/A for v1.0; deferred decision.

**Status:** Accepted

---

### ADR-014: No Cross-Device Synchronization; Single-Device Only

**Decision:** The application remains single-device and offline-only. No cross-device synchronization, cloud backup, or backend synchronization is implemented in v1.0 or mandated for future versions (unless a new spec explicitly requires it).

**Context:**
- Requirement NFR-O-001 mandates "100% offline functionality with no internet connection required."
- Requirement NFR-O-002 explicitly states the app "shall not attempt to establish network connections."
- Assumption A-007 explicitly accepts data loss if the device is reset: "no cloud backup or recovery if the device is reset or lost."
- Adding a backend for cloud sync would violate the offline-first principle and introduce operational complexity (server infrastructure, authentication, data privacy).
- The spec contains no requirements for cross-device functionality.

**Alternatives Considered:**
1. **Optional cloud sync with user opt-in:** Violates NFR-O-001 (100% offline requirement) and adds networking complexity.
2. **Backend API layer for analytics/telemetry:** Explicitly out of scope (Section 8.6); would violate offline-first principle.

**Trade-offs:**
- **Accepted:** Users cannot access game sessions across devices; data is trapped on a single device. Acceptable per Assumption A-007 and the offline-first design principle.
- **Benefit:** No backend infrastructure to maintain, no privacy/data handling concerns, 100% offline reliability.
- **Future:** If a new spec requires multi-device support, a separate backend service can be designed without refactoring the client architecture, which is already network-agnostic.

**Status:** Accepted

---

### ADR-015: Player Name Validation Rules

**Decision:** Enforce strict validation for player names: allow only 1–20 alphanumeric characters (a-z, A-Z, 0-9), spaces, and hyphens. Reject names containing emojis, special characters (#, @, !, etc.), or non-Latin Unicode scripts.

**Context:**
- Requirement FR-S-002 specifies "input names for participating players" but does not formally define constraints.
- Section 4.2 mentions "up to 20 characters per name."
- Strict character whitelisting prevents rendering issues (emoji width variability, unsupported scripts) and simplifies storage/debugging.
- Spaces and hyphens are common in real names (e.g., "Alice-Bob", "John Smith") and are safe to permit.
- The 1-character minimum enforces non-empty names; empty names cause display confusion.

**Alternatives Considered:**
1. **Permissive Unicode support:** Allows any Unicode character; complicates rendering (variable-width emojis, right-to-left scripts) and increases storage unpredictability.
2. **Only alphanumeric (no spaces/hyphens):** Reduces realism for multi-word names.
3. **No validation (accept any string):** Risks display bugs and storage issues with malformed data.

**Trade-offs:**
- **Accepted:** Players with non-Latin names (Chinese, Arabic, Cyrillic) cannot use their native scripts in v1.0. This is a localization limitation deferred to v1.1 (see ADR-022).
- **Accepted:** Maximum effective name length is reduced if spaces/hyphens are used (e.g., "Mary-Jane Watson" is 16 characters, leaving 4 for surname).
- **Benefit:** Consistent rendering across all devices, simpler debugging, no character encoding issues.
- **Implementation:** Simple regex validation: `/^[a-zA-Z0-9 \-]{1,20}$/`

**Status:** Accepted

---

### ADR-016: Draw Feature Multi-Touch Color Cycling Beyond 8 Touches

**Decision:** Cycle through the 8-color palette when more than 8 touches are detected. The 9th touch reuses the color of the 1st touch; the 10th reuses the 2nd color, etc. (color = palette[touchIndex % 8]).

**Context:**
- Requirement FR-T-001 mandates support for "up to 10 simultaneous touch points."
- Requirement Section 10.2 provides exactly 8 predefined colors for multi-touch circles.
- The spec does not specify behavior for >8 touches.
- Requirement FR-T-003 specifies "random winner selection"; the winner is selected randomly, not by color uniqueness.

**Alternatives Considered:**
1. **Reject touches >8:** Would frustrate users in 10-player scenarios; violates the intent of FR-T-001.
2. **Generate new colors dynamically:** Risks palette incoherence (unpredictable colors); complicates code.
3. **Reuse colors sequentially (current choice):** Simplest implementation; acceptable trade-off.

**Trade-offs:**
- **Accepted:** Color uniqueness is lost beyond 8 simultaneous touches. Two different touch points may share the same color, potentially making it harder to visually distinguish them in crowded 9–10 player games.
- **Benefit:** Simple implementation (single modulo operation); all touches remain visually represented; fair winner selection (random, not color-dependent).
- **Mitigation:** Random winner selection is independent of color and position, so color overlap does not affect fairness. In typical board game sessions (2–6 players), this is not a practical issue.

**Status:** Accepted

---

### ADR-017: PanResponder Multi-Touch Fallback Strategy

**Decision:** Use React Native's PanResponder as the primary multi-touch handler in v1.0. If testing reveals unreliable behavior with >6 simultaneous touches on target devices, migrate to `react-native-gesture-handler` during the QA phase before release.

**Context:**
- Requirement FR-T-001 mandates support for up to 10 touches.
- PanResponder is built-in (no external dependency, aligns with ADR-005) and is adequate for typical use cases (2–6 players per Assumption A-010).
- Reanimated 2's GestureHandler is a proven alternative for advanced multi-touch scenarios.
- Deferring the decision to QA/testing avoids premature optimization and respects "Simplicity First."

**Alternatives Considered:**
1. **Start with GestureHandler in v1.0:** Adds dependency and complexity; may be unnecessary.
2. **Use only PanResponder, no fallback:** Risks missing out on 9–10 player scenarios if PanResponder fails.
3. **Hybrid approach (test during development):** Current choice; pragmatic.

**Trade-offs:**
- **Accepted:** The migration decision is deferred, adding testing risk. If PanResponder fails at >6–7 touches, the team must rewrite touch handling code during QA.
- **Mitigation:** Straightforward API similarity between PanResponder and GestureHandler allows quick migration. Early multi-touch testing during development reduces QA surprises.
- **Benefit:** Minimal dependencies and complexity in v1.0 codebase.

**Status:** Accepted

---

### ADR-018: AsyncStorage Performance Management and Cleanup

**Decision:** Implement automatic cleanup of game sessions older than 60 days on app startup. Monitor AsyncStorage enumeration performance during testing; if listing >100 sessions takes >500ms, implement session archiving or migrate to SQLite post-v1.0.

**Context:**
- Assumption A-006 estimates <50 sessions per device, but power users could accumulate 200+ sessions over 1–2 years.
- AsyncStorage is a key-value store with no built-in indexing; enumerating all keys is O(n) and can slow app startup.
- Requirement NFR-P-003 specifies <500ms startup time; large session enumeration violates this.
- The 60-day retention window is reasonable: retains recent games (likely still relevant) while preventing storage bloat.
- Requirement NFR-R-004 specifies "independent storage without interference"; cleanup does not affect active sessions.

**Alternatives Considered:**
1. **No cleanup; grow unbounded:** Risks performance degradation and storage bloat over time.
2. **Manual cleanup by user:** Adds UI complexity; most users will not manually clean old data.
3. **SQLite from v1.0:** Over-engineered for estimated scale; adds complexity unnecessarily.
4. **Archiving to separate storage:** Deferred to v1.1 if needed.

**Trade-offs:**
- **Accepted:** Users' old game sessions are automatically deleted after 60 days without warning or confirmation. This removes historical records but prevents storage bloat.
- **Mitigation:** Users can manually export or screenshot important sessions (deferred to v1.1). A user preference to customize retention period (30–90 days) can be added in v1.1.
- **Benefit:** Predictable storage footprint, stable app startup performance, reduced AsyncStorage overhead.
- **Monitoring:** During QA, measure enumeration performance with 50, 100, and 200 sessions to establish baseline; migrate to SQLite if >500ms observed.

**Status:** Accepted

---

### ADR-019: Animation Frame Rate Graceful Degradation

**Decision:** Target 60 FPS on all devices per Requirement NFR-P-001. If testing reveals 60 FPS is unachievable on minimum-spec devices (2GB RAM, Android 8.0), reduce animation complexity: shorten dice roll duration from 1s to 500ms, reduce simultaneous animations, and accept graceful degradation to 30 FPS rather than dropping the animation feature.

**Context:**
- Requirement NFR-P-001 mandates "60 FPS animations on devices with 2GB RAM minimum."
- React Native's Animated API is optimized for 60 FPS but is subject to platform performance constraints.
- Older Android devices with 2GB RAM and system bloatware may not consistently sustain 60 FPS.
- Testing on actual target devices (not emulators) is the only reliable way to establish the true baseline.
- Reducing animation complexity (duration, particle count, simultaneous animations) is a proven technique to improve frame rates without removing functionality.
- 30 FPS is still smooth enough for human perception (cinema standard is 24 FPS).

**Alternatives Considered:**
1. **Strict 60 FPS requirement; fail on low-end devices:** Unachievable on some devices; poor UX.
2. **Remove animations entirely:** Violates Requirement FR-D-002 (dice animation) and NFR-U-002 (visual feedback).
3. **Graceful degradation (current choice):** Pragmatic; maintains functionality across device tiers.

**Trade-offs:**
- **Accepted:** Animations may appear less smooth on low-end devices. Dice rolls may feel "snappier" (shorter 500ms duration) rather than dramatic (1s).
- **Benefit:** Consistent functionality across all target devices; users on budget phones still get animations, just shorter/snappier.
- **Implementation:** Detect device performance during early animation render; use `LayoutAnimation.configureNext()` or frame rate detection to adjust duration.

**Status:** Accepted

---

### ADR-020: Haptic Feedback Graceful Fallback

**Decision:** Rely on Expo Haptics' built-in graceful fallback behavior. The `triggerNotification()` call is silently no-op on devices without vibration hardware or if the user has disabled vibration in OS settings. No app-level error handling is required. Complement haptic feedback with visual feedback (e.g., text animation) to ensure the 3-second touch stability event is perceivable without vibration.

**Context:**
- Requirement FR-T-005 specifies "haptic feedback (vibration)" after 3 seconds of touch stability.
- Requirement A-009 explicitly states "Haptic feedback (vibration) is available on all target devices; graceful degradation occurs if unavailable."
- Expo's Haptics module abstracts platform differences and handles fallback automatically. iOS devices with Haptic Engine and modern Android devices with Vibrator support will provide feedback; older devices will silently skip feedback.
- This is the idiomatic approach in React Native; no custom code is required.

**Alternatives Considered:**
1. **Custom platform detection and error handling:** Unnecessary; Expo Haptics handles this.
2. **Strict vibration requirement; fail on unsupported devices:** Violates Assumption A-009.
3. **Haptics-only feedback, no visual alternative:** Leaves unsupported devices without perceivable event notification.

**Trade-offs:**
- **Accepted:** Users on unsupported devices will not receive haptic feedback for the 3-second stability completion event.
- **Mitigation:** Provide visual feedback (e.g., "Ready!" text appears, circle glows, animation plays) in parallel with haptics. Ensures the event is perceivable even without vibration.
- **Benefit:** Single API call; no configuration; handles cross-platform compatibility automatically.

**Status:** Accepted

---

### ADR-021: Screen Reader Accessibility Annotations

**Decision:** Annotate all interactive elements with `accessibilityLabel` and `accessibilityHint` properties for VoiceOver (iOS) and TalkBack (Android) support. Prioritize these elements in order: (1) Roll Dice button, (2) Score +/− buttons, (3) New Game button, (4) Delete Session button, (5) Draw Canvas touch area. Secondary elements (player name inputs, tab labels) are labeled but may be lower priority.

**Context:**
- Requirement NFR-A-005 specifies support for VoiceOver (iOS) and TalkBack (Android) on "critical interface elements."
- Critical elements are those that directly affect game logic and user actions.
- Labels must be concise and action-oriented (e.g., "Roll dice button, activates dice roll animation" rather than generic "button").
- Full accessibility testing and refinement is deferred to v1.1 or accessibility audit post-launch.

**Alternatives Considered:**
1. **No accessibility support:** Violates NFR-A-005 and accessibility standards.
2. **Full accessibility implementation with testing:** Deferred to v1.1 or post-launch audit; too time-consuming for MVP.
3. **Current approach (prioritized annotations):** Pragmatic; covers critical paths while deferring comprehensive support.

**Trade-offs:**
- **Accepted:** Secondary UI elements (headers, informational text) are labeled but not extensively tested. Users may experience inconsistent screen reader behavior for non-critical elements.
- **Benefit:** Critical user paths (rolling dice, modifying scores, creating games) are accessible; improves inclusivity without overwhelming development effort.
- **Future:** Comprehensive accessibility audit and refinement in v1.1.

**Status:** Accepted

---

### ADR-022: English-Only Localization for v1.0

**Decision:** The application is English-only for v1.0. All UI strings (button labels, error messages, feedback text) are hardcoded in English. Internationalization (i18n) and multi-language support are deferred to v1.1 or later.

**Context:**
- The specification is in English, and the primary audience is English-speaking users.
- Implementing i18n requires additional tooling (e.g., i18next, react-i18next), translation management infrastructure, and testing for each supported language.
- i18n adds complexity, increases bundle size, and complicates maintenance without addressing the MVP scope.
- Deferring i18n to v1.1 aligns with "Simplicity First" and allows prioritizing core gameplay stability in v1.0.

**Alternatives Considered:**
1. **Add i18n support in v1.0:** Adds ~5–10KB to bundle; requires translation workflows and testing. Unnecessary for MVP.
2. **Hardcoded English (current choice):** Simplest; adequate for MVP launch.
3. **User-selectable language with single alternative (e.g., Spanish):** Adds maintenance burden without broad applicability.

**Trade-offs:**
- **Accepted:** Non-English speakers cannot use the app in their preferred language. Users with devices set to non-English locales will see English UI.
- **Mitigation:** If the app is released in markets with non-English speakers, i18n becomes urgent and should be prioritized in v1.0.1 or v1.1.
- **Benefit:** Minimal dependencies, simpler codebase, faster development.

**Status:** Accepted

---

### ADR-023: Static Light Theme; No Dark Mode in v1.0

**Decision:** The application uses a fixed, light color theme for v1.0. No dark mode variant, system theme detection, or theme customization is implemented. Dark mode support is deferred to v1.1.

**Context:**
- Implementing dark mode requires defining a second color palette, detecting system theme preference (using `useColorScheme()` hook in React Native), managing theme state, and testing across light/dark modes on both iOS and Android.
- Dark mode effectively doubles the visual design and testing workload.
- The light theme is suitable for table-top gaming scenarios (typically in well-lit environments or with focused screen time).
- Requirement NFR-U-002 emphasizes visual metaphors and "game table aesthetic"; a light palette aligns with this metaphor.
- Accessibility benefit (reduced eye strain) is real but can be achieved with high contrast and careful color choices in the light theme.
- Custom theme support is explicitly out of scope (Section 8.6; ADR-010 confirms static design system).

**Alternatives Considered:**
1. **Light and dark mode from v1.0:** Doubles visual design and testing effort; not justified for MVP.
2. **Light theme only (current choice):** Simplest; adequate for MVP.
3. **User toggle with single alternative (e.g., high-contrast mode):** Adds state management complexity; deferred to v1.1 if accessibility feedback demands it.

**Trade-offs:**
- **Accepted:** Users who prefer dark mode for accessibility (reduced eye strain, astigmatism) cannot enable it in v1.0.
- **Mitigation:** Ensure high contrast and sufficient color separation in the light palette per WCAG AA standards (Requirement NFR-A-006). If accessibility feedback indicates dark mode is essential, prioritize in v1.0.1 patch or v1.1.
- **Benefit:** Simpler styling code, faster development, no theme state management complexity.

**Status:** Accepted

---

### ADR-024: No Analytics or Crash Reporting

**Decision:** The application does not use analytics, crash reporting, or telemetry tools that require internet connectivity in v1.0. Only local console logging (`console.log`, `console.error`) is available for debugging during development. Sentry, Firebase Crashlytics, Braze, or similar services are explicitly excluded.

**Context:**
- Requirement NFR-O-002 is absolute and non-negotiable: "the app shall not attempt to establish network connections."
- Any analytics or crash reporting service inherently requires network access to send data to a remote server, violating this fundamental constraint.
- The offline-first design is a core feature and architectural principle (ADR-009, Assumption A-007).
- Crash reporting can be deferred to v1.1 if a backend is added in the future, but only if it respects offline-first constraints (queue crashes locally, send only with explicit user consent and active connectivity).

**Alternatives Considered:**
1. **Optional analytics with user opt-in:** Still violates NFR-O-002 (absolute offline requirement); adds network layer complexity.
2. **Local crash logging to AsyncStorage:** Possible but adds storage overhead; limited utility without data analysis infrastructure.
3. **No reporting (current choice):** Aligns with offline-first principle; simplest implementation.

**Trade-offs:**
- **Accepted:** The development team has no visibility into production crashes, user behavior patterns, or app performance metrics. Debugging must rely on user error reports and local testing.
- **Mitigation:** User feedback, beta testing community, and app store reviews provide qualitative insights. Local console logging and error boundaries provide visibility during development.
- **Benefit:** Simplified codebase, no privacy/data handling concerns, 100% offline compliance.
- **Future:** Production monitoring via optional backend can be added post-launch if a backend is introduced.

**Status:** Accepted

---

### ADR-025: Dice Roll History Ephemeral Storage

**Decision:** Dice rolls are ephemeral in v1.0. Each time the Dice feature is exited or the app is restarted, all roll history is cleared. No roll history is persisted to AsyncStorage or shown across sessions.

**Context:**
- The specification explicitly states "No data persistence is required for dice rolls" (implied in ADR-002's scope: only Score feature game sessions are persisted).
- Requirement FR-D-003 specifies "Display individual die values and sum," but does not mandate roll history.
- Keeping in-memory roll history during a single Dice session (e.g., last 10 rolls on screen) adds marginal UX value but complicates state management.
- The Dice feature's purpose is to generate random values on-demand for a single roll; historical tracking is outside scope.
- Users who need to track rolls can use the Score feature, which persists player scores (not roll sequences, but sufficient for most use cases).

**Alternatives Considered:**
1. **Implement persistent roll history:** Requires storage schema, UI redesign, and state management. Violates scope and simplicity goal.
2. **In-memory session history (last 10 rolls visible on screen):** Adds complexity; marginal UX value. Deferred to v1.1 if users request.
3. **Ephemeral only (current choice):** Simplest; aligns with "quick roll" use case.

**Trade-offs:**
- **Accepted:** Users cannot review past rolls or verify fairness after exiting the Dice feature. Each roll is independent and immediately discarded if the feature is exited.
- **Mitigation:** If players request roll history in v1.1, implement an optional in-session log (visible only during the current session, not persisted post-session).
- **Benefit:** Zero persistence overhead, simpler component state, faster feature development.

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
  - `cleanupOldSessions(retentionDays: number): Promise<void>` — Auto-delete sessions older than N days (per ADR-018)
- **Consumes:** React Native AsyncStorage

**Dependencies:** React Native, AsyncStorage

---

### Service: VibrationService
**Responsibility:** Encapsulate platform-specific haptic feedback, providing a simple API for triggering vibrations when needed (e.g., Draw feature timer completion). Handles graceful fallback on unsupported devices (per ADR-020).

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
| `name` | string | Display name (1–20 characters, alphanumeric + spaces/hyphens per ADR-015) |

**Storage Type:** Local device storage (AsyncStorage). Each GameSession is serialized as JSON and stored with key `game_session_{sessionId}`. All sessions are listed by enumerating keys prefixed with `game_session_`.

**Cleanup:** Sessions older than 60 days are automatically deleted on app startup (per ADR-018).

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

**Note on Dice and Draw:** These features are stateless in terms of persistent data. Dice rolls are ephemeral (not persisted; per ADR-025). Draw selections are immediate and not stored. Both features have no data model in the persistence layer; all state is in-memory and cleared on exit.

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
| `cleanupOldSessions(retentionDays: number = 60): Promise<void>` | Auto-delete sessions older than N days | (no return; void promise) |

---

### VibrationService – Public Interface

| Method | Purpose | Feedback Pattern |
|--------|---------|------------------|
| `triggerNotification(): Promise<void>` | Single haptic pulse | Single, brief vibration (~50ms) |
| `triggerSuccess(): Promise<void>` | Multi-pulse success pattern | Two short pulses (~75ms apart) |
| `triggerError(): Promise<void>` | Multi-pulse error pattern | Three quick pulses (~50ms apart) |

---

## 8. Open Questions

None — all questions resolved.

---

**End of Architecture Document**