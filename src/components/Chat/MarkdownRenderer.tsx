import React, { Suspense } from 'react';

// 지연 로딩: react-markdown 관련 무거운 의존성 분리
// 단일 줄바꿈을 <br>로 유지하기 위해 remark-breaks 추가
const LazyMarkdown = React.lazy(async () => {
  const [rm, rgfm, rbreaks, rhighlight] = await Promise.all([
    import('react-markdown'),
    import('remark-gfm'),
    import('remark-breaks'),
    import('rehype-highlight')
  ]);
  const ReactMarkdown = rm.default;
  const remarkGfm = rgfm.default;
  const remarkBreaks = rbreaks.default;
  const rehypeHighlight = rhighlight.default;

  const Component = (props: { children: string }) => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        a: (p) => <a {...p} target="_blank" rel="noopener noreferrer" />,
        // pre 태그 overflow 개선 - 세로 스크롤바 제거하고 전체 표시
        pre: ({ children, ...rest }) => (
          <pre className="overflow-x-auto" {...rest}>{children}</pre>
        )
      }}
    >
      {props.children}
    </ReactMarkdown>
  );
  return { default: Component };
});

export interface MarkdownRendererProps {
  text: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ text }) => {
  return (
    <Suspense fallback={<div className="text-xs text-neutral-400 animate-pulse">로딩중...</div>}>
      <LazyMarkdown>{text}</LazyMarkdown>
    </Suspense>
  );
};

export default MarkdownRenderer;
