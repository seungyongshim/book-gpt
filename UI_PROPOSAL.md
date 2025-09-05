# Book-GPT UI/UX 제안서

## 0. 개요
모바일 우선(Mobile-first) React + Tailwind SPA로 장편 서사 생성·편집 도구를 구현하기 위한 UI 구조, 상호작용 패턴, 디자인 시스템, 확장 전략을 정리한다. 목표는 (1) 최소 인지부하로 세계관/페이지 작성 흐름 가속, (2) 토큰/프롬프트 복잡성을 시각화하여 제어 가능, (3) 확장 가능한 도구 오케스트레이션 UI 기반 마련이다.

---
## 1. 사용자 유형 & 핵심 목표
| 사용자 | 목표 | 주요 Pain | 해결 UX 패턴 |
|--------|------|-----------|---------------|
| 1인 창작자 | 빠른 초안 대량 생산 | 장문 맥락 단절, 길이 관리 | @참조 선택 퀵패널, Prompt Preview, Token Meter |
| 장르 작가 | 톤/스타일 일관성 | 세계관/규칙 드리프트 | World Summary 캐시 상태 표시, Drift 알림 Placeholder |
| 에디터(후속) | 버전 비교/수정 | 변경 출처 추적 어려움 | Version Timeline + Diff View |

---
## 2. 상위 사용자 여정 (Primary Flows)
1. 책 생성 → 세계관 핵심 5필드 입력 → 첫 페이지 지시 작성 → @참조 없음 → 초안 스트리밍 관찰 → 간단 편집 후 저장.
2. 3~5 페이지 누적 후 새 페이지 생성 시 @3-5 범위 참조 → 프롬프트 길이 초과 경고 → 축약 레벨 제안 수용 → 생성.
3. 세계관 설정 대폭 수정(인물/규칙) → 다음 페이지 Prompt Preview에서 world.summary 재생성 배지 확인 → 새 초안 생성.
4. 이전 페이지 내용 스타일 불일치 감지(향후 기능) → 스타일 가이드 패널 확인 → 수동 편집 → Version 저장.

---
## 3. 정보 구조 (IA) & 라우팅
```
/
 /books                # BookList
 /books/:bookId        # BookDashboard
 /books/:bookId/world  # WorldBuilder
 /books/:bookId/pages/:pageIndex  # PageEditor
 /books/:bookId/pages/:pageIndex/versions  # VersionTimeline
 /books/:bookId/pages/:pageIndex/diff/:versionId  # DiffView
 /settings             # Global Settings (optional future)
```
모바일 네비 패턴: 상단 압축 AppBar + 하단 Contextual Action Bar(CAB). WorldBuilder/Editor 내 탭은 수평 스크롤 가능한 Segmented Control.

---
## 4. 주요 화면 텍스트 와이어프레임
### 4.1 Book List
```
[Header: "내 책"] [+ 새 책]
[Search Field]
[List]
  ├─ BookCard(title, genre, lastUpdated, > )
  ├─ ...
[Footer mini help]
```

### 4.2 World Builder (핵심 5필드 MVP)
```
[Header: < Back | World Setting | [Summary Badge(state)] ]
[Tabs: Premise | Characters | Factions | Rules | Style]
[Scrollable Form Panel]
[Sticky Save Button + Changed Indicator]
```
변경 시 상단 Summary Badge: (Idle / Modified* / Rebuilding… / Cached✓)

### 4.3 Book Dashboard
```
[Header: < Books | Book Title | (+ Page)]
[Filter: Status(Draft/Published/All)] [Search]
[Pages List]
  ├─ PageItem(#idx title status modifiedAt badges[Refs, Len])
  ├─ ...
[Stats Bar: Total Pages · Last Generation Time]
```

