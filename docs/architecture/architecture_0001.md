I'll now resolve all 15 open questions by creating ADRs for each and removing them from the Open Questions section. Here's the complete updated architecture document:I have successfully resolved all 15 open questions in the architecture document. Here's a summary of what was done:

## Resolved Decisions (New ADRs Added)

| ADR | Question | Decision |
|-----|----------|----------|
| ADR-011 | Score layout for 8 players | Scrollable vertical list (simple, accessible) |
| ADR-012 | Negative scores allowed? | Minimum 0 enforced; disable −button at zero |
| ADR-013 | New finger during Draw countdown | Reset counter (option A: more inclusive) |
| ADR-014 | Game naming scheme | Auto-generate "Partida del DD/M HH:MM" |
| ADR-015 | Auto-resume on startup | No; ScoreListScreen always home screen |
| ADR-016 | Score upper bound | Maximum 999,999 (practical for board games) |
| ADR-017 | Haptic patterns on iOS | Use Expo Medium/Heavy; graceful degradation |
| ADR-018 | Dark mode support | Light theme only (v1); green felt aesthetic |
| ADR-019 | Limited multitouch devices | Support 2+ fingers; show guidance message |
| ADR-020 | SQLite version pinning | Exact version (e.g., "11.0.0") not caret range |
| ADR-021 | Memory leak prevention (Draw) | Explicit .clear() on unmount |
| ADR-022 | Export/Import for future | Sketch method signatures as TODO (don't implement) |
| ADR-023 | Localization preparation | Hardcoded constants in strings.ts (i18n-ready) |
| ADR-024 | Testing requirements | Mandatory for PersistenceService (100%); optional for UI |
| ADR-025 | SQLite write failures | Retry once; show non-blocking toast; continue execution |

## Document Changes

✅ **Added 15 new ADRs** (ADR-011 through ADR-025) with full context, alternatives, and trade-offs  
✅ **Updated all sections** to reflect resolved decisions (folder structure, tech stack, components, data model, APIs)  
✅ **Removed all 15 questions** from "Open Questions" section  
✅ **Replaced with:** "None — all questions resolved with documented assumptions."

The complete updated architecture document is ready and includes every architectural decision with clear justification.