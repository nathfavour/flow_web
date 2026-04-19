import { createAPIFileRoute } from '@tanstack/react-start/api';
import { getRequest } from '@tanstack/react-start/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { resolveCurrentUser } from '@/lib/appwrite/client';

export const APIRoute = createAPIFileRoute('/api/ai/generate')({
  POST: async () => {
    try {
      const request = getRequest();
      const user = await resolveCurrentUser(request);
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { prompt, history, systemInstruction } = await request.json();
      const userKey = request.headers.get('x-user-gemini-key');
      const apiKey = userKey || process.env.GOOGLE_API_KEY;

      if (!apiKey) {
        return Response.json({ error: 'AI service not configured' }, { status: 500 });
      }

      if (!userKey) {
        const plan = (user as any).prefs?.subscriptionTier || 'FREE';
        const isPro = ['PRO', 'ORG', 'LIFETIME'].includes(plan);
        if (!isPro) {
          return Response.json({
            error: 'AI features require a Pro account. Upgrade to continue or provide your own API key in settings.',
          }, { status: 403 });
        }
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash';
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: systemInstruction || 'You are Kylrixflow assistant, a concise and helpful AI for tasks, forms, and productivity.',
      });

      if (history && history.length > 0) {
        const chat = model.startChat({
          history: history.map((h: any) => ({
            role: h.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: h.content || h.text }],
          })),
        });
        const result = await chat.sendMessage(prompt);
        return Response.json({ text: result.response.text() });
      }

      const result = await model.generateContent(prompt);
      return Response.json({ text: result.response.text() });
    } catch (error: unknown) {
      console.error('AI Generation Error:', error);
      const message = error instanceof Error ? error.message : 'Internal Server Error';
      return Response.json({ error: message }, { status: 500 });
    }
  },
});
export const Route = APIRoute;
