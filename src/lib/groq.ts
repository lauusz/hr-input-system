type GroqResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function callGroq<T>(prompt: string): Promise<GroqResult<T>> {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL;

  if (!apiKey || !model) {
    return { success: false, error: 'GROQ env belum lengkap' };
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: process.env.GROQ_TEMPERATURE,
      messages: [
        {
          role: 'system',
          content: 'Kamu adalah sistem ekstraksi data dokumen kependudukan Indonesia.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    return { success: false, error: t };
  }

  const json = await res.json();
  const text = json.choices?.[0]?.message?.content;

  if (!text) {
    return { success: false, error: 'Response kosong dari Groq' };
  }

  try {
    const parsed = JSON.parse(text);
    return { success: true, data: parsed };
  } catch {
    return { success: false, error: 'Output Groq bukan JSON valid' };
  }
}
