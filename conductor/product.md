# Product Definition: AI Compare

## Overview
AI Compare is a desktop application designed to provide a side-by-side comparison of multiple AI chat models. It leverages the free web versions of popular AI services, bypassing API costs and allowing users to interact with multiple models simultaneously in a unified interface.

## Core Purpose
To empower users to compare AI responses directly, identify the best model for a specific task, and synthesize information from multiple sources without manual copy-pasting or multiple browser tabs.

## Target Audience
- Developers and researchers testing different LLMs.
- Writers and creators looking for diverse perspectives.
- General users who want to find the most accurate or helpful AI responses.

## Key Features
1. **Multi-Workspace Support**: Organize different sets of AI models into workspaces with independent chat states.
2. **Parallel Chat Windows**: View multiple AI models side-by-side using Electron's `<webview>` tags.
3. **Unified Global Input**: Send a single prompt to all enabled models simultaneously with a synchronized input bar.
4. **Summary and Synthesis**: Automatically extract and summarize chat history from all windows using local aggregation or optional LLM APIs.
5. **Secure Credential Management**: Store API keys safely using macOS Keychain integration.
6. **Customizable Layout**: Drag and resize model windows for an optimized viewing experience.

## Feature Roadmap
- [ ] Support for more international and niche AI models.
- [ ] Advanced prompt templates and variables.
- [ ] Exporting chat comparisons to various formats (PDF, Markdown, JSON).
- [ ] Enhanced local summarization (offline models or sophisticated text processing).
- [ ] Browser-based version or mobile companion (future consideration).
