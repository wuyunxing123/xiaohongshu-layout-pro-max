import { useEffect, useRef, useState, Dispatch, SetStateAction } from 'react';

/**
 * 将 state 同步到 localStorage。
 * - 初始挂载时尝试从 storage 恢复；
 * - 任何变化后延迟 200ms 写入（避免拖拽时高频写）。
 *
 * 注意：图片（base64 数据 URL）请勿用此 hook 持久化，会超出 localStorage 容量。
 */
export function usePersistedState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initial;
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  });

  const writeTimer = useRef<number | null>(null);

  useEffect(() => {
    if (writeTimer.current !== null) window.clearTimeout(writeTimer.current);
    writeTimer.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        // 通常是 QuotaExceededError。静默即可，不打断用户操作。
        console.warn(`[usePersistedState] failed to persist "${key}":`, err);
      }
    }, 200);
    return () => {
      if (writeTimer.current !== null) window.clearTimeout(writeTimer.current);
    };
  }, [key, value]);

  return [value, setValue];
}
