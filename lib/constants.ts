import type { CanvasConfig, Template } from '../types';

export const TEMPLATES: Template[] = [
  {
    id: 'five-grid-flow',
    name: '首页五图流',
    description: '底边距 50px，1 大 4 小',
    icon: 'fa-th-large',
  },
  {
    id: 'directory-flow',
    name: '精简目录流',
    description: '左侧 9 个固定位，首页无需标题',
    icon: 'fa-list-ol',
  },
  {
    id: 'single-page-flow',
    name: '单页纯享流',
    description: '顶 415px, 左 15px, 右 8px',
    icon: 'fa-file-image',
  },
  {
    id: 'poster-flow',
    name: '纯享画报流',
    description: '上下留白不靠边，首页左侧标题',
    icon: 'fa-square',
  },
  {
    id: 'grid-flow',
    name: '双图大标题流',
    description: '首页左右边距 35px，双图大尺寸',
    icon: 'fa-columns',
  },
];

export const FONT_OPTIONS = [
  { name: '思源黑体', value: '"Noto Sans SC", sans-serif' },
  { name: '站酷高端黑', value: '"ZCOOL HiMei", sans-serif' },
  { name: '幼圆 (系统)', value: '"YouYuan", "SimYou", "STYuanti-SC-Regular", "ZCOOL KuaiLe", sans-serif' },
  { name: '汉仪 (手书感)', value: '"Ma Shan Zheng", "HYQiHei", "HYZhongSong", cursive' },
  { name: '思源宋体', value: '"Noto Serif SC", serif' },
  { name: '楷体', value: 'KaiTi, "楷体", STKaiti, serif' },
  { name: '系统默认', value: 'system-ui, sans-serif' },
];

export type LayoutKey =
  | 'textX' | 'textY'
  | 'subtitleX' | 'subtitleY'
  | 'titleFontSize' | 'subtitleFontSize'
  | 'writingMode' | 'titleFontFamily'
  | 'titleColor' | 'subtitleColor';

export type LayoutConfigMap = Record<string, Pick<CanvasConfig, LayoutKey>>;

export const INITIAL_LAYOUTS: LayoutConfigMap = {
  'five-grid-flow':   { textX: 600, textY: 90,  subtitleX: 600, subtitleY: 170, titleFontSize: 84,  subtitleFontSize: 36, writingMode: 'horizontal', titleFontFamily: '"Noto Sans SC", sans-serif', titleColor: '#1a1a1a', subtitleColor: '#4b5563' },
  'directory-flow':   { textX: 0,   textY: 0,   subtitleX: 0,   subtitleY: 0,   titleFontSize: 0,   subtitleFontSize: 0,  writingMode: 'horizontal', titleFontFamily: '"Noto Sans SC", sans-serif', titleColor: '#1a1a1a', subtitleColor: '#4b5563' },
  'single-page-flow': { textX: 0,   textY: 0,   subtitleX: 0,   subtitleY: 0,   titleFontSize: 0,   subtitleFontSize: 0,  writingMode: 'horizontal', titleFontFamily: '"Noto Sans SC", sans-serif', titleColor: '#1a1a1a', subtitleColor: '#4b5563' },
  'poster-flow':      { textX: 200, textY: 800, subtitleX: 200, subtitleY: 1400, titleFontSize: 90, subtitleFontSize: 40, writingMode: 'vertical',  titleFontFamily: '"Noto Serif SC", serif',   titleColor: '#1a1a1a', subtitleColor: '#4b5563' },
  'grid-flow':        { textX: 600, textY: 800, subtitleX: 600, subtitleY: 920,  titleFontSize: 110, subtitleFontSize: 48, writingMode: 'horizontal', titleFontFamily: '"Noto Sans SC", sans-serif', titleColor: '#1a1a1a', subtitleColor: '#4b5563' },
};

export const DEFAULT_CONFIG: CanvasConfig = {
  backgroundColor: '#ffffff',
  backgroundImage: undefined,
  title: '一年级期末家长会',
  subtitle: '20页 PPT / 4500字发言稿',
  titleColor: '#1a1a1a',
  subtitleColor: '#4b5563',
  writingMode: 'horizontal',
  titleFontSize: 84,
  subtitleFontSize: 42,
  titleFontFamily: '"Noto Sans SC", sans-serif',
  textX: 600,
  textY: 250,
  subtitleX: 600,
  subtitleY: 380,
  subtitleWidth: 800,
  textWidth: 1040,
  textHeight: 240,
  showBg: false,
  bgColor: '#ffffff',
  bgOpacity: 0.8,
};

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 1600;
