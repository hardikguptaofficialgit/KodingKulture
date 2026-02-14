import judge0Client, { LANGUAGE_MAP } from '../config/judge0.js';

// Helper to encode to base64
const toBase64 = (str) => Buffer.from(str || '').toString('base64');

// Helper to decode from base64
const fromBase64 = (str) => str ? Buffer.from(str, 'base64').toString('utf-8') : '';

// @desc    Submit code to Judge0
// @route   POST /api/judge0/submit
export const submitToJudge0 = async (sourceCode, languageId, input, expectedOutput) => {
  try {
    // Create submission with base64 encoding
    const response = await judge0Client.post('/submissions?base64_encoded=true', {
      source_code: toBase64(sourceCode),
      language_id: languageId,
      stdin: toBase64(input),
      expected_output: toBase64(expectedOutput),
      cpu_time_limit: 2,
      memory_limit: 256000 // 256 MB in KB
    });

    const token = response.data.token;

    // Poll for result
    let result;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      const resultResponse = await judge0Client.get(`/submissions/${token}?base64_encoded=true`);
      result = resultResponse.data;

      if (result.status.id > 2) { // Status > 2 means completed
        break;
      }

      attempts++;
    }

    // Decode base64 fields in result
    if (result.stdout) result.stdout = fromBase64(result.stdout);
    if (result.stderr) result.stderr = fromBase64(result.stderr);
    if (result.compile_output) result.compile_output = fromBase64(result.compile_output);
    if (result.message) result.message = fromBase64(result.message);

    return result;
  } catch (error) {
    console.error('Judge0 submission error:', error);
    throw error;
  }
};

// @desc    Batch submit to Judge0
export const batchSubmitToJudge0 = async (submissions) => {
  try {
    const response = await judge0Client.post('/submissions/batch?base64_encoded=true', {
      submissions: submissions.map(s => ({
        ...s,
        source_code: toBase64(s.source_code),
        stdin: toBase64(s.stdin),
        expected_output: toBase64(s.expected_output)
      }))
    });

    const tokens = response.data.map(s => s.token);

    // Poll for results (mirrors submitToJudge0 pattern)
    let results;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1500));

      results = await Promise.all(
        tokens.map(token =>
          judge0Client.get(`/submissions/${token}?base64_encoded=true`)
            .then(res => res.data)
        )
      );

      // Check if all submissions are done (status > 2 means completed)
      if (results.every(r => r.status.id > 2)) {
        break;
      }

      attempts++;
    }

    // Decode base64 fields in results
    for (const result of results) {
      if (result.stdout) result.stdout = fromBase64(result.stdout);
      if (result.stderr) result.stderr = fromBase64(result.stderr);
      if (result.compile_output) result.compile_output = fromBase64(result.compile_output);
      if (result.message) result.message = fromBase64(result.message);
    }

    return results;
  } catch (error) {
    console.error('Judge0 batch submission error:', error);
    throw error;
  }
};

// @desc    Get Judge0 status
export const getJudge0Status = async () => {
  try {
    const response = await judge0Client.get('/about');
    return response.data;
  } catch (error) {
    console.error('Judge0 status error:', error);
    throw error;
  }
};

// Status ID mapping
export const STATUS_MAP = {
  1: 'IN_QUEUE',
  2: 'PROCESSING',
  3: 'ACCEPTED',
  4: 'WRONG_ANSWER',
  5: 'TIME_LIMIT_EXCEEDED',
  6: 'COMPILATION_ERROR',
  7: 'RUNTIME_ERROR_SIGSEGV',
  8: 'RUNTIME_ERROR_SIGXFSZ',
  9: 'RUNTIME_ERROR_SIGFPE',
  10: 'RUNTIME_ERROR_SIGABRT',
  11: 'RUNTIME_ERROR_NZEC',
  12: 'RUNTIME_ERROR_OTHER',
  13: 'INTERNAL_ERROR',
  14: 'EXEC_FORMAT_ERROR'
};

export const mapStatusToVerdict = (statusId) => {
  switch (statusId) {
    case 3:
      return 'ACCEPTED';
    case 4:
      return 'WRONG_ANSWER';
    case 5:
      return 'TIME_LIMIT_EXCEEDED';
    case 6:
      return 'COMPILATION_ERROR';
    default:
      if (statusId >= 7 && statusId <= 12) {
        return 'RUNTIME_ERROR';
      }
      return 'PENDING';
  }
};
