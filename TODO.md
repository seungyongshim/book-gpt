# TODO Roadmap

프로젝트 전역 소스 코드를 스캔하여 현재 상태와 필요한 후속 작업을 정리했습니다. (2025-08-24 기준)

## 0. 기준 / 우선순위 레이블
- P0: 반드시 즉시 (핵심 기능 공백 / 데이터 손실 가능)
- P1: 핵심 UX 개선 / 주요 기능 완성
- P2: 품질 / 유지보수성 / 최적화
- P3: 부가 가치 / 실험적 개선

## 1. 필수 기능 공백 (P0)
- [ ] OpenAI Chat Completions (SSE) 실제 연동 (`src/services/gpt.ts` 현재 mock)  
	- [ ] 환경변수 기반 API key 주입 (Vite: `import.meta.env.VITE_OPENAI_API_KEY`)  
	- [ ] 모델 / 파라미터 설정 구조 (`GenerationConfig`) 활용  
	- [ ] AbortController 통한 중단 처리 exposed  
	- [ ] 에러 상태 분류 (네트워크 / 401 / rate limit / 기타)
- [x] Page 생성 시 최초 버전 자동 기록 (현재는 generate 이후만 `addVersion` 호출)  
- [x] 새로고침 시 라우팅 404 대응: GitHub Pages용 `404.html` 복제 빌드 스텝 (README 안내 반영 필요)
 - [x] `worldStore.load` 실패(없을 때 신규 초기 레코드 생성?) 정책 결정 및 처리
- [ ] IndexedDB 버전 마이그레이션 전략 문서화 (현재 `DB_VERSION=1` 고정)

## 2. 페이지/버전 관리 (P1)
- [ ] `VersionTimeline` 실제 구현  
	- [ ] 특정 `pageId`의 `pageVersions` 조회 (인덱스: `by-page`)  
	- [ ] 시간순 정렬 + 작성자 / 길이 / 생성 시각 표시  
	- [ ] 선택 버전 → DiffView 링크 (쿼리 파라미터 or 경로 param)  
- [ ] `DiffView` 구현  
	- [ ] 두 버전 선택 UI (기본: 직전 vs 선택)  
	- [ ] 단어/문장 diff (간단 LCS 또는 외부 경량 diff 알고리즘)  
	- [ ] 추가/삭제 색상 하이라이트  
- [ ] 페이지 제목/slug 편집 UI (현재 index만 표시)  
- [ ] 페이지 삭제 & 재인덱싱 정책 (index gap 허용 여부)  
- [ ] 버전 diff 저장 전략 (`PageVersion.diff` 필드 currently unused) → on-save 시 이전 snapshot 대비 diff 캐시
 - [x] `addVersion` 호출 시 페이지 `updatedAt` 동기화 (현재 pages 메타 업데이트 없음)

## 3. 프롬프트 & 참조 시스템 (P1)
- [ ] `assemblePrompt` → OpenAI 메시지 포맷 변환 유틸 추가 (system / context / user roll-up)  
- [ ] 참조된 페이지 slug 지원 (`@p:slug`) → slug ↔ id 매핑 로직 구현  
- [ ] 참조 범위 `@3-5` 너무 길 때 경고 (현재 50 초과 guard 후 전체 무효) → 사용자 피드백 UI  
- [ ] `referenceSummaries` 생성 로직: 현재 `getReferenceSummary`는 페이지 rawContent 요약만.  
	- [ ] rawContent 없을 경우 lazy fetch/generate 전략  
	- [ ] summary TTL / 재생성 조건 (페이지 업데이트  timestamp 비교)  
- [x] WorldDerived 재생성: 현재 `worldDerivedInvalidated` true일 때만 version+summary 재생성 → 최초 미존재 캐시 fallback 처리 확인 필요 (구현됨: 캐시 미존재 시 플래그와 무관하게 재생성 로직 수행)
 - [x] WorldDerived 재생성: 현재 `worldDerivedInvalidated` true일 때만 version+summary 재생성 → 최초 미존재 캐시 fallback 처리 확인 필요 (구현됨: 캐시 미존재 시 플래그와 무관하게 재생성 로직 수행)
