const DEFAULT_BASE_URL = process.env.NVIDIA_API_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = process.env.NVIDIA_MODEL || 'meta/llama-3.1-8b-instruct';

const extractJson = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return null;

  const fenced = rawText.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : rawText.trim();

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const sliced = candidate.slice(start, end + 1);
      return JSON.parse(sliced);
    }
  }

  return null;
};

const callNvidiaChat = async ({ messages, temperature = 0.3, maxTokens = 1800 }) => {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY is not configured on server');
  }

  const response = await fetch(`${DEFAULT_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      temperature,
      max_tokens: maxTokens,
      top_p: 0.9
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`NVIDIA API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || '';
  return text;
};

export const callNvidiaForJson = async (messages, options = {}) => {
  const text = await callNvidiaChat({ messages, ...options });
  const parsed = extractJson(text);

  if (!parsed) {
    throw new Error('Model returned invalid JSON payload');
  }

  return parsed;
};
