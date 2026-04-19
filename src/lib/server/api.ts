import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { resolveCurrentUser } from '@/lib/appwrite/client';

type AIChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export const generateAIResponse = createServerFn({ method: 'POST' })
  .inputValidator((data: {
    prompt: string;
    history?: AIChatMessage[];
    systemInstruction?: string;
    apiKey?: string;
  }) => data)
  .handler(async ({ data }) => {
    const request = getRequest();
    const user = await resolveCurrentUser(request);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const apiKey = data.apiKey || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('AI service not configured');
    }

    if (!data.apiKey) {
      const plan = (user as any).prefs?.subscriptionTier || 'FREE';
      const isPro = ['PRO', 'ORG', 'LIFETIME'].includes(plan);
      if (!isPro) {
        throw new Error('AI features require a Pro account. Upgrade to continue or provide your own API key in settings.');
      }
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash',
      systemInstruction: data.systemInstruction || 'You are Kylrixflow assistant, a concise and helpful AI for tasks, forms, and productivity.',
    });

    if (data.history && data.history.length > 0) {
      const chat = model.startChat({
        history: data.history.map((h) => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        })),
      });
      const result = await chat.sendMessage(data.prompt);
      return result.response.text();
    }

    const result = await model.generateContent(data.prompt);
    return result.response.text();
  });
