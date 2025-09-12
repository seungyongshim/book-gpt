# Book-GPT: 채팅 기반 AI 책 작성 플랫폼

## 🎯 프로젝트 개요

Book-GPT는 GPT를 활용하여 채팅 기반 인터페이스로 책을 작성할 수 있는 React SPA 웹 애플리케이션입니다. 사용자는 자연스러운 대화를 통해 책의 주제를 정하고, 목차를 구성하며, 각 챕터의 내용을 생성하고 편집할 수 있습니다.

## 🏗️ 아키텍처 개요

### 핵심 기능

- **채팅 기반 UI**: 실시간 메시지 주고받기, 스트리밍 응답
- **AI 책 작성**: GPT를 활용한 자동 목차 생성 및 챕터 작성
- **실시간 편집**: 생성된 내용의 즉시 편집 및 수정
- **책 미리보기**: 완성된 책의 읽기 모드 제공
- **프로젝트 관리**: 여러 책 프로젝트 동시 관리

### 기술 스택

#### 프론트엔드 코어

- **React 18** - Hook 기반, Concurrent Features 활용
- **TypeScript** - 타입 안정성 보장
- **Vite** - 빠른 개발 환경 및 빌드
- **React Router v6** - SPA 라우팅

#### 상태 관리

- **Zustand** - 가벼운 클라이언트 상태 관리
- **TanStack Query (React Query)** - 서버 상태 관리 및 캐싱

#### UI/UX

- **Tailwind CSS** - 유틸리티 기반 스타일링
- **Headless UI** - 접근성이 보장된 무헤드 컴포넌트
- **Framer Motion** - 부드러운 애니메이션
- **React Markdown** - 마크다운 렌더링

#### 개발 도구

- **ESLint + Prettier** - 코드 품질 및 포맷팅
- **Husky** - Git 훅 관리
- **Vitest** - 단위 테스트

## 📁 프로젝트 구조

```
src/
├── components/              # 재사용 가능한 컴포넌트
│   ├── ui/                 # 기본 UI 컴포넌트
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── Spinner.tsx
│   ├── chat/               # 채팅 관련 컴포넌트
│   │   ├── ChatContainer.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageItem.tsx
│   │   ├── InputArea.tsx
│   │   └── TypingIndicator.tsx
│   ├── book/               # 책 관련 컴포넌트
│   │   ├── BookEditor.tsx
│   │   ├── BookViewer.tsx
│   │   ├── ChapterList.tsx
│   │   ├── ChapterEditor.tsx
│   │   └── TableOfContents.tsx
│   └── common/             # 공통 컴포넌트
│       ├── Layout.tsx
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── ErrorBoundary.tsx
├── pages/                  # 페이지 컴포넌트
│   ├── HomePage.tsx
│   ├── ChatPage.tsx
│   ├── BookPage.tsx
│   └── SettingsPage.tsx
├── hooks/                  # 커스텀 훅
│   ├── useChat.ts
│   ├── useBook.ts
│   ├── useGPT.ts
│   └── useLocalStorage.ts
├── stores/                 # Zustand 스토어
│   ├── chatStore.ts
│   ├── bookStore.ts
│   ├── userStore.ts
│   └── uiStore.ts
├── services/               # API 서비스
│   ├── gptService.ts
│   ├── storageService.ts
│   └── types.ts
├── types/                  # TypeScript 타입 정의
│   ├── chat.ts
│   ├── book.ts
│   ├── user.ts
│   └── api.ts
├── utils/                  # 유틸리티 함수
│   ├── constants.ts
│   ├── helpers.ts
│   ├── formatters.ts
│   └── validators.ts
└── styles/                 # 글로벌 스타일
    ├── globals.css
    └── components.css
```

## 🎨 컴포넌트 아키텍처

### 메인 레이아웃

```tsx
<Layout>
  <Header />
  <div className="flex">
    <Sidebar />
    <MainContent>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/book/:id" element={<BookPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </MainContent>
  </div>
</Layout>
```

### 채팅 인터페이스

```tsx
<ChatContainer>
  <MessageList>
    {messages.map(message => (
      <MessageItem key={message.id} message={message} />
    ))}
    <TypingIndicator isVisible={isTyping} />
  </MessageList>
  <InputArea onSend={handleSendMessage} />
</ChatContainer>
```

### 책 편집 인터페이스

```tsx
<BookEditor>
  <div className="flex">
    <ChapterList
      chapters={book.chapters}
      selectedChapter={selectedChapter}
      onChapterSelect={setSelectedChapter}
    />
    <ChapterEditor chapter={selectedChapter} onChapterUpdate={updateChapter} />
  </div>
  <TableOfContents book={book} />
</BookEditor>
```

## 🗄️ 상태 관리

### Chat Store (chatStore.ts)

```typescript
interface ChatState {
  messages: Message[];
  currentConversationId: string | null;
  isLoading: boolean;
  streamingMessage: string | null;

  // Actions
  addMessage: (message: Message) => void;
  updateStreamingMessage: (content: string) => void;
  clearChat: () => void;
  loadConversation: (id: string) => void;
}
```

### Book Store (bookStore.ts)

