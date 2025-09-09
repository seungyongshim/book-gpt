import React from 'react';

export type IconName =
  | 'warning'
  | 'x'
  | 'arrow-right'
  | 'list'
  | 'plus'
  | 'trash'
  | 'check'
  | 'sun'
  | 'moon'
  | 'loop'
  | 'data-transfer-download'
  | 'document-text'
  | 'document'
  | 'code'
  | 'check-circle'
  | 'x-circle'
  | 'exclamation-triangle'
  | 'information-circle'
  | 'download'
  | 'upload'
  | 'share';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName | string; // string 허용 (미등록 아이콘 대비 graceful fallback)
  size?: number; // px
  title?: string;
  className?: string;
}

// 공통 SVG 속성 (stroke 기반 outline 스타일)
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

// 아이콘 path 정의 (Heroicons/Feather 스타일 혼합 커스텀)
const ICON_PATHS: Record<string, JSX.Element> = {
  warning: (
    <g>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.29 3.86 2.82 17.01A2 2 0 0 0 4.54 20h14.92a2 2 0 0 0 1.72-2.99L12.71 3.86a2 2 0 0 0-3.42 0Z" />
    </g>
  ),
  x: (
    <path d="M6 6l12 12M6 18L18 6" />
  ),
  'arrow-right': (
    <path d="M5 12h14M13 6l6 6-6 6" />
  ),
  list: (
    <g>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </g>
  ),
  plus: (
    <g>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </g>
  ),
  trash: (
    <g>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14" />
    </g>
  ),
  check: (
    <path d="M5 13l4 4L19 7" />
  ),
  sun: (
    <g>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l1.41-1.41M16.24 8.34l1.41-1.41" />
    </g>
  ),
  moon: (
    <path d="M21 12.79A9 9 0 0 1 11.21 3 7 7 0 1 0 21 12.79Z" />
  ),
  loop: (
    <g>
      <path d="M4 4v6h6" />
      <path d="M20 20v-6h-6" />
      <path d="M20 9A9 9 0 0 0 6.5 4.5L4 10" />
      <path d="M4 15a9 9 0 0 0 13.5 4.5L20 14" />
    </g>
  ),
  'data-transfer-download': (
    <g>
      <path d="M12 3v12" />
      <path d="M8 11l4 4 4-4" />
      <path d="M4 19h16" />
    </g>
  ),
  'document-text': (
    <g>
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M7 3h7l6 6v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M9 9h6" />
      <path d="M9 13h6" />
      <path d="M9 17h3" />
    </g>
  ),
  document: (
    <g>
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M7 3h7l6 6v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
    </g>
  ),
  code: (
    <g>
      <path d="M16 18l6-6-6-6" />
      <path d="M8 6l-6 6 6 6" />
    </g>
  ),
  'check-circle': (
    <g>
      <path d="M9 12l2 2 4-4" />
      <circle cx="12" cy="12" r="10" />
    </g>
  ),
  'x-circle': (
    <g>
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6" />
      <path d="M9 9l6 6" />
    </g>
  ),
  'exclamation-triangle': (
    <g>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.29 3.86 2.82 17.01A2 2 0 0 0 4.54 20h14.92a2 2 0 0 0 1.72-2.99L12.71 3.86a2 2 0 0 0-3.42 0Z" />
    </g>
  ),
  'information-circle': (
    <g>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </g>
  ),
  download: (
    <g>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </g>
  ),
  upload: (
    <g>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v12" />
    </g>
  ),
  share: (
    <g>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51l6.83 3.98" />
      <path d="M15.41 6.51l-6.82 3.98" />
    </g>
  ),
};

export const Icon: React.FC<IconProps> = ({ name, size = 16, className, title, ...rest }) => {
  const content = ICON_PATHS[name] || (
    <g>
      <circle cx="12" cy="12" r="10" />
      <path d="M5 5l14 14" />
    </g>
  );

  // title 없고, 상위 버튼이 자체 aria-label을 제공한다면 단순 장식으로 간주 가능하므로 aria-hidden 허용
  const ariaProps: Record<string, any> = title
    ? { role: 'img', 'aria-label': title as string }
    : { 'aria-hidden': true, focusable: false };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      {...base}
      {...ariaProps}
      {...rest}
    >
      {title && <title>{title}</title>}
      {content}
    </svg>
  );
};

export default Icon;
