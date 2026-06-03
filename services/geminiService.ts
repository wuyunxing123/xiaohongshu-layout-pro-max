import { GoogleGenAI, Type, GenerateContentResponse } from '@google/genai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MAX_VISION_IMAGES = 4;

/**
 * 懒加载 Gemini client：
 * - 没有 key 时不实例化，AI 按钮调用会直接走 fallback，避免模块加载时炸掉整个 App
 * - 有 key 时按需创建，节省首屏内存
 */
const getClient = (): GoogleGenAI | null => {
  if (!API_KEY) return null;
  try {
    return new GoogleGenAI({ apiKey: API_KEY });
  } catch (err) {
    console.warn('Gemini client init failed:', err);
    return null;
  }
};

/**
 * 从 dataURL 中解析出 base64 主体和 MIME。
 * 输入示例：data:image/jpeg;base64,/9j/4AAQ...
 */
const parseDataUrl = (dataUrl: string): { mimeType: string; data: string } | null => {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
};

export const generateXHSTitles = async (
  imageUrls: string[],
): Promise<{ title: string; subtitle: string }> => {
  const parts: any[] = [
    {
      text:
        '你是一个小红书爆款博主。请根据我上传的一系列图片（通常是PPT内容或干货分享），生成一个极具吸引力、带情绪价值且包含表情符号的标题（10字以内）和一个副标题（15字以内）。返回 JSON 格式。',
    },
  ];

  // 取前 N 张图作为视觉上下文，让标题更贴合内容
  const sampled = imageUrls.slice(0, MAX_VISION_IMAGES);
  for (const url of sampled) {
    const parsed = parseDataUrl(url);
    if (!parsed) continue;
    parts.push({
      inlineData: {
        mimeType: parsed.mimeType || 'image/jpeg',
        data: parsed.data,
      },
    });
  }

  try {
    const ai = getClient();
    if (!ai) {
      console.warn('VITE_GEMINI_API_KEY is not set; using fallback titles.');
      return { title: 'PPT干货合集', subtitle: '手把手教你零基础入门' };
    }
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
          },
          required: ['title', 'subtitle'],
        },
      },
    });

    const result = JSON.parse(response.text || '{}');
    return {
      title: result.title || 'PPT干货合集',
      subtitle: result.subtitle || '手把手教你零基础入门',
    };
  } catch (error) {
    console.error('Gemini Error:', error);
    return { title: 'PPT干货合集', subtitle: '手把手教你零基础入门' };
  }
};
