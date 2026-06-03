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
import { batchDownloadZip } from './lib/exportPng';
import EditorPanel from './components/EditorPanel';
import PreviewGrid from './components/PreviewGrid';
import ZoomModal from './components/ZoomModal';

const STORAGE_KEYS = {
  config: 'xh-layout:config',
  layouts: 'xh-layout:layouts',
  template: 'xh-layout:template',
} as const;

const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v));

/**
 * 还原 config 时主动丢弃 backgroundImage：
 * - base64 太大不适合 localStorage
 * - 用户刷新后重新上传底图是合理代价
 */
const loadConfigFromStorage = (): CanvasConfig => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.config);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<CanvasConfig>;
    return { ...DEFAULT_CONFIG, ...parsed, backgroundImage: undefined };
  } catch {
    return DEFAULT_CONFIG;
  }
};

const App: React.FC = () => {
  const [images, setImages] = useState<string[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // 持久化字段：模板选择 + 每模板的布局参数
  const [activeTemplateId, setActiveTemplateId] = usePersistedState<TemplateId>(
    STORAGE_KEYS.template,
    TEMPLATES[0].id,
  );
  const [layoutConfigs, setLayoutConfigs] = usePersistedState<LayoutConfigMap>(
    STORAGE_KEYS.layouts,
    INITIAL_LAYOUTS,
  );

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
  const [localTitle, setLocalTitle] = useState(config.title);
  const [localSubtitle, setLocalSubtitle] = useState(config.subtitle);
  useEffect(() => {
    const timer = setTimeout(() => {
      setConfig((prev) =>
        prev.title === localTitle && prev.subtitle === localSubtitle ? prev : { ...prev, title: localTitle, subtitle: localSubtitle },
      );
    }, 200);
    return () => clearTimeout(timer);
  }, [localTitle, localSubtitle]);
  useEffect(() => {
    setLocalTitle(config.title);
    setLocalSubtitle(config.subtitle);
  }, [config.title, config.subtitle]);

  // 拖拽状态
  const [isDraggingTitle, setIsDraggingTitle] = useState(false);
  const [isDraggingSubtitle, setIsDraggingSubtitle] = useState(false);
  const isDraggingAny = isDraggingTitle || isDraggingSubtitle;

  // 加载状态
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // 缩放状态
  const [zoomedPreviewIdx, setZoomedPreviewIdx] = useState<number | null>(null);
  const [zoomedSourceUrl, setZoomedSourceUrl] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const zoomedContainerRef = useRef<HTMLDivElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);

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
    if (layout) {
      setConfig((prev) => ({ ...prev, ...layout }));
    }
  }, [activeTemplateId]);

  // config 中布局相关字段变化 → 写回当前模板的 layoutConfigs
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
    config.titleColor,
    config.subtitleColor,
    activeTemplateId,
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
      setLocalTitle(result.title);
      setLocalSubtitle(result.subtitle);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  // 缩略图预渲染：所有页面 → dataURL
  // - 拖拽中：使用 0.5x 缩放 + 0.4 质量，秒级响应
  // - 静止时：1x + 0.8 质量，高清展示
  const updateAllPreviews = useCallback(async () => {
    const renderPage = async (idx: number) => {
      const canvas = document.createElement('canvas');
      const scale = isDraggingAny ? 0.5 : 1;
      canvas.width = CANVAS_WIDTH * scale;
      canvas.height = CANVAS_HEIGHT * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';
      if (scale !== 1) ctx.scale(scale, scale);
      await drawCanvasPage(ctx, idx, images, config, activeTemplateId, layoutInfo, loadImage);
      return canvas.toDataURL('image/png', isDraggingAny ? 0.4 : 0.8);
    };
    setIsPreviewLoading(true);
    try {
      const tasks: Promise<string>[] = [];
      for (let i = 0; i < layoutInfo.total; i++) tasks.push(renderPage(i));
      const urls = await Promise.all(tasks);
      setPreviewUrls(urls);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [images, config, activeTemplateId, layoutInfo, loadImage, isDraggingAny]);

  // 拖拽期间用更短的 debounce，松手后用常规 250ms
  useEffect(() => {
    const delay = isDraggingAny ? 80 : 250;
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

  const closeZoom = () => {
    setZoomedPreviewIdx(null);
    setZoomedSourceUrl(null);
  };

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden text-zinc-800 font-['Noto_Sans_SC']">
      <EditorPanel
        config={config}
        setConfig={setConfig}
        localTitle={localTitle}
        setLocalTitle={setLocalTitle}
        localSubtitle={localSubtitle}
        setLocalSubtitle={setLocalSubtitle}
        activeTemplateId={activeTemplateId}
        setActiveTemplateId={setActiveTemplateId}
        isTextHidden={isTextHidden}
        imageCount={images.length}
        isAiLoading={isAiLoading}
        isProcessing={isProcessing}
        isPreviewLoading={isPreviewLoading}
        previewPageCount={previewUrls.length}
        onAiGenerate={handleAiGenerate}
        onUpload={handleUpload}
        onBgUpload={handleBgUpload}
        onExport={handleExport}
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
        setLocalTitle={setLocalTitle}
        localSubtitle={localSubtitle}
        setLocalSubtitle={setLocalSubtitle}
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
