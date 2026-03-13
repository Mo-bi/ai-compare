# Product Guidelines: AI Compare

## UI/UX Principles
1. **Side-by-Side Efficiency**: Maximize horizontal screen space for model windows. Ensure responsive resizing and smooth horizontal scrolling.
2. **Synchronized Interaction**: The global input bar should be easily accessible and provide feedback on which models are currently receiving messages.
3. **Model Integration**: Each AI site should be loaded in its native form as much as possible, with minimal modification to its internal styling unless necessary for functionality.
4. **Summary Accessibility**: The summary panel should be easily toggled and provide a clear, aggregated view of the ongoing conversation.

## Coding Conventions
- **TypeScript**: Use strong typing for all functions and state variables. Avoid `any` whenever possible.
- **React Components**: Use functional components with hooks. Consolidate logic into reusable hooks (e.g., `usePasswordManager`).
- **State Management**: Use Zustand for global application state. Keep the state as flat as possible.
- **Naming**: Use camelCase for variables and functions, and PascalCase for React components and types.

## Security Standards
- **Keychain Integration**: All sensitive information (API keys, credentials) MUST be stored in the macOS Keychain using `keytar`. Never log or commit these secrets.
- **IpcMain/IpcRenderer Security**: Follow Electron security best practices, using `preload.ts` to expose only necessary APIs to the renderer process.

## Performance Optimization
- **Webview Management**: Optimize the loading and visibility of webviews to minimize memory and CPU usage.
- **DOM Injection**: Use efficient DOM selectors and minimize the frequency of `executeJavaScript()` calls.
