# SCSS Style Guide - ChatGPT-like React App

## 📁 파일 구조

```
src/styles/scss/
├── abstracts/
│   ├── _variables.scss     # 색상, 폰트, 간격 변수
│   └── _mixins.scss        # 재사용 가능한 믹스인
├── base/
│   ├── _reset.scss         # CSS 리셋 & 기본 스타일
│   └── _typography.scss    # 폰트 & 텍스트 스타일
├── layout/
│   └── _layout.scss        # 그리드, 레이아웃 구조
├── components/
│   └── _components.scss    # 공통 UI 컴포넌트
├── pages/
│   ├── _chat-input.scss    # ChatInput 컴포넌트
│   ├── _chat-sidebar.scss  # ChatSidebar 컴포넌트
│   ├── _message-list.scss  # MessageList 컴포넌트
│   ├── _settings-panel.scss # SettingsPanel 컴포넌트
│   └── _usage-info.scss    # UsageInfo 컴포넌트
└── main.scss              # 메인 import 파일
```

## 🎨 변수 시스템

### 색상 팔레트

```scss
// _variables.scss에서 정의된 색상
$colors: (
  primary: #1b6ec2,
  white: #ffffff,
  gray-50: #f8f9fa,
  gray-500: #6c757d,
  // ... 기타 색상
);

// 테마별 색상 맵
$light-theme: (
  bg-primary: map-get($colors, white),
  text-primary: map-get($colors, gray-800),
  // ... 기타 라이트 테마 색상
);

$dark-theme: (
  bg-primary: #1a1a1a,
  text-primary: map-get($colors, white),
  // ... 기타 다크 테마 색상
);
```

### 간격 시스템

```scss
$spacers: (
  0: 0,
  1: 0.25rem,    // 4px
  2: 0.5rem,     // 8px
  3: 0.75rem,    // 12px
  4: 1rem,       // 16px
  5: 1.25rem,    // 20px
  // ... 기타 간격
);

// 사용법
.example {
  padding: spacing(4);  // 1rem (16px)
  margin: spacing(2);   // 0.5rem (8px)
}
```

### 반응형 브레이크포인트

```scss
$breakpoints: (
  xs: 0,
  sm: 576px,
  md: 768px,
  lg: 992px,
  xl: 1200px,
  xxl: 1400px
);
```

## 🔧 믹스인 가이드

### 반응형 믹스인

```scss
// 모바일 우선 (min-width)
@include media-breakpoint-up(md) {
  // 768px 이상에서 적용
}

// 데스크톱 우선 (max-width)
@include media-breakpoint-down(lg) {
  // 992px 미만에서 적용
}

// 범위 지정
@include media-breakpoint-between(sm, lg) {
  // 576px - 992px 사이에서 적용
}
```

### 레이아웃 믹스인

```scss
// Flexbox 유틸리티
@include flex-center;     // display: flex + center alignment
@include flex-between;    // space-between + center align
@include flex-column;     // flex-direction: column

// 버튼 스타일
@include button-style($bg-color, $text-color, $border-color);

// 폼 컨트롤
@include form-control-style();

// 카드 스타일
@include card-style($padding);
```

### 유틸리티 믹스인

```scss
// 텍스트 자르기
@include text-truncate(1);    // 한 줄
@include text-truncate(3);    // 세 줄

// 스크롤바 커스텀
@include custom-scrollbar(8px, transparent, var(--border-color));

// 호버 효과
@include hover-lift(-2px, 0 4px 8px rgba(0, 0, 0, 0.15));
```

## 🏗️ 컴포넌트 스타일링 패턴

### BEM 네이밍 컨벤션

```scss
// Block__Element--Modifier 패턴
.chat-input {
  // Block
  
  &__wrapper {
    // Element: .chat-input__wrapper
  }
  
  &__input {
    // Element: .chat-input__input
    
    &--disabled {
      // Modifier: .chat-input__input--disabled
    }
  }
  
  &__send-btn {
    // Element: .chat-input__send-btn
    
    &--sending {
      // Modifier: .chat-input__send-btn--sending
    }
  }
}
```

### 컴포넌트별 스타일 격리

```scss
// pages/_chat-input.scss
.chat-input {
  // 이 컴포넌트만의 고유한 스타일
  
  // 공통 컴포넌트 확장
  &__input {
    @extend .form-control;
  }
  
  &__send-btn {
    @extend .btn;
    @extend .btn--primary;
  }
}
```

## 🎯 테마 시스템 사용법

### CSS 변수와 SCSS 함수 조합

```scss
// CSS 변수 (런타임 변경 가능)
:root {
  @include theme-variables($light-theme);
}

[data-theme="dark"] {
  @include theme-variables($dark-theme);
}

// SCSS 함수 (빌드타임 계산)
.example {
  color: color(primary);                    // SCSS 맵에서 색상
  background: var(--bg-primary);           // CSS 변수
  padding: spacing(4);                     // SCSS 함수
  
  // 색상 변형
  border-color: color-variant(color(primary), 'light');
}
```