```typescript
interface BookState {
  books: Book[];
  currentBook: Book | null;
  selectedChapter: Chapter | null;
  isGenerating: boolean;

  // Actions
  createBook: (title: string, description: string) => void;
  updateBook: (id: string, updates: Partial<Book>) => void;
  addChapter: (bookId: string, chapter: Chapter) => void;
  updateChapter: (chapterId: string, content: string) => void;
  generateTableOfContents: (prompt: string) => Promise<void>;
  generateChapter: (chapterId: string, prompt: string) => Promise<void>;
}
```

### UI Store (uiStore.ts)

```typescript
interface UIState {
  sidebarOpen: boolean;
  activeModal: string | null;
  theme: 'light' | 'dark';

  // Actions
  toggleSidebar: () => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}
```

## 🤖 GPT API 연동

### GPT Service 구조

```typescript
class GPTService {
  // 스트리밍 채팅 응답
  async streamChatCompletion(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void
  ): Promise<void>;

  // 책 목차 생성
  async generateTableOfContents(topic: string, requirements: string[]): Promise<TableOfContents>;

  // 챕터 내용 생성
  async generateChapter(context: BookContext, chapterOutline: ChapterOutline): Promise<string>;

  // 내용 개선 제안
  async improveContent(content: string, improvementType: string): Promise<string>;
}
```

### 에러 처리 전략

- **Rate Limiting**: 429 에러 시 지수 백오프 재시도
- **Network Errors**: 자동 재시도 및 사용자 알림
- **API Key 관리**: 환경변수 및 보안 저장
- **Graceful Degradation**: API 실패 시 로컬 저장된 내용 유지

## 📱 사용자 인터페이스

### 채팅 기반 책 작성 워크플로우

1. **프로젝트 시작**
   - "새 책을 만들고 싶어요"
   - 주제, 장르, 대상 독자 등 대화로 설정

2. **목차 생성**
   - AI가 제안하는 목차 구조
   - 사용자 피드백으로 목차 수정
   - 최종 목차 승인

3. **챕터별 작성**
   - 챕터 선택 후 "이 챕터를 써주세요"
   - 스트리밍으로 실시간 내용 생성
   - 즉시 편집 및 수정 가능

4. **검토 및 완성**
   - 전체 책 미리보기
   - 부분 수정 및 개선
   - 최종 완성본 저장/내보내기

### 반응형 디자인

- **Desktop**: 사이드바 + 메인 컨텐츠 레이아웃
- **Tablet**: 접을 수 있는 사이드바
- **Mobile**: 하단 탭 네비게이션 + 풀스크린 모드

## 🔄 데이터 플로우

### 메시지 처리 플로우

```
User Input → ChatStore → GPT Service → Streaming Response → UI Update
     ↓
Book Context Update → BookStore → Local Storage
```

### 책 생성 플로우

```
Topic Discussion → TOC Generation → Chapter Creation → Real-time Editing
       ↓                ↓               ↓              ↓
   ChatStore      BookStore       GPT Service    Live Preview
```

## 🔐 보안 및 성능

### 보안 조치

- **API Key 보호**: 환경변수 및 프록시 서버 사용
- **XSS 방지**: DOMPurify를 통한 사용자 입력 정화
- **CSRF 보호**: 토큰 기반 요청 검증

### 성능 최적화

- **코드 스플리팅**: React.lazy()를 통한 라우트별 분할
- **메모이제이션**: React.memo, useMemo, useCallback 활용
- **가상화**: 긴 채팅 리스트를 위한 react-window
- **이미지 최적화**: 지연 로딩 및 WebP 포맷 지원

## 🚀 개발 및 배포

### 개발 환경 설정

```bash
# 프로젝트 설치
npm install

# 개발 서버 시작
npm run dev

# 타입 체크
npm run type-check

# 린팅
npm run lint

# 테스트
npm run test
```

### 빌드 및 배포

```bash
# 프로덕션 빌드
npm run build

# 미리보기
npm run preview

# 배포 (Vercel/Netlify)
npm run deploy
```

## 📋 향후 확장 계획

### Phase 1: 기본 기능

- [x] 채팅 기반 UI 구현
- [x] GPT API 연동
- [x] 기본 책 편집 기능
- [x] 로컬 저장소 연동

### Phase 2: 고급 기능

- [ ] 다중 언어 지원
- [ ] 책 템플릿 시스템
- [ ] 협업 기능 (실시간 공유)
- [ ] PDF/EPUB 내보내기

### Phase 3: 확장 기능

- [ ] 이미지 생성 연동 (DALL-E)
- [ ] 음성 인식/합성
- [ ] 모바일 앱 (React Native)
- [ ] 클라우드 백업 및 동기화

## 🎯 핵심 설계 원칙

1. **사용자 중심**: 직관적이고 자연스러운 대화형 인터페이스
2. **실시간성**: 스트리밍을 통한 즉각적인 피드백
3. **확장성**: 모듈화된 구조로 기능 추가 용이
4. **성능**: 최적화된 렌더링과 효율적인 상태 관리
5. **접근성**: 모든 사용자가 접근 가능한 웹 표준 준수

이 아키텍처는 확장 가능하고 유지보수가 용이하며, 사용자에게 탁월한 경험을 제공하는 현대적인 웹 애플리케이션을 구축하기 위한 견고한 기반을 제공합니다.
