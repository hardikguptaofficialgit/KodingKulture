import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import adminService from '../../services/adminService';
import codingService from '../../services/codingService';
import api from '../../services/authService';
import toast from 'react-hot-toast';
import ImageUpload from '../../components/common/ImageUpload';
import { Save, X, Plus, Trash2, Edit, ArrowLeft, Code, Library, Search } from 'lucide-react';

const CODING_CATEGORIES = ['GENERAL', 'DSA', 'ALGORITHMS', 'DATABASE', 'SYSTEM_DESIGN'];

const ManageCodingProblems = () => {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isAdminOrOrganiser } = useAuth();

  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [editingProblem, setEditingProblem] = useState(null);
  const [saveToLibrary, setSaveToLibrary] = useState(false);
  const [libraryIsPublic, setLibraryIsPublic] = useState(true);

  // Library state
  const [libraryProblems, setLibraryProblems] = useState([]);
  const [selectedLibraryProblems, setSelectedLibraryProblems] = useState([]);
  const [libraryFilter, setLibraryFilter] = useState({ category: '', search: '' });
  const [libraryLoading, setLibraryLoading] = useState(false);

  const [formData, setFormData] = useState({
    contestId: contestId,
    title: '',
    description: '',
    inputFormat: '',
    outputFormat: '',
    constraints: '',
    examples: [{ input: '', output: '', explanation: '' }],
    testcases: [{ input: '', output: '', points: 10, isHidden: false }],
    score: 100,
    difficulty: 'MEDIUM',
    timeLimit: 2000,
    memoryLimit: 256,
    tags: [],
    order: 1,
    imageUrl: null,
    imagePublicId: null
  });

  useEffect(() => {
    if (!isAdminOrOrganiser) {
      toast.error('Access denied');
      navigate('/');
      return;
    }
    fetchProblems();
  }, [contestId, isAdminOrOrganiser]);

  const fetchProblems = async () => {
    try {
      const data = await codingService.getCodingProblemsByContest(contestId);
      setProblems(data.problems);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching problems:', error);
      toast.error('Failed to load problems');
      setLoading(false);
    }
  };

  const fetchLibraryProblems = async () => {
    setLibraryLoading(true);
    try {
      const params = new URLSearchParams();
      if (libraryFilter.category) params.append('category', libraryFilter.category);
      if (libraryFilter.search) params.append('search', libraryFilter.search);

      const response = await api.get(`/coding/library?${params}`);
      setLibraryProblems(response.data.problems);
    } catch (error) {
      toast.error('Failed to load library');
    } finally {
      setLibraryLoading(false);
    }
  };

  useEffect(() => {
    if (showLibrary) {
      fetchLibraryProblems();
    }
  }, [showLibrary, libraryFilter]);

  const handleAddFromLibrary = async () => {
    if (selectedLibraryProblems.length === 0) {
      toast.error('Select at least one problem');
      return;
    }

    try {
      await api.post(`/coding/contest/${contestId}/add-from-library`, {
        problemIds: selectedLibraryProblems
      });
      toast.success(`${selectedLibraryProblems.length} problems added to contest`);
      setShowLibrary(false);
      setSelectedLibraryProblems([]);
      fetchProblems();
    } catch (error) {
      toast.error('Failed to add problems');
    }
  };

  const toggleLibrarySelection = (problemId) => {
    setSelectedLibraryProblems(prev =>
      prev.includes(problemId)
        ? prev.filter(id => id !== problemId)
        : [...prev, problemId]
    );
  };

  const resetForm = () => {
    setFormData({
      contestId: contestId,
      title: '',
      description: '',
      inputFormat: '',
      outputFormat: '',
      constraints: '',
      examples: [{ input: '', output: '', explanation: '' }],
      testcases: [{ input: '', output: '', points: 10, isHidden: false }],
      score: 100,
      difficulty: 'MEDIUM',
      timeLimit: 2000,
      memoryLimit: 256,
      tags: [],
      order: problems.length + 1,
      imageUrl: null,
      imagePublicId: null
    });
    setEditingProblem(null);
    setSaveToLibrary(false);
    setLibraryIsPublic(true);
    setShowForm(false);
  };

  const handleEdit = (problem) => {
    setFormData({
      contestId: contestId,
      title: problem.title,
      description: problem.description,
      inputFormat: problem.inputFormat,
      outputFormat: problem.outputFormat,
      constraints: problem.constraints || '',
      examples: problem.examples.length > 0 ? problem.examples : [{ input: '', output: '', explanation: '' }],
      testcases: problem.testcases || [{ input: '', output: '', points: 10, isHidden: false }],
      score: problem.score,
      difficulty: problem.difficulty,
      timeLimit: problem.timeLimit,
      memoryLimit: problem.memoryLimit,
      tags: problem.tags || [],
      order: problem.order,
      imageUrl: problem.imageUrl || null,
      imagePublicId: problem.imagePublicId || null
    });
    setEditingProblem(problem);
    setShowForm(true);
  };

  const handleDelete = async (problem) => {
    // Check if this is a library problem linked to contest (has contestProblemId)
    const isLibraryLinked = !!problem.contestProblemId;

    try {
      if (isLibraryLinked) {
        // Only remove from contest, keep in library
        await adminService.removeCodingFromContest(contestId, problem._id);
        toast.success('Problem removed from contest');
      } else {
        // Delete entirely (was created in this contest directly)
        await adminService.deleteCodingProblem(problem._id);
        toast.success('Problem deleted successfully');
      }
      fetchProblems();
    } catch (error) {
      console.error('Error removing problem:', error);
      toast.error('Failed to remove problem');
    }
  };

  const handleExampleChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      examples: prev.examples.map((ex, i) =>
        i === index ? { ...ex, [field]: value } : ex
      )
    }));
  };

  const addExample = () => {
    setFormData(prev => ({
      ...prev,
      examples: [...prev.examples, { input: '', output: '', explanation: '' }]
    }));
  };

  const removeExample = (index) => {
    if (formData.examples.length <= 1) {
      toast.error('At least 1 example required');
      return;
    }
    setFormData(prev => ({
      ...prev,
      examples: prev.examples.filter((_, i) => i !== index)
    }));
  };

  const handleTestcaseChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      testcases: prev.testcases.map((tc, i) =>
        i === index ? { ...tc, [field]: value } : tc
      )
    }));
  };

  const addTestcase = () => {
    setFormData(prev => ({
      ...prev,
      testcases: [...prev.testcases, { input: '', output: '', points: 10, isHidden: true }]
    }));
  };

  const removeTestcase = (index) => {
    if (formData.testcases.length <= 1) {
      toast.error('At least 1 testcase required');
      return;
    }
    setFormData(prev => ({
      ...prev,
      testcases: prev.testcases.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Title and description are required');
      return;
    }

    const validExamples = formData.examples.filter(ex => ex.input.trim() && ex.output.trim());
    if (validExamples.length === 0) {
      toast.error('At least one valid example is required');
      return;
    }

    const validTestcases = formData.testcases.filter(tc => tc.input.trim() && tc.output.trim());
    if (validTestcases.length === 0) {
      toast.error('At least one valid testcase is required');
      return;
    }

    try {
      const problemData = {
        ...formData,
        examples: validExamples,
        testcases: validTestcases.map(tc => ({
          ...tc,
          points: parseInt(tc.points)
        })),
        score: parseInt(formData.score),
        timeLimit: parseInt(formData.timeLimit),
        memoryLimit: parseInt(formData.memoryLimit),
        imageUrl: formData.imageUrl,
        imagePublicId: formData.imagePublicId,
        ...((!editingProblem && saveToLibrary) ? {
          saveToLibrary: true,
          libraryIsPublic: isAdmin ? libraryIsPublic : false
        } : {})
      };

      if (editingProblem) {
        await adminService.updateCodingProblem(editingProblem._id, problemData);
        toast.success('Problem updated successfully');
      } else {
        await adminService.createCodingProblem(problemData);
        toast.success(saveToLibrary ? 'Problem created & saved to library' : 'Problem created successfully');
      }

      resetForm();
      fetchProblems();
    } catch (error) {
      console.error('Error saving problem:', error);
      toast.error(error.response?.data?.message || 'Failed to save problem');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold mb-2">Manage Coding Problems</h1>
              <p className="text-gray-400">{problems.length} problems created</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowLibrary(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Library className="w-5 h-5" />
              Add from Library
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-primary"
            >
              {showForm ? (
                <>
                  <X className="w-5 h-5 mr-2" />
                  Cancel
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Create New
                </>
              )}
            </button>
          </div>
        </div>

        {/* Problem Form */}
        {showForm && (
          <div className="card mb-8">
            <h2 className="text-xl font-bold mb-6">
              {editingProblem ? 'Edit Problem' : 'Create New Problem'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Problem Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input-field"
                    placeholder="e.g., Two Sum"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="5"
                    className="input-field resize-none font-mono text-sm"
                    placeholder="Describe the problem..."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Input Format *
                    </label>
                    <textarea
                      value={formData.inputFormat}
                      onChange={(e) => setFormData({ ...formData, inputFormat: e.target.value })}
                      rows="3"
                      className="input-field resize-none font-mono text-sm"
                      placeholder="First line contains..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Output Format *
                    </label>
                    <textarea
                      value={formData.outputFormat}
                      onChange={(e) => setFormData({ ...formData, outputFormat: e.target.value })}
                      rows="3"
                      className="input-field resize-none font-mono text-sm"
                      placeholder="Print the result..."
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Constraints
                  </label>
                  <textarea
                    value={formData.constraints}
                    onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
                    rows="3"
                    className="input-field resize-none font-mono text-sm"
                    placeholder="1 ≤ N ≤ 10^5..."
                  />
                </div>
              </div>

              {/* Examples */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-300">
                    Examples *
                  </label>
                  <button
                    type="button"
                    onClick={addExample}
                    className="text-sm text-primary-400 hover:text-primary-300"
                  >
                    + Add Example
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.examples.map((example, index) => (
                    <div key={index} className="p-4 bg-dark-700/50 rounded-lg border border-dark-600">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-primary-400">Example {index + 1}</span>
                        {formData.examples.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeExample(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Input</label>
                          <textarea
                            value={example.input}
                            onChange={(e) => handleExampleChange(index, 'input', e.target.value)}
                            rows="2"
                            className="input-field resize-none font-mono text-sm"
                            placeholder="Input..."
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Output</label>
                          <textarea
                            value={example.output}
                            onChange={(e) => handleExampleChange(index, 'output', e.target.value)}
                            rows="2"
                            className="input-field resize-none font-mono text-sm"
                            placeholder="Output..."
                          />
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="block text-xs text-gray-400 mb-1">Explanation (optional)</label>
                        <textarea
                          value={example.explanation}
                          onChange={(e) => handleExampleChange(index, 'explanation', e.target.value)}
                          rows="2"
                          className="input-field resize-none text-sm"
                          placeholder="Explain the example..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Test Cases */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-300">
                    Test Cases * (Will be used for evaluation)
                  </label>
                  <button
                    type="button"
                    onClick={addTestcase}
                    className="text-sm text-primary-400 hover:text-primary-300"
                  >
                    + Add Testcase
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.testcases.map((testcase, index) => (
                    <div key={index} className="p-4 bg-dark-700/50 rounded-lg border border-dark-600">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-primary-400">Testcase {index + 1}</span>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              checked={testcase.isHidden}
                              onChange={(e) => handleTestcaseChange(index, 'isHidden', e.target.checked)}
                              className="w-4 h-4 rounded border-gray-600 text-primary-500"
                            />
                            <span className="text-gray-400">Hidden</span>
                          </label>
                        </div>

                        {formData.testcases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTestcase(index)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Input</label>
                          <textarea
                            value={testcase.input}
                            onChange={(e) => handleTestcaseChange(index, 'input', e.target.value)}
                            rows="2"
                            className="input-field resize-none font-mono text-sm"
                            placeholder="Input..."
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Expected Output</label>
                          <textarea
                            value={testcase.output}
                            onChange={(e) => handleTestcaseChange(index, 'output', e.target.value)}
                            rows="2"
                            className="input-field resize-none font-mono text-sm"
                            placeholder="Output..."
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Points</label>
                          <input
                            type="number"
                            value={testcase.points}
                            onChange={(e) => handleTestcaseChange(index, 'points', e.target.value)}
                            className="input-field"
                            min="0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Total Score *
                  </label>
                  <input
                    type="number"
                    value={formData.score}
                    onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                    className="input-field"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Difficulty
                  </label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="input-field"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Time Limit (ms)
                  </label>
                  <input
                    type="number"
                    value={formData.timeLimit}
                    onChange={(e) => setFormData({ ...formData, timeLimit: e.target.value })}
                    className="input-field"
                    min="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Memory Limit (MB)
                  </label>
                  <input
                    type="number"
                    value={formData.memoryLimit}
                    onChange={(e) => setFormData({ ...formData, memoryLimit: e.target.value })}
                    className="input-field"
                    min="1"
                  />
                </div>
              </div>

              {/* Image Upload */}
              <ImageUpload
                imageUrl={formData.imageUrl}
                onImageChange={(url, publicId) => setFormData({ ...formData, imageUrl: url, imagePublicId: publicId })}
                onImageRemove={() => setFormData({ ...formData, imageUrl: null, imagePublicId: null })}
              />

              {/* Save to Library */}
              {!editingProblem && (
                <div className="p-4 rounded-lg bg-dark-700/50 border border-dark-600 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveToLibrary}
                      onChange={(e) => setSaveToLibrary(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm font-medium">Also save to my question library</span>
                  </label>
                  {saveToLibrary && isAdmin && (
                    <div className="flex items-center gap-4 ml-7">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="codingLibraryVisibility"
                          checked={libraryIsPublic}
                          onChange={() => setLibraryIsPublic(true)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-green-400">Public Library</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="codingLibraryVisibility"
                          checked={!libraryIsPublic}
                          onChange={() => setLibraryIsPublic(false)}
                          className="w-4 h-4"
                        />
                        <span className="text-sm text-yellow-400">Private Library</span>
                      </label>
                    </div>
                  )}
                  {saveToLibrary && !isAdmin && (
                    <p className="text-xs text-gray-500 ml-7">Will be saved to your private library</p>
                  )}
                </div>
              )}

              {/* Submit */}
              <div className="flex justify-end gap-4 pt-4 border-t border-dark-700">
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <Save className="w-5 h-5 mr-2" />
                  {editingProblem ? 'Update Problem' : 'Create Problem'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Problems List */}
        <div className="card">
          <h2 className="text-xl font-bold mb-6">All Problems</h2>

          {problems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">No problems in this contest yet</p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowLibrary(true)}
                  className="btn-secondary"
                >
                  <Library className="w-5 h-5 mr-2" />
                  Add from Library
                </button>
                <button
                  onClick={() => setShowForm(true)}
                  className="btn-primary"
                >
                  Create New Problem
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {problems.map((problem, index) => (
                <div key={problem._id} className="p-4 bg-dark-700/50 rounded-lg border border-dark-600">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="badge-primary">#{index + 1}</span>
                        <h3 className="text-lg font-bold">{problem.title}</h3>
                        <span className={`badge-${problem.difficulty.toLowerCase()}`}>
                          {problem.difficulty}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">{problem.description}</p>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(problem)}
                        className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4 text-blue-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(problem)}
                        className="p-2 hover:bg-dark-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>Score: <span className="text-primary-400 font-semibold">{problem.score}</span></span>
                    <span>Examples: <span className="text-white">{problem.examples?.length || 0}</span></span>
                    <span>Testcases: <span className="text-white">{problem.testcases?.length || 0}</span></span>
                    <span>Time: <span className="text-white">{problem.timeLimit}ms</span></span>
                    <span>Memory: <span className="text-white">{problem.memoryLimit}MB</span></span>
                    {problem.submissionCount > 0 && (
                      <span>Acceptance: <span className="text-green-400">
                        {((problem.acceptedCount / problem.submissionCount) * 100).toFixed(1)}%
                      </span></span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Library Modal */}
      {showLibrary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl max-w-4xl w-full max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-dark-700 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Select from Coding Library</h2>
                <p className="text-gray-400 text-sm">{selectedLibraryProblems.length} selected</p>
              </div>
              <button onClick={() => { setShowLibrary(false); setSelectedLibraryProblems([]); }}>
                <X className="w-6 h-6 text-gray-400 hover:text-white" />
              </button>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-dark-700 flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search problems..."
                  value={libraryFilter.search}
                  onChange={(e) => setLibraryFilter({ ...libraryFilter, search: e.target.value })}
                  className="input pl-10 w-full"
                />
              </div>
              <select
                value={libraryFilter.category}
                onChange={(e) => setLibraryFilter({ ...libraryFilter, category: e.target.value })}
                className="input w-48"
              >
                <option value="">All Categories</option>
                {CODING_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Problem List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {libraryLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
                </div>
              ) : libraryProblems.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No problems in library</p>
              ) : (
                libraryProblems.map(problem => (
                  <div
                    key={problem._id}
                    onClick={() => toggleLibrarySelection(problem._id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedLibraryProblems.includes(problem._id)
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-dark-600 hover:border-dark-500'
                      }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedLibraryProblems.includes(problem._id)}
                        onChange={() => { }}
                        className="w-5 h-5 mt-1 rounded"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold">{problem.title}</span>
                          <span className={`badge-${problem.difficulty.toLowerCase()} text-xs`}>
                            {problem.difficulty}
                          </span>
                          <span className="text-gray-500 text-xs">{problem.score} pts</span>
                        </div>
                        <p className="text-gray-400 text-sm line-clamp-2">{problem.description}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-dark-700 flex justify-end gap-3">
              <button
                onClick={() => { setShowLibrary(false); setSelectedLibraryProblems([]); }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFromLibrary}
                disabled={selectedLibraryProblems.length === 0}
                className="btn-primary disabled:opacity-50"
              >
                Add {selectedLibraryProblems.length} Problems
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageCodingProblems;
