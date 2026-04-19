'use client';

import { useSettings } from './useSettings';
import { generateAIResponse } from '@/lib/server/api';

export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const useAI = () => {
  const { userSettings } = useSettings();

  const generate = async (prompt: string, options: { 
    history?: AIChatMessage[], 
    systemInstruction?: string 
  } = {}) => {
    return await generateAIResponse({
      data: {
        prompt,
        history: options.history,
        systemInstruction: options.systemInstruction,
        apiKey: userSettings.customGeminiKey || undefined,
      },
    });
  };

  return { generate };
};
