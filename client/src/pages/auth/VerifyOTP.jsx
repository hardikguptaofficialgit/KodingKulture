import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/authService';
import toast from 'react-hot-toast';
import { Mail, RefreshCw, ArrowLeft, CheckCircle } from 'lucide-react';

const VerifyOTP = () => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const inputRefs = useRef([]);
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const email = location.state?.email;

    useEffect(() => {
        if (!email) {
            navigate('/register');
            return;
        }

        // Focus first input
        inputRefs.current[0]?.focus();

        // Countdown timer
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    setCanResend(true);
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [email, navigate]);

    const handleChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        if (!/^\d+$/.test(pastedData)) return;

        const newOtp = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
        setOtp(newOtp);

        const focusIndex = Math.min(pastedData.length, 5);
        inputRefs.current[focusIndex]?.focus();
    };

    const handleVerify = async () => {
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            toast.error('Please enter complete OTP');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/auth/verify-otp', {
                email,
                otp: otpString
            });

            if (response.data.success) {
                toast.success('Email verified! Please login to continue.');
                // Redirect to login page after successful OTP verification
                navigate('/login');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid OTP');
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;

        setResending(true);
        try {
            await api.post('/auth/resend-otp', { email });
            toast.success('New OTP sent to your email');
            setCountdown(60);
            setCanResend(false);
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to resend OTP');
        } finally {
            setResending(false);
        }
    };

    // Auto-submit when all digits entered
    useEffect(() => {
        if (otp.every(digit => digit !== '')) {
            handleVerify();
        }
    }, [otp]);

    return (
        <div className="page-shell flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                <div className="card p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-500/20 flex items-center justify-center">
                            <Mail className="w-8 h-8 text-primary-500" />
                        </div>
                        <h1 className="text-strong mb-2 text-2xl font-bold">Verify Your Email</h1>
                        <p className="text-muted-ui">
                            We've sent a 6-digit code to<br />
                            <span className="text-primary-400 font-medium">{email}</span>
                        </p>
                    </div>

                    {/* OTP Input */}
                    <div className="flex justify-center gap-3 mb-6">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => (inputRefs.current[index] = el)}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={handlePaste}
                                className={`
                  w-12 h-14 text-center text-2xl font-bold rounded-lg border-2 
                  transition-all text-strong
                  ${digit ? 'border-primary-500' : ''}
                  focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20
                `}
                                style={{
                                    backgroundColor: 'rgb(var(--color-panel-muted))',
                                    borderColor: digit ? 'rgb(var(--color-accent-500))' : 'rgb(var(--color-border))'
                                }}
                                disabled={loading}
                            />
                        ))}
                    </div>

                    {/* Verify Button */}
                    <button
                        onClick={handleVerify}
                        disabled={loading || otp.some(d => d === '')}
                        className="btn-primary w-full py-3 mb-4 inline-flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Verifying...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                Verify Email
                            </>
                        )}
                    </button>

                    {/* Resend */}
                    <div className="text-center">
                        <p className="text-muted-ui mb-2 text-sm">
                            Didn't receive the code?
                        </p>
                        {canResend ? (
                            <button
                                onClick={handleResend}
                                disabled={resending}
                                className="text-primary-400 hover:text-primary-300 font-medium inline-flex items-center gap-1"
                            >
                                <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
                                Resend OTP
                            </button>
                        ) : (
                            <p className="text-soft-ui text-sm">
                                Resend in <span className="text-primary-400 font-medium">{countdown}s</span>
                            </p>
                        )}
                    </div>

                    {/* Back to Register */}
                    <div className="mt-6 border-t pt-6 text-center" style={{ borderColor: 'rgb(var(--color-border))' }}>
                        <Link
                            to="/register"
                            className="text-muted-ui hover:text-strong inline-flex items-center gap-1 text-sm"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Register
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyOTP;
