# Architecture One-Pager

핵심 목표: 모바일 우선 소설 저작 SPA에서 Book → Page 흐름을 AI로 확장하되, 장문 컨텍스트 비용을 최소화.

## Core Pillars
1. Structured World Model → 요약 캐시(`worldDerived`)
2. Layered Prompt (system/book/world/page/@refs/user)
3. Reference Summaries 재사용(`referenceSummaries`)
4. Token Budget Adaptive Compression (L0~L4)

## Data Stores (IndexedDB v1)
- books / worldSettings / pages / pageVersions / referenceSummaries / worldDerived / settings

## Page Generation Flow
@파싱 → 캐시 로드/생성 → PromptLayer 합성 + 토큰 추정 → 필요 시 L1~L4 축약 → GPT 스트림(partial flush 2K) → 저장 & 요약.

## Compression Ladder
L1 저우선 참조 50%
L2 worldDerived 1200→800
L3 모든 참조 bullet(≤120자)
L4 pageSystem 핵심 bullet
(초과 시 참조 제거 UI)

## Token Calibration
(추정프롬프트+완료근사)/기존추정 비율 이동평균 (α=0.15) → factor(0.7~1.3) → 차기 추정 반영.

## Tools (Phase Roadmap)
- world.summary (캐시 기반 세계관 요약)
- references.context (@참조 요약 묶음)
- style.guide / ethics.checklist (P2)
- characters.lookup (P3)

## Edge Essentials
순환/중복 참조 차단 · 스트림 중단 복구(partial) · 세계관 대변경 후 재요약 · Quota 임박 시 압축+GC.

## Backlog Snapshot (P1 핵심)
SSE, Partial Flush, worldDerived, referenceSummaries, TokenMeter, Prompt Preview, Version List/Diff/Rollback, Toast, referenceParser Tests.

세부 정책 & 전체 백로그: `AGENTS.md` 참고.
