import React, { Suspense } from 'react';

// 지연 로딩: react-markdown 관련 무거운 의존성 분리
const LazyMarkdown = React.lazy(async () => {
  const [rm, rgfm, rhighlight] = await Promise.all([
    import('react-markdown'),
    import('remark-gfm'),
    import('rehype-highlight')
  ]);
  const ReactMarkdown = rm.default;
  const remarkGfm = rgfm.default;
  const rehypeHighlight = rhighlight.default;
  const Component = (props: { children: string }) => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        a: (p) => <a {...p} target="_blank" rel="noopener noreferrer" />
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
