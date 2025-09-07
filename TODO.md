# TODO Roadmap

갱신일: 2025-09-07 (자동 업데이트 반영)  
최근 변경: WorldBuilder 자동 요약 디바운스(Auto toggle) & worldDerived 캐시 재생성 테스트 추가

## 0. 기준 / 우선순위 레이블
- P0: 반드시 즉시 (핵심 기능 공백 / 데이터 손실 가능)
- P1: 핵심 UX 개선 / 주요 기능 완성
- P2: 품질 / 유지보수성 / 최적화
- P3: 부가 가치 / 실험적 개선

## 1. 필수 기능 공백 (P0)
- [x] OpenAI Chat Completions (SSE) 실제 연동 (`src/services/gpt.ts` mock→SSE)  
	- [x] 환경변수 기반 API key 주입 (Vite: `import.meta.env.VITE_OPENAI_API_KEY`)  
	- [x] 모델 / 파라미터 설정 구조 (`GenerationConfig`) 활용  
	- [x] AbortController 통한 중단 처리 exposed  
	- [x] 에러 상태 분류 (네트워크 / 401 / rate limit / 기타)  
- [x] Page 생성 시 최초 버전 자동 기록  
- [x] 새로고침 404 대응 (postbuild 스크립트)  
- [x] `worldStore.load` 실패 시 초기 레코드 생성  
- [x] IndexedDB 버전 마이그레이션 전략 문서화 (현재 `DB_VERSION=1`) → `MIGRATIONS.md` 작성

## 2. 페이지/버전 관리 (P1)
- [x] VersionTimeline 기본 목록 (시간/작성자/길이/링크)  
- [x] DiffView 길이 & 단어 diff MVP  
- [x] 페이지 제목/slug 편집 UI  
- [x] 버전 diff 저장 (`PageVersion.diff`)  
- [x] VersionTimeline 고급(버전 비교 선택 UI → 2개 선택 후 커스텀 diff)  
- [x] DiffView 고급(문장/문단 diff, 긴 동일 구간 collapse 1차)  
- [x] 페이지 삭제 & 재인덱싱 정책  

## 3. 프롬프트 & 참조 시스템 (P1)
- [x] `assemblePrompt` → OpenAI messages 변환 유틸 (promptLayerToMessages)  
- [x] 참조된 페이지 slug 지원 (`@p:slug`)  
- [x] 참조 범위 과도 (`@3-50`) 경고 UI  
- [x] reference summary TTL / 재생성 정책 (24h TTL + page.updatedAt 비교 재생성)  
- [x] Token 예측 로직 개선 (언어 혼합) → 엔트로피 기반 혼합 가중치, 긴 ASCII 런 패널티, 숫자+단위/구두점 묶음 할인, 이동 평균 보정(calibration factor)  

## 4. 세계관 (World) 기능 확장 (P2)
- [x] WorldBuilder 추가 필드 UI 확장  
- [x] 자동 요약 프리뷰 패널  
- [x] 변경 debounce 재요약 옵션 (Auto toggle + 0.7s)  
- [ ] 캐릭터/파벌 구조화 + validator  

## 5. 생성 흐름 개선 (P2)
- [x] Abort 기능  
- [ ] 임시 저장 조건 (시간/토큰 기반 선택)  
- [ ] 레이어 별 토큰 분포 UI  
	- [x] 1차: TokenMeter 레이어 분포 막대/최대 레이어 표시 (추가 압축 버튼 연동 훅)  
- [x] 모델/temperature 선택 UI  
- [ ] 완료 후 focus/scroll 관리  
- [ ] 통합 오류 메시지(Toast)  
- [x] 목표 길이 초과 자동 중단 (target *1.02)  
- [x] Extend 이어쓰기 (미달 시 추가 생성)  
- [x] 진행률(progress bar) 및 char 카운트 표시  
- [x] tokensPrompt / tokensCompletion 분리 저장  
- [x] 동적 targetChars 추천 (promptTokens 기반)  
- [x] 컨텍스트 잔여 토큰 예산 패널  

