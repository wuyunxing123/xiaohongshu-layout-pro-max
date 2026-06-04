import type { TemplateId } from '../types';

export interface LayoutInfo {
  total: number;
  perPage: number;
  coverCount: number;
}

export const calcLayoutInfo = (templateId: TemplateId, imageCount: number): LayoutInfo => {
  if (templateId === 'single-page-flow') {
    // 每张图对应一页（含封面），0 张时给 1 页占位
    return { total: Math.max(1, imageCount), perPage: 1, coverCount: 0 };
  }
  if (imageCount === 0) return { total: 1, perPage: 1, coverCount: 0 };

  if (templateId === 'directory-flow') {
    return { total: Math.ceil(imageCount / 3), perPage: 3, coverCount: 0 };
  }

  // 双图品牌流：固定 2 张/页，封面用 2 张（不参与自动降密度逻辑）
  if (templateId === 'double-brand-flow') {
    return {
      total: 1 + Math.ceil(Math.max(0, imageCount - 2) / 2),
      perPage: 2,
      coverCount: 2,
    };
  }

  let coverCount = 3;
  if (templateId === 'five-grid-flow') coverCount = 5;
  else if (templateId === 'grid-flow') coverCount = 2;

  const remaining = Math.max(0, imageCount - coverCount);
  let perPage = 3;
  let pages = 1 + Math.ceil(remaining / perPage);

  if (pages < 6 && remaining > 0) {
    perPage = 2;
    pages = 1 + Math.ceil(remaining / perPage);
    if (pages < 6) {
      perPage = 1;
      pages = 1 + Math.ceil(remaining / perPage);
    }
  }
  return { total: pages, perPage, coverCount };
};
