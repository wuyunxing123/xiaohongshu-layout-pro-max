export interface ImageSlot {
  id: string;
  url: string | null;
  file: File | null;
  label?: string;
}

export type CoverVariant = 'a' | 'b';

export interface CanvasConfig {
  backgroundColor: string;
  backgroundImage?: string;
  title: string;
  subtitle: string;
  titleColor: string;
  subtitleColor: string;
  writingMode: 'horizontal' | 'vertical';
  // 字体设置
  titleFontSize: number;
  subtitleFontSize: number;
  titleFontFamily: string;
  // 标题位置 (基于 1200x1600 画布坐标)
  textX: number;
  textY: number;
  // 副标题位置
  subtitleX: number;
  subtitleY: number;
  subtitleWidth: number;

  textWidth: number;
  textHeight: number;
  showBg: boolean;
  bgColor: string;
  bgOpacity: number;
  // 内置封面选择
  coverVariant?: CoverVariant;
}

export type TemplateId =
  | 'five-grid-flow'
  | 'directory-flow'
  | 'single-page-flow'
  | 'poster-flow'
  | 'grid-flow';

export interface Template {
  id: TemplateId;
  name: string;
  description: string;
  icon: string;
}
