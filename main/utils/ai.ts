import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from './logger';
import { loadEnvConfig } from '../config/env';

let genAI: GoogleGenerativeAI | null = null;
let model: any = null;

const initializeAI = (): boolean => {
  try {
    const env = loadEnvConfig();
    const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === '') {
      logger.warn('⚠️ GEMINI_API_KEY chưa được cấu hình. AI features sẽ không hoạt động.');
      return false;
    }

    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    logger.success('✅ Đã khởi tạo Gemini AI');
    return true;
  } catch (error) {
    logger.error('❌ Lỗi khởi tạo Gemini AI:', error);
    return false;
  }
};

export const askAI = async (question: string, context?: string): Promise<string> => {
  if (!model) {
    if (!initializeAI()) {
      return '❌ AI chưa được cấu hình. Vui lòng thêm GEMINI_API_KEY vào .env';
    }
  }

  try {
    const prompt = context
      ? `Bạn là một chatbot thân thiện và hài hước. Trả lời câu hỏi dựa trên context:\n\nContext: ${context}\n\nCâu hỏi: ${question}\n\nTrả lời:`
      : `Bạn là một chatbot thân thiện và hài hước. Hãy trả lời câu hỏi một cách ngắn gọn và dễ hiểu:\n\n${question}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text || '❌ Không thể tạo phản hồi. Vui lòng thử lại.';
  } catch (error: any) {
    logger.error('Lỗi khi gọi Gemini AI:', error);
    return `❌ Có lỗi xảy ra: ${error.message || 'Unknown error'}`;
  }
};

// Initialize on load
if (typeof window === 'undefined') {
  initializeAI();
}
