import JSZip from 'jszip';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  TEMPLATES,
  type LayoutConfigMap,
} from './constants';
import { calcLayoutInfo } from './layoutCalc';
import { drawCanvasPage, type ImageLoader } from './canvasRenderer';
import type { CanvasConfig, TemplateId } from '../types';

/**
 * 将多张 PNG dataURL 打包为单个 zip 下载。
 * 相比逐张 <a download>，避免浏览器把连续 click 当成弹窗拦截，
 * 用户也只需保存一个文件。
 */
export const batchDownloadZip = async (
  dataUrls: string[],
  baseName: string = 'page',
): Promise<void> => {
  if (dataUrls.length === 0) return;

  const zip = new JSZip();
  dataUrls.forEach((dataUrl, i) => {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx < 0) return;
    const base64 = dataUrl.slice(commaIdx + 1);
    zip.file(`${baseName}-${i + 1}.png`, base64, { base64: true });
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}s.zip`;
  a.click();
  // 异步清理，给浏览器一点时间完成下载触发
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** 一键导出全部排版的实时进度（每完成一页回调一次） */
export interface ExportAllProgress {
  /** 1-based，当前正在导出的任务序号（已按变体展平） */
  currentTemplate: number;
  /** 总任务数（模板 + 内置封面变体） */
  totalTemplates: number;
  /** 当前任务展示名（用于按钮文案展示） */
  templateName: string;
  /** 1-based，当前模板内正在导出的页码 */
  pageCurrent: number;
  /** 当前模板的总页数 */
  pageTotal: number;
}

/** 把模板名清洗成安全的文件夹名 */
const sanitizeFolderName = (name: string): string => {
  // 去掉 zip 不允许的字符 / Windows 非法字符
  const cleaned = name.replace(/[\\/:*?"<>|]/g, '_').trim();
  return cleaned || '未命名模板';
};

/** 把单页渲染为高清 PNG dataURL（1200×1600，无低质量标记） */
const renderPageToPngDataUrl = async (
  pageIdx: number,
  allImages: string[],
  config: CanvasConfig,
  templateId: TemplateId,
  loadImage: ImageLoader,
): Promise<string> => {
  const layout = calcLayoutInfo(templateId, allImages.length);
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 canvas 2D context');
  await drawCanvasPage(ctx, pageIdx, allImages, config, templateId, layout, loadImage, false);
  return canvas.toDataURL('image/png');
};

/**
 * 一键导出全部排版：
 *  - 遍历 TEMPLATES，按每个模板的 layoutConfigs 渲染对应所有页
 *  - 在 zip 内按模板名建立子文件夹，所有页统一 page-N.png
 *  - 文件夹名清洗：去除 zip/Windows 非法字符
 *
 * @param onProgress 每完成一页触发一次，用于按钮实时显示进度
 */
export const exportAllTemplatesZip = async (
  allImages: string[],
  baseConfig: CanvasConfig,
  layoutConfigs: LayoutConfigMap,
  templateTitles: Record<TemplateId, string>,
  templateSubtitles: Record<TemplateId, string>,
  loadImage: ImageLoader,
  onProgress?: (p: ExportAllProgress) => void,
  zipFileName: string = 'xiaohongshu-all-templates',
): Promise<void> => {
  if (allImages.length === 0) return;

  // 把"有内置多封面变体的模板"按变体展平为多个任务，否则只有一个任务
  // - single-page-flow：内置封面 A / B 是两套不同的视觉，需要各导出一份
  // - 其他模板：单任务
  const tasks: { templateId: TemplateId; templateName: string; variant: 'a' | 'b' | null }[] = [];
  for (const tpl of TEMPLATES) {
    if (tpl.id === 'single-page-flow') {
      tasks.push({ templateId: tpl.id, templateName: tpl.name, variant: 'a' });
      tasks.push({ templateId: tpl.id, templateName: tpl.name, variant: 'b' });
    } else {
      tasks.push({ templateId: tpl.id, templateName: tpl.name, variant: null });
    }
  }
  const totalTasks = tasks.length;

  const zip = new JSZip();

  for (let t = 0; t < totalTasks; t++) {
    const { templateId, templateName, variant } = tasks[t];
    const layout = calcLayoutInfo(templateId, allImages.length);
    if (layout.total <= 0) continue;

    // 合并：该模板的布局参数 + 用户当前的公共配置（背景、标题、副标题、封面等）
    // 命中封面变体时覆盖 coverVariant，触发 canvasRenderer 走对应变体的封面底图 + 嵌入区域
    const tplConfig: CanvasConfig = {
      ...baseConfig,
      title: templateTitles[templateId] ?? baseConfig.title,
      subtitle: templateSubtitles[templateId] ?? baseConfig.subtitle,
      ...layoutConfigs[templateId],
      ...(variant ? { coverVariant: variant } : {}),
    };

    // 文件夹名：变体后缀用大写 A / B，方便在解压后一眼区分
    const displayName = variant ? `${templateName}·${variant.toUpperCase()}` : templateName;
    const folderName = sanitizeFolderName(
      variant ? `${templateName}-${variant.toUpperCase()}` : templateName,
    );

    const folder = zip.folder(folderName);
    if (!folder) continue;

    for (let pageIdx = 0; pageIdx < layout.total; pageIdx++) {
      onProgress?.({
        currentTemplate: t + 1,
        totalTemplates: totalTasks,
        templateName: displayName,
        pageCurrent: pageIdx + 1,
        pageTotal: layout.total,
      });
      const dataUrl = await renderPageToPngDataUrl(pageIdx, allImages, tplConfig, templateId, loadImage);
      const commaIdx = dataUrl.indexOf(',');
      if (commaIdx < 0) continue;
      const base64 = dataUrl.slice(commaIdx + 1);
      folder.file(`page-${pageIdx + 1}.png`, base64, { base64: true });
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${zipFileName}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
