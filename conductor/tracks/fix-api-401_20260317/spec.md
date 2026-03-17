# Specification: Fix API 401 Authentication Error

## Overview
This track addresses a critical bug where API-based summarization fails with an HTTP 401 Unauthorized error. This issue was introduced after migrating from `keytar` to local JSON storage for the OpenAI-compatible API key.

## Problem Description
- **Error Message**: `API 401: {"error":{"message":"Authentication Fails, Your api key: ****eb7d is invalid", ...}}`
- **Scope**: Affects all API models (DeepSeek, Kimi, etc.) used in the summary module.
- **Context**: Occurs when trying to generate a summary. The key displayed in the error message appears to be incorrect or truncated.

## Functional Requirements
1. **API Key Integrity**: Ensure the API key is correctly saved to and loaded from the new `config.json` file.
2. **Correct Data Flow**: Ensure the API key is correctly passed from the renderer process (Zustand store) to the main process during the `api:proxy-stream` IPC call.
3. **Validation**: Add logging (masked) to verify the key being used by the main process proxy.

## Acceptance Criteria
- [ ] Users can save their API key in Settings.
- [ ] The API key persists and is correctly loaded on app restart.
- [ ] The Summary feature works without 401 errors for all configured providers.
- [ ] No regression in the local JSON storage mechanism.

## Out of Scope
- Reverting to `keytar`.
