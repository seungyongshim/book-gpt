# chatgpt-like-react

## Tailwind CSS 마이그레이션 (2025-09)

이 프로젝트는 기존 SCSS + Bootstrap 기반 스타일을 제거하고 Tailwind CSS로 전면 전환되었습니다.

주요 변경 사항:
- `src/styles/scss` 및 Bootstrap CSS 제거 (사용하지 않음)
- `tailwind.config.js`, `postcss.config.js`, `src/styles/tailwind.css` 추가
- 다크 모드는 `data-theme="dark"` 속성과 Tailwind `dark:` 변형을 병행 지원
- 재사용되는 말풍선/패널/버튼 패턴을 Tailwind 유틸리티 및 소규모 커스텀 클래스(`chat-bubble-*`, `icon-btn`, `settings-*`)로 통합
- 후속 리팩터링: `IconButton`, `Button(variant)`, `MessageActionButtons` 컴포넌트 추출로 중복 제거

로컬 개발:
```bash
npm install
npm run dev
```

프로덕션 빌드:
```bash
npm run build
```

기존 SCSS 의존 스크립트(`stylelint` for scss)는 유틸리티 CSS 및 TSX 내 className 점검으로 대체되었습니다.
![CI](../../workflows/CI/badge.svg)

## 번들 최적화 & 코드 스플리팅 (2025-09)

마크다운 렌더링( `react-markdown`, `remark-gfm`, `rehype-highlight`, `highlight.js` ) 관련 의존성이 초기 번들에 포함되어 큰 사이즈(>300kB gzip 전) 문제를 유발하던 부분을 다음과 같이 최적화했습니다.

### 적용된 전략
1. Dynamic Import + `React.lazy`
	- `MarkdownRenderer` 컴포넌트를 분리하여 마크다운이 실제 필요할 때만 네트워크 로드
	- 초기 메시지가 전부 plain text인 경우 첫 페인트가 더 빨라짐 (TTI 감소)
2. Vite `manualChunks` 설정
	- `vendor`(react, zustand 등 공통) / `markdown`(마크다운 + 하이라이트 계열) 청크 분리
	- 사용자가 채팅 인터랙션을 시작할 때 핵심 UI가 더 빠르게 인터랙션 가능
3. 재사용 컴포넌트 추출
	- `Button`, `IconButton`, `MessageActionButtons`, `Spinner` 추출로 코드 중복 및 dead code 감소 → 트리쉐이킹 효율 상승

### 빌드 결과 (참고 스냅샷)
```
dist/assets/index-*.js           ~44 kB (gzip ~14 kB)
dist/assets/vendor-*.js         ~145 kB (gzip ~47 kB)
dist/assets/markdown-*.js       ~335 kB (gzip ~102 kB)
```
`markdown` 청크는 하이라이트 테마 + remark/rehype 파이프라인 때문이며, 지연 로딩되어 최초 경로에는 영향을 주지 않습니다.

### 추가 고려 가능한 최적화 (선택)
| 항목 | 제안 | 예상 효과 |
|------|------|-----------|
| 코드 하이라이트 경량화 | `highlight.js/lib/core` + 필요한 언어만 등록 | `markdown` 청크 30~60% 감소 |
| Shiki 대체 검토 | on-demand wasm 초기화 또는 pre-build highlighter | 일관된 테마 + 더 작은 런타임 |
| 이미지/아이콘 최적화 | Open Iconic → Heroicons(SVG tree-shake) | 사용하지 않는 폰트 제거로 ~150kB 절감 |
| Prefetch | `link rel="prefetch"` for markdown 청크 (사용자 idle 시) | 체감 지연 감소 |
| PWA 캐싱 | Service Worker로 vendor/markdown 캐시 | 재방문 속도 향상 |

### 사용 방법 요약
마크다운/코드 블럭이 전혀 필요 없는 라우트(예: 설정 페이지)에서는 추가 비용이 들지 않습니다. 메시지에 마크다운이 포함될 때 최초 한 번만 `markdown` 청크가 로드됩니다.

### 향후 작업 권장 순서
1. highlight.js 언어 subset 구성
2. 아이콘 폰트 제거 & SVG 아이콘 전환
3. Service Worker (PWA) 도입
4. 성능 프로파일링 (LCP/TTI) 측정 후 필요 시 prefetch 조정

---
이 최적화 섹션은 변경 추적을 위해 날짜와 함께 유지하세요. 새로운 전략을 적용하면 bullet을 업데이트하거나 Deprecated 표기를 추가하십시오.
