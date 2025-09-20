// Icon 관련 공용 타입 및 상수 분리 (Fast Refresh 경고 해결을 위해 컴포넌트 파일에서 분리)
export const ICON_NAMES = [
  'warning', 'x', 'arrow-right', 'arrow-left', 'list', 'plus', 'trash', 'check', 'sun', 'moon', 'loop', 'loop-circular', 'data-transfer-download', 'mic', 'wave', 'stop', 'pencil', 'edit', 'wrench', 'clipboard', 'reload'
] as const;

export type IconName = typeof ICON_NAMES[number];
