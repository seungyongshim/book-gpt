// 간단 slug 생성 및 고유성 보장 유틸
export function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\uAC00-\uD7A3\s-]/g, '') // 한글/영문/숫자/공백/하이픈 외 제거
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function ensureUniqueSlug(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

export function generateUniqueSlug(title: string, existing: string[]): string {
  const base = toSlug(title) || 'untitled';
  return ensureUniqueSlug(base, new Set(existing));
}