### 4.4 Page Editor
```
[Header: < Pages | #Index Title (editable) | Actions(...)]
[Body]
  [Left Drawer (collapsible)]
    - Page System Prompt (textarea w/ token count)
    - @참조 선택 패널 (Search + Selected chips + Add range)
    - World Summary Mini (expand)
    - Token Meter (Prompt vs Target)
    - Generation Settings (model, temperature, target length)
    - Generate Button (primary)
  [Right Panel]
    - StreamingOutput (monospace-ish readability)
    - Toolbar: [Refine Mode Toggle] [Summarize] [Publish]
    - Refined Editor (if toggle)
    - Version Badge / Last Saved
```
Streaming 중:
```
[Progress Bar inline] [Stop] [~chars, est tokens]
```

### 4.5 Prompt Preview (모달 or Drawer)
```
[Layer Accordion]
  1. System
  2. Book System
  3. World Summary (length + compression state)
  4. Page System
  5. Dynamic Context (@refs sorted by priority)
  6. User Instruction
[Total Tokens vs Budget][Apply Compression Suggestions]
```

### 4.6 Version Timeline
```
[Header: < Page | Versions]
[List chronological]
  - (timestamp, author, diff size, actions[View Diff | Restore])
[Restore Confirmation Dialog]
```

### 4.7 Diff View
```
[Header: < Versions | Diff vA ↔ vB]
[Split or Inline diff toggle]
[Legend: + Add / - Remove / ~ Modified]
[Restore as Draft]
```

---
## 5. 컴포넌트 계층 (요약)
- Foundation: `LayoutShell`, `TopBar`, `BottomActionBar`, `Panel`, `Modal`, `Drawer`
- Navigation: `BookNav`, `PageNav`, `TabStrip`
- Data Units: `BookCard`, `PageItem`, `CharacterCard`
- Editing: `RichTextArea`(경량), `PromptTextArea`, `ReferencePicker`, `TokenMeter`, `GenerationSettingsForm`
- Generation: `StreamingOutput`, `CompressionSuggestionList`, `PromptLayerAccordion`
- Versioning: `VersionTimeline`, `DiffView`
- Feedback: `Toast`, `InlineBadge`, `Skeleton`, `ProgressBar`
상태 경계: GPT 호출/비동기 = React Query; Persistent domain = Zustand + IndexedDB sync. UI 파생 상태(토큰 계산 등)는 memo + lightweight selectors.

---
## 6. 핵심 상호작용 흐름
### 6.1 페이지 생성
1. User 입력 (Instruction + @선택) → Parser → references state 저장
2. Generate 클릭 → PromptLayer 구성 & 토큰 프리체크 → 초과 시 Compression Dialog
3. SSE 수신 → 2,000자 마다 partial flush 저장 → Token Meter 실시간 업데이트
4. 완료 후 자동 Summary 생성 (비동기) → Page meta 갱신

### 6.2 @참조 선택
- 입력창 '@' 타이핑 → Quick palette (최근/제목/범위 안내)
- 범위 입력 패턴 감지 `3-6` → Preview 길이 추정 → 추가 버튼
- 중복 시 weight 증가 배지 (우선순위 표시)

### 6.3 세계관 수정 & 요약 캐시 무효
- 필드 변경 시 상단 Badge = Modified*
- 저장 시: Rebuilding… 스피너 → 완료 시 Cached✓ 및 worldDerived 버전 증가
- 첫 페이지 생성 진입 시 “세계관 갱신됨” 토스트 출력

### 6.4 버전 롤백
- DiffView에서 Restore → Confirm Dialog(현재 draft 보존 안내) → 새 Version append + Editor 내용 교체

### 6.5 토큰 초과 축약 제안
- Prompt Preview 하단: `현재 3240 / 3000` 경고
- Suggestion Chips: [참조 저우선 50% 축소] [WorldSummary 1200→800] [All refs bullet]
- 클릭 시 미리보기 길이 재계산 → Accept → 적용 후 닫기

