# Specification: Fix Resizing and Remove keytar

## Overview
This track addresses two primary issues: the non-functional window resizing mechanism and the build/runtime instability caused by the `keytar` native dependency.

## Functional Requirements
1. **Window Resizing Fix**:
    - Ensure that when the cursor is at the panel boundary (showing the `col-resize` state), the user can drag to change the width of the windows.
    - Fix the underlying event handling or layout constraints preventing the width update.
2. **Remove keytar Dependency**:
    - Completely remove the `keytar` library from `package.json` and the codebase.
    - Remove the `passwordManager.ts` utility and any related IPC handlers.
    - Clean up `usePasswordManager.ts` hook or replace it with a simpler storage logic.
3. **Migrate API Key Storage**:
    - Implement a simple JSON-based storage for the OpenAI API Key in the application's `userData` folder.
    - Ensure the API key persists across app restarts.

## Non-Functional Requirements
- **Build Stability**: Removing the native dependency will eliminate architecture mismatch errors (e.g., `mach-o` slice errors) during development and packaging.
- **Performance**: Resizing should be smooth and performant.

## Acceptance Criteria
- [ ] Users can drag panel boundaries to resize windows as expected.
- [ ] The app no longer requires or attempts to load the `keytar` module.
- [ ] The OpenAI API Key can be saved in the settings and is correctly loaded from a local JSON file upon startup.
- [ ] The app builds and runs successfully in both development and production (packaged) modes without native module errors.

## Out of Scope
- High-security encryption for the API key (the user has prioritized build stability over Keychain-level security).
