import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { CanvasConfig, TemplateId } from './types';
import { generateXHSTitles } from './services/geminiService';
import {
  TEMPLATES,
  INITIAL_LAYOUTS,
  DEFAULT_CONFIG,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  LayoutConfigMap,
} from './lib/constants';
import { calcLayoutInfo } from './lib/layoutCalc';
import { useLruImageCache } from './hooks/useLruImageCache';
import { usePersistedState } from './hooks/usePersistedState';
import { drawCanvasPage, getCanvasCoords } from './lib/canvasRenderer';
import { batchDownloadZip, exportAllTemplatesZip, type ExportAllProgress } from './lib/exportPng';
import EditorPanel from './components/EditorPanel';
import PreviewGrid from './components/PreviewGrid';
import ZoomModal from './components/ZoomModal';

const STORAGE_KEYS = {
  config: 'xh-layout:config',
  layouts: 'xh-layout:layouts',
  template: 'xh-layout:template',
  templateTitles: 'xh-layout:template-titles',
  templateSubtitles: 'xh-layout:template-subtitles',
} as const;

/**
 * layoutConfigs 的存储版本。
 * - bump 这个数 → 老数据自动作废，重新用 INITIAL_LAYOUTS 兜底。
 * - 用于"修了 layout 同步 bug 后，老用户本地还有污染数据"的情况，
 *   不需要让用户手动清 localStorage。
 */
const LAYOUT_STORAGE_VERSION = 2;

const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v));

const createInitialTemplateSubtitles = (): Record<TemplateId, string> =>
  TEMPLATES.reduce(
    (acc, template) => {
      acc[template.id] = DEFAULT_CONFIG.subtitle;
      return acc;
    },
    {} as Record<TemplateId, string>,
  );

const createInitialTemplateTitles = (): Record<TemplateId, string> =>
  TEMPLATES.reduce(
    (acc, template) => {
      acc[template.id] = DEFAULT_CONFIG.title;
      return acc;
    },
    {} as Record<TemplateId, string>,
  );

/**
 * 还原 config 时主动丢弃 backgroundImage：
 * - base64 太大不适合 localStorage
 * - 用户刷新后重新上传底图是合理代价
 *
 * 顺带做一次数据迁移：旧版用扁平的 coverEmbedX/Y/W/H 四个字段，
 * 新版改成按 coverVariant 分别存储的 coverEmbedRegion。检测到旧字段时
 * 自动转成新结构，用户的旧设置不会丢。
 */
const loadConfigFromStorage = (): CanvasConfig => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.config);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<CanvasConfig> & {
      // 旧版扁平字段（迁移期临时读取）
      coverEmbedX?: number;
      coverEmbedY?: number;
      coverEmbedW?: number;
      coverEmbedH?: number;
    };
    let region = parsed.coverEmbedRegion as any;
    if (
      !region &&
      (parsed.coverEmbedX !== undefined ||
        parsed.coverEmbedY !== undefined ||
        parsed.coverEmbedW !== undefined ||
        parsed.coverEmbedH !== undefined)
    ) {
      const migrated = {
        x: parsed.coverEmbedX ?? 0.03,
        y: parsed.coverEmbedY ?? 0.27,
        w: parsed.coverEmbedW ?? 0.94,
        h: parsed.coverEmbedH ?? 0.42,
      };
      region = { a: migrated, b: { ...migrated } };
    }
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      coverEmbedRegion: region ?? DEFAULT_CONFIG.coverEmbedRegion,
      backgroundImage: undefined,
      // 旧版本没有 subtitleFontFamily，回退到 titleFontFamily，保证视觉不变
      subtitleFontFamily: parsed.subtitleFontFamily ?? parsed.titleFontFamily ?? DEFAULT_CONFIG.subtitleFontFamily,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
};

