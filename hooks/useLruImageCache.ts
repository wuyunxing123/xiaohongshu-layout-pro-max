import { useCallback, useRef } from 'react';

/**
 * 简单 LRU 图片缓存：超出容量时淘汰最久未使用的项。
 * Map 的插入顺序特性正好可以充当 LRU 的"最近使用"序列。
 */
const DEFAULT_MAX_ENTRIES = 60;

export function useLruImageCache(maxEntries: number = DEFAULT_MAX_ENTRIES) {
  const cache = useRef(new Map<string, HTMLImageElement>());

  const load = useCallback((url: string): Promise<HTMLImageElement> => {
    const hit = cache.current.get(url);
    if (hit) {
      // 命中：刷新顺序（移到末尾表示最近使用）
      cache.current.delete(url);
      cache.current.set(url, hit);
      return Promise.resolve(hit);
    }
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      if (!url.startsWith('data:')) img.crossOrigin = 'anonymous';
      img.onload = () => {
        // 写入前先检查容量
        if (cache.current.size >= maxEntries) {
          const oldestKey = cache.current.keys().next().value;
          if (oldestKey !== undefined) cache.current.delete(oldestKey);
        }
        cache.current.set(url, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }, [maxEntries]);

  const clear = useCallback(() => cache.current.clear(), []);

  return { load, clear };
}
