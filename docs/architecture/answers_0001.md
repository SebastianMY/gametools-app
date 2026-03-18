# Game Companion Mobile Application — Architecture Questions Resolved

## Q1: Touch Stability Tolerance
**Decision**: Allow 5–10mm position drift while detecting touch stability; use a threshold-based check rather than exact position locking.

**Rationale**: Requirement FR-T-004 mandates "touch stability for 3 seconds" but does not specify tolerance for natural hand tremor or micro-movement. Expecting exact pixel-perfect stillness creates a frustrating UX (players struggle to keep fingers completely stationary). A 5–10mm tolerance matches typical gaming input standards and is imperceptible to the human eye while remaining tight enough to prevent accidental jitter. The Draw feature's purpose is fair random selection; minor movement does not affect fairness.

**Trade-offs**: A small amount of hand motion is tolerated, which could theoretically be perceived as "cheating" by a player trying to influence position; however, the app selects a random touch after stability, not based on position. Implementation requires tracking position history and computing standard deviation or distance-from-mean to detect stability, adding ~20 lines of code.

---

## Q2: Undo/Redo for Score Tracking
**Decision**: Not implemented in v1.0; deferred to v1.1 or later.

**Rationale**: Requirement AF-003-B lists "Undo Last Change" as an alternative flow, but the spec does not mandate undo as a primary functional requirement. Section 8.6 (Out of Scope) does not explicitly exclude undo, but the emphasis on simplicity and minimal cognitive load (NFR-U-004) suggests post-hoc data recovery is not essential for the MVP. Storing undo history requires additional storage, increased complexity in ScoreService, and UI state management. The app already provides session deletion, which allows users to start over.

**Trade-offs**: Users cannot undo an accidental score change; they must delete the session and start over. Acceptable for v1.0 given the simplicity goal. Undo can be added to v1.1 with a stack of recent score modifications stored in-memory during a session.

---

## Q3: Undo History Depth
**Decision**: Not applicable to v1.0; deferred pending v1.1 undo implementation.

**Rationale**: Depends on Q2; if undo is implemented in v1.1, the history depth should be limited to the current session only (cleared when the session is closed), storing the last 20 score changes in a stack. This balances usability (undo typical mistakes) with memory constraints (2GB RAM minimum devices).

**Trade-offs**: N/A for v1.0.

---

## Q4: Multiple Device Support / Cross-Device Sync
**Decision**: No cross-device synchronization in v1.0 or future versions unless explicitly mandated by a new spec. The application remains single-device, offline-only.

**Rationale**: Requirement NFR-O-001 and NFR-O-002 are absolute: "100% offline functionality" and "shall not attempt to establish network connections." ADR-009 confirms no backend API. Adding a backend for cloud sync would violate these non-negotiable constraints and introduce operational complexity (server maintenance, database, authentication). The spec's Assumption A-007 explicitly accepts data loss if the device is reset. If future users require sync, a separate backend service can be designed without refactoring the client architecture, which is already network-agnostic.

**Trade-offs**: Users cannot access their game sessions across devices; data is trapped on a single device. This is an accepted limitation per the offline-first design principle.

---

