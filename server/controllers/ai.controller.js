import { callNvidiaForJson } from '../services/nvidiaAi.service.js';

const mcqSystemPrompt = `You are an expert assessment designer.
Return ONLY valid JSON.
Do not include markdown.
Schema:
{
  "mcqs": [
    {
      "question": "string",
      "options": [{"text":"string","isCorrect":boolean}],
      "correctAnswers": [number],
      "category": "GENERAL|APTITUDE|TECHNICAL|REASONING|ENTREPRENEURSHIP",
      "difficulty": "EASY|MEDIUM|HARD",
      "marks": number,
      "negativeMarks": number,
      "explanation": "string",
      "tags": ["string"]
    }
  ]
}
Rules:
- 4 options minimum, exactly 1-2 correct options.
- correctAnswers must match options index positions where isCorrect=true.
- Questions must be practical, non-trivial, and unambiguous.
- Keep explanation concise and accurate.`;

const codingSystemPrompt = `You are an expert competitive programming setter.
Return ONLY valid JSON.
Do not include markdown.
Schema:
{
  "problem": {
    "title": "string",
    "description": "string",
    "inputFormat": "string",
    "outputFormat": "string",
    "constraints": ["string"],
    "examples": [{"input":"string","output":"string","explanation":"string"}],
    "testcases": [{"input":"string","output":"string","hidden":boolean,"points":number}],
    "category": "GENERAL|DSA|ALGORITHMS|DATABASE|SYSTEM_DESIGN",
    "difficulty": "EASY|MEDIUM|HARD",
    "score": number,
    "timeLimit": number,
    "memoryLimit": number,
    "tags": ["string"]
  }
}
Rules:
- Provide at least 2 examples and 5 testcases.
- hidden=true for most testcases, keep at least 1 visible testcase.
- Points should sum reasonably near score.
- Problem must be solvable and internally consistent.`;

const normalizeMcq = (mcq) => {
  const options = Array.isArray(mcq?.options)
    ? mcq.options.map((o) => ({ text: String(o?.text || '').trim(), isCorrect: Boolean(o?.isCorrect) })).filter((o) => o.text)
    : [];

  const correctAnswers = options
    .map((opt, idx) => (opt.isCorrect ? idx : -1))
    .filter((idx) => idx !== -1);

  return {
    question: String(mcq?.question || '').trim(),
    options,
    correctAnswers,
    category: mcq?.category || 'GENERAL',
    difficulty: mcq?.difficulty || 'MEDIUM',
    marks: Number(mcq?.marks) > 0 ? Number(mcq.marks) : 1,
    negativeMarks: Number(mcq?.negativeMarks) >= 0 ? Number(mcq.negativeMarks) : 0,
    explanation: String(mcq?.explanation || '').trim(),
    tags: Array.isArray(mcq?.tags) ? mcq.tags.map((t) => String(t).trim()).filter(Boolean) : []
  };
};

const normalizeCodingProblem = (problem) => {
  const testcases = Array.isArray(problem?.testcases)
    ? problem.testcases.map((tc) => ({
        input: String(tc?.input || ''),
        output: String(tc?.output || ''),
        hidden: Boolean(tc?.hidden),
        points: Number(tc?.points) > 0 ? Number(tc.points) : 10
      })).filter((tc) => tc.input || tc.output)
    : [];

  return {
    title: String(problem?.title || '').trim(),
    description: String(problem?.description || '').trim(),
    inputFormat: String(problem?.inputFormat || '').trim(),
    outputFormat: String(problem?.outputFormat || '').trim(),
    constraints: Array.isArray(problem?.constraints) ? problem.constraints.map((c) => String(c).trim()).filter(Boolean) : [],
    examples: Array.isArray(problem?.examples)
      ? problem.examples.map((ex) => ({
          input: String(ex?.input || ''),
          output: String(ex?.output || ''),
          explanation: String(ex?.explanation || '')
        })).filter((ex) => ex.input || ex.output)
      : [],
    testcases,
    category: problem?.category || 'GENERAL',
    difficulty: problem?.difficulty || 'MEDIUM',
    score: Number(problem?.score) > 0 ? Number(problem.score) : 100,
    timeLimit: Number(problem?.timeLimit) > 0 ? Number(problem.timeLimit) : 2,
    memoryLimit: Number(problem?.memoryLimit) > 0 ? Number(problem.memoryLimit) : 256,
    tags: Array.isArray(problem?.tags) ? problem.tags.map((t) => String(t).trim()).filter(Boolean) : []
  };
};

