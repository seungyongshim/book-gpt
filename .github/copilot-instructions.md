# Book-GPT Copilot Instructions

## Project Overview

Book-GPT is a React-based SPA that enables users to write books through a chat interface powered by GPT. The application allows natural conversation-based book creation, from topic selection to chapter generation and editing.

## Tech Stack & Architecture

### Core Technologies
- **React 18** with TypeScript
- **Vite** for development and build
- **Tailwind CSS** for styling (migrated from SCSS/Bootstrap)
- **Zustand** for state management
- **React Markdown** with syntax highlighting

### Code Organization
```
src/
├── components/
│   ├── UI/           # Reusable UI components (Button, Icon, etc.)
│   ├── Chat/         # Chat interface components
│   ├── Settings/     # Settings panel components
│   └── Sidebar/      # Navigation sidebar components
├── hooks/            # Custom React hooks
├── stores/           # Zustand state stores
├── services/         # API and external service integrations
└── styles/           # Global styles and Tailwind CSS
```

## Development Guidelines

### Code Style & Standards
- **TypeScript**: Use strict typing, avoid `any`
- **React**: Functional components with hooks only
- **Styling**: Use Tailwind CSS utilities, avoid custom CSS unless necessary
- **State**: Use Zustand for client state, React Query for server state
- **Imports**: Use absolute imports for `src/` directory

### Component Patterns
1. **UI Components**: Small, reusable, single responsibility
2. **Feature Components**: Combine UI components for specific features
3. **Page Components**: Top-level route components
4. **Hooks**: Extract complex logic into custom hooks

### Naming Conventions
- **Files**: PascalCase for components (`Button.tsx`), camelCase for utilities (`apiClient.ts`)
- **Components**: PascalCase (`MessageBubble`)
- **Hooks**: Start with `use` (`useChat`, `useTheme`)
- **Stores**: End with `Store` (`chatStore`, `settingsStore`)

## Performance Considerations

### Bundle Optimization
- **Code Splitting**: Use `React.lazy()` for heavy components (especially markdown rendering)
- **Dynamic Imports**: Defer loading of non-critical dependencies
- **Manual Chunks**: Separate vendor libraries from application code

### Key Optimizations Applied
- Markdown rendering components are lazy-loaded
- Icons use custom SVG system instead of font libraries
- Vendor libraries separated into distinct chunks

## Key Features to Understand

### Chat Interface
- Real-time messaging with streaming responses
- Markdown rendering with code syntax highlighting
- Message actions (copy, edit, delete)
- Dark/light theme support

### State Management
- `chatStore`: Messages, conversations, streaming state
- `settingsStore`: User preferences, theme, API keys
- Local storage persistence for user data

### Styling System
- **Tailwind CSS**: Primary styling method
- **Custom Components**: `Button`, `IconButton`, `Icon` for consistency
- **Theme Support**: Dark mode via `data-theme` attribute
- **Responsive**: Mobile-first responsive design

## Development Workflow

### Setup & Scripts
```bash
npm install          # Install dependencies
npm run dev         # Start development server
npm run build       # Production build
npm run lint        # ESLint check
npm run stylelint   # Stylelint check
npm run format      # Prettier formatting
```

### Code Quality
- **ESLint**: TypeScript/React rules, max 10 warnings allowed
- **Stylelint**: SCSS/CSS linting for any custom styles
- **Prettier**: Consistent code formatting
- **TypeScript**: Strict type checking

### Testing Strategy
- Unit tests for utility functions and hooks
- Component testing for UI interactions
- Integration tests for feature workflows

## AI Integration Guidelines

### GPT API Integration
- Streaming responses for real-time experience
- Error handling with retry logic
- Rate limiting considerations
- API key security (environment variables)

### Content Generation
- Book outline/table of contents generation
- Chapter content creation
- Content improvement suggestions
- Context-aware responses

## Security & Best Practices

### Data Handling
- Client-side storage for user data
- Secure API key management
- Input sanitization for user content
- XSS prevention in markdown rendering

### Performance
- Lazy loading for non-critical features
- Image optimization and lazy loading
- Bundle size monitoring
- Memory leak prevention

## Common Patterns & Examples

### Creating New Components
```tsx
// UI Component example
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  onClick
}) => {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};
```

### State Management
```tsx
// Zustand store example
interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  addMessage: (message: Message) => void;
  setStreaming: (isStreaming: boolean) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message]
  })),
  setStreaming: (isStreaming) => set({ isStreaming })
}));
```

### Custom Hooks
```tsx
// Custom hook example
export const useChat = () => {
  const { messages, addMessage, isStreaming } = useChatStore();
  
  const sendMessage = useCallback(async (content: string) => {
    // Implementation
  }, []);
  
  return { messages, sendMessage, isStreaming };
};
```

## Migration Notes

### Recent Changes (2025-09)
- **SCSS → Tailwind**: Completely migrated from SCSS/Bootstrap to Tailwind CSS
- **Icon System**: Replaced Open Iconic font with custom SVG icon system
- **Bundle Optimization**: Implemented code splitting and dynamic imports
- **Component Refactoring**: Extracted reusable UI components

### Deprecated Patterns
- ❌ SCSS/CSS modules (use Tailwind utilities)
- ❌ Font-based icons (use `<Icon />` component)
- ❌ Class components (use functional components)
- ❌ Props drilling (use Zustand stores)

## Troubleshooting

### Common Issues
1. **Build Failures**: Usually TypeScript errors or missing dependencies
2. **Styling Issues**: Check Tailwind class names and responsive breakpoints
3. **State Updates**: Ensure Zustand store updates are immutable
4. **Bundle Size**: Monitor chunk sizes and lazy load heavy dependencies

### Debug Tools
- React Developer Tools
- Zustand DevTools
- Vite bundle analyzer
- Browser Performance tab

## Contributing Guidelines

When working on this project:
1. Follow the established code patterns and conventions
2. Use TypeScript strictly - no `any` types
3. Prefer Tailwind utilities over custom CSS
4. Extract reusable logic into custom hooks
5. Test new features thoroughly
6. Update documentation for architectural changes
7. Consider performance impact of new dependencies
8. Maintain backward compatibility when possible

Focus on creating maintainable, performant, and accessible user interfaces that enhance the book-writing experience through AI assistance.