const App: React.FC = () => {
  const [images, setImages] = useState<string[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // 持久化字段：模板选择
  const [activeTemplateId, setActiveTemplateId] = usePersistedState<TemplateId>(
    STORAGE_KEYS.template,
    TEMPLATES[0].id,
  );
  const [templateTitles, setTemplateTitles] = usePersistedState<Record<TemplateId, string>>(
    STORAGE_KEYS.templateTitles,
    createInitialTemplateTitles(),
  );
  const [templateSubtitles, setTemplateSubtitles] = usePersistedState<Record<TemplateId, string>>(
    STORAGE_KEYS.templateSubtitles,
    createInitialTemplateSubtitles(),
  );

  // 持久化字段：每模板的布局参数（带版本号，旧污染数据自动作废）
  const [layoutConfigs, setLayoutConfigs] = useState<LayoutConfigMap>(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.layouts);
      if (!raw) return INITIAL_LAYOUTS;
      const parsed = JSON.parse(raw) as LayoutConfigMap & { __v?: number };
      if (parsed.__v !== LAYOUT_STORAGE_VERSION) return INITIAL_LAYOUTS;
      // 去掉版本字段再返回
      const { __v: _v, ...rest } = parsed as LayoutConfigMap & { __v?: number };
      return rest as LayoutConfigMap;
    } catch {
      return INITIAL_LAYOUTS;
    }
  });
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          STORAGE_KEYS.layouts,
          JSON.stringify({ ...layoutConfigs, __v: LAYOUT_STORAGE_VERSION }),
        );
      } catch (err) {
        console.warn('Persist layouts failed:', err);
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [layoutConfigs]);

  // config：排除 backgroundImage 后持久化
  const [config, setConfig] = useState<CanvasConfig>(loadConfigFromStorage);
  useEffect(() => {
    const { backgroundImage: _bg, ...persistable } = config;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(persistable));
      } catch (err) {
        console.warn('Persist config failed:', err);
      }
    }, 200);
    return () => window.clearTimeout(timer);
  }, [config]);

  // LRU 图片缓存：避免大量图片撑爆内存
  const { load: loadImage } = useLruImageCache();

  // 文本输入本地副本，250ms 后写入 config（避免拖拽/打字时高频渲染）
  const [localTitle, setLocalTitle] = useState(
    templateTitles[activeTemplateId] ?? DEFAULT_CONFIG.title,
  );
  const [localSubtitle, setLocalSubtitle] = useState(
    templateSubtitles[activeTemplateId] ?? DEFAULT_CONFIG.subtitle,
  );

  const handleTitleChange = useCallback(
    (value: string) => {
      setLocalTitle(value);
      setTemplateTitles((prev) =>
        prev[activeTemplateId] === value ? prev : { ...prev, [activeTemplateId]: value },
      );
      setConfig((prev) => (prev.title === value ? prev : { ...prev, title: value }));
    },
    [activeTemplateId, setTemplateTitles],
  );

  const handleSubtitleChange = useCallback(
    (value: string) => {
      setLocalSubtitle(value);
      setTemplateSubtitles((prev) =>
        prev[activeTemplateId] === value ? prev : { ...prev, [activeTemplateId]: value },
      );
      setConfig((prev) => (prev.subtitle === value ? prev : { ...prev, subtitle: value }));
    },
    [activeTemplateId, setTemplateSubtitles],
  );

  // 拖拽状态
  const [isDraggingTitle, setIsDraggingTitle] = useState(false);
  const [isDraggingSubtitle, setIsDraggingSubtitle] = useState(false);
  const isDraggingAny = isDraggingTitle || isDraggingSubtitle;

  // 加载状态
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  // 一键导出全部排版的进度（null = 未在进行）
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [exportAllProgress, setExportAllProgress] = useState<ExportAllProgress | null>(null);

  // 缩放状态
  const [zoomedPreviewIdx, setZoomedPreviewIdx] = useState<number | null>(null);
  const [zoomedSourceUrl, setZoomedSourceUrl] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const zoomedContainerRef = useRef<HTMLDivElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);

  // 性能优化：结构签名 + 预览缓存
  // 只有影响所有页面的字段（图片、背景、模板等）变化时才全量渲染，
  // 纯文字变化只重渲染封面页
  const structuralSigRef = useRef<string>('');
  const previewUrlsRef = useRef<string[]>([]);

  const activeTemplate = useMemo(
    () => TEMPLATES.find((t) => t.id === activeTemplateId) || TEMPLATES[0],
    [activeTemplateId],
  );

  const isTextHidden = useMemo(
    () => activeTemplateId === 'directory-flow' || activeTemplateId === 'single-page-flow',
    [activeTemplateId],
  );

  const layoutInfo = useMemo(
    () => calcLayoutInfo(activeTemplateId, images.length),
    [activeTemplateId, images.length],
  );

  // 切模板 → 应用该模板的布局
  useEffect(() => {
    const layout = layoutConfigs[activeTemplateId];
    const title = templateTitles[activeTemplateId] ?? DEFAULT_CONFIG.title;
    const subtitle = templateSubtitles[activeTemplateId] ?? DEFAULT_CONFIG.subtitle;
    if (layout) {
      setConfig((prev) => ({ ...prev, ...layout, title, subtitle }));
    }
    setLocalTitle(title);
    setLocalSubtitle(subtitle);
  }, [activeTemplateId]);

  // config 中布局相关字段变化 → 写回当前模板的 layoutConfigs
  // 注意：依赖里故意不放 activeTemplateId。
  // 切模板的瞬间，第一次渲染时 activeTemplateId 已是新模板、但 config 还残留旧模板的值，
  // 这时候写回会把"旧模板的副标题字号/颜色/字体"污染进"新模板的 layoutConfigs"，
  // 表现就是所有模板的副标题看起来"共用了"。把 activeTemplateId 拿掉后，
  // 写回只在用户主动改 config 时触发，切模板 useEffect 改完 config 后的那次写回
  // 用的是新模板的 config 写到新模板的 key，是无害的（写回值与旧值一致）。
  useEffect(() => {
    setLayoutConfigs((prev) => ({
      ...prev,
      [activeTemplateId]: {
        textX: config.textX,
        textY: config.textY,
        subtitleX: config.subtitleX,
        subtitleY: config.subtitleY,
        titleFontSize: config.titleFontSize,
        subtitleFontSize: config.subtitleFontSize,
        writingMode: config.writingMode,
        titleFontFamily: config.titleFontFamily,
        subtitleFontFamily: config.subtitleFontFamily,
        titleColor: config.titleColor,
        subtitleColor: config.subtitleColor,
      },
    }));
  }, [
    config.textX,
    config.textY,
    config.subtitleX,
    config.subtitleY,
    config.titleFontSize,
    config.subtitleFontSize,
    config.writingMode,
    config.titleFontFamily,
    config.subtitleFontFamily,
    config.titleColor,
    config.subtitleColor,
  ]);

  // 拖拽手柄：mousedown + window 级别 mousemove/mouseup
  const handleTextHandleMouseDown = useCallback(
    (e: React.MouseEvent, type: 'drag-title' | 'drag-subtitle') => {
      e.preventDefault();
      if (type === 'drag-title') setIsDraggingTitle(true);
      if (type === 'drag-subtitle') setIsDraggingSubtitle(true);
    },
    [],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingTitle && !isDraggingSubtitle) return;
      const container =
        zoomedPreviewIdx !== null ? zoomedContainerRef.current : previewContainerRef.current;
      const { x, y } = getCanvasCoords(e.clientX, e.clientY, container);
      if (isDraggingTitle) {
        setConfig((prev) => ({ ...prev, textX: clamp(x, CANVAS_WIDTH), textY: clamp(y, CANVAS_HEIGHT) }));
      } else if (isDraggingSubtitle) {
        setConfig((prev) => ({
          ...prev,
          subtitleX: clamp(x, CANVAS_WIDTH),
          subtitleY: clamp(y, CANVAS_HEIGHT),
        }));
      }
    },
    [isDraggingTitle, isDraggingSubtitle, zoomedPreviewIdx],
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggingTitle(false);
    setIsDraggingSubtitle(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // 文件上传
  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    const fileArray = Array.from(files) as File[];
    const dataUrlPromises = fileArray.map(
      (file: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }),
    );
    try {
      const newImages = await Promise.all(dataUrlPromises);
      setImages((prev) => [...prev, ...newImages]);
    } catch (error) {
      console.error('Error reading files:', error);
    }
  };

  const handleBgUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setConfig((prev) => ({ ...prev, backgroundImage: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleAiGenerate = async () => {
    if (images.length === 0) return;
    setIsAiLoading(true);
    try {
      const result = await generateXHSTitles(images);
      handleTitleChange(result.title);
      handleSubtitleChange(result.subtitle);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // 缩略图预渲染：所有页面 → dataURL
  // 性能优化：
  // - 纯文字变化（标题/副标题/位置）只重渲染封面页，其余复用已有预览
  // - 结构变化（图片/背景/模板/封面变体等）才全量渲染
  // - 拖拽中：0.4x 缩放 + JPEG 0.5 质量，最快响应
  // - 静止时：1x + PNG 0.8 质量，高清展示
  const updateAllPreviews = useCallback(async () => {
    const renderPage = async (idx: number) => {
      const canvas = document.createElement('canvas');
      const scale = isDraggingAny ? 0.4 : 1;
      canvas.width = CANVAS_WIDTH * scale;
      canvas.height = CANVAS_HEIGHT * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';
      if (scale !== 1) ctx.scale(scale, scale);
      await drawCanvasPage(ctx, idx, images, config, activeTemplateId, layoutInfo, loadImage);
      // JPEG 编码比 PNG 快很多，拖拽时用 JPEG 减少主线程阻塞
      return canvas.toDataURL(isDraggingAny ? 'image/jpeg' : 'image/png', isDraggingAny ? 0.5 : 0.8);
    };

    // 结构签名：影响所有页面的字段。只有这些变化才需要全量渲染。
    // 纯文字字段（title/subtitle/textX/textY/字号/颜色/字体）不在签名中，
    // 它们只影响封面页，走 cover-only 快速路径。
    const sig = [
      images.length,
      layoutInfo.total,
      activeTemplateId,
      config.backgroundColor,
      config.backgroundImage ? '1' : '0',
      config.bgOpacity,
      config.coverVariant,
      JSON.stringify(config.coverEmbedRegion),
      config.brandText,
    ].join('|');
    const structuralChanged = structuralSigRef.current !== sig;
    structuralSigRef.current = sig;

    const hasFullPreviews = previewUrlsRef.current.length >= layoutInfo.total;
    const coverOnly = (isDraggingAny || !structuralChanged) && hasFullPreviews;

    if (coverOnly) {
      // 只渲染封面页，其余复用已有预览 — 不设 loading 避免闪烁
      try {
        const coverUrl = await renderPage(0);
        if (coverUrl) {
          setPreviewUrls(prev => {
            const next = [...prev];
            next[0] = coverUrl;
            previewUrlsRef.current = next;
            return next;
          });
        }
      } catch (e) {
        console.error(e);
      }
      return;
    }

    // 全量渲染
    setIsPreviewLoading(true);
    try {
      const tasks: Promise<string>[] = [];
      for (let i = 0; i < layoutInfo.total; i++) tasks.push(renderPage(i));
      const urls = await Promise.all(tasks);
      previewUrlsRef.current = urls;
      setPreviewUrls(urls);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [images, config, activeTemplateId, layoutInfo, loadImage, isDraggingAny]);

  // 拖拽期间用更短的 debounce，松手后用常规 250ms
  useEffect(() => {
    const delay = isDraggingAny ? 60 : 200;
    const timer = setTimeout(updateAllPreviews, delay);
    return () => clearTimeout(timer);
  }, [updateAllPreviews, isDraggingAny]);

  // 放大预览中的实时 canvas
  useEffect(() => {
    if (zoomedPreviewIdx === null || !liveCanvasRef.current) return;
    const ctx = liveCanvasRef.current.getContext('2d');
    if (!ctx) return;
    const frame = requestAnimationFrame(() => {
      drawCanvasPage(ctx, zoomedPreviewIdx, images, config, activeTemplateId, layoutInfo, loadImage);
    });
    return () => cancelAnimationFrame(frame);
  }, [config, images, activeTemplateId, layoutInfo, zoomedPreviewIdx, loadImage]);

  const handleExport = async () => {
    if (previewUrls.length === 0) return;
    setIsProcessing(true);
    try {
      await batchDownloadZip(previewUrls, 'page');
    } finally {
      setIsProcessing(false);
    }
  };

  // 一键导出全部排版：遍历所有模板，按各模板自己的 layoutConfigs 渲染并归类打包
  const handleExportAll = async () => {
    if (images.length === 0) return;
    setIsExportingAll(true);
    setExportAllProgress(null);
    try {
      await exportAllTemplatesZip(
        images,
        config,
        layoutConfigs,
        templateTitles,
        templateSubtitles,
        loadImage,
        (p) => setExportAllProgress(p),
      );
    } finally {
      setIsExportingAll(false);
      setExportAllProgress(null);
    }
  };

  // 重置当前模板的副标题 / 标题排版到默认值
  // - 写回 layoutConfigs[activeTemplateId]：下一次切走再切回也会保持默认
  // - 同步刷新当前 config 的相关字段：UI 立即看到效果
  const handleResetCurrentLayout = () => {
    const defaultLayout = INITIAL_LAYOUTS[activeTemplateId];
    if (!defaultLayout) return;
    setLayoutConfigs((prev) => ({ ...prev, [activeTemplateId]: defaultLayout }));
    setConfig((prev) => ({ ...prev, ...defaultLayout }));
  };

  const closeZoom = () => {
    setZoomedPreviewIdx(null);
    setZoomedSourceUrl(null);
  };

  return (
    <div className="flex h-screen min-w-0 bg-zinc-50 overflow-hidden text-zinc-800 font-['Noto_Sans_SC']">
      <EditorPanel
        config={config}
        setConfig={setConfig}
        localTitle={localTitle}
        setLocalTitle={handleTitleChange}
        localSubtitle={localSubtitle}
        setLocalSubtitle={handleSubtitleChange}
        activeTemplateId={activeTemplateId}
        setActiveTemplateId={setActiveTemplateId}
        isTextHidden={isTextHidden}
        imageCount={images.length}
        isAiLoading={isAiLoading}
        isProcessing={isProcessing}
        isPreviewLoading={isPreviewLoading}
        previewPageCount={previewUrls.length}
        isExportingAll={isExportingAll}
        exportAllProgress={exportAllProgress}
        onAiGenerate={handleAiGenerate}
        onUpload={handleUpload}
        onBgUpload={handleBgUpload}
        onExport={handleExport}
        onExportAll={handleExportAll}
        onResetCurrentLayout={handleResetCurrentLayout}
        onPreviewImageClick={(url) => setZoomedSourceUrl(url)}
        uploadedImageUrls={images}
        fileInputRef={fileInputRef}
        bgInputRef={bgInputRef}
      />

      <PreviewGrid
        previewUrls={previewUrls}
        config={config}
        activeTemplateId={activeTemplateId}
        activeTemplateName={activeTemplate.name}
        imageCount={images.length}
        isTextHidden={isTextHidden}
        isDraggingTitle={isDraggingTitle}
        isDraggingSubtitle={isDraggingSubtitle}
        previewContainerRef={previewContainerRef}
        onZoom={(idx) => setZoomedPreviewIdx(idx)}
        onTextHandleMouseDown={handleTextHandleMouseDown}
      />

      <ZoomModal
        zoomedPreviewIdx={zoomedPreviewIdx}
        zoomedSourceUrl={zoomedSourceUrl}
        close={closeZoom}
        zoomedContainerRef={zoomedContainerRef}
        liveCanvasRef={liveCanvasRef}
        config={config}
        setConfig={setConfig}
        localTitle={localTitle}
        setLocalTitle={handleTitleChange}
        localSubtitle={localSubtitle}
        setLocalSubtitle={handleSubtitleChange}
        isTextHidden={isTextHidden}
        activeTemplateId={activeTemplateId}
        isDraggingTitle={isDraggingTitle}
        isDraggingSubtitle={isDraggingSubtitle}
        onTextHandleMouseDown={handleTextHandleMouseDown}
      />
    </div>
  );
};

export default App;
