import type { CanvasConfig, TemplateId, CoverVariant } from '../types';
import { CANVAS_HEIGHT, CANVAS_WIDTH, getCoverImageUrl } from './constants';
import type { LayoutInfo } from './layoutCalc';

export type ImageLoader = (url: string) => Promise<HTMLImageElement>;

const drawCoverVariantA = (ctx: CanvasRenderingContext2D) => {
  const W = CANVAS_WIDTH, H = CANVAS_HEIGHT;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#7c3aed');
  grad.addColorStop(0.5, '#f97316');
  grad.addColorStop(1, '#22c55e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
};

const drawCoverVariantB = (ctx: CanvasRenderingContext2D) => {
  const W = CANVAS_WIDTH, H = CANVAS_HEIGHT;
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#1e293b');
  grad.addColorStop(0.5, '#475569');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  // 画个装饰条
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, H * 0.78, W, 6);
};

export const drawBuiltinCover = (ctx: CanvasRenderingContext2D, variant: CoverVariant) => {
  if (variant === 'a') drawCoverVariantA(ctx);
  else drawCoverVariantB(ctx);
};

/**
 * 左上角品牌标识：白底黑字圆角胶囊。
 * 留空不渲染；按文字宽度自适应。
 */
export const drawBrandLabel = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number = 50,
  y: number = 50,
) => {
  if (!text) return;
  ctx.save();

  ctx.font = `800 46px "Noto Sans SC", sans-serif`;
  ctx.textBaseline = 'middle';
  const textWidth = ctx.measureText(text).width;

  const padX = 28;
  const padY = 18;
  const rectW = textWidth + padX * 2;
  const rectH = 46 + padY * 2;
  const radius = 23;

  // 轻微投影
  ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;

  // 背景
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(x, y, rectW, rectH, radius);
  ctx.fill();

  // 文字
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#1a1a1a';
  ctx.textAlign = 'center';
  ctx.fillText(text, x + rectW / 2, y + rectH / 2);

  ctx.restore();
};

/** 在 DOM 容器坐标 (clientX/Y) 与画布坐标 (1200×1600) 之间换算。 */
export const getCanvasCoords = (
  clientX: number,
  clientY: number,
  container: HTMLElement | null,
) => {
  if (!container) return { x: 0, y: 0 };
  const rect = container.getBoundingClientRect();
  const scale = CANVAS_WIDTH / rect.width;
  return {
    x: (clientX - rect.left) * scale,
    y: (clientY - rect.top) * scale,
  };
};