- [ ] Token 예측 로직 정교화 (현재 단순 length 기반) + 다국어 대응 heuristic 개선

## 4. 세계관 (World) 기능 확장 (P2)
- [ ] `WorldBuilder` 추가 필드 UI: timeline / geography / factions / characters / magicOrTech / constraints  
- [ ] 자동 요약 프리뷰 (summarizeWorld 결과) 패널  
- [ ] 변경 감지 시 derived summary 즉시/지연 재계산 옵션 (debounce)  
- [ ] 캐릭터 / 파벌 구조화 (JSON schema) + 간단 validator  

## 5. 생성 흐름 개선 (P2)
- [ ] `usePageGeneration` Abort 기능 (중단 버튼)  
- [ ] 스트리밍 중 주기적 임시 저장 길이 조건 → 토큰 or 시간 기반 조정 (현재 2000 chars)  
- [ ] 사용자 지시문 + 시스템 레이어 별 토큰 분포 UI (TokenMeter 확장)  
- [ ] 모델 선택 드롭다운 (temperature / target length 입력)  
- [ ] 생성 완료 후 자동 focus / scroll 관리  
- [ ] 오류 메시지 UI 표준화 (toast / alert component)

## 6. 성능 & 안정성 (P2)
- [ ] IndexedDB 오류 (QuotaExceeded 등) 핸들링  
- [ ] 대량 페이지 로드 가상 스크롤 (BookDashboard 예상)  
- [ ] Diff 계산 Web Worker 오프로드  
- [ ] summarizeWorld / referenceSummary 캐시 사이즈 제한 & LRU 정책  
- [ ] 페이지 자동 저장(수정형 UI 도입 시) debounced write

## 7. UI/UX 개선 (P2)
- [ ] 다크/라이트 모드 토글 (현재 CSS 변수만, .light 적용 UI 없음)  
- [ ] 공용 Button / Panel / Card 컴포넌트 추출  
- [ ] 키보드 단축키: 새 페이지, 생성 실행, 프롬프트 패널 열기  
- [ ] 로딩 Skeleton (세계관 / 페이지 목록)  
- [ ] 접근성 (aria-label / semantic heading 수준 / focus ring) 점검  
- [ ] 국제화(i18n) 베이스 (ko/en) 구조 준비

## 8. 테스트 & 품질 (P2)
- [ ] 유닛 테스트 환경 설정 (Vitest or Jest)  
	- [ ] referenceParser 테스트 (단일/범위/slug/중복 weight)  
	- [ ] promptAssembler summarize 메서드 경계 조건  
	- [ ] worldDerived 캐시 재생성 조건  
- [ ] E2E (Playwright) 최소 시나리오: 책 생성 → 페이지 생성 → 프롬프트 → 스트림 결과 저장  
- [ ] 타입 안전성 향상: optional 필드 사용 지점 null guard  
- [ ] ESLint 규칙 강화 (unused vars, import ordering)

## 9. 배포 & 구성 (P2)
- [ ] `.env.example` 작성 (`VITE_OPENAI_API_KEY`, `VITE_OPENAI_BASE_URL` 등)  
- [ ] README: 모델 설정 / 환경 변수 / 404.html 빌드 스크립트 반영  
- [ ] GitHub Actions 워크플로 확인 (현재 README 언급, 실제 파일 유무 점검)  
- [x] GitHub Actions 워크플로 확인 (현재 README 언급, 실제 파일 유무 점검)  
 - [x] GitHub Actions 워크플로 확인 (현재 README 언급, 실제 파일 유무 점검)  
- [ ] 릴리즈 태깅 & CHANGELOG.md 도입  
- [ ] 라이선스 헤더 자동 추가 스크립트 (옵션)

