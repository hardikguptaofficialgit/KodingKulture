import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ContestTimerProvider } from './context/ContestTimerContext';
import api from './services/authService';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyOTP from './pages/auth/VerifyOTP';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import ContestList from './pages/contest/ContestList';
import ContestDetails from './pages/contest/ContestDetails';
import ContestHub from './pages/contest/ContestHub';
import MCQSection from './pages/contest/MCQSection';
import CodingSection from './pages/contest/CodingSection';
import FormSection from './pages/contest/FormSection';
import ContestReview from './pages/contest/ContestReview';
import UserDashboard from './pages/dashboard/UserDashboard';
import Leaderboard from './pages/leaderboard/Leaderboard';
import LeaderboardList from './pages/leaderboard/LeaderboardList';
import UserAnswerReview from './pages/leaderboard/UserAnswerReview';
import Certificate from './pages/certificate/Certificate';
import AdminDashboard from './pages/admin/AdminDashboard';
import CreateContest from './pages/admin/CreateContest';
import ManageMCQ from './pages/admin/ManageMCQ';
import ManageCodingProblems from './pages/admin/ManageCodingProblems';
import MCQLibrary from './pages/admin/MCQLibrary';
import CodingLibrary from './pages/admin/CodingLibrary';
import ContestViolations from './pages/admin/ContestViolations';
import ContestParticipants from './pages/admin/ContestParticipants';
import UserManagement from './pages/admin/UserManagement';
import VerifyContests from './pages/admin/VerifyContests';
import FormBuilder from './pages/admin/FormBuilder';
import FormEvaluation from './pages/admin/FormEvaluation';
import AdminRooms from './pages/admin/AdminRooms';
import MyRooms from './pages/rooms/MyRooms';
import CreateRoom from './pages/rooms/CreateRoom';
import RoomDetail from './pages/rooms/RoomDetail';
import JoinRoom from './pages/rooms/JoinRoom';
import AcceptInvite from './pages/rooms/AcceptInvite';
import Loader from './components/common/Loader';
import ProctorGuard from './components/contest/ProctorGuard';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <Loader fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Admin Route Component
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return <Loader fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Admin or Organiser Route Component
const AdminOrOrganiserRoute = ({ children }) => {
  const { isAuthenticated, isAdminOrOrganiser, loading } = useAuth();

  if (loading) {
    return <Loader fullScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdminOrOrganiser) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Scroll to Top Component
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// Layout Component
const Layout = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};

// Contest Wrapper with Timer Provider (used by ContestHub)
const ContestWithTimer = ({ children }) => {
  const { contestId } = useParams();
  return (
    <ContestTimerProvider contestId={contestId}>
      {children}
    </ContestTimerProvider>
  );
};

