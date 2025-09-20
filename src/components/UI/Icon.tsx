import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Check,
  Clipboard,
  Download,
  Edit,
  List,
  Mic,
  Moon,
  Pencil,
  Plus,
  RefreshCw,
  Repeat,
  RotateCcw,
  Square,
  Sun,
  Trash2,
  Waves,
  Wrench,
  X,
  CircleSlash
} from 'lucide-react';
import { IconName } from './Icon.types';

const ICON_MAP: Record<IconName, React.ComponentType<any>> = {
  warning: AlertTriangle,
  x: X,
  'arrow-right': ArrowRight,
  'arrow-left': ArrowLeft,
  list: List,
  plus: Plus,
  trash: Trash2,
  check: Check,
  sun: Sun,
  moon: Moon,
  loop: RefreshCw,
  'loop-circular': Repeat,
  'data-transfer-download': Download,
  mic: Mic,
  wave: Waves,
  stop: Square,
  pencil: Pencil,
  edit: Edit,
  wrench: Wrench,
  clipboard: Clipboard,
  reload: RotateCcw
};

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  title?: string;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 16, title, className, ...rest }) => {
  const LucideComp = ICON_MAP[name];
  if (!LucideComp) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[Icon] Unknown icon name: ${name}`);
    }
    return <CircleSlash size={size} className={className} strokeWidth={2} aria-hidden focusable={false} />;
  }
  const ariaProps: Record<string, any> = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true, focusable: false };
  return <LucideComp size={size} className={className} strokeWidth={2} {...ariaProps} {...rest} />;
};

export default Icon;