export const generateMcqDraft = async (req, res) => {
  try {
    const {
      prompt = '',
      category = 'GENERAL',
      difficulty = 'MEDIUM',
      marks = 1,
      negativeMarks = 0,
      count = 1
    } = req.body || {};

    const userPrompt = `Create ${Math.min(Math.max(Number(count) || 1, 1), 5)} high-quality MCQ(s).
Category: ${category}
Difficulty: ${difficulty}
Marks: ${marks}
Negative Marks: ${negativeMarks}
Focus: ${String(prompt || 'general problem-solving and conceptual clarity').trim()}`;

    const result = await callNvidiaForJson([
      { role: 'system', content: mcqSystemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    const mcqs = Array.isArray(result?.mcqs) ? result.mcqs.map(normalizeMcq).filter((m) => m.question && m.options.length >= 4 && m.correctAnswers.length > 0) : [];

    return res.status(200).json({
      success: true,
      mcqs
    });
  } catch (error) {
    console.error('generateMcqDraft error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate MCQ draft' });
  }
};

export const improveMcqDraft = async (req, res) => {
  try {
    const { prompt = '', draft } = req.body || {};

    if (!draft || !draft.question) {
      return res.status(400).json({ success: false, message: 'MCQ draft is required' });
    }

    const userPrompt = `Improve this MCQ draft for clarity, fairness, and assessment quality.
Additional direction: ${String(prompt || 'improve quality and remove ambiguity').trim()}
Draft JSON:
${JSON.stringify(draft)}`;

    const result = await callNvidiaForJson([
      { role: 'system', content: mcqSystemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    const first = Array.isArray(result?.mcqs) ? result.mcqs[0] : null;
    const mcq = normalizeMcq(first || result?.mcq || draft);

    return res.status(200).json({ success: true, mcq });
  } catch (error) {
    console.error('improveMcqDraft error:', error);
    return res.status(500).json({ success: false, message: 'Failed to improve MCQ draft' });
  }
};

export const generateCodingDraft = async (req, res) => {
  try {
    const {
      prompt = '',
      category = 'GENERAL',
      difficulty = 'MEDIUM',
      score = 100,
      timeLimit = 2,
      memoryLimit = 256
    } = req.body || {};

    const userPrompt = `Create one advanced but fair coding problem.
Category: ${category}
Difficulty: ${difficulty}
Score: ${score}
Time Limit: ${timeLimit}
Memory Limit: ${memoryLimit}
Focus: ${String(prompt || 'data structures and algorithms').trim()}`;

    const result = await callNvidiaForJson([
      { role: 'system', content: codingSystemPrompt },
      { role: 'user', content: userPrompt }
    ], { maxTokens: 2600 });

    const problem = normalizeCodingProblem(result?.problem || result);

    return res.status(200).json({ success: true, problem });
  } catch (error) {
    console.error('generateCodingDraft error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate coding draft' });
  }
};

export const improveCodingDraft = async (req, res) => {
  try {
    const { prompt = '', draft } = req.body || {};

    if (!draft || !draft.title || !draft.description) {
      return res.status(400).json({ success: false, message: 'Coding draft is required' });
    }

    const userPrompt = `Improve this coding problem for clarity, correctness, and test strength.
Additional direction: ${String(prompt || 'improve quality and edge-case coverage').trim()}
Draft JSON:
${JSON.stringify(draft)}`;

    const result = await callNvidiaForJson([
      { role: 'system', content: codingSystemPrompt },
      { role: 'user', content: userPrompt }
    ], { maxTokens: 2600 });

    const problem = normalizeCodingProblem(result?.problem || result);

    return res.status(200).json({ success: true, problem });
  } catch (error) {
    console.error('improveCodingDraft error:', error);
    return res.status(500).json({ success: false, message: 'Failed to improve coding draft' });
  }
};
