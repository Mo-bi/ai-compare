# Track: Multi-AI Dialogue Window Summary Reconstruction

## Objective
Reconstruct the summary module to support reading progress tracking, window selection, prompt library management, and multiple API providers with streaming output.

## Key Files & Context
- `src/renderer/store/appStore.ts`: State management for workspaces and summary data.
- `src/renderer/components/SummaryPanel.tsx`: UI for the summary feature.
- `src/main/summaryService.ts`: Backend service for API calls (to be enhanced or moved to renderer).
- `src/renderer/App.tsx`: Orchestration of the summary workflow.

## Implementation Steps

### Phase 1: State Refactoring
1.  **Update `Workspace` Interface**:
    -   Add `summaryState`:
        -   `status`: 'idle' | 'reading' | 'selecting' | 'generating' | 'completed'
        -   `panelStatuses`: Map of panelId to { status: 'pending' | 'reading' | 'success' | 'failed', error?: string }
        -   `selectedPanelIds`: string[]
        -   `selectedPromptId`: string
        -   `generatedContent`: string
2.  **Add Prompt Management**:
    -   Add `summaryPrompts`: `{ id, name, content, isDefault }[]` to global store.
    -   Initialize with the system default template.

### Phase 2: UI Overhaul (`SummaryPanel.tsx`)
1.  **Reading Phase**: Show list of panels in current workspace with their reading status (real-time updates).
2.  **Selection Phase**:
    -   Checkbox list of panels (only successful ones).
    -   Prompt selection dropdown.
    -   Prompt editor (textarea).
3.  **Execution Phase**:
    -   Model selection (Kimi, DeepSeek, Gemini, MiniMax, Doubao).
    -   "Run API" button (streaming display).
    -   "Copy to Clipboard" button (Prompt + Content).

### Phase 3: API Integration
1.  **Streaming Support**: Implement streaming for API calls.
2.  **Multi-Provider Support**: Add configurations and handling for Kimi, DeepSeek, Gemini, MiniMax, Doubao.

### Phase 4: Workflow Orchestration
1.  **Update `handleSummarize` in `App.tsx`**:
    -   Trigger reading phase.
    -   Update statuses as webview histories are fetched.
    -   Transition to selection phase.

## Verification & Testing
- Test reading history from multiple windows simultaneously.
- Verify that summary states are independent across different workspaces.
- Test prompt editing and selection.
- Verify API streaming for at least one provider (e.g., DeepSeek or Gemini).
- Verify "One-click Copy" format.
