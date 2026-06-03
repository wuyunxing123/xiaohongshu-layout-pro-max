import React, { RefObject } from 'react';
import { CanvasConfig, TemplateId } from '../types';
import TextHandles from './TextHandles';

interface PreviewGridProps {
  previewUrls: string[];
  config: CanvasConfig;
  activeTemplateId: TemplateId;
  activeTemplateName: string;
  imageCount: number;
  isTextHidden: boolean;
  isDraggingTitle: boolean;
  isDraggingSubtitle: boolean;
  previewContainerRef: RefObject<HTMLDivElement | null>;
  onZoom: (idx: number) => void;
  onTextHandleMouseDown: (e: React.MouseEvent, type: 'drag-title' | 'drag-subtitle') => void;
}

const PreviewGrid: React.FC<PreviewGridProps> = ({
  previewUrls,
  config,
  activeTemplateId,
  activeTemplateName,
  imageCount,
  isTextHidden,
  isDraggingTitle,
  isDraggingSubtitle,
  previewContainerRef,
  onZoom,
  onTextHandleMouseDown,
}) => {
  return (
    <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar bg-zinc-100/30 p-8 pb-24">
      <div className="max-w-6xl mx-auto w-full">
        <header className="mb-10 flex flex-col gap-2">
          <h2 className="text-3xl font-black text-zinc-900 tracking-tight flex items-center gap-3">
            设计画廊
            <span className="text-sm font-bold text-zinc-400 px-3 py-1 bg-white border border-zinc-200 rounded-full">
              {activeTemplateName}
            </span>
          </h2>
          <p className="text-zinc-400 font-bold text-xs uppercase tracking-widest">
            {imageCount > 0 ? `共 ${previewUrls.length} 页就绪` : '等待上传 PPT 截图...'}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {previewUrls.map((url, idx) => (
            <div key={idx} className="group flex flex-col gap-4 relative">
              <div className="flex justify-between px-2 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                <span>{idx === 0 && !isTextHidden ? 'COVER (封面)' : `PAGE ${idx + 1}`}</span>
              </div>
              <div
                ref={idx === 0 ? previewContainerRef : undefined}
                onClick={() => onZoom(idx)}
                className="relative shadow-2xl rounded-3xl overflow-hidden bg-white ring-1 ring-zinc-200/50 transition-all duration-700 transform group-hover:scale-[1.05] group-hover:-translate-y-4 group-hover:shadow-[0_60px_90px_-25px_rgba(0,0,0,0.35)] cursor-zoom-in"
              >
                <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-auto block select-none" />
                {idx === 0 && !isTextHidden && (
                  <TextHandles
                    config={config}
                    activeTemplateId={activeTemplateId}
                    isDraggingTitle={isDraggingTitle}
                    isDraggingSubtitle={isDraggingSubtitle}
                    onMouseDown={onTextHandleMouseDown}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PreviewGrid;
