import React, { RefObject } from 'react';
import { CanvasConfig, TemplateId } from '../types';
import { CANVAS_HEIGHT, CANVAS_WIDTH, FONT_OPTIONS } from '../lib/constants';
import TextHandles from './TextHandles';

interface ZoomModalProps {
  zoomedPreviewIdx: number | null;
  zoomedSourceUrl: string | null;
  close: () => void;
  zoomedContainerRef: RefObject<HTMLDivElement | null>;
  liveCanvasRef: RefObject<HTMLCanvasElement | null>;
  config: CanvasConfig;
  setConfig: React.Dispatch<React.SetStateAction<CanvasConfig>>;
  localTitle: string;
  setLocalTitle: (v: string) => void;
  localSubtitle: string;
  setLocalSubtitle: (v: string) => void;
  isTextHidden: boolean;
  activeTemplateId: TemplateId;
  isDraggingTitle: boolean;
  isDraggingSubtitle: boolean;
  onTextHandleMouseDown: (e: React.MouseEvent, type: 'drag-title' | 'drag-subtitle') => void;
}

const ZoomModal: React.FC<ZoomModalProps> = ({
  zoomedPreviewIdx,
  zoomedSourceUrl,
  close,
  zoomedContainerRef,
  liveCanvasRef,
  config,
  setConfig,
  localTitle,
  setLocalTitle,
  localSubtitle,
  setLocalSubtitle,
  isTextHidden,
  activeTemplateId,
  isDraggingTitle,
  isDraggingSubtitle,
  onTextHandleMouseDown,
}) => {
  if (zoomedPreviewIdx === null && zoomedSourceUrl === null) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8 transition-all overflow-hidden animate-in fade-in zoom-in duration-300">
      <div className="absolute top-8 right-8 z-[110]">
        <button
          onClick={close}
          className="w-14 h-14 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all border border-white/20 shadow-2xl active:scale-90"
          aria-label="关闭预览"
        >
          <i className="fas fa-times text-2xl"></i>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row h-full w-full max-w-7xl gap-12 items-center justify-center py-6">
        <div className="flex-1 flex justify-center items-center h-full relative">
          <div
            ref={zoomedContainerRef}
            className="relative h-full max-h-[85vh] aspect-[3/4] bg-white rounded-[40px] shadow-[0_60px_120px_rgba(0,0,0,0.8)] overflow-hidden ring-1 ring-white/10"
          >
            {zoomedPreviewIdx !== null ? (
              <canvas
                ref={liveCanvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="h-full w-auto block select-none bg-white"
              />
            ) : (
              <img
                src={zoomedSourceUrl!}
                alt="放大预览"
                className="h-full w-auto block select-none object-contain"
              />
            )}
            {zoomedPreviewIdx === 0 && !isTextHidden && (
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

        {zoomedPreviewIdx !== null && (
          <div className="flex flex-col gap-6 text-white w-full max-w-sm custom-scrollbar overflow-y-auto max-h-[85vh]">
            <div className="bg-white/10 p-6 rounded-[32px] border border-white/20 backdrop-blur-xl shadow-2xl flex flex-col gap-6">
              <h3 className="text-xl font-black flex items-center gap-2 text-red-400">
                <i className="fas fa-edit"></i> 实时编辑
              </h3>
              {zoomedPreviewIdx === 0 && !isTextHidden && (
                <>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block">
                      封面主标题
                    </label>
                    <textarea
                      value={localTitle}
                      onChange={(e) => setLocalTitle(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-black text-sm outline-none focus:ring-2 focus:ring-red-500/50 min-h-[80px]"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                        <label className="text-[9px] font-black text-white/40 block mb-2 uppercase">标题字号</label>
                        <input
                          type="range"
                          min="40"
                          max="240"
                          value={config.titleFontSize}
                          onChange={(e) => setConfig((prev) => ({ ...prev, titleFontSize: Number(e.target.value) }))}
                          className="w-full accent-red-500"
                        />
                      </div>
                      <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                        <label className="text-[9px] font-black text-white/40 block mb-2 uppercase">标题颜色</label>
                        <input
                          type="color"
                          value={config.titleColor}
                          onChange={(e) => setConfig((prev) => ({ ...prev, titleColor: e.target.value }))}
                          className="w-full h-8 bg-transparent cursor-pointer p-0 border-none"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block">
                      封面副标题
                    </label>
                    <textarea
                      value={localSubtitle}
                      onChange={(e) => setLocalSubtitle(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold text-xs outline-none focus:ring-2 focus:ring-red-500/50 h-20"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                        <label className="text-[9px] font-black text-white/40 block mb-2 uppercase">副标题字号</label>
                        <input
                          type="range"
                          min="10"
                          max="120"
                          value={config.subtitleFontSize}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, subtitleFontSize: Number(e.target.value) }))
                          }
                          className="w-full accent-zinc-400"
                        />
                      </div>
                      <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                        <label className="text-[9px] font-black text-white/40 block mb-2 uppercase">副标题颜色</label>
                        <input
                          type="color"
                          value={config.subtitleColor}
                          onChange={(e) => setConfig((prev) => ({ ...prev, subtitleColor: e.target.value }))}
                          className="w-full h-8 bg-transparent cursor-pointer p-0 border-none"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-4 pt-4 border-t border-white/10">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block">
                  全局背景设置
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                    <label className="text-[9px] font-black text-white/40 block mb-2 uppercase">背景色</label>
                    <input
                      type="color"
                      value={config.backgroundColor}
                      onChange={(e) => setConfig((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                      className="w-full h-8 bg-transparent cursor-pointer p-0 border-none"
                    />
                  </div>
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                    <label className="text-[9px] font-black text-white/40 block mb-2 uppercase">底图透明</label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={config.bgOpacity}
                      onChange={(e) => setConfig((prev) => ({ ...prev, bgOpacity: Number(e.target.value) }))}
                      className="w-full accent-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-white/10">
                <label className="text-[10px] font-black text-white/50 uppercase tracking-widest block">全局字体</label>
                <select
                  value={config.titleFontFamily}
                  onChange={(e) => setConfig((prev) => ({ ...prev, titleFontFamily: e.target.value }))}
                  className="w-full bg-zinc-900/80 border border-white/20 rounded-2xl px-5 py-4 text-white text-xs font-bold outline-none"
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value} className="bg-zinc-900 text-white">
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={close}
                className="w-full py-5 bg-red-500 hover:bg-red-600 rounded-2xl font-black text-white shadow-xl transition-all text-sm"
              >
                完成并保存
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZoomModal;
