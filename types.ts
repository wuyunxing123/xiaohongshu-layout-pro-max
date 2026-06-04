export interface ImageSlot {
  id: string;
  url: string | null;
  file: File | null;
  label?: string;
}

export type CoverVariant = 'a' | 'b';

/** 封面嵌入 PPT 图片区域（比例 0-1，相对 1200×1600 画布） */
export interface EmbedRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}

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
  // 封面嵌入 PPT 图片区域（按 coverVariant 分别存储，切模板自动切换）
  coverEmbedRegion: Record<CoverVariant, EmbedRegion>;
  // 品牌标识（左上角白底黑字胶囊），留空则不显示
  brandText: string;
}

export type TemplateId =
  | 'five-grid-flow'
  | 'directory-flow'
  | 'single-page-flow'
  | 'poster-flow'
  | 'grid-flow'
  | 'double-brand-flow';

export interface Template {
  id: TemplateId;
  name: string;
  description: string;
  icon: string;
}