---
## 7. 디자인 시스템 (Tailwind)
### 7.1 컬러 토큰 (semantic)
```
--color-bg: hsl(220 15% 9%);
--color-surface: hsl(222 18% 14%);
--color-surface-alt: hsl(222 18% 18%);
--color-border: hsl(220 12% 28%);
--color-border-accent: hsl(260 70% 55%);
--color-text: hsl(220 15% 92%);
--color-text-dim: hsl(220 10% 65%);
--color-primary: hsl(265 85% 62%);
--color-primary-hover: hsl(265 85% 70%);
--color-danger: hsl(350 70% 55%);
--color-warn: hsl(40 85% 55%);
--color-success: hsl(145 55% 45%);
--color-info: hsl(205 70% 55%);
```
Light 모드에서 대비 조정 (L* +30). Tailwind config `theme.extend.colors`에 semantic alias 매핑.

### 7.2 타이포 스케일
| Token | Rem | 용도 |
|-------|-----|------|
| text-xs | 0.75 | 메타/배지 |
| text-sm | 0.875 | 보조 텍스트 |
| text-base | 1 | 본문 |
| text-lg | 1.125 | 패널 제목 |
| text-xl | 1.25 | 화면 소제목 |
| text-2xl | 1.5 | 메인 헤더 |

### 7.3 Spacing & Radius
- Space scale: Tailwind 기본 (0, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12)
- Radius: `rounded-xs(2px)`, `sm(4px)`, `md(6px)`, `lg(10px)`, `xl(16px)` → Card=md, Modal=xl, Interactive chip=full

### 7.4 Shadows & Elevation
- `elev-0`: none
- `elev-1`: sm (패널)
- `elev-2`: md (모달/드로어)
- `focus-ring`: outline-offset-2 ring-2 ring-primary/60

### 7.5 Interactive States
- Hover: 밝기 +8% / border-accent subtle
- Active: scale-95 transition-fast
- Disabled: opacity-40 cursor-not-allowed
- Loading: skeleton pulse or spinner size-sm

### 7.6 Tailwind Config 확장 스니펫
```js
// tailwind.config.js (예시)
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        surfaceAlt: 'var(--color-surface-alt)',
        border: 'var(--color-border)',
        text: 'var(--color-text)',
        textDim: 'var(--color-text-dim)',
        primary: 'var(--color-primary)',
        danger: 'var(--color-danger)',
        warn: 'var(--color-warn)',
        success: 'var(--color-success)',
        info: 'var(--color-info)'
      },
      boxShadow: {
        'elev-1': '0 1px 2px -1px hsl(220 40% 2% / 0.4), 0 1px 3px hsl(220 40% 2% / 0.3)',
        'elev-2': '0 4px 16px -2px hsl(220 40% 2% / 0.45)'
      },
      animation: { 'pulse-slow': 'pulse 3s ease-in-out infinite' }
    }
  }
};
```

### 7.7 아이콘 전략
- Heroicons (outline + solid 혼용) → size 18/20/24
- 의미 강조: 상태 배지 색상 + 아이콘 조합 (예: Cached✓ = check-circle, Modified* = pencil-square)

---
## 8. 접근성 & 국제화
- 키보드 순서: 논리적 DOM 순, Drawer 열릴 때 focus trap.
- ARIA: `aria-live=polite` (스트리밍), `role=status` (토큰 미터), `aria-busy` (Rebuilding world summary).
- 대비: 최소 4.5:1 (본문) / 큰 텍스트 3:1.
- 단축키 제안: `Ctrl+Enter` 생성, `Alt+P` Prompt Preview, `Ctrl+K` @참조 팔레트.
- 다국어 준비: 모든 라벨 i18n key 매핑(JSON), dynamic content direction 고정(ltr 가정; 향후 rtl 고려 가능).