## 6. 성능 & 안정성 (P2)
- [ ] IndexedDB Quota/에러 핸들링  
- [ ] 대량 페이지 가상 스크롤  
- [ ] Diff Web Worker 오프로드  
- [ ] world/reference 캐시 LRU  
- [ ] 수정형 자동 저장(debounce)  

## 7. UI/UX 개선 (P2)
- [ ] 다크/라이트 모드 토글  
- [ ] 공용 Button/Panel/Card 추출  
- [ ] 단축키 (생성, 프롬프트 패널 등)  
- [ ] Skeleton 로딩  
- [ ] 접근성 개선(aria, heading 레벨)  
- [ ] i18n 베이스 구조  

## 8. 테스트 & 품질 (P2)
- [ ] 유닛 테스트 환경 (Vitest/Jest)  
	- [x] referenceParser 경계 케이스 (단일/범위/slug/중복/무효/경고)  
	- [x] promptAssembler 토큰 휴리스틱 기본 비교/엔트로피/패널티/보정  
	- [x] world summarize (summarizeWorld) 섹션 레이블 & 길이 한도  
	- [x] worldDerived 캐시 재생성  
- [ ] E2E 기본 시나리오  
- [ ] optional 필드 null guard 강화  
- [ ] ESLint 규칙 확장  

## 9. 배포 & 구성 (P2)
- [x] `.env.example` 작성  
- [ ] README 환경 변수 상세 + 모델 선택 섹션  
- [x] GitHub Actions 워크플로 존재 확인  
- [ ] CHANGELOG 및 릴리즈 태깅  

## 10. 데이터 모델 개선 (P3)
- [x] tokensUsed 분리 (prompt/completion)  
- [ ] PageVersion 메타: model/temperature  
- [ ] WorldSetting 과거 버전 diff  
- [ ] 다중 Book export/import  
- [ ] reference summary batch 사전 계산  

## 11. 보안 / 프라이버시 (P3)
- [ ] API 키 저장 전략 & 암호화 고려  
- [ ] 민감 데이터 내보내기/삭제 UX  
- [ ] 오프라인 모드 안내  

## 12. 문서화 (P3)
- [ ] 아키텍처 문서 최신화  
- [ ] 프롬프트 계층 다이어그램  
- [ ] 상태 흐름 시퀀스 다이어그램  
- [ ] 토큰 최적화 전략 노트  

## 13. 코드 리팩터링 후보 (P3)
- [ ] Zustand selector 최적화  
- [ ] usePageGeneration side-effect 분리  
- [ ] 타입 중복(PromptLayer 등) 통합  
- [ ] Lazy code-splitting (Diff/Timeline)  
- [ ] Tailwind theme 확장 (CSS 변수 축소)  

## 14. 잠재 버그 / 주의 지점
- [ ] addVersion 후 pages 상태 갱신 여부 재검증 (현재 구현: 갱신)  
- [ ] worldDerived 초기 로딩 race  
- [ ] 긴 스트림 비활성 탭 지연(백프레셔)  
- [ ] 다중 탭 동시 편집 충돌  
- [ ] 토큰 추정 과/과소 문제 (1차 개선완료, 실제 모델 usage 수집시 추가 정밀 보정 예정)  

## 15. 빠른 승리 (Quick Wins)
- [x] 404.html postbuild  
- [x] Abort 버튼  
- [x] VersionTimeline 목록  
- [x] DiffView 길이 + 단어 diff  
- [x] slug 인풋 & 변환 util  
- [ ] referenceParser span guard 경고 UI  

## 16. 실행 순서 (업데이트)
1. Prompt assemble → OpenAI messages 유틸 분리
2. Reference summary TTL 및 범위 경고 UI
3. WorldBuilder 확장 + 자동 요약 프리뷰
4. 테스트 환경(Vitest) + 핵심 단위 테스트
5. 모델/temperature 선택 UI + 토큰 분포
6. 캐시 LRU & 임시 저장 개선
7. 문서/CHANGELOG 정비

## 17. 메트릭/관찰 (미구현)
- [ ] usage 메트릭 로컬 집계  
- [ ] diff 계산 시간 / 토큰 추정 오차 로깅  
- [ ] 에러/중단 이유 분류  

---
갱신 시: 완료된 항목 체크 및 변경일 업데이트.

