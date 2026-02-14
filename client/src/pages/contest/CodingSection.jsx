import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useContestTimer } from '../../context/ContestTimerContext';
import codingService from '../../services/codingService';
import api from '../../services/authService';
import Editor from '@monaco-editor/react';
import toast from 'react-hot-toast';
import {
  Play,
  Send,
  Clock,
  ChevronLeft,
  ChevronRight,
  Code,
  CheckCircle,
  XCircle,
  Loader,
  Terminal,
  FileCode,
  CheckSquare,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  GripVertical,
  GripHorizontal,
  Minimize2,
  Maximize2
} from 'lucide-react';

import { LANGUAGES, DEFAULT_CODE } from '../../utils/constants';

// Map constants.js LANGUAGES to the format needed by CodingSection
const LANGUAGE_OPTIONS = LANGUAGES.map(lang => ({
  id: lang.id,
  name: lang.label,
  monaco: lang.value,
  template: DEFAULT_CODE[lang.value] || '// Your code here\n'
}));

const CodingSection = () => {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formattedTime, remainingTime, progress } = useContestTimer();

  // Block re-entry if contest already submitted
  useEffect(() => {
    if (progress) {
      if (progress.status === 'SUBMITTED' || progress.status === 'TIMED_OUT') {
        toast.error('Contest already submitted. You cannot re-enter.');
        navigate(`/contest/${contestId}/review`, { replace: true });
      }
      if (progress.terminationReason === 'MALPRACTICE') {
        toast.error('Contest terminated due to malpractice.');
        navigate(`/contest/${contestId}/review`, { replace: true });
      }
    }
  }, [progress, contestId, navigate]);

  const [problems, setProblems] = useState([]);
  const [currentProblem, setCurrentProblem] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGE_OPTIONS[3]); // Python default
  const [languageByProblem, setLanguageByProblem] = useState({}); // Store language per problem
  const [code, setCode] = useState(LANGUAGE_OPTIONS[3].template);
  const [codeByProblem, setCodeByProblem] = useState({}); // Store code per problem
  const [customInput, setCustomInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('description'); // description, submissions
  const [submissions, setSubmissions] = useState([]);
  const [testResults, setTestResults] = useState(null);
  const [contestInfo, setContestInfo] = useState(null);

  // Resizable panel states
  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // percentage
  const [ioHeight, setIoHeight] = useState(250); // pixels
  const [isIoMinimized, setIsIoMinimized] = useState(false);
  const [isResizingHorizontal, setIsResizingHorizontal] = useState(false);
  const [isResizingVertical, setIsResizingVertical] = useState(false);
  const containerRef = useRef(null);
  const rightPanelRef = useRef(null);

  // Time tracking
  const problemStartTime = useRef(Date.now());
  const sectionStartTime = useRef(Date.now());

  useEffect(() => {
    fetchProblems();
  }, [contestId]);

  useEffect(() => {
    if (problems.length > 0) {
      fetchSubmissions(problems[currentProblem]._id);
    }
  }, [currentProblem, problems]);

  // Save and restore code, language, customInput, and output when switching problems (with localStorage)
  useEffect(() => {
    if (problems.length > 0) {
      const problemId = problems[currentProblem]?._id;
      if (problemId) {
        // Restore language first
        const langKey = `lang_${contestId}_${problemId}`;
        const savedLangId = localStorage.getItem(langKey) || languageByProblem[problemId];
        let restoredLanguage = LANGUAGE_OPTIONS[3]; // Default Python
        if (savedLangId) {
          const found = LANGUAGE_OPTIONS.find(l => l.id === parseInt(savedLangId));
          if (found) restoredLanguage = found;
        }
        setSelectedLanguage(restoredLanguage);

        // Restore code
        const codeKey = `code_${contestId}_${problemId}`;
        const savedCode = localStorage.getItem(codeKey) || codeByProblem[problemId];
        if (savedCode !== undefined && savedCode !== null) {
          setCode(savedCode);
        } else {
          setCode(restoredLanguage.template);
        }

        // Restore customInput
        const inputKey = `input_${contestId}_${problemId}`;
        const savedInput = localStorage.getItem(inputKey);
        setCustomInput(savedInput || '');

        // Restore output
        const outputKey = `output_${contestId}_${problemId}`;
        const savedOutput = localStorage.getItem(outputKey);
        setOutput(savedOutput || '');
      }
      setTestResults(null);
    }
  }, [currentProblem, problems]);

  // Save code, customInput, and output to localStorage whenever they change
  useEffect(() => {
    if (problems.length > 0 && problems[currentProblem]) {
      const problemId = problems[currentProblem]._id;

      // Save code
      const codeKey = `code_${contestId}_${problemId}`;
      setCodeByProblem(prev => ({ ...prev, [problemId]: code }));
      localStorage.setItem(codeKey, code);

      // Save customInput
      const inputKey = `input_${contestId}_${problemId}`;
      localStorage.setItem(inputKey, customInput);

      // Save output
      const outputKey = `output_${contestId}_${problemId}`;
      localStorage.setItem(outputKey, output);
    }
  }, [code, customInput, output, currentProblem, problems, contestId]);

  // Save language to localStorage whenever it changes
  useEffect(() => {
    if (problems.length > 0 && problems[currentProblem]) {
      const problemId = problems[currentProblem]._id;
      const langKey = `lang_${contestId}_${problemId}`;
      setLanguageByProblem(prev => ({ ...prev, [problemId]: selectedLanguage.id }));
      localStorage.setItem(langKey, selectedLanguage.id.toString());
    }
  }, [selectedLanguage, currentProblem, problems, contestId]);

  // Track time when changing problems
  const trackProblemTime = async (problemId, timeSpent) => {
    try {
      await api.post(`/contests/${contestId}/track-time`, {
        type: 'coding',
        problemId,
        timeSpent
      });
    } catch (error) {
      console.error('Error tracking time:', error);
    }
  };

  // Handle problem navigation with time tracking
  const handleProblemChange = (newProblem) => {
    if (problems.length === 0) return;

    const currentProb = problems[currentProblem];
    const timeSpent = Math.floor((Date.now() - problemStartTime.current) / 1000);

    // Track time for the problem we're leaving
    if (currentProb && timeSpent > 0) {
      trackProblemTime(currentProb._id, timeSpent);
    }

    // Reset timer for new problem
    problemStartTime.current = Date.now();
    setCurrentProblem(newProblem);
  };

  // Track section time when leaving coding section
  useEffect(() => {
    return () => {
      const sectionTimeSpent = Math.floor((Date.now() - sectionStartTime.current) / 1000);
      api.post(`/contests/${contestId}/track-time`, {
        type: 'coding-section',
        timeSpent: sectionTimeSpent
      }).catch(err => console.error('Error tracking section time:', err));
    };
  }, [contestId]);

  // Horizontal resize (between left and right panels)
  const handleHorizontalMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizingHorizontal(true);
  }, []);

  // Vertical resize (between editor and I/O)
  const handleVerticalMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizingVertical(true);
  }, []);

  // Handle mouse move for resizing with smooth updates
  useEffect(() => {
    let animationFrameId = null;

    const handleMouseMove = (e) => {
      // Cancel any pending animation frame
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        if (isResizingHorizontal && containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
          // Allow code editor to take more space (min 15% for problem, max 85%)
          setLeftPanelWidth(Math.min(Math.max(15, newWidth), 85));
        }
        if (isResizingVertical && rightPanelRef.current) {
          const panelRect = rightPanelRef.current.getBoundingClientRect();
          const newHeight = panelRect.bottom - e.clientY;
          // Better constraints: min 80px, max 60% of panel height
          const maxHeight = panelRect.height * 0.6;
          setIoHeight(Math.min(Math.max(80, newHeight), maxHeight));
        }
      });
    };

    const handleMouseUp = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      setIsResizingHorizontal(false);
      setIsResizingVertical(false);
    };

    if (isResizingHorizontal || isResizingVertical) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isResizingHorizontal ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingHorizontal, isResizingVertical]);

  const fetchProblems = async () => {
    try {
      const data = await codingService.getCodingProblemsByContest(contestId);
      setProblems(data.problems);

      if (data.contest) {
        setContestInfo(data.contest);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching problems:', error);
      toast.error(error.response?.data?.message || 'Failed to load problems');
      setLoading(false);
    }
  };

  const fetchSubmissions = async (problemId) => {
    try {
      const data = await codingService.getSubmissions(problemId, contestId);
      setSubmissions(data.submissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const handleLanguageChange = (language) => {
    const problemId = problems[currentProblem]?._id;

    // Check if current code is empty or just template
    const currentLang = selectedLanguage;
    const isTemplateOrEmpty = !code.trim() || code.trim() === currentLang.template.trim();

    setSelectedLanguage(language);

    // Only reset code to template if code is empty/template
    if (isTemplateOrEmpty) {
      setCode(language.template);
    }

    setOutput('');
    setTestResults(null);
  };

  const handleRunCode = async () => {
    if (!code.trim()) {
      toast.error('Please write some code first');
      return;
    }

    setRunning(true);
    setOutput('Running...');
    setTestResults(null);

    try {
      // For custom test, we'll use the first example as reference
      const problem = problems[currentProblem];
      const testInput = customInput || (problem.examples[0]?.input || '');

      const response = await codingService.runCode({
        problemId: problem._id,
        sourceCode: code,
        languageId: selectedLanguage.id,
        input: customInput || (problem.examples[0]?.input || '') // Use example input if no custom input
      });

      // Build output display based on whether we have comparison results
      let outputDisplay = '';

      if (response.error) {
        outputDisplay = response.error;
        toast.error('Compilation/Runtime error');
      } else if (response.passed === true) {
        outputDisplay = `✅ TEST PASSED\n\nYour Output:\n${response.output}\n\nExpected Output:\n${response.expectedOutput}`;
        toast.success('✅ Test case passed!');
      } else if (response.passed === false) {
        outputDisplay = `❌ TEST FAILED\n\nYour Output:\n${response.output}\n\nExpected Output:\n${response.expectedOutput}`;
        toast.error('❌ Test case failed - output does not match');
      } else {
        // Custom input was used, no comparison available
        outputDisplay = response.output || 'No output';
        toast.success('Code executed successfully');
      }

      setOutput(outputDisplay);
    } catch (error) {
      console.error('Error running code:', error);
      setOutput(error.response?.data?.message || 'Failed to run code');
      toast.error('Failed to run code');
    } finally {
      setRunning(false);
    }
  };

  const handleCheckTestCases = async () => {
    if (!code.trim()) {
      toast.error('Please write some code first');
      return;
    }

    setChecking(true);
    setOutput('Checking all test cases...');
    setTestResults(null);

    try {
      const problem = problems[currentProblem];
      const response = await codingService.checkAllTestCases({
        problemId: problem._id,
        sourceCode: code,
        languageId: selectedLanguage.id
      });

      // Build detailed output
      let outputDisplay = response.allPassed
        ? `✅ ALL TEST CASES PASSED (${response.passedCount}/${response.totalTestcases})\n\n`
        : `❌ FAILED (${response.passedCount}/${response.totalTestcases} passed)\n\n`;

      response.testcaseResults.forEach(tc => {
        outputDisplay += `Test Case ${tc.testcaseNumber}: ${tc.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
        if (!tc.hidden) {
          outputDisplay += `  Input: ${tc.input}\n`;
          outputDisplay += `  Expected: ${tc.expectedOutput}\n`;
          outputDisplay += `  Your Output: ${tc.actualOutput}\n`;
        } else {
          outputDisplay += `  [Hidden Test Case]\n`;
        }
        if (tc.error) {
          outputDisplay += `  Error: ${tc.error}\n`;
        }
        outputDisplay += `  Time: ${tc.executionTime?.toFixed(2) || 0}ms\n\n`;
      });

      setOutput(outputDisplay);

      if (response.allPassed) {
        toast.success(`✅ All ${response.totalTestcases} test cases passed!`);
      } else {
        toast.error(`❌ ${response.totalTestcases - response.passedCount} test case(s) failed`);
      }
    } catch (error) {
      console.error('Error checking test cases:', error);
      setOutput(error.response?.data?.message || 'Failed to check test cases');
      toast.error('Failed to check test cases');
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.error('Please write some code first');
      return;
    }

    setSubmitting(true);
    setTestResults(null);

    try {
      const problem = problems[currentProblem];
      const response = await codingService.submitCode(contestId, {
        problemId: problem._id,
        sourceCode: code,
        languageId: selectedLanguage.id
      });

      setTestResults(response.submission);

      // Judge0 was unavailable — code saved for manual review
      if (response.saved) {
        toast.error('Code execution failed. Please try again later.');
        fetchSubmissions(problem._id);
        return;
      }

      if (response.submission.verdict === 'ACCEPTED') {
        toast.success(`Accepted! Score: ${response.submission.score}`);
      } else {
        toast.error(`${response.submission.verdict.replace(/_/g, ' ')}`);
      }

      // Refresh submissions
      fetchSubmissions(problem._id);
    } catch (error) {
      console.error('Error submitting code:', error);
      toast.error(error.response?.data?.message || 'Failed to submit code');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (problems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Coding Problems Available</h2>
          <button onClick={() => navigate(`/contest/${contestId}`)} className="btn-primary">
            Back to Contest
          </button>
        </div>
      </div>
    );
  }

  const problem = problems[currentProblem];

  return (
    <div className="h-screen flex flex-col bg-dark-900">
      {/* Header */}
      <div className="bg-dark-800 border-b border-dark-700 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/contest/${contestId}/hub`)}
              className="text-gray-400 hover:text-white flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Hub
            </button>
            <h1 className="text-lg font-bold">{problem.title}</h1>
            <span className={`badge-${problem.difficulty.toLowerCase()}`}>
              {problem.difficulty}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Timer Display */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-semibold ${remainingTime < 300 ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-dark-700 text-white'
              }`}>
              <Clock className="w-5 h-5" />
              <span>{formattedTime}</span>
            </div>

            <div className="text-sm text-gray-400">
              Score: <span className="text-primary-400 font-semibold">{problem.score}</span>
            </div>

            <select
              value={selectedLanguage.id}
              onChange={(e) => handleLanguageChange(LANGUAGE_OPTIONS.find(l => l.id === parseInt(e.target.value)))}
              className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm"
            >
              {LANGUAGE_OPTIONS.map(lang => (
                <option key={lang.id} value={lang.id}>{lang.name}</option>
              ))}
            </select>

            <button
              onClick={handleRunCode}
              disabled={running}
              className="btn-secondary"
            >
              {running ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              Run
            </button>

            <button
              onClick={handleCheckTestCases}
              disabled={checking}
              className="btn-secondary"
            >
              {checking ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <CheckSquare className="w-4 h-4 mr-2" />}
              Check All
            </button>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Submit
            </button>
          </div>
        </div>

        {/* Problem Navigation */}
        <div className="flex items-center gap-2 mt-3">
          {problems.map((p, index) => (
            <button
              key={p._id}
              onClick={() => handleProblemChange(index)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${index === currentProblem
                ? 'bg-primary-500 text-white'
                : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                }`}
            >
              Problem {index + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden">
        {/* Left Panel - Problem Description */}
        <div style={{ width: `${leftPanelWidth}%` }} className="border-r border-dark-700 flex flex-col">

          {/* Tabs */}
          <div className="flex border-b border-dark-700 bg-dark-800">
            <button
              onClick={() => setActiveTab('description')}
              className={`px-6 py-3 text-sm font-medium ${activeTab === 'description'
                ? 'text-primary-400 border-b-2 border-primary-500'
                : 'text-gray-400 hover:text-white'
                }`}
            >
              <FileCode className="w-4 h-4 inline mr-2" />
              Description
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              className={`px-6 py-3 text-sm font-medium ${activeTab === 'submissions'
                ? 'text-primary-400 border-b-2 border-primary-500'
                : 'text-gray-400 hover:text-white'
                }`}
            >
              <Terminal className="w-4 h-4 inline mr-2" />
              Submissions ({submissions.length})
            </button>
          </div>

          {/* Content */}
          <div
            className="flex-1 overflow-y-auto p-6 select-none"
            onCopy={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
          >
            {activeTab === 'description' ? (
              <div className="space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-lg font-bold mb-3">Description</h3>
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {problem.description}
                  </p>
                  {/* Problem Image (if exists) */}
                  {problem.imageUrl && (
                    <div className="mt-4">
                      <img
                        src={problem.imageUrl}
                        alt="Problem"
                        className="max-w-full max-h-80 rounded-lg border border-dark-600"
                        onContextMenu={(e) => e.preventDefault()}
                        draggable="false"
                      />
                    </div>
                  )}
                </div>

                {/* Input Format */}
                <div>
                  <h3 className="text-lg font-bold mb-3">Input Format</h3>
                  <div className="bg-dark-800 rounded-lg p-4">
                    <p className="text-gray-300 whitespace-pre-wrap font-mono text-sm">
                      {problem.inputFormat}
                    </p>
                  </div>
                </div>

                {/* Output Format */}
                <div>
                  <h3 className="text-lg font-bold mb-3">Output Format</h3>
                  <div className="bg-dark-800 rounded-lg p-4">
                    <p className="text-gray-300 whitespace-pre-wrap font-mono text-sm">
                      {problem.outputFormat}
                    </p>
                  </div>
                </div>

                {/* Constraints */}
                {problem.constraints && (
                  <div>
                    <h3 className="text-lg font-bold mb-3">Constraints</h3>
                    <div className="bg-dark-800 rounded-lg p-4">
                      <p className="text-gray-300 whitespace-pre-wrap font-mono text-sm">
                        {problem.constraints}
                      </p>
                    </div>
                  </div>
                )}

                {/* Examples */}
                <div>
                  <h3 className="text-lg font-bold mb-3">Examples</h3>
                  <div className="space-y-4">
                    {problem.examples.map((example, index) => (
                      <div key={index} className="bg-dark-800 rounded-lg p-4">
                        <p className="text-primary-400 font-semibold mb-2">Example {index + 1}</p>
                        <div className="space-y-2">
                          <div>
                            <p className="text-gray-400 text-sm mb-1">Input:</p>
                            <pre className="bg-dark-900 rounded p-2 text-sm font-mono text-gray-300">
                              {example.input}
                            </pre>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm mb-1">Output:</p>
                            <pre className="bg-dark-900 rounded p-2 text-sm font-mono text-gray-300">
                              {example.output}
                            </pre>
                          </div>
                          {example.explanation && (
                            <div>
                              <p className="text-gray-400 text-sm mb-1">Explanation:</p>
                              <p className="text-gray-300 text-sm">{example.explanation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm text-gray-400">
                  <div>
                    <span className="mr-2">Submissions:</span>
                    <span className="text-white font-semibold">{problem.submissionCount || 0}</span>
                  </div>
                  <div>
                    <span className="mr-2">Acceptance:</span>
                    <span className="text-green-400 font-semibold">
                      {problem.submissionCount > 0
                        ? `${((problem.acceptedCount / problem.submissionCount) * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No submissions yet</p>
                ) : (
                  submissions.map(sub => (
                    <div key={sub._id} className="bg-dark-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-semibold ${sub.verdict === 'ACCEPTED' ? 'text-green-400' :
                          sub.verdict === 'PENDING' ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                          {sub.verdict === 'ACCEPTED' && <CheckCircle className="w-4 h-4 inline mr-1" />}
                          {sub.verdict !== 'ACCEPTED' && sub.verdict !== 'PENDING' && <XCircle className="w-4 h-4 inline mr-1" />}
                          {sub.verdict.replace(/_/g, ' ')}
                        </span>
                        <span className="text-gray-400 text-sm">
                          {new Date(sub.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>Language: <span className="text-white">{LANGUAGE_OPTIONS.find(l => l.id === sub.languageId)?.name}</span></span>
                        <span>Score: <span className="text-primary-400">{sub.score}</span></span>
                        {sub.executionTime && <span>Time: <span className="text-white">{sub.executionTime}ms</span></span>}
                        {sub.testcasesPassed !== undefined && (
                          <span>Tests: <span className="text-white">{sub.testcasesPassed}/{sub.totalTestcases}</span></span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Horizontal Resize Handle */}
        <div
          onMouseDown={handleHorizontalMouseDown}
          className="w-1.5 bg-dark-700 hover:bg-primary-500 cursor-col-resize flex items-center justify-center group transition-colors"
        >
          <GripVertical className="w-3 h-3 text-gray-600 group-hover:text-white" />
        </div>

        {/* Right Panel - Code Editor */}
        <div ref={rightPanelRef} className="flex-1 flex flex-col overflow-hidden">
          {/* Editor - uses flex to fill remaining space */}
          <div
            className="overflow-hidden transition-none"
            style={{
              flex: isIoMinimized ? '1 1 100%' : '1 1 auto',
              minHeight: '200px'
            }}
          >
            <Editor
              height="100%"
              language={selectedLanguage.monaco}
              value={code}
              onChange={(value) => setCode(value)}
              theme="vs-dark"
              onMount={(editor, monaco) => {
                // Disable paste by intercepting Ctrl+V / Cmd+V
                editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
                  toast.error('Pasting is disabled during the contest');
                });
                // Also disable context menu paste
                editor.onContextMenu((e) => {
                  e.event.preventDefault();
                });
              }}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
                contextmenu: false, // Disable right-click menu
              }}
            />
          </div>

          {/* Vertical Resize Handle */}
          {!isIoMinimized && (
            <div
              onMouseDown={handleVerticalMouseDown}
              className="h-1.5 bg-dark-700 hover:bg-primary-500 cursor-row-resize flex items-center justify-center group transition-colors"
            >
              <GripHorizontal className="w-3 h-3 text-gray-600 group-hover:text-white" />
            </div>
          )}

          {/* Custom Input & Output */}
          <div
            style={{
              height: isIoMinimized ? '40px' : `${ioHeight}px`,
              flexShrink: 0
            }}
            className="border-t border-dark-700 flex flex-col bg-dark-800"
          >
            <div className="flex border-b border-dark-700 items-center h-10 flex-shrink-0">
              <div className="w-1/2 px-4 py-2 text-sm font-medium text-gray-400">Custom Input</div>
              <div className="w-1/2 px-4 py-2 text-sm font-medium text-gray-400 border-l border-dark-700">Output</div>
              <button
                onClick={() => setIsIoMinimized(!isIoMinimized)}
                className="px-3 py-2 text-gray-400 hover:text-white hover:bg-dark-700 transition-colors flex-shrink-0"
                title={isIoMinimized ? 'Expand' : 'Minimize'}
              >
                {isIoMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
            </div>
            {!isIoMinimized && (
              <div className="flex-1 flex overflow-hidden">
                <textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Enter custom input (optional)..."
                  className="w-1/2 bg-dark-900 text-gray-300 p-4 font-mono text-sm resize-none focus:outline-none"
                />
                <div className="w-1/2 border-l border-dark-700 bg-dark-900 p-4 font-mono text-sm overflow-auto">
                  {testResults ? (
                    <div className="space-y-2">
                      <div className={`font-semibold ${testResults.verdict === 'ACCEPTED' ? 'text-green-400' : 'text-red-400'
                        }`}>
                        {testResults.verdict.replace(/_/g, ' ')}
                      </div>
                      <div className="text-gray-400 text-xs">
                        Testcases Passed: {testResults.testcasesPassed}/{testResults.totalTestcases}
                      </div>
                      <div className="text-gray-400 text-xs">
                        Score: {testResults.score}/{problem.score}
                      </div>
                      {testResults.executionTime && (
                        <div className="text-gray-400 text-xs">
                          Execution Time: {testResults.executionTime}ms
                        </div>
                      )}
                      {testResults.errorMessage && (
                        <pre className="text-red-400 text-xs mt-2 whitespace-pre-wrap">
                          {testResults.errorMessage}
                        </pre>
                      )}
                    </div>
                  ) : (
                    <pre className="text-gray-300 whitespace-pre-wrap">{output || 'Output will appear here...'}</pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingSection;
