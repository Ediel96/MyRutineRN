# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

React Native (0.86, RN new architecture / nitro modules) port of an iOS SwiftUI/SwiftData app called MyRoutine. Many files carry `// equivalente a X.swift` comments pointing at the Swift file they were ported from — treat those as the source of intended behavior when a port looks incomplete.

## Commands

```sh
npm start                    # Metro dev server
npm run android               # build & run Android
npm run ios                   # build & run iOS
npm run lint                  # eslint .
npm test                      # jest
npx jest path/to/file.test.tsx -t "test name"   # single test
npm run start:reset           # metro with --reset-cache
npm run android:reset         # gradlew clean + metro reset
npm run ios:reset             # pod-install + xcodebuild clean + metro reset
npm run clean:node            # wipe node_modules, reinstall, pod-install
```

`postinstall` runs `patch-package` (see `patches/`, currently patches `react-native-audio-recorder-player`). If native deps behave oddly after `npm install`, check this patch still applies.

## Architecture

### State: Zustand stores backed by MMKV, no backend
All persistence is local. Each store in `src/stores/` owns one MMKV-backed slice and is the source of truth loaded at app boot in `App.tsx`:
- `routinesStore` — `RoutineEvent`, `Subtask`, `CompletionRecord`. Reads/writes go through `src/services/storage.ts` (raw MMKV, JSON arrays under fixed keys). Every mutation that touches alarm-relevant fields also fires notification scheduling (`scheduleAlarmsForRoutine`/`scheduleReminderForRoutine`) via a fire-and-forget `runAsync` wrapper — notification failures must never break local state.
- `settingsStore` — theme/language/provider selection.
- `aiSettingsStore` — selected AI provider + custom providers (metadata in MMKV, API keys in `react-native-keychain` via `src/services/keychain.ts`, never in MMKV).
- `alarmStore` — separate `Alarm` model (`src/types/alarm.ts`) with its own MMKV instance (`alarms-storage`), distinct from the routine-alarm fields on `RoutineEvent`. Always calls the native `AlarmService` before persisting: create = schedule-then-save, update/toggle = cancel-then-reschedule-then-save, so JS state never gets ahead of what's actually scheduled natively.
- `pomodoroStore` — in-memory timer (setInterval-driven), persists completed sessions via `storage.savePomodoroSession` and updates subtask stats through `routinesStore.recordPomodoroForSubtask`.

`RoutineEvent` stores day/category/status as raw string enums (`dayRaw`, `categoryRaw`, `statusRaw`) rather than typed enums directly — computed/typed views are the `*WithComputed` types in `src/types/models.ts`.

### Two parallel alarm systems
1. **Routine alarms** — fields on `RoutineEvent` (`alarmEnabled`, `alarmTime`, `alarmDaysRaw`, `notifyMinutesBefore`), scheduled through `src/services/notifications.ts`. Android uses the custom native `AndroidAlarmModule` (`AlarmManager.setAlarmClock()`, exact and Doze-proof); iOS uses `@notifee/react-native` trigger notifications.
2. **Standalone alarms** — `Alarm` model in `alarmStore`, scheduled through `src/services/AlarmService.ts`, which dispatches per-platform to `src/native/AndroidAlarmModule.ts` (AlarmManager) or `src/native/IOSAlarmKitModule.ts` (iOS 26+ AlarmKit only — `AlarmService.checkAvailability()` gates on iOS version, `< 26` is unsupported).

Native bridge modules live at `android/app/src/main/java/com/myroutinern/alarm/` (`AndroidAlarmModule.kt`, `AlarmTriggerReceiver.kt`, `AlarmRingingActivity.kt`, `AlarmPlaybackService.kt`, `BootReceiver.kt` for reboot rescheduling) and `ios/MyRoutineRN/AlarmKitModule.swift`. JS-side wrappers in `src/native/` are the only files that should reference `NativeModules.AndroidAlarmModule` / `IOSAlarmKitModule` directly.

Alarm firing navigation (cold start + hot path) is wired in `App.tsx`: it polls `AndroidAlarmModule.getInitialAlarmIntent()` until `NavigationContainer` is ready, and separately subscribes to the `AlarmFired` native event, both navigating to the `AlarmRinging` screen.

### AI routine parsing
`src/services/aiParser.ts` turns free text (or transcribed audio) into `RoutineEvent` drafts:
- Text: calls whichever provider is selected in `aiSettingsStore` (`builtin:anthropic`, `builtin:openai`, or `custom:<id>`) via `getAPIConfig`. Anthropic and OpenAI-compatible payloads are built differently (`callAnthropicAPI` vs `callOpenAICompatibleAPI`).
- Audio: always transcribes via OpenAI Whisper regardless of selected text provider, then feeds the transcript through the same text path.
- Response is defensively parsed: `extractAndValidateRoutines` strips markdown fences, attempts JSON.parse, and on failure calls `repairTruncatedJSON` to recover a partial response cut off by `max_tokens`. `validateAndFix` then clamps every field (duration ranges per category in `CATEGORY_DURATION`, days 1–7, HH:MM time format, alarm always forced `true`) — never trust the model's output directly.
- `formatExistingRoutines` feeds a compact summary of current routines back into the system prompt so "update"/"adjust" requests can target existing routines by name.

### Navigation
Single stack (`RootNavigator.tsx`) with a bottom-tab `Main` route (`Today`, `Week`, `Calendar`, `Stats`, `Settings`) plus modal/detail screens pushed on top (`EventDetail`, `EventEditor`, `SubtaskEditor`, `Pomodoro` and `VoiceCreator` as full-screen modals, `AlarmRinging` as a full-screen modal, etc.). Route params are typed in `src/navigation/types.ts`.

### Theming
`src/theme/useTheme.ts` is the single entry point components use for colors/spacing/typography — it resolves `AppThemeMode` (light/dark/system) against `useColorScheme()` and returns tokens from `src/theme/AppTheme.ts`. Don't hardcode colors in components; pull from `useTheme()`.

### i18n
`src/i18n/` uses `react-i18next` with locale files in `src/i18n/locales/{en,es,fr}.json`. `AppLanguage` enum maps to locale bundles via `APP_LANGUAGE_CONFIG`.
