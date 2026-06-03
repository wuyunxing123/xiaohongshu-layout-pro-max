import React, { RefObject } from 'react';
import { CanvasConfig, TemplateId } from '../types';
import { TEMPLATES, FONT_OPTIONS, COVER_VARIANTS } from '../lib/constants';

interface EditorPanelProps {
  config: CanvasConfig;
  setConfig: React.Dispatch<React.SetStateAction<CanvasConfig>>;
  localTitle: string;
  setLocalTitle: (v: string) => void;
  localSubtitle: string;
  setLocalSubtitle: (v: string) => void;
  activeTemplateId: TemplateId;
  setActiveTemplateId: (id: TemplateId) => void;
  isTextHidden: boolean;
  imageCount: number;
  isAiLoading: boolean;
  isProcessing: boolean;
  isPreviewLoading: boolean;
  previewPageCount: number;
  onAiGenerate: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBgUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onPreviewImageClick: (url: string) => void;
  uploadedImageUrls: string[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  bgInputRef: RefObject<HTMLInputElement | null>;
}

const EditorPanel: React.FC<EditorPanelProps> = ({
  config,
  setConfig,
  localTitle,
  setLocalTitle,
  localSubtitle,
  setLocalSubtitle,
  activeTemplateId,
  setActiveTemplateId,
  isTextHidden,
  imageCount,
  isAiLoading,
  isProcessing,
  isPreviewLoading,
  previewPageCount,
  onAiGenerate,
  onUpload,
  onBgUpload,
  onExport,
  onPreviewImageClick,
  uploadedImageUrls,
  fileInputRef,
  bgInputRef,
}) => {
  return (
    <div className="w-[440px] bg-white shadow-2xl z-20 flex flex-col p-8 border-r border-zinc-200 overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-14 h-14 bg-red-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
          <i className="fas fa-layer-group text-2xl"></i>
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tight">
            XH-Layout <span className="text-red-500">PRO</span>
          </h1>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">实时设计引擎</p>
        </div>
      </div>

      <div className="space-y-10 flex-1">
        {!isTextHidden && (
          <>
            <section>
              <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-4">主标题配置</h2>
              <div className="space-y-4 bg-zinc-50 p-4 rounded-3xl border border-zinc-100">
                <div className="relative">
                  <input
                    type="text"
                    value={localTitle}
                    onChange={(e) => setLocalTitle(e.target.value)}
                    className="w-full px-5 py-4 bg-white border border-zinc-100 rounded-2xl text-sm font-black focus:ring-4 focus:ring-red-500/5 outline-none"
                    aria-label="主标题文本"
                  />
                  <button
                    onClick={onAiGenerate}
                    disabled={imageCount === 0 || isAiLoading}
                    className="absolute right-2.5 top-2.5 bottom-2.5 px-4 bg-zinc-900 text-white rounded-xl text-[10px] font-black flex items-center gap-2 disabled:opacity-40"
                    aria-label="AI 生成标题"
                  >
                    {isAiLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-robot"></i>} AI
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-zinc-400 uppercase mb-2 block">
                      字号 ({config.titleFontSize})
                    </label>
                    <input
                      type="range"
                      min="40"
                      max="240"
                      value={config.titleFontSize}
                      onChange={(e) => setConfig((prev) => ({ ...prev, titleFontSize: Number(e.target.value) }))}
                      className="w-full accent-red-500"
                      aria-label="主标题字号"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-zinc-400 uppercase mb-2 block">标题颜色</label>
                    <input
                      type="color"
                      value={config.titleColor}
                      onChange={(e) => setConfig((prev) => ({ ...prev, titleColor: e.target.value }))}
                      className="w-full h-8 rounded-lg cursor-pointer bg-white border border-zinc-200 p-0.5"
                      aria-label="主标题颜色"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-4">副标题配置</h2>
              <div className="space-y-4 bg-zinc-50 p-4 rounded-3xl border border-zinc-100">
                <textarea
                  value={localSubtitle}
                  onChange={(e) => setLocalSubtitle(e.target.value)}
                  className="w-full px-5 py-4 bg-white border border-zinc-100 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-red-500/5 h-24 resize-none outline-none"
                  aria-label="副标题文本"
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-bold text-zinc-400 uppercase mb-2 block">
                      字号 ({config.subtitleFontSize})
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={config.subtitleFontSize}
                      onChange={(e) => setConfig((prev) => ({ ...prev, subtitleFontSize: Number(e.target.value) }))}
                      className="w-full accent-zinc-500"
                      aria-label="副标题字号"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-zinc-400 uppercase mb-2 block">副标题颜色</label>
                    <input
                      type="color"
                      value={config.subtitleColor}
                      onChange={(e) => setConfig((prev) => ({ ...prev, subtitleColor: e.target.value }))}
                      className="w-full h-8 rounded-lg cursor-pointer bg-white border border-zinc-200 p-0.5"
                      aria-label="副标题颜色"
                    />
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        <section>
          <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-4">排版选择</h2>
          <div className="grid grid-cols-1 gap-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTemplateId(t.id)}
                aria-pressed={activeTemplateId === t.id}
                aria-label={`模板：${t.name}（${t.description}）`}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                  activeTemplateId === t.id
                    ? 'border-red-500 bg-red-50/20'
                    : 'border-zinc-50 hover:border-zinc-200'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    activeTemplateId === t.id ? 'bg-red-500 text-white' : 'bg-zinc-100 text-zinc-400'
                  }`}
                >
                  <i className={`fas ${t.icon} text-sm`}></i>
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-900">{t.name}</h3>
                  <p className="text-[9px] text-zinc-400 font-medium mt-0.5">{t.description}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {activeTemplateId === 'single-page-flow' && (
          <section>
            <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-4">封面选择</h2>
            <div className="grid grid-cols-2 gap-3">
              {COVER_VARIANTS.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setConfig((prev) => ({ ...prev, coverVariant: v.id }))}
                  aria-pressed={config.coverVariant === v.id}
                  aria-label={`封面：${v.name}`}
                  className={`p-4 rounded-2xl border-2 transition-all text-center ${
                    config.coverVariant === v.id
                      ? 'border-red-500 bg-red-50/20'
                      : 'border-zinc-50 hover:border-zinc-200'
                  }`}
                >
                  <div className={`w-full aspect-[3/4] rounded-xl mb-2 ${
                    v.id === 'a' 
                      ? 'bg-gradient-to-b from-purple-500 via-orange-500 to-green-500' 
                      : 'bg-gradient-to-br from-slate-800 via-slate-600 to-slate-900'
                  }`}>
                    {v.id === 'b' && (
                      <div className="w-full h-1.5 bg-white mt-[78%]"></div>
                    )}
                  </div>
                  <span className="text-xs font-black text-zinc-900">{v.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-4">背景 & 纹理</h2>
          <div className="bg-zinc-50 rounded-3xl p-6 border border-zinc-100 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-zinc-100">
                <span className="text-[9px] font-bold block mb-3 uppercase text-zinc-400">背景色</span>
                <input
                  type="color"
                  value={config.backgroundColor}
                  onChange={(e) => setConfig((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                  className="w-full h-10 rounded-xl cursor-pointer bg-white border border-zinc-200 p-1"
                  aria-label="画布背景色"
                />
              </div>
              <div className="bg-white rounded-2xl p-4 border border-zinc-100">
                <span className="text-[9px] font-bold block mb-3 uppercase text-zinc-400">
                  底图透明 ({Math.round(config.bgOpacity * 100)}%)
                </span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={config.bgOpacity}
                  onChange={(e) => setConfig((prev) => ({ ...prev, bgOpacity: Number(e.target.value) }))}
                  className="w-full accent-red-500 mt-2"
                  aria-label="底图透明度"
                />
              </div>
            </div>
            <button
              onClick={() => bgInputRef.current?.click()}
              className="w-full py-4 bg-zinc-900 text-white rounded-2xl text-[10px] font-black hover:bg-black flex items-center justify-center gap-2 shadow-lg"
              aria-label={config.backgroundImage ? '替换底图' : '上传底图'}
            >
              <i className="fas fa-image"></i>
              {config.backgroundImage ? '替换底图' : '上传底图'}
            </button>
            <input ref={bgInputRef} type="file" className="hidden" accept="image/*" onChange={onBgUpload} />
          </div>
        </section>

        <section>
          <h2 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-4">素材管理</h2>
          <div className="bg-zinc-50 rounded-3xl p-6 border border-zinc-100 space-y-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-white border-2 border-zinc-900 text-zinc-900 py-4 rounded-2xl font-black hover:bg-zinc-900 hover:text-white text-xs flex items-center justify-center gap-2"
            >
              <i className="fas fa-plus-circle"></i>导入 PPT 截图
            </button>
            <input ref={fileInputRef} type="file" multiple className="hidden" accept="image/*" onChange={onUpload} />
            {uploadedImageUrls.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mt-4 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                {uploadedImageUrls.map((url, idx) => (
                  <div
                    key={idx}
                    onClick={() => onPreviewImageClick(url)}
                    className="aspect-[3/4] rounded-xl overflow-hidden border-2 border-zinc-200 cursor-zoom-in transition-all bg-white hover:scale-110 group relative"
                  >
                    <img src={url} className="w-full h-full object-cover" alt={`素材 ${idx + 1}`} />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all"></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <button
        disabled={imageCount === 0 || isProcessing || isPreviewLoading}
        onClick={onExport}
        aria-label="一键批量导出图集为压缩包"
        className={`mt-10 w-full py-6 rounded-3xl font-black transition-all shadow-2xl flex items-center justify-center gap-3 text-lg ${
          imageCount === 0 || isProcessing || isPreviewLoading
            ? 'bg-zinc-100 text-zinc-300'
            : 'bg-red-500 text-white hover:bg-red-600'
        }`}
      >
        {isProcessing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-cloud-download-alt"></i>}
        <span>一键批量导出图集</span>
      </button>
    </div>
  );
};

export default EditorPanel;
