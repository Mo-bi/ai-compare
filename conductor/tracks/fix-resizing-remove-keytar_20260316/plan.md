# Implementation Plan: Fix Resizing and Remove keytar

## Phase 1: Dependency Cleanup
- [x] Task: Remove `keytar` from `package.json` dependencies.
- [x] Task: Uninstall `keytar` and remove related `node_modules`.
- [x] Task: Remove `src/main/passwordManager.ts`.
- [x] Task: Clean up `src/main/main.ts` by removing `keytar`-related IPC handlers.
- [x] Task: Update `src/renderer/electron.d.ts` to reflect the removal of the old `password` API.
- [x] Task: Delete `src/renderer/hooks/usePasswordManager.ts`.

## Phase 2: Simple Local Key Storage
- [x] Task: Implement a lightweight JSON storage utility in the main process (using Node.js `fs`).
- [x] Task: Update the `electronAPI` in `src/main/main.ts` to provide `getApiKey` and `setApiKey` using the new JSON storage in the `userData` folder.
- [x] Task: Update the renderer (likely `SettingsPanel.tsx` or `appStore.ts`) to use the new simple storage API.

## Phase 3: Fix Resizing Logic
- [x] Task: Investigate the event flow in `PanelContainer.tsx` and `WebviewPanel.tsx`.
- [x] Task: Fix the `mousemove` event handling during resize to ensure the `onPanelWidthChange` callback is triggered correctly.
- [x] Task: Ensure the `flex: 0` setting doesn't prevent width updates.
- [x] Task: Verify the "resizing overlay" doesn't block its own resizing logic.

## Phase 4: Final Verification
- [ ] Task: Verify window resizing is smooth and works across multiple panels.
- [ ] Task: Verify the OpenAI API Key is saved and persists across app restarts.
- [ ] Task: Ensure the build process is clean (no `keytar` errors).
- [ ] Task: Conductor - User Manual Verification 'Phase 4' (Protocol in workflow.md)
