import { describe, it, expect } from 'vitest';
import { calcLayoutInfo } from '../lib/layoutCalc';

describe('calcLayoutInfo', () => {
  describe('空图集', () => {
    it('任意模板都返回 1 页（占位封面）', () => {
      expect(calcLayoutInfo('five-grid-flow', 0)).toEqual({ total: 1, perPage: 1, coverCount: 0 });
      expect(calcLayoutInfo('single-page-flow', 0)).toEqual({ total: 1, perPage: 1, coverCount: 0 });
      expect(calcLayoutInfo('directory-flow', 0)).toEqual({ total: 1, perPage: 1, coverCount: 0 });
    });
  });

  describe('single-page-flow', () => {
    it('每页 1 张', () => {
      expect(calcLayoutInfo('single-page-flow', 1)).toEqual({ total: 1, perPage: 1, coverCount: 0 });
      expect(calcLayoutInfo('single-page-flow', 5)).toEqual({ total: 5, perPage: 1, coverCount: 0 });
    });
  });

  describe('directory-flow', () => {
    it('每页 3 张', () => {
      expect(calcLayoutInfo('directory-flow', 3)).toEqual({ total: 1, perPage: 3, coverCount: 0 });
      expect(calcLayoutInfo('directory-flow', 9)).toEqual({ total: 3, perPage: 3, coverCount: 0 });
      expect(calcLayoutInfo('directory-flow', 10)).toEqual({ total: 4, perPage: 3, coverCount: 0 });
    });
  });

  describe('five-grid-flow', () => {
    it('封面 5 张；剩余尽量铺到至少 6 页', () => {
      // 5 张图刚好放封面，无内页
      expect(calcLayoutInfo('five-grid-flow', 5)).toEqual({ total: 1, perPage: 3, coverCount: 5 });
      // 6 张图 → 封面 5 + 1 内页（剩 1 → 1 张/页 → 总 2 页）
      expect(calcLayoutInfo('five-grid-flow', 6)).toEqual({ total: 2, perPage: 1, coverCount: 5 });
      // 9 张图 → 封面 5 + 1 页能塞 4 张（但会降到 1 张/页以拉满页数）→ 总 5 页
      expect(calcLayoutInfo('five-grid-flow', 9).total).toBe(5);
    });
  });

  describe('grid-flow', () => {
    it('封面 2 张，内容页固定 2 张/页', () => {
      // 2 张图刚好放封面
      expect(calcLayoutInfo('grid-flow', 2)).toEqual({ total: 1, perPage: 2, coverCount: 2 });
      // 5 张图 → 封面 2 + 剩 3 张 → 内容页 ceil(3/2)=2 → 总 3 页
      expect(calcLayoutInfo('grid-flow', 5)).toEqual({ total: 3, perPage: 2, coverCount: 2 });
    });
  });

  describe('poster-flow', () => {
    it('封面 3 张', () => {
      // 3 张图刚好放封面
      expect(calcLayoutInfo('poster-flow', 3)).toEqual({ total: 1, perPage: 3, coverCount: 3 });
      // 6 张图 → 封面 3 + 3 内页会尽量铺成多页 → 实际 4 页（1 张/页）
      expect(calcLayoutInfo('poster-flow', 6)).toEqual({ total: 4, perPage: 1, coverCount: 3 });
    });
  });

  describe('自适应页数逻辑', () => {
    it('图片少时会降低 perPage 以增加总页数', () => {
      // 8 张图：five-grid 封面 5 + 剩 3 张 → 自适应降到 1 张/页 → 1+3=4 页
      expect(calcLayoutInfo('five-grid-flow', 8)).toEqual({ total: 4, perPage: 1, coverCount: 5 });
    });
  });
});
