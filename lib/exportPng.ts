import JSZip from 'jszip';

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