### 다크 테마 대응

```scss
.component {
  color: var(--text-primary);
  background: var(--bg-primary);
  
  // 다크 테마 전용 스타일
  [data-theme="dark"] & {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  }
}
```

## 📝 새 컴포넌트 추가 가이드

### 1. 컴포넌트 스타일 파일 생성

```scss
// pages/_new-component.scss
.new-component {
  // 기본 스타일
  
  &__element {
    // 하위 요소
  }
  
  &--modifier {
    // 상태 변형
  }
}

// 반응형 스타일
@include media-breakpoint-down(md) {
  .new-component {
    // 모바일 스타일
  }
}
```

### 2. main.scss에 import 추가

```scss
// main.scss 하단에 추가
@import "pages/new-component";
```

### 3. 공통 패턴 활용

```scss
.new-component {
  // 공통 컴포넌트 확장
  @extend .card;
  
  // 믹스인 활용
  @include flex-center;
  
  // 변수 사용
  padding: spacing(4);
  color: var(--text-primary);
  
  &__button {
    @include button-style(var(--btn-primary-bg), white);
  }
}
```

## ⚡ 성능 최적화 팁

### 1. 선택자 최적화

```scss
// ❌ 피해야 할 패턴
.component .element .sub-element {
  // 너무 깊은 중첩
}

// ✅ 권장 패턴
.component {
  &__element {
    &-sub {
      // BEM으로 평면화
    }
  }
}
```

### 2. 믹스인 남용 방지

```scss
// ❌ 단순한 스타일을 믹스인으로
@mixin simple-style {
  color: red;
}

// ✅ 복잡하거나 재사용성이 높은 스타일만 믹스인으로
@mixin complex-button($bg, $text, $hover-effect: true) {
  // 복잡한 로직
}
```

### 3. CSS 변수와 SCSS 변수의 적절한 사용

```scss
// CSS 변수: 런타임 변경이 필요한 경우 (테마 등)
background: var(--bg-primary);

// SCSS 변수: 빌드타임에 결정되는 값
padding: spacing(4);
font-size: $font-size-base;
```

## 🔍 디버깅 팁

### 1. 컴파일 에러 해결

```scss
// CSS 변수는 SCSS 함수에 사용할 수 없음
// ❌ 
background: darken(var(--primary-color), 10%);

// ✅
background: var(--primary-color);
filter: brightness(0.9); // 대신 CSS 필터 사용
```

### 2. 스타일 충돌 방지

```scss
// 네임스페이스 활용
.chat-input {
  // 이 블록 안에서만 유효한 스타일
  
  .btn {
    // 전역 .btn과 구분됨
  }
}
```

## 📦 빌드 설정

현재 프로젝트는 Vite + Sass로 구성되어 있으며, main.tsx에서 `main.scss` 하나만 import하면 모든 스타일이 자동으로 포함됩니다.

```typescript
// main.tsx
import './styles/scss/main.scss'
```

### 빌드 최적화 옵션

- CSS 압축: Vite가 자동 처리
- Autoprefixer: 필요시 postcss.config.js에서 설정
- 미사용 CSS 제거: PurgeCSS 등의 도구 활용 가능

---

## 마이그레이션 완료 사항

✅ **완료된 작업:**
1. 기존 CSS 파일들을 SCSS로 전환
2. 중복 스타일 제거 및 모듈화
3. BEM 네이밍 컨벤션 적용
4. 반응형 믹스인 구현
5. 테마 시스템 개선
6. 컴포넌트별 스타일 격리

✅ **성능 개선:**
- CSS 파일 수 감소 (8개 → 1개)
- 중복 코드 제거로 파일 크기 최적화
- 체계적인 변수 시스템으로 유지보수성 향상

이 가이드를 참고하여 일관된 스타일링을 유지하고, 새로운 컴포넌트를 추가할 때 기존 패턴을 활용하시기 바랍니다.

---

## 중복 방지 규칙 (2025-08-29 업데이트)

- 전역 키프레임: `spin` 등 공용 애니메이션은 `abstracts/_mixins.scss`에 한 번만 정의하고, 각 컴포넌트에서는 재정의하지 않습니다.
- 포커스 스타일: `:focus-visible` 전역 규칙은 `base/_reset.scss`에서만 관리합니다. 개별 파일에 중복 정의하지 않습니다.
- 스크롤바: 커스텀 스크롤바는 `@include custom-scrollbar(...)` 믹스인을 사용해 구현합니다. 직접 `::-webkit-scrollbar*`를 반복 정의하지 않습니다.
- 공통 폼 컨트롤: 동일한 구조의 입력류는 `%model-control-shared` 같은 플레이스홀더 또는 믹스인을 도입해 `@extend` / `@include`로 재사용합니다.