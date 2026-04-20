import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Lock, Building2, Phone, Eye, EyeOff, UserPlus, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/authService';
import { GOOGLE_CLIENT_ID } from '../../utils/constants';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    college: '',
    phone: ''
  });
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleButtonRef = useRef(null);

  const navigate = useNavigate();
  const { updateUser } = useAuth();

  const handleGoogleCallback = useCallback(async (response) => {
    if (!response.credential) {
      toast.error('Google sign-up failed');
      return;
    }

    setGoogleLoading(true);
    try {
      const result = await api.post('/auth/google', { credential: response.credential });

      if (result.data.success) {
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        updateUser(result.data.user);
        toast.success(result.data.message);
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Google sign-up failed');
    } finally {
      setGoogleLoading(false);
    }
  }, [navigate, updateUser]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.error('Missing VITE_GOOGLE_CLIENT_ID in client environment');
      return;
    }

    const initGoogle = () => {
      if (window.google?.accounts?.id && googleButtonRef.current) {
        googleButtonRef.current.innerHTML = '';
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
        });

        window.google.accounts.id.renderButton(
          googleButtonRef.current,
          {
            theme: 'outline',
            size: 'large',
            width: Math.max(320, Math.floor(googleButtonRef.current.offsetWidth || 320)),
            text: 'continue_with',
            shape: 'pill',
          }
        );
      }
    };

    if (!window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.body.appendChild(script);
    } else {
      initGoogle();
    }
  }, [handleGoogleCallback]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/send-otp', formData);

      if (response.data.success) {
        toast.success('OTP sent to your email!');
        navigate('/verify-otp', { state: { email: formData.email } });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mb-2 flex items-center justify-center">
            <UserPlus className="h-10 w-10 text-primary-500" />
          </div>
          <h2 className="text-strong mb-2 text-3xl font-bold">Create account</h2>
          <p className="text-muted-ui">Set up your profile and start joining contests.</p>
        </div>

        <div className="card">
          <div className="space-y-4">
            
            {/* Options Wrapper - Hidden when email form is active */}
            <div className={showEmailForm ? 'hidden' : 'space-y-4'}>
              
              {/* Custom Google Sign Up Block */}
              <div
                className="relative flex min-h-[76px] w-full items-center justify-between overflow-hidden rounded-2xl p-4 text-left transition-colors"
                style={{ backgroundColor: 'rgb(var(--color-panel-muted) / 0.72)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-6 w-6 items-center justify-center">
                    {/* Official Google 'G' Logo */}
                    <svg viewBox="0 0 24 24" className="h-full w-full">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-strong text-sm font-semibold">Continue with Google</div>
                    <div className="text-muted-ui text-xs">Create your account instantly with your verified profile.</div>
                  </div>
                </div>

                {/* The invisible real Google button overlay */}
                {GOOGLE_CLIENT_ID ? (
                  <div
                    className={`absolute inset-0 z-10 overflow-hidden rounded-2xl ${googleLoading ? 'pointer-events-none' : 'cursor-pointer opacity-[0.01]'}`}
                  >
                    <div ref={googleButtonRef} className="h-full w-full"></div>
                  </div>
                ) : (
                  <div className="absolute inset-0 z-20 flex items-center justify-center text-xs text-red-500" style={{ backgroundColor: 'rgb(var(--color-panel) / 0.92)' }}>
                    Missing VITE_GOOGLE_CLIENT_ID
                  </div>
                )}
                
                {googleLoading && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center backdrop-blur-sm" style={{ backgroundColor: 'rgb(var(--color-panel) / 0.82)' }}>
                    <span className="text-strong text-sm font-medium">Signing up...</span>
                  </div>
                )}
              </div>

              {/* Continue with Email Button */}
              <button
                type="button"
                onClick={() => setShowEmailForm(true)}
                className="flex w-full items-center justify-between rounded-2xl p-4 text-left transition-colors"
                style={{ backgroundColor: 'rgb(var(--color-panel-muted) / 0.72)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="text-soft-ui">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-strong text-sm font-semibold">Continue with Email</div>
                    <div className="text-muted-ui text-xs">Create your account with email and profile details.</div>
                  </div>
                </div>
              </button>
            </div>

            {/* Email Form - Only visible when toggled */}
            {showEmailForm && (
              <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl p-4" style={{ backgroundColor: 'rgb(var(--color-panel-muted) / 0.46)' }}>
                <button 
                  type="button"
                  onClick={() => setShowEmailForm(false)}
                  className="text-muted-ui hover:text-strong mb-2 flex items-center gap-2 text-sm transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to options
                </button>

                <div>
                  <label className="label">Full Name</label>
                  <div className="relative">
                    <User className="text-soft-ui absolute left-3 top-3.5 h-5 w-5" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="input-field pl-10"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Email Address</label>
                  <div className="relative">
                    <Mail className="text-soft-ui absolute left-3 top-3.5 h-5 w-5" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="input-field pl-10"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <Lock className="text-soft-ui absolute left-3 top-3.5 h-5 w-5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="input-field pl-10 pr-10"
                      placeholder="Minimum 6 characters"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-soft-ui absolute right-3 top-3.5 transition-colors hover:text-strong"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label">College/University</label>
                  <div className="relative">
                    <Building2 className="text-soft-ui absolute left-3 top-3.5 h-5 w-5" />
                    <input
                      type="text"
                      name="college"
                      value={formData.college}
                      onChange={handleChange}
                      className="input-field pl-10"
                      placeholder="Your college name"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Phone Number</label>
                  <div className="relative">
                    <Phone className="text-soft-ui absolute left-3 top-3.5 h-5 w-5" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="input-field pl-10"
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3 text-base mt-2"
                >
                  {loading ? 'Creating account...' : 'Create account'}
                </button>
              </form>
            )}
          </div>

          <div className="mt-6 text-center">
            <p className="text-muted-ui">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary-500 hover:text-primary-400">
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