---
## 9. 성능 & 로딩 UX
| 상황 | 패턴 |
|------|------|
| 첫 로딩 | Skeleton + 최소 critical CSS inline |
| 세계관 요약 재생성 | Inline spinner + 이전 cache 흐릿 처리 (opacity-60) |
| 스트리밍 | 행 끝 점등 cursor + 1초 단위 토큰 추정 업데이트 |
| 대용량 페이지 스크롤 | 가상화 필요 X (12k chars 허용) → 단, DiffView는 lazy chunk diff |
| IndexedDB 초기화 | Splash with progress (store count) |
| 압축 처리 | Badge: "Compressed" hover tooltip size 절감률 |

Optimistic: 제목/상태 변경 즉시 UI 반영 후 IndexedDB 실패 시 토스트 롤백.

---
## 10. 반응형 & 다크모드
- Breakpoints: `sm: 360`, `md: 640`, `lg: 900`, `xl: 1200` (모바일 기준 확장)
- Page Editor: <900px = 세로 스택(Left Drawer 토글), ≥900px = 2열
- 다크모드 기본, Light 토글 시 root class 전환; 시스템 `prefers-color-scheme` 첫 설정 적용.

---
## 11. 확장 로드맵 UX 훅
| Phase | Placeholder / Hook |
|-------|-------------------|
| 2 | Tool Orchestrator 패널 (world.summary + references.context) 로그 탭 |
| 3 | Characters Panel: 등장 빈도/상태 칩, Embedding 기반 추천 섹션 비활성 placeholder |
| 3 | Style Guide 세부 패널 확장 버튼 "Drift Check(베타)" 비활성 |
| 4 | Consistency Agent 알림 센터 (TopBar bell) |

---
## 12. QA 체크리스트 & KPI
### 체크리스트
- [ ] 모바일 360px에서 모든 기본 플로우 스크롤만으로 수행 가능
- [ ] Generate 중 다른 페이지로 이동 시 경고 다이얼로그
- [ ] @참조 파서 잘못된 범위 입력 시 명확한 오류 메시지
- [ ] 토큰 초과 >5% 시 축약 제안 항상 노출
- [ ] DiffView 가독성 (추가/삭제 색 대비 준수)
- [ ] 세계관 수정 후 첫 생성 전 반드시 Modified 배지 유지
- [ ] 스크린리더: Generate 버튼 라벨 + 진행 상태 읽힘

### KPI (초기)
| 지표 | 목표 |
|------|------|
| 첫 초안 생성까지 평균 클릭 수 | ≤ 8 |
| 페이지 생성 중 중단율 | < 10% |
| 축약 제안 수용률 | 60%+ (과도 참조 시) |
| 롤백 기능 사용 빈도 | 15% 이하 (과도 사용은 품질 불안정 신호) |

---
## 13. 구현 우선순위 (UI)
1. Layout + BookList + BookDashboard
2. PageEditor (StreamingOutput + ReferencePicker MVP)
3. PromptPreview + TokenMeter
4. WorldBuilder (기본 5필드 + Summary Badge)
5. VersionTimeline + DiffView
6. CompressionSuggestion & Shortcut Layer

---
## 14. 리스크 & 완화
| 리스크 | 영향 | 완화 |
|--------|------|------|
| 세계관 필드 확장 시 레이아웃 과밀 | 사용성 저하 | 탭 내 아코디언 + progressive disclose |
| 긴 스트리밍 동안 사용자 지루함 | 이탈 증가 | 진행 추정·분량 목표 진행률 바 |
| 토큰 계산 부정확 초기 편차 | 잘못된 축약 | usage 피드백 기반 보정 factor 저장 |
| IndexedDB quota 근접 | 저장 실패 | 용량 경고+오래된 Version GC 안내 |

---
## 15. 요약
제안된 UI는 창작 흐름(맥락 유지 + 토큰 가시화)에 최적화된 이중 패널 편집기와 계층형 Prompt Preview를 중심으로 하며, Tailwind semantic 토큰과 상태 배지 체계를 통해 드리프트, 캐시, 축약 상태를 직관적으로 표현한다. 향후 Tool Orchestrator 및 Consistency Agent를 UI 훅(Panels/Notifications)로 자연스럽게 확장 가능하도록 설계하였다.

