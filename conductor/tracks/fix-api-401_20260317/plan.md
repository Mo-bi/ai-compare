# Implementation Plan: Fix API 401 Authentication Error

## Phase 1: Debugging & Root Cause Analysis
- [x] Task: Audit `src/main/main.ts` IPC handlers for `config:get-api-key` and `config:set-api-key`.
- [x] Task: Inspect the `api:proxy-stream` handler in `src/main/main.ts` to see how the `Authorization` header is constructed.
- [x] Task: Verify the exact format of the saved `config.json` file in the `userData` directory.

## Phase 2: Fix & Robustness
- [x] Task: Correct any issues found in the API key storage or retrieval logic.
- [x] Task: Ensure the renderer store (`appStore.ts`) properly initializes the API key from the local storage on startup.
- [x] Task: Add trim logic to the API key input in `SettingsPanel.tsx` to prevent whitespace issues.
- [x] Task: Add masked logging in the main process to verify the first and last 4 characters of the API key being sent to providers.

## Phase 3: Validation
- [ ] Task: Verify the fix by saving a valid API key and running a summary.
- [ ] Task: Verify persistence by restarting the app.
- [ ] Task: Conductor - User Manual Verification 'Phase 3' (Protocol in workflow.md)
