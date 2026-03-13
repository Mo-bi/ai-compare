# Workflow: AI Compare

## Development Lifecycle
The development of AI Compare follows a structured lifecycle to ensure code quality and project goals:

1. **Research & Requirements**: Identify new AI models to support or features to implement. Research DOM structures and input methods for target AI sites.
2. **Strategy**: Design the implementation plan, focusing on how to inject JS and handle state across multiple windows.
3. **Implementation**: Develop features using React components and Electron main process logic. Use TypeScript for type safety and idiomatic React patterns.
4. **Validation**: Test the new feature in both development and packaged environments. Verify that JS injection works correctly for all supported AI models.
5. **Deployment**: Build and package the application using `electron-builder` for target platforms (macOS, Windows, Linux).

## Git Branching Strategy
- `main`: Stable releases and production-ready code.
- `develop`: Ongoing development and feature integration.
- `feature/*`: Specific feature branches merged into `develop`.
- `bugfix/*`: Fixes for identified issues merged into `develop`.

## CI/CD Pipeline
- (To be defined: Automated tests, linting, and build processes).

## Contributing Guidelines
- Follow established coding styles and naming conventions.
- Provide clear commit messages describing the *why* and *what* of the change.
- Ensure all new features are thoroughly tested before merging.
