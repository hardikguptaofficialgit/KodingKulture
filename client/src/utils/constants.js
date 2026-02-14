export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const CONTEST_STATUS = {
  UPCOMING: 'UPCOMING',
  LIVE: 'LIVE',
  ENDED: 'ENDED'
};

export const SUBMISSION_VERDICT = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  WRONG_ANSWER: 'WRONG_ANSWER',
  TIME_LIMIT_EXCEEDED: 'TIME_LIMIT_EXCEEDED',
  MEMORY_LIMIT_EXCEEDED: 'MEMORY_LIMIT_EXCEEDED',
  RUNTIME_ERROR: 'RUNTIME_ERROR',
  COMPILATION_ERROR: 'COMPILATION_ERROR'
};

export const LANGUAGES = [
  { value: 'c', label: 'C', id: 50 },
  { value: 'cpp', label: 'C++', id: 54 },
  { value: 'java', label: 'Java', id: 62 },
  { value: 'python', label: 'Python', id: 71 },
  { value: 'javascript', label: 'JavaScript', id: 63 },
  { value: 'go', label: 'Go', id: 60 },
  { value: 'rust', label: 'Rust', id: 73 }
];

export const DIFFICULTY_COLORS = {
  EASY: 'text-green-400',
  MEDIUM: 'text-yellow-400',
  HARD: 'text-red-400'
};

export const DEFAULT_CODE = {
  c: '#include <stdio.h>\n\nint main() {\n    // Your code here\n    return 0;\n}',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your code here\n    return 0;\n}',
  java: 'public class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}',
  python: '# Your code here\n\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()',
  javascript: '// Your code here\n\nfunction main() {\n    \n}\n\nmain();',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    // Your code here\n}',
  rust: 'fn main() {\n    // Your code here\n}'
};

// Google OAuth Client ID — must be set via VITE_GOOGLE_CLIENT_ID env variable
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
