# Tech Stack: AI Compare

## Core Frameworks
- **Electron**: Main application framework for cross-platform desktop development.
- **React**: UI library for the rendering process.
- **TypeScript**: Typed JavaScript for both main and renderer processes.
- **Vite**: Modern build tool and development server for the React frontend.

## Key Libraries & Tools
- **Zustand**: State management for the renderer process (appStore).
- **Keytar**: Native library for accessing macOS Keychain for secure API key storage.
- **Lucide React**: Icon library for UI elements.
- **Tailwind CSS**: (Assumed, based on typical modern React setups, but I should check `global.css` or `package.json`).
- **electron-builder**: For packaging and distributing the application.

## Architectural Patterns
- **IPC (Inter-Process Communication)**: Communicates between the main and renderer processes using `preload.ts`.
- **WebView Injection**: Uses `webview.executeJavaScript()` to interact with the DOM of external AI websites.
- **Response Header Interception**: Modifies HTTP headers (like `X-Frame-Options` and `CSP`) to allow loading AI sites within `<webview>`.
- **Partitioning**: Each AI site uses its own session partition for independent Cookie and local storage management.

## Project Structure
- `src/main/`: Electron main process, handling window creation, IPC, and security.
- `src/renderer/`: React frontend, UI components, and state management.
- `assets/`: Static resources like icons and images.
- `release/`: Build and distribution artifacts.