## Q5: Player Name Constraints
**Decision**: Enforce a strict 1–20 character limit; allow only alphanumeric characters (a-z, A-Z, 0-9), spaces, and hyphens. Reject names with emojis, special characters (#, @, etc.), or Unicode beyond Latin script.

**Rationale**: Section 4.2 mentions "up to 20 characters per name." Strict character whitelisting prevents rendering issues (emoji width variability, unsupported scripts), simplifies storage, and reduces security risks (injection). Spaces and hyphens are common in names (e.g., "Alice-Bob", "John Smith") and are safe. The 1-character minimum enforces non-empty names.

**Trade-offs**: Players with non-Latin names (Chinese, Arabic, Cyrillic, etc.) cannot use their native scripts in v1.0. This is a localization limitation deferred to v1.1 (Q12). Hyphens and spaces reduce the maximum effective length (e.g., "Mary-Jane Watson" is 16 characters). Acceptable trade-off given the MVP scope.

---

## Q6: Draw Feature Touch Colors – Behavior Beyond 8 Touches
**Decision**: Cycle through the 8-color palette. The 9th touch reuses the color of the 1st touch, the 10th reuses the 2nd, etc. (color = palette[touchIndex % 8]).

**Rationale**: Requirement FR-T-001 states the app shall support "up to 10 simultaneous touch points." The spec provides 8 predefined colors (Section 10.2) but does not address >8 touches. Cycling through the palette is the simplest implementation (single modulo operation) and prevents visual confusion (all touches remain colored). Alternative (reject touches >8) would frustrate users in 10-player scenarios; alternative (generate new colors) risks palette incoherence.

**Trade-offs**: Color uniqueness is lost beyond 8 touches (two different touch points may share the same color), potentially making it harder to visually distinguish touches in a crowded 9–10 player game. However, the random winner selection is independent of color and position, so this does not affect fairness. The trade-off is acceptable given the rare case of >8 players in typical board game sessions.

---

## Q7: Multi-touch Testing on Real Devices – Fallback Strategy
**Decision**: Use React Native's PanResponder as the primary multi-touch handler. If testing reveals unreliable behavior with >6 simultaneous touches on target devices, migrate to `react-native-gesture-handler` during the QA phase.

**Rationale**: PanResponder is built-in (no external dependency, aligns with ADR-005) and is adequate for typical use cases (2–6 players is the common scenario per Assumption A-010). However, Requirement FR-T-001 mandates support for up to 10 touches; if PanResponder fails at >6–7 touches, GestureHandler is a proven drop-in alternative. Deferring the decision to QA/testing avoids premature optimization and respects the "Simplicity First" principle.

**Trade-offs**: The migration decision is deferred, adding testing risk; if PanResponder fails, the team must rewrite touch handling code mid-development. Mitigated by the straightforward API similarity between PanResponder and GestureHandler, and by starting testing early with multi-touch scenarios.

---

## Q8: AsyncStorage Performance at Scale
**Decision**: Implement a cleanup mechanism: automatically delete game sessions older than 60 days on app startup. Monitor AsyncStorage enumeration time during testing; if listing >100 sessions takes >500ms, implement session archiving or migrate to SQLite.

**Rationale**: Assumption A-006 estimates <50 sessions per device, but a power user could accumulate 200+ sessions in 1–2 years. AsyncStorage is a key-value store with no built-in indexing; enumerating all keys is O(n) and can slow app startup. The 60-day auto-delete is a reasonable compromise: retains recent games (likely still relevant) while preventing storage bloat. Monitoring during testing ensures early detection of performance issues; SQLite migration is straightforward if needed (see ADR-002).

**Trade-offs**: Users' old game sessions are automatically deleted without warning, removing historical records. Acceptable trade-off for simplicity; users can manually export or archive important sessions in v1.1. A setting to customize the retention period (30–90 days) can be added to v1.1.

---

## Q9: Animation Frame Rate on Low-End Devices
**Decision**: Target 60 FPS on all devices; if testing reveals 60 FPS is unachievable on minimum-spec devices (2GB RAM, Android 8.0), reduce animation complexity: shorten duration from 1s to 500ms, use fewer simultaneous animations, and accept graceful degradation to 30 FPS rather than dropping the feature.

**Rationale**: Requirement NFR-P-001 mandates "60 FPS animations on devices with 2GB RAM minimum." However, older Android devices with 2GB RAM and bloatware may not sustain 60 FPS. The Animated API is optimized for 60 FPS but is subject to platform performance. Testing on actual target devices (not just emulators) will reveal the true baseline. Reducing animation complexity (duration, particles, simultaneous animations) is a proven technique to improve frame rates without removing functionality. 30 FPS is still smooth enough for human perception and acceptable for v1.0.

**Trade-offs**: Animations may appear less smooth on low-end devices; dice rolls may feel "snappier" (shorter duration) rather than dramatic. This is a visual/experience trade-off, not a functional one. Users with high-end devices get the full 1s smooth animation; users with budget devices get a shorter, acceptable animation.

---

## Q10: Haptic Feedback on Devices Without Vibration
**Decision**: Rely on Expo Haptics' built-in fallback behavior; the `triggerNotification()` call is silently no-op on devices without vibration hardware or if the user has disabled vibration in OS settings. No app-level error handling is required.

**Rationale**: Requirement A-009 explicitly states "Haptic feedback (vibration) is available on all target devices; graceful degradation occurs if unavailable." Expo's Haptics module abstracts platform differences and handles graceful fallback automatically. iOS devices with Haptic Engine and modern Android devices with Vibrator support will provide feedback; older devices or accessibility settings will silently skip feedback. This is the idiomatic approach in React Native and requires no custom code.

**Trade-offs**: Users on unsupported devices will not receive any haptic feedback for the 3-second stability completion event. Mitigated by providing visual feedback (e.g., a "Ready!" text change or animation) in parallel with haptics, ensuring the event is perceivable without vibration.

---

## Q11: Accessibility – Screen Reader Support
**Decision**: Annotate all interactive elements with `accessibilityLabel` and `accessibilityHint` properties. Prioritize these elements in order: (1) Roll Dice button, (2) Score +/− buttons, (3) New Game button, (4) Delete Session button, (5) Draw Canvas touch area. Secondary elements (player name inputs, tabs) are labeled but may be lower priority.

**Rationale**: Requirement NFR-A-005 specifies support for VoiceOver (iOS) and TalkBack (Android) on "critical interface elements." Critical elements are those that directly affect game logic and user actions. Roll Dice, Score +/−, and New Game are primary interactions. Labels must be concise and action-oriented (e.g., "Roll dice button, activates dice roll animation" rather than "button").

**Trade-offs**: Secondary UI elements (headers, status text) are labeled but not tested extensively; users may experience inconsistent screen reader behavior for informational elements. Acceptable for v1.0; comprehensive accessibility testing and refinement can occur in v1.1.

---

## Q12: Localization / Internationalization
**Decision**: English-only for v1.0. All UI strings are hardcoded in English. Internationalization (i18n) is deferred to v1.1 or later.

**Rationale**: The specification is in English, and the primary audience is English-speaking users. Implementing i18n requires additional tooling (e.g., i18next or react-i18next), translation management, and testing for each supported language. This adds complexity and bundle size without addressing the MVP scope. Deferring i18n to v1.1 follows the "Simplicity First" principle and allows prioritizing core gameplay stability in v1.0.

**Trade-offs**: Non-English speakers cannot use the app in their preferred language. Users with devices set to non-English locales will see English UI. Acceptable limitation for v1.0 MVP; if the app is released in markets with non-English speakers, i18n becomes urgent and should be prioritized in v1.1.

---

## Q13: Dark Mode Support
**Decision**: Static light theme for v1.0. The app uses a predefined light color palette (per ADR-010) with no dark mode variant. Dark mode support is deferred to v1.1.

**Rationale**: Implementing dark mode requires defining a second color palette, detecting system theme preference (`useColorScheme()` hook in React Native), managing theme state, and testing on both iOS and Android across light/dark modes. This doubles the visual design work and complicates the styling layer. The light theme is suitable for table-top gaming scenarios (typically in well-lit environments or with focused screen time). Deferring dark mode aligns with "Simplicity First."

**Trade-offs**: Users who prefer dark mode for accessibility (e.g., reduced eye strain, astigmatism) cannot enable it. Partially mitigated by ensuring sufficient color contrast in the light palette (per NFR-A-006 WCAG AA standards). If accessibility feedback indicates dark mode is essential, it can be prioritized in an urgent v1.0.1 patch.

---

## Q14: Analytics or Crash Reporting
**Decision**: No analytics, crash reporting, or telemetry tools that require internet connectivity in v1.0. Use only local console logging (`console.log`, `console.error`) for debugging during development. Sentry, Firebase Crashlytics, or similar services are explicitly out of scope.

**Rationale**: Requirement NFR-O-002 is absolute: "the app shall not attempt to establish network connections." Any analytics or crash reporting service inherently requires network access (to send data to a remote server), violating this non-negotiable constraint. The offline-first design is a core feature (Assumption A-007). Crash reporting can be deferred to v1.1 if a backend is added, but only if it respects offline-first constraints (queue crashes locally, send only with explicit user consent and active connectivity).

**Trade-offs**: The development team has no visibility into production crashes or user behavior. Debugging must rely on user error reports and local testing. Acceptable for v1.0 MVP; production monitoring can be added post-launch.

---

## Q15: Dice Roll History
**Decision**: Rolls are ephemeral in v1.0. Each time the Dice feature is exited or the app is restarted, all roll history is cleared. No roll history is persisted.

**Rationale**: The specification explicitly states "No data persistence is required for dice rolls" (implied by ADR-002's scope: only game sessions in Score feature are persisted). Keeping in-memory roll history during a Dice session (e.g., last 10 rolls) adds marginal UX value but complicates state management. The Dice feature's purpose is to generate random values on-demand; users who need to track rolls can use the Score feature (which persists player scores, not roll sequences). Keeping rolls ephemeral aligns with the simplicity goal.

**Trade-offs**: Users cannot review past rolls or verify fairness after a session; each roll is independent and immediately discarded if the feature is exited. Acceptable for a table-top gaming tool; if players request roll history in v1.1, it can be added as an optional in-session log (not persisted post-session).

---

**End of Answers Document**