// ProctoredContest provides both ContestTimerProvider and ProctorGuard
// Proctored Contest Wrapper (for MCQ, Coding, and Forms sections)
const ProctoredContest = ({ children, sectionType = 'mcq' }) => {
  const { contestId } = useParams();
  const navigate = useNavigate();
  const [proctorEnabled, setProctorEnabled] = useState(false); // Default to false to avoid forced proctoring on error
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const checkProctoring = async () => {
      try {
        const response = await api.get(`/contests/${contestId}`);
        if (!mounted) return;

        const contest = response.data.contest;
        const isProctored = contest?.sections?.[sectionType]?.proctored ?? false;
        setProctorEnabled(isProctored);
        setError(null);
      } catch (error) {
        console.error('Error fetching contest:', error);
        if (!mounted) return;
        setProctorEnabled(false);
        setError('Could not load contest settings');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkProctoring();

    return () => { mounted = false; };
  }, [contestId, sectionType]);

  const handleAutoSubmit = async (reason) => {
    try {
      // Read MCQ answers from localStorage
      const mcqAnswers = JSON.parse(localStorage.getItem(`mcq_answers_${contestId}`) || '{}');
      const formattedAnswers = Object.entries(mcqAnswers).map(([mcqId, selectedOptions]) => ({
        mcqId,
        selectedOptions
      }));

      // Submit answers to backend before navigating
      await api.post(`/contests/${contestId}/submit`, {
        mcqAnswers: formattedAnswers
      });

      // Clear localStorage for this contest
      Object.keys(localStorage).forEach(key => {
        if (key.includes(contestId)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Auto-submit error:', error);
      // Continue navigation even if submit fails (backend already marked as terminated)
    }

    // Navigate to review page
    setTimeout(() => {
      navigate(`/contest/${contestId}/review`);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading section...</p>
        </div>
      </div>
    );
  }

  return (
    <ContestTimerProvider contestId={contestId}>
      <ProctorGuard contestId={contestId} onAutoSubmit={handleAutoSubmit} enabled={proctorEnabled}>
        {children}
      </ProctorGuard>
    </ContestTimerProvider>
  );
};


function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
            },
            success: {
              iconTheme: {
                primary: '#FF6B35',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/contests" element={<Layout><ContestList /></Layout>} />
          <Route path="/contest/:id" element={<Layout><ContestDetails /></Layout>} />
          <Route path="/leaderboard" element={<Layout><LeaderboardList /></Layout>} />
          <Route path="/leaderboard/:contestId" element={<Layout><Leaderboard /></Layout>} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout><UserDashboard /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Contest Section Routes */}
          <Route
            path="/contest/:contestId/hub"
            element={
              <ProtectedRoute>
                <ContestWithTimer>
                  <ContestHub />
                </ContestWithTimer>
              </ProtectedRoute>
            }
          />

          <Route
            path="/contest/:contestId/mcq"
            element={
              <ProtectedRoute>
                <ProctoredContest sectionType="mcq">
                  <MCQSection />
                </ProctoredContest>
              </ProtectedRoute>
            }
          />

          <Route
            path="/contest/:contestId/coding"
            element={
              <ProtectedRoute>
                <ProctoredContest sectionType="coding">
                  <CodingSection />
                </ProctoredContest>
              </ProtectedRoute>
            }
          />

          <Route
            path="/contest/:contestId/forms"
            element={
              <ProtectedRoute>
                <ProctoredContest sectionType="forms">
                  <FormSection />
                </ProctoredContest>
              </ProtectedRoute>
            }
          />

          <Route
            path="/contest/:contestId/review"
            element={
              <ProtectedRoute>
                <Layout>
                  <ContestReview />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Certificate Route */}
          <Route
            path="/certificate/:resultId"
            element={
              <ProtectedRoute>
                <Layout><Certificate /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Admin/Organiser Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <AdminOrOrganiserRoute>
                <Layout><AdminDashboard /></Layout>
              </AdminOrOrganiserRoute>
            }
          />

          <Route
            path="/admin/contest/create"
            element={
              <AdminOrOrganiserRoute>
                <Layout><CreateContest /></Layout>
              </AdminOrOrganiserRoute>
            }
          />

          <Route
            path="/admin/contest/edit/:contestId"
            element={
              <AdminOrOrganiserRoute>
                <Layout><CreateContest /></Layout>
              </AdminOrOrganiserRoute>
            }
          />

          <Route
            path="/admin/contest/mcq/:contestId"
            element={
              <AdminOrOrganiserRoute>
                <Layout><ManageMCQ /></Layout>
              </AdminOrOrganiserRoute>
            }
          />

          <Route
            path="/admin/contest/coding/:contestId"
            element={
              <AdminOrOrganiserRoute>
                <Layout><ManageCodingProblems /></Layout>
              </AdminOrOrganiserRoute>
            }
          />

          {/* Form Builder Routes */}
          <Route
            path="/admin/contest/forms/:contestId"
            element={
              <AdminOrOrganiserRoute>
                <Layout><FormBuilder /></Layout>
              </AdminOrOrganiserRoute>
            }
          />

          <Route
            path="/admin/contest/forms/:contestId/:formId"
            element={
              <AdminOrOrganiserRoute>
                <Layout><FormBuilder /></Layout>
              </AdminOrOrganiserRoute>
            }
          />

          <Route
            path="/admin/contest/evaluate/:contestId"
            element={
              <AdminOrOrganiserRoute>
                <Layout><FormEvaluation /></Layout>
              </AdminOrOrganiserRoute>
            }
          />

          {/* Library Routes */}
          <Route
            path="/admin/mcq-library"
            element={
              <AdminOrOrganiserRoute>
                <Layout><MCQLibrary /></Layout>
              </AdminOrOrganiserRoute>
            }
          />

          <Route
            path="/admin/coding-library"
            element={
              <AdminOrOrganiserRoute>
                <Layout><CodingLibrary /></Layout>
              </AdminOrOrganiserRoute>
            }
          />

          {/* User Management Route */}
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <Layout><UserManagement /></Layout>
              </AdminRoute>
            }
          />

          {/* Contest Verification Route */}
          <Route
            path="/admin/verify-contests"
            element={
              <AdminRoute>
                <Layout><VerifyContests /></Layout>
              </AdminRoute>
            }
          />

          {/* Proctoring Violations Route */}
          <Route
            path="/admin/contest/:contestId/violations"
            element={
              <AdminOrOrganiserRoute>
                <ContestViolations />
              </AdminOrOrganiserRoute>
            }
          />

          {/* Admin Participants Route */}
          <Route
            path="/admin/contest/:contestId/participants"
            element={
              <AdminOrOrganiserRoute>
                <ContestParticipants />
              </AdminOrOrganiserRoute>
            }
          />

          {/* Admin Answer Review Route */}
          <Route
            path="/admin/contest/:contestId/user/:userId/answers"
            element={
              <AdminOrOrganiserRoute>
                <Layout><UserAnswerReview /></Layout>
              </AdminOrOrganiserRoute>
            }
          />

          {/* Admin Rooms Route */}
          <Route
            path="/admin/rooms"
            element={
              <AdminRoute>
                <Layout><AdminRooms /></Layout>
              </AdminRoute>
            }
          />

          {/* Room Routes */}
          <Route
            path="/rooms"
            element={
              <ProtectedRoute>
                <Layout><MyRooms /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/rooms/create"
            element={
              <AdminOrOrganiserRoute>
                <Layout><CreateRoom /></Layout>
              </AdminOrOrganiserRoute>
            }
          />

          <Route
            path="/rooms/:roomId"
            element={
              <ProtectedRoute>
                <Layout><RoomDetail /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/rooms/join/:shortCode"
            element={
              <ProtectedRoute>
                <Layout><JoinRoom /></Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/rooms/accept-invite/:token"
            element={
              <ProtectedRoute>
                <Layout><AcceptInvite /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
