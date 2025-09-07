// 경량 word diff (아주 단순) - 추가/삭제/공통
export interface DiffToken { value: string; added?: boolean; removed?: boolean; }

export function diffWords(a: string, b: string): DiffToken[] {
  if (a === b) return [{ value: a }];
  if (!a && b) {
    return b.split(/\s+/).filter(Boolean).map(w=>({ value: w, added: true }));
  }
  const aWords = a.split(/\s+/);
  const bWords = b.split(/\s+/);
  const dp: number[][] = Array(aWords.length + 1).fill(0).map(()=>Array(bWords.length + 1).fill(0));
  for (let i= aWords.length -1; i>=0; i--) {
    for (let j= bWords.length -1; j>=0; j--) {
      dp[i][j] = aWords[i] === bWords[j] ? dp[i+1][j+1] + 1 : Math.max(dp[i+1][j], dp[i][j+1]);
    }
  }
  const out: DiffToken[] = [];
  let i=0, j=0;
  while (i < aWords.length && j < bWords.length) {
    if (aWords[i] === bWords[j]) { out.push({ value: aWords[i] }); i++; j++; }
    else if (dp[i+1][j] >= dp[i][j+1]) { out.push({ value: aWords[i], removed: true }); i++; }
    else { out.push({ value: bWords[j], added: true }); j++; }
  }
  while (i < aWords.length) { out.push({ value: aWords[i], removed: true }); i++; }
  while (j < bWords.length) { out.push({ value: bWords[j], added: true }); j++; }
  return out;
}