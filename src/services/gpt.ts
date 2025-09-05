import { PromptLayer, StreamChunk } from '../types/domain';

// OpenAI Chat Completions 호환 SSE 스트리밍 호출 (단순 스텁)
export async function generatePage(layer: PromptLayer, onChunk: (c: StreamChunk) => void, signal?: AbortSignal) {
  // 실제 구현 시 fetch + ReadableStream reader 사용
  // 여기서는 모의 딜레이 + 가짜 텍스트 스트리밍
  const fake = '이것은 생성된 예시 텍스트입니다. '.repeat(50);
  const parts = fake.match(/.{1,80}/g) || [];
  for (const p of parts) {
    if (signal?.aborted) return;
    await new Promise(r => setTimeout(r, 10));
    onChunk({ text: p });
  }
  onChunk({ text: '', done: true });
}