## 10. 데이터 모델 개선 (P3)
- [ ] `PageMeta.tokensUsed` → promptTokens / completionTokens 분리  
- [ ] `PageVersion`에 model / temperature / seed 등 메타 포함  
- [ ] WorldSetting 버전 비교 Diff 기능 (과거 버전 저장 전략)  
- [ ] 다중 Book workspace import/export (JSON)  
- [ ] 선택 페이지 subset 기반 reference summary batch precompute

## 11. 보안 / 프라이버시 (P3)
- [ ] API 키 로컬 저장 전략 (sessionStorage vs localStorage vs IndexedDB) + 암호화 여부 검토  
- [ ] 민감 데이터(미공개 원고) 내보내기/삭제 UX  
- [ ] Offline 모드(네트워크 단절 시 캐시 기반 작업) 안내

## 12. 문서화 (P3)
- [ ] 개발자 아키텍처 문서 (`AGENTS.md` / `UI_PROPOSAL.md` 연계) 최신화  
- [ ] 프롬프트 계층 설계 다이어그램  
- [ ] 상태 흐름 (books/pages/world/version) 시퀀스 다이어그램  
- [ ] 성능/토큰 최적화 전략 노트

## 13. 코드 리팩터링 후보 (P3)
- [ ] Zustand store 분리: selector 활용 / shallow 비교로 재렌더 최적화  
- [ ] `usePageGeneration` 내부 side-effect 분리 (saving logic → service)  
- [ ] 타입 중복 (PromptLayer vs AssembleOptions) 통합  
- [ ] dynamic import 분리 (Diff, Timeline 등 비주요 경로 코드 스플리팅)  
- [ ] CSS 변수 → Tailwind theme 확장으로 일부 통합

## 14. 잠재 버그 / 주의 지점
- [ ] `pagesStore.addVersion` 후 `pages` 상태 자체 갱신 없음 → UI 최신화 누락 가능  
- [ ] worldDerivedInvalidated 플래그: 앱 재시작 시 초기 false → 캐시 존재 안 하면 첫 호출에서 재생성 OK? (load 후 즉시 접근 시 undefined 가능)  
- [ ] 참조 slug(`@p:slug`) 아직 미해결 → UI는 'pages:' 출력에서 빈 값 가능  
- [ ] 긴 스트림 중 브라우저 탭 비활성화 시 setState 타이밍 지연 (백프레셔 전략 미구현)  
- [ ] 다중 탭 동시 편집 시 IndexedDB 충돌/경합 처리 미정  
- [ ] `estimateTokens` 단순 length 기준 — 영어 혼합 시 과/과소 추정 가능

## 15. 빠른 승리 (Quick Wins)
- [ ] 404.html 생성 postbuild 스크립트  
- [ ] Abort 버튼 추가  
- [x] Abort 버튼 추가  
 - [x] VersionTimeline 기본 목록 구현  
 - [x] DiffView에 간단 `contentSnapshot.length` 비교 + 단어 diff 표시  
- [ ] slug 필드 인풋 (책/페이지) + URL friendly 변환 util  
- [ ] `referenceParser` span guard (>50) 발생 시 사용자 경고 반환 구조

## 16. 실행 순서 제안 (첫 2주)
1. Quick Wins (Abort, VersionTimeline, 404.html, slug)  
2. 실제 OpenAI 스트리밍 연동 + 환경변수 (.env)  
3. DiffView MVP + 버전 diff 저장  
4. 참조 slug 해석 & summary 캐시 재생성 정책  
5. WorldBuilder 확장 필드 & 즉시 요약 프리뷰  
6. 테스트 환경 및 핵심 유닛 테스트 도입  
7. 문서/README 정비

## 17. 메트릭/관찰 (미구현)
- [ ] 간단 usage 메트릭 (페이지 수 / 평균 길이 / 생성 횟수) 비개인 식별 ID 기반 로컬 집계  
- [ ] 성능 측정: diff 계산 시간 / 요약 길이 분포 / 평균 토큰 추정 오차  
- [ ] 에러/중단 이유 분류 대시보드 (콘솔 기반 최소)

---
갱신 시: 완료된 항목 체크 + 변경일 갱신. 새로운 학습/제약 조건 발생 시 섹션 추가.

