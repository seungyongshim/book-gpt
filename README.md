# Book GPT (MVP Skeleton)

React + Vite 기반 장편 서사 생성 도구의 최소 골격입니다. (세계관/페이지/참조/프롬프트 계층화 설계 반영)

## 실행

```bash
npm install
npm run dev
```

## 주요 폴더
- `src/types/domain.ts` 도메인 타입
- `src/db/database.ts` IndexedDB 초기화 & 헬퍼
- `src/stores/*` Zustand 상태 (책/세계관/페이지)
- `src/utils/referenceParser.ts` @참조 파서
- `src/utils/promptAssembler.ts` 프롬프트 합성 & 토큰 추정
- `src/services/gpt.ts` (모의) 스트리밍 생성
- `src/hooks/usePageGeneration.ts` 생성 훅

## 추후 작업 (설계 문서 대비)
- 실제 OpenAI 호환 Chat Completions SSE 연동
- worldDerived 캐시 생성 & 무효화 파이프라인
- referenceSummaries 요약 생성 로직
- TokenMeter & Prompt Preview UI
- VersionTimeline 실제 데이터 조회 & Diff
- 압축/축약 레벨 알고리즘

## 라이선스
MIT
