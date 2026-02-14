import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';
import { API_BASE_URL } from '../utils/constants';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const eventSourceRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      // Check if token is expired by decoding payload (no verification needed client-side)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          // Token expired — clear auth state
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setLoading(false);
          return;
        }
      } catch (e) {
        // Malformed token — clear auth state
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setLoading(false);
        return;
      }

      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  // SSE connection for real-time role updates
  useEffect(() => {
    if (!isAuthenticated) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Connect to SSE endpoint (token via query param since EventSource can't set headers)
    const sseUrl = `${API_BASE_URL}/auth/sse?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(sseUrl);
    eventSourceRef.current = eventSource;

    // Fires on initial connect — syncs role from server (handles offline→online)
    eventSource.addEventListener('role-sync', (event) => {
      try {
        const serverData = JSON.parse(event.data);
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

        if (currentUser.role !== serverData.role) {
          // Role was changed while user was offline
          const updatedUser = { ...currentUser, role: serverData.role, name: serverData.name };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          toast.success(`Your role has been updated to ${serverData.role}`);
        }
      } catch (err) {
        console.error('SSE role-sync parse error:', err);
      }
    });

    // Fires when admin changes role in real-time
    eventSource.addEventListener('role-update', (event) => {
      try {
        const data = JSON.parse(event.data);
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

        const updatedUser = { ...currentUser, role: data.role, name: data.name };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));

        toast.success(`Your role has been changed to ${data.role}`, {
          duration: 5000,
          icon: '🔄'
        });

        // Auto-redirect: if demoted to USER and currently on admin/organiser page
        if (data.role === 'USER' && location.pathname.startsWith('/admin')) {
          toast.error('You no longer have access to this page', { duration: 4000 });
          navigate('/', { replace: true });
        }
      } catch (err) {
        console.error('SSE role-update parse error:', err);
      }
    });

    eventSource.onerror = () => {
      // EventSource auto-reconnects on error (built-in browser behavior)
      // On reconnect, the server sends role-sync again, so offline changes are caught
      console.warn('SSE connection error, will auto-reconnect...');
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [isAuthenticated]);

  const login = async (credentials) => {
    try {
      const response = await authService.login(credentials);
      const { token, user: userData } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      const { token, user: newUser } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(newUser));

      setUser(newUser);
      setIsAuthenticated(true);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    isAdmin: user?.role === 'ADMIN',
    isOrganiser: user?.role === 'ORGANISER',
    isAdminOrOrganiser: user?.role === 'ADMIN' || user?.role === 'ORGANISER'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

