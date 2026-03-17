# Track: Fix Doubao Subsequent Send Issue

## Objective
Fix the issue where Doubao window only sends the first message correctly but fails on subsequent messages (text is filled but Enter/Send is not triggered).

## Key Files & Context
- `src/renderer/components/WebviewPanel.tsx`: Contains the `getSendScript` function which handles the message injection and sending logic for all AI models.

## Proposed Solution
The issue likely stems from Doubao's use of a complex input component (possibly React-based) where simply setting `textarea.value` doesn't reliably trigger the internal state update for the "Send" button to enable or for the `Enter` key listener to fire on subsequent interactions.

### Changes to `getSendScript`:
1.  **Add specialized handling for Doubao**: Use `execCommand('insertText')` combined with `CompositionEvent` to ensure the virtual DOM state is updated.
2.  **Expand button selectors**: Ensure `[data-testid="chat_input_send_button"]` and `[data-testid="chat-input-send-button"]` are both present.
3.  **Ensure Enter fallback**: Add `doubao` to the list of IDs that always trigger a `KeyboardEvent` (Enter) fallback.

## Implementation Plan

### Phase 1: Code Update
1.  Modify `src/renderer/components/WebviewPanel.tsx`:
    -   Update `getSendScript` to include a specific case for `doubao`.
    -   Add `[data-testid="chat_input_send_button"]` to `btnSelectors`.
    -   Add `id === 'doubao'` to the Enter fallback condition.

## Verification
- Reproduce the issue: Open Doubao, send one message, try sending a second.
- Apply fix and verify both messages send correctly without manual intervention.
- Verify regression on other models.
