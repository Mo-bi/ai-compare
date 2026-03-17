# Track: Fix Panel Resizing UX Issue

## Objective
Fix the issue where the resize cursor (`col-resize`) appears in the middle of AI panels instead of just at the edges, and ensure dragging logic works correctly.

## Key Files & Context
- `src/renderer/components/PanelContainer.tsx`: Manages the layout and flex properties of the panel wrappers.
- `src/renderer/components/WebviewPanel.tsx`: Contains the `resize-handle` element and its styling.

## Proposed Solution
The root cause is likely the `flex: 1` property on the panel wrapper in `PanelContainer.tsx`, which causes panels to expand or shrink beyond their fixed width, leading to overlapping boundaries where the absolute-positioned resize handles might end up in the middle of the visible area of another panel.

### Changes:
1.  **Fix `PanelContainer.tsx` layout**:
    -   When not maximized, panels should use `flex: 0 0 auto` and rely solely on their `width` property (or `flex: 0 0 ${panel.width}px`).
    -   Ensure the wrapper div doesn't allow content to bleed or overlap by setting correct flex and width constraints.
2.  **Improve `WebviewPanel.tsx` resize handle**:
    -   Keep the `resize-handle` at a reasonable width (e.g., 6px) but ensure its `zIndex` and positioning are strictly at the right edge.
    -   Add a visual indicator (like a color change on hover) to the handle so users know exactly where it is.
3.  **Prevent Iframe/Webview Interference**:
    -   During resizing, a transparent overlay should be shown over the webviews to prevent them from capturing mouse events, which can break the `mousemove` tracking.

## Implementation Plan

### Phase 1: Layout Fix
1.  Modify `src/renderer/components/PanelContainer.tsx`:
    -   Change the style of the panel wrapper div to `flex: "0 0 auto"` when not maximized.
    -   Add a "resize-overlay" that covers all webviews when `isResizing` is true.

### Phase 2: Handle Polish
1.  Modify `src/renderer/components/WebviewPanel.tsx`:
    -   Update `resize-handle` styles for better feedback.

## Verification
- Open multiple panels.
- Verify that the `col-resize` cursor only appears at the right edge of each panel.
- Verify that dragging actually changes the width smoothly.
- Test with many panels (where horizontal scrolling is required).