export const drawRoundedImage = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  fit: 'cover' | 'contain' = 'cover',
  skipShadow: boolean = false,
) => {
  ctx.save();
  if (!skipShadow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 55;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 25;
  }
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  if (!skipShadow) {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.clip();
  if (img) {
    const aspect = img.width / img.height;
    const slotAspect = w / h;
    let dx, dy, dw, dh;
    if (fit === 'cover') {
      if (aspect > slotAspect) { dh = h; dw = h * aspect; dx = x - (dw - w) / 2; dy = y; }
      else { dw = w; dh = w / aspect; dx = x; dy = y - (dh - h) / 2; }
    } else {
      if (aspect > slotAspect) { dw = w; dh = w / aspect; dx = x; dy = y + (h - dh) / 2; }
      else { dh = h; dw = h * aspect; dx = x + (w - dw) / 2; dy = y; }
    }
    ctx.drawImage(img, dx, dy, dw, dh);
  } else {
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,0.03)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.stroke();
  ctx.restore();
};

export const drawCanvasPage = async (
  ctx: CanvasRenderingContext2D,
  pageIdx: number,
  allImages: string[],
  currentConfig: CanvasConfig,
  currentTemplateId: TemplateId,
  layout: LayoutInfo,
  loadImage: ImageLoader,
  lowQuality: boolean = false,
) => {
  const W = CANVAS_WIDTH;
  const H = CANVAS_HEIGHT;
  const { perPage, coverCount } = layout;

  ctx.fillStyle = currentConfig.backgroundColor;
  ctx.fillRect(0, 0, W, H);

  if (currentConfig.backgroundImage) {
    try {
      const bgImg = await loadImage(currentConfig.backgroundImage);
      ctx.save();
      ctx.globalAlpha = currentConfig.bgOpacity;
      const aspect = bgImg.width / bgImg.height;
      const canvasAspect = W / H;
      let dx, dy, dw, dh;
      if (aspect > canvasAspect) { dh = H; dw = H * aspect; dx = -(dw - W) / 2; dy = 0; }
      else { dw = W; dh = W / aspect; dx = 0; dy = -(dh - H) / 2; }
      ctx.drawImage(bgImg, dx, dy, dw, dh);
      ctx.restore();
    } catch (e) {
      console.error('BG Image Load Failed', e);
    }
  }

  if (currentTemplateId === 'single-page-flow') {
    // 封面 + 后续每一页：都用封面图作底图，保持视觉一致
    const variant = currentConfig.coverVariant ?? 'a';

    // 1. 画封面底图（所有页都画，包括内容页）
    try {
      const coverUrl = getCoverImageUrl(variant);
      const coverImg = await loadImage(coverUrl);
      ctx.save();
      ctx.globalAlpha = 1;
      const aspect = coverImg.width / coverImg.height;
      const canvasAspect = W / H;
      let dx, dy, dw, dh;
      if (aspect > canvasAspect) { dh = H; dw = H * aspect; dx = -(dw - W) / 2; dy = 0; }
      else { dw = W; dh = W / aspect; dx = 0; dy = -(dh - H) / 2; }
      ctx.drawImage(coverImg, dx, dy, dw, dh);
      ctx.restore();
    } catch {
      // 封面图加载失败时用内置渐变
      drawBuiltinCover(ctx, variant);
    }

    // 2. 选 PPT 图片：每页对应一张图，page N 用第 N 张
    const imgIdx = pageIdx;
    const img = allImages[imgIdx] ? await loadImage(allImages[imgIdx]) : null;
    if (img) {
      // 嵌入区域由 config 按 coverVariant 分别存储
      const region =
        currentConfig.coverEmbedRegion?.[variant] ??
        { x: 0.03, y: 0.27, w: 0.94, h: 0.42 };
      const tvX = W * region.x;
      const tvY = H * region.y;
      const tvW = W * region.w;
      const tvH = H * region.h;

      // 计算图片在 tv 区域内的尺寸（保持比例）
      const imgAspect = img.width / img.height;
      const tvAspect = tvW / tvH;
      let drawW, drawH;
      if (imgAspect > tvAspect) { drawW = tvW; drawH = drawW / imgAspect; }
      else { drawH = tvH; drawW = drawH * imgAspect; }
      const x = tvX + (tvW - drawW) / 2;
      const y = tvY + (tvH - drawH) / 2;

      // 直接 drawImage（不要白底/shadow，让 PPT 图嵌进封面背景里）
      ctx.save();
      ctx.drawImage(img, x, y, drawW, drawH);
      ctx.restore();
    }
  } else if (currentTemplateId === 'double-brand-flow') {
    // 双图品牌流：封面和内容页都是上下两张图，顶部留给标题，底部留给副标题
    const isCover = pageIdx === 0;
    const startIdx = isCover ? 0 : coverCount + (pageIdx - 1) * perPage;
    const img1 = allImages[startIdx] ? await loadImage(allImages[startIdx]) : null;
    const img2 = allImages[startIdx + 1] ? await loadImage(allImages[startIdx + 1]) : null;

    // 布局：顶部 200px 留标题 → 16:9 上图 → 30px 间隙 → 16:9 下图 → 底部留副标题
    const hMargin = 60;
    const imageW = W - hMargin * 2;
    const imageH = imageW * (9 / 16);
    const topPadding = 200;
    const gap = 30;
    const xPos = hMargin;

    if (img1) drawRoundedImage(ctx, img1, xPos, topPadding, imageW, imageH, 16, 'cover', lowQuality);
    if (img2) drawRoundedImage(ctx, img2, xPos, topPadding + imageH + gap, imageW, imageH, 16, 'cover', lowQuality);
  } else if (currentTemplateId === 'directory-flow') {
    const margin = 50, colGap = 40, rowGap = 30;
    const sidebarWidth = W * 0.18;
    const mainWidth = W - (margin * 2) - sidebarWidth - colGap;
    const mainItemH = mainWidth * (9 / 16);
    const totalH = (mainItemH * 3) + (rowGap * 2);
    const startY = (H - totalH) / 2;
    const sideItemH = (totalH - (rowGap * 8)) / 9;
    for (let i = 0; i < 9; i++) {
      const img = allImages[i] ? await loadImage(allImages[i]) : null;
      drawRoundedImage(ctx, img, margin, startY + i * (sideItemH + rowGap), sidebarWidth, sideItemH, 8, 'cover', lowQuality);
    }
    for (let i = 0; i < 3; i++) {
      const img = allImages[pageIdx * 3 + i] ? await loadImage(allImages[pageIdx * 3 + i]) : null;
      if (img) drawRoundedImage(ctx, img, margin + sidebarWidth + colGap, startY + i * (mainItemH + rowGap), mainWidth, mainItemH, 16, 'cover', lowQuality);
    }
  } else {
    if (pageIdx > 0) {
      const startIdx = coverCount + (pageIdx - 1) * perPage;
      const padding = 40;
      const innerW = W - padding * 2;
      const innerH = H - padding * 2;

      if (perPage === 3) {
        const gap = 60;
        const imgH = (innerH - gap * 2) / 3;
        const imgW = imgH * (16 / 9);
        const xPos = (W - imgW) / 2;
        for (let i = 0; i < 3; i++) {
          const img = allImages[startIdx + i] ? await loadImage(allImages[startIdx + i]) : null;
          if (img) drawRoundedImage(ctx, img, xPos, padding + i * (imgH + gap), imgW, imgH, 24, 'cover', lowQuality);
        }
      } else if (perPage === 2) {
        const gap = 80;
        const img1 = allImages[startIdx] ? await loadImage(allImages[startIdx]) : null;
        const img2 = allImages[startIdx + 1] ? await loadImage(allImages[startIdx + 1]) : null;
        const h1 = img1 ? (innerW / (img1.width / img1.height)) : (innerW * 9 / 16);
        const h2 = img2 ? (innerW / (img2.width / img2.height)) : (innerW * 9 / 16);
        const totalH = h1 + h2 + gap;
        const startY = (H - totalH) / 2;
        if (img1) drawRoundedImage(ctx, img1, padding, startY, innerW, h1, 32, 'contain', lowQuality);
        if (img2) drawRoundedImage(ctx, img2, padding, startY + h1 + gap, innerW, h2, 32, 'contain', lowQuality);
      } else if (perPage === 1) {
        const img = allImages[startIdx] ? await loadImage(allImages[startIdx]) : null;
        if (img) {
          const aspect = img.width / img.height;
          let drawW = innerW;
          let drawH = drawW / aspect;
          if (drawH > innerH) {
            drawH = innerH;
            drawW = drawH * aspect;
          }
          const x = (W - drawW) / 2;
          const y = (H - drawH) / 2;
          drawRoundedImage(ctx, img, x, y, drawW, drawH, 40, 'contain', lowQuality);
        }
      }
    } else {
      if (currentTemplateId === 'five-grid-flow') {
        const margin = 50, gap = 50;
        const mainW = W - margin * 2, mainH = mainW * (9 / 16);
        const smallW = (mainW - gap) / 2, smallH = smallW * (9 / 16);
        const contentStartY = 235;
        const imgMain = allImages[0] ? await loadImage(allImages[0]) : null;
        drawRoundedImage(ctx, imgMain, margin, contentStartY, mainW, mainH, 24, 'cover', lowQuality);
        for (let i = 0; i < 4; i++) {
          const col = i % 2, row = Math.floor(i / 2);
          const imgSmall = allImages[i + 1] ? await loadImage(allImages[i + 1]) : null;
          drawRoundedImage(ctx, imgSmall, margin + col * (smallW + gap), contentStartY + mainH + gap + row * (smallH + gap), smallW, smallH, 16, 'cover', lowQuality);
        }
      } else if (currentTemplateId === 'poster-flow') {
        const vPadding = 40, rowGap = 50;
        const itemH = (H - vPadding * 2 - rowGap * 2) / 3, itemW = itemH * 16 / 9;
        const xPos = (W - itemW - 45);
        for (let i = 0; i < 3; i++) {
          const img = allImages[i] ? await loadImage(allImages[i]) : null;
          drawRoundedImage(ctx, img, xPos, vPadding + i * (itemH + rowGap), itemW, itemH, 24, 'cover', lowQuality);
        }
      } else if (currentTemplateId === 'grid-flow') {
        const hMargin = 35, vPadding = 45;
        const mainWidth = W - hMargin * 2, mainItemH = mainWidth * (9 / 16);
        const img1 = allImages[0] ? await loadImage(allImages[0]) : null;
        drawRoundedImage(ctx, img1, hMargin, vPadding, mainWidth, mainItemH, 24, 'cover', lowQuality);
        const img2 = allImages[1] ? await loadImage(allImages[1]) : null;
        drawRoundedImage(ctx, img2, hMargin, H - mainItemH - vPadding, mainWidth, mainItemH, 24, 'cover', lowQuality);
      }
    }
  }

  if (pageIdx === 0 && currentTemplateId !== 'directory-flow' && currentTemplateId !== 'single-page-flow') {
    ctx.save();
    ctx.fillStyle = currentConfig.titleColor;
    ctx.font = `900 ${currentConfig.titleFontSize}px ${currentConfig.titleFontFamily}`;
    ctx.textAlign = 'center';
    if (currentTemplateId === 'poster-flow') {
      const chars = currentConfig.title.split('');
      const lineHeight = currentConfig.titleFontSize * 1.1;
      const totalH = chars.length * lineHeight;
      let curY = currentConfig.textY - (totalH / 2) + (currentConfig.titleFontSize / 2);
      chars.forEach(c => { ctx.fillText(c, currentConfig.textX, curY); curY += lineHeight; });
    } else {
      ctx.fillText(currentConfig.title, currentConfig.textX, currentConfig.textY);
    }
    ctx.fillStyle = currentConfig.subtitleColor;
    ctx.font = `700 ${currentConfig.subtitleFontSize}px ${currentConfig.titleFontFamily}`;
    const lines = currentConfig.subtitle.split('\n');
    lines.forEach((l, i) => { ctx.fillText(l, currentConfig.subtitleX, currentConfig.subtitleY + i * currentConfig.subtitleFontSize * 1.3); });
    ctx.restore();
  }

  // 品牌标识：仅双图品牌流显示，所有页面左上角白底黑字胶囊
  if (currentTemplateId === 'double-brand-flow') {
    drawBrandLabel(ctx, currentConfig.brandText, 50, 50);
  }
};
