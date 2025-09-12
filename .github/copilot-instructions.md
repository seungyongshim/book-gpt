# Book-GPT: ChatGPT-like React SPA for AI Book Writing

Book-GPT is a React + TypeScript + Vite single-page application that provides a ChatGPT-like interface for AI-powered book writing. Users can create conversations, manage multiple book projects, and interact with AI to generate and edit book content.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Bootstrap and Setup
- Install dependencies: `npm ci` -- takes 20-30 seconds. NEVER CANCEL. Set timeout to 60+ seconds.
- Development server: `npm run dev` -- starts in ~200ms on http://localhost:5173/book-gpt/
- Production build: `npm run build` -- takes 5-10 seconds. NEVER CANCEL. Set timeout to 30+ seconds.
- Production preview: `npm run preview` -- builds then serves on http://localhost:4173/book-gpt/

### Code Quality and Testing
- Lint code: `npm run lint` -- takes 1-2 seconds. NEVER CANCEL. Set timeout to 15+ seconds.
- Format code: `npm run format` -- takes 2-3 seconds. NEVER CANCEL. Set timeout to 15+ seconds.
- Style lint: `npm run stylelint` -- takes 1-2 seconds. Auto-fix with `npx stylelint "src/**/*.{css,scss}" --fix`
- Unit tests: `npm run test:unit` -- takes 1-2 seconds. NEVER CANCEL. Set timeout to 15+ seconds.
- E2E tests: `npm run test:e2e` -- requires `npx playwright install` first. Takes 30+ seconds. NEVER CANCEL. Set timeout to 120+ seconds.

### VSCode Integration
- Press F5 to debug with Chrome (configured in .vscode/launch.json)
- Multiple debug configurations available: Chrome, Edge, Vitest, Playwright
- Background task auto-starts Vite dev server when debugging

## Critical Build Requirements

### NEVER CANCEL Commands
- **npm ci**: May take up to 30 seconds depending on network. ALWAYS wait for completion.
- **npm run build**: TypeScript compilation + Vite build takes 5-10 seconds. ALWAYS wait for completion.
- **Playwright browser install**: Downloads 100+ MB of browsers. Can take 5+ minutes. ALWAYS wait for completion.

### Known Issues and Workarounds
- TypeScript version warning: Uses 5.9.2 but @typescript-eslint supports <5.6.0 - non-blocking warning
- Playwright download failures: May fail in restricted network environments - document as known limitation
- Empty catch blocks: Fix with proper error comments to pass ESLint

## Validation

### Manual Testing Scenarios
After making changes, ALWAYS test these core scenarios:
1. **Load Application**: Navigate to http://localhost:5173/book-gpt/ and verify UI loads completely
2. **Chat Interface**: Type a message in the chat input and verify send button becomes enabled
3. **Dark Mode Toggle**: Click theme toggle button and verify UI switches between light/dark modes
4. **Settings Controls**: Test temperature slider and model input to ensure interactive elements work
5. **Conversation Management**: Click "새 대화" (New Chat) button and verify new conversation appears in sidebar

### Automated Testing
- Unit tests cover input history, storage services, and core functionality
- E2E tests validate chat interface and newline rendering (requires Playwright browsers)
- Linting ensures code quality and consistency
- Format check ensures consistent code style

### Production Deployment
- GitHub Pages deployment via `.github/workflows/deploy.yml`
- Automatic base path configuration for GitHub Pages (`/<repo-name>/`)
- Build artifacts created in `dist/` directory
- Sourcemaps enabled for debugging production issues

## Repository Structure

### Key Directories
- `src/components/` - React components organized by feature (Chat, UI, Settings, Sidebar)
- `src/services/` - API services, storage, and business logic
- `src/stores/` - Zustand state management
- `src/styles/` - SCSS styles and Tailwind CSS configuration  
- `tests/e2e/` - Playwright end-to-end tests
- `.vscode/` - VSCode debugging and task configuration
- `.github/workflows/` - GitHub Actions deployment pipeline

### Configuration Files
- `package.json` - Dependencies and npm scripts
- `vite.config.ts` - Vite build configuration with Vitest setup
- `playwright.config.ts` - E2E test configuration
- `tsconfig.json` - TypeScript configuration
- `.eslintrc.json` - Linting rules
- `.prettierrc` - Code formatting rules
- `tailwind.config.js` - CSS framework configuration

## Common Development Tasks

### Starting Development
1. `npm ci` (first time only)
2. `npm run dev`
3. Open http://localhost:5173/book-gpt/
4. Begin making changes - hot reload is enabled

### Before Committing Changes
1. `npm run lint` - Fix any linting errors
2. `npm run format` - Format code consistently  
3. `npm run stylelint` - Fix CSS/SCSS style issues
4. `npm run test:unit` - Ensure unit tests pass
5. `npm run build` - Verify production build succeeds
6. Manual validation of key functionality

### Adding New Features
- Components go in appropriate `src/components/` subdirectory
- Add tests in `__tests__` directories alongside components  
- Update stores in `src/stores/` for state management
- Add services in `src/services/` for API integration
- Follow existing TypeScript patterns and naming conventions

### Debugging
- Use VSCode F5 debugging for interactive development
- Chrome DevTools available for runtime debugging
- Vitest UI for test debugging: `npm run test:unit:ui`
- Playwright debugging for E2E: `npm run test:e2e -- --debug`

## Application Architecture

### Core Technologies
- **Frontend**: React 18 + TypeScript + Vite
- **State Management**: Zustand for client state
- **Styling**: Tailwind CSS + SCSS modules  
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Build Tool**: Vite with TypeScript compilation
- **Deployment**: GitHub Pages via GitHub Actions

### Key Features
- ChatGPT-like conversational interface for book writing
- Dark/light theme support with system preference detection
- Local storage via IndexedDB with fallbacks
- Input history with keyboard navigation (ArrowUp/Down)
- Markdown rendering with syntax highlighting
- Responsive design for desktop and mobile
- Real-time temperature controls for AI model settings

### Expected API Integration
Application expects backend API on localhost:4141 for:
- `/v1/models` - Available AI models
- `/usage` - Usage statistics  
- Chat completion endpoints
- Connection failures are handled gracefully with user feedback

## Troubleshooting

### Common Build Failures
- **TypeScript errors**: Check for unused imports/variables, fix with proper TypeScript syntax
- **ESLint errors**: Run `npm run lint` to identify and fix code quality issues
- **StyleLint errors**: Run `npm run stylelint` or auto-fix with `--fix` flag
- **Test failures**: Check test files in `__tests__` directories, ensure mocks are correct

### Runtime Issues  
- **Blank page**: Check browser console for JavaScript errors, verify build completed successfully
- **API errors**: Expected when backend not running - application handles gracefully
- **Storage errors**: IndexedDB may be blocked - application falls back to localStorage
- **Theme not switching**: Check localStorage permissions and CSS class application

### Performance Issues
- Build includes code splitting for vendor and markdown chunks
- Large dependencies (highlight.js, markdown parsers) are chunked separately
- Sourcemaps enabled for production debugging but may increase build size
- Hot reload should be nearly instantaneous for most changes

## CI/CD Pipeline

The `.github/workflows/deploy.yml` workflow:
1. Installs Node.js 20 and dependencies via npm ci
2. Runs linting via `npm run lint` 
3. Builds production version via `npm run build`
4. Deploys to GitHub Pages automatically on main branch pushes
5. Deployment URL: `https://<username>.github.io/book-gpt/`

Always ensure your changes pass the full CI pipeline by running the same commands locally before pushing.
