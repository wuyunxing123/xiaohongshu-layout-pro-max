import React from 'react';
import { CanvasConfig, TemplateId } from '../types';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../lib/constants';

interface TextHandlesProps {
  config: CanvasConfig;
  activeTemplateId: TemplateId;
  isDraggingTitle: boolean;
  isDraggingSubtitle: boolean;
  onMouseDown: (e: React.MouseEvent, type: 'drag-title' | 'drag-subtitle') => void;
}

const TextHandles: React.FC<TextHandlesProps> = ({
  config,
  activeTemplateId,
  isDraggingTitle,
  isDraggingSubtitle,
  onMouseDown,
}) => {
  // poster-flow 用竖排窄框，其它用横排宽框
  const titleWidth = activeTemplateId === 'poster-flow' ? 120 : 400;
  const titleHeight = activeTemplateId === 'poster-flow' ? 400 : 150;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      <div
        role="button"
        tabIndex={0}
        aria-label="拖动主标题位置"
        style={{
          left: `${(config.textX / CANVAS_WIDTH) * 100}%`,
          top: `${(config.textY / CANVAS_HEIGHT) * 100}%`,
          width: `${(titleWidth / CANVAS_WIDTH) * 100}%`,
          height: `${(titleHeight / CANVAS_HEIGHT) * 100}%`,
          transform: 'translate(-50%, -50%)',
        }}
        className={`absolute border-2 border-red-500/50 pointer-events-auto rounded cursor-move transition-all ${
          isDraggingTitle
            ? 'bg-red-500/20 border-red-500 ring-4 ring-red-500/20'
            : 'hover:bg-red-500/5'
        }`}
        onMouseDown={(e) => onMouseDown(e, 'drag-title')}
      >
        <span className="absolute -top-6 left-0 text-[10px] font-black text-white bg-red-500 px-2 py-0.5 rounded shadow-lg uppercase">
          Title
        </span>
      </div>
      <div
        role="button"
        tabIndex={0}
        aria-label="拖动副标题位置"
        style={{
          left: `${(config.subtitleX / CANVAS_WIDTH) * 100}%`,
          top: `${(config.subtitleY / CANVAS_HEIGHT) * 100}%`,
          width: `${(320 / CANVAS_WIDTH) * 100}%`,
          height: `${(100 / CANVAS_HEIGHT) * 100}%`,
          transform: 'translate(-50%, -50%)',
        }}
        className={`absolute border-2 border-zinc-500/50 pointer-events-auto rounded cursor-move transition-all ${
          isDraggingSubtitle
            ? 'bg-zinc-500/20 border-zinc-500 ring-4 ring-zinc-500/20'
            : 'hover:bg-zinc-50/10'
        }`}
        onMouseDown={(e) => onMouseDown(e, 'drag-subtitle')}
      >
        <span className="absolute -top-6 left-0 text-[10px] font-black text-white bg-zinc-800 px-2 py-0.5 rounded shadow-lg uppercase">
          Sub
        </span>
      </div>
    </div>
  );
};

export default TextHandles;
