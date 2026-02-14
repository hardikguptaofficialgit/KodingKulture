import api from './authService';

const codingService = {
  getCodingProblemsByContest: async (contestId) => {
    const response = await api.get(`/coding/contest/${contestId}`);
    return response.data;
  },

  getProblemById: async (id) => {
    const response = await api.get(`/coding/${id}`);
    return response.data;
  },

  submitCode: async (contestId, data) => {
    const response = await api.post(`/submissions`, { ...data, contestId });
    return response.data;
  },

  runCode: async (data) => {
    // For testing purposes - this would call Judge0 directly or a test endpoint
    const response = await api.post(`/submissions/test`, data);
    return response.data;
  },

  getSubmissions: async (problemId, contestId = null) => {
    const url = contestId
      ? `/submissions/problem/${problemId}?contestId=${contestId}`
      : `/submissions/problem/${problemId}`;
    const response = await api.get(url);
    return response.data;
  },

  getCodingProgress: async (contestId) => {
    const response = await api.get(`/submissions/contest/${contestId}/progress`);
    return response.data;
  },

  getCodingReview: async (contestId) => {
    const response = await api.get(`/submissions/contest/${contestId}/review`);
    return response.data;
  },

  getSubmissionById: async (id) => {
    const response = await api.get(`/submissions/${id}`);
    return response.data;
  },

  checkAllTestCases: async (data) => {
    const response = await api.post(`/submissions/check-all`, data);
    return response.data;
  }
};

export default codingService;
