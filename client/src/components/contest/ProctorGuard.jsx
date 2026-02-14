import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle, Maximize, Shield } from 'lucide-react';
import api from '../../services/authService';
import toast from 'react-hot-toast';

const ProctorGuard = ({
    contestId,
    onAutoSubmit,
    enabled = true,
    children
}) => {
    const [warningCount, setWarningCount] = useState(0);
    const [showWarning, setShowWarning] = useState(false);
    const [violationType, setViolationType] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const maxWarnings = 3;
    const isProcessingRef = useRef(false);
    const hasAutoSubmittedRef = useRef(false);
    const warningCountRef = useRef(0);

    // Request fullscreen
    const enterFullscreen = useCallback(async () => {
        try {
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                await elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                await elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                await elem.msRequestFullscreen();
            }
            setIsFullscreen(true);
        } catch (error) {
            console.error('Fullscreen request failed:', error);
        }
    }, []);

    // Log violation to backend - INSTANT warning, async API call
    const logViolation = useCallback(async (type, details = null) => {
        if (isProcessingRef.current || hasAutoSubmittedRef.current) return;
        isProcessingRef.current = true;

        // Use ref for accurate count (avoids stale closure on rapid events)
        const newWarningCount = warningCountRef.current + 1;
        warningCountRef.current = newWarningCount;
        setWarningCount(newWarningCount);
        setViolationType(type);
        setShowWarning(true);

        // Check if max warnings reached
        if (newWarningCount >= maxWarnings) {
            hasAutoSubmittedRef.current = true;
            toast.error('Contest terminated due to malpractice!', {
                duration: 5000,
                icon: '🚫'
            });
            if (onAutoSubmit) {
                onAutoSubmit('MALPRACTICE');
            }
        }

        // Log to API in background (non-blocking)
        try {
            await api.post(`/contests/${contestId}/violation`, {
                type,
                details
            });
        } catch (error) {
            console.error('Failed to log violation:', error);
        } finally {
            isProcessingRef.current = false;
        }
    }, [contestId, onAutoSubmit, maxWarnings]);

    // Handle visibility change (tab switch) - INSTANT
    const handleVisibilityChange = useCallback(() => {
        if (document.hidden && enabled && !hasAutoSubmittedRef.current) {
            logViolation('TAB_SWITCH', 'User switched to another tab');
        }
    }, [enabled, logViolation]);

    // Handle window blur (clicking outside) - REDUCED delay
    const handleBlur = useCallback(() => {
        if (enabled && !hasAutoSubmittedRef.current) {
            // Minimal delay (20ms) just to filter double-events
            setTimeout(() => {
                if (!document.hasFocus()) {
                    logViolation('WINDOW_BLUR', 'Window lost focus');
                }
            }, 20);
        }
    }, [enabled, logViolation]);

    // Handle fullscreen change
    const handleFullscreenChange = useCallback(() => {
        const isNowFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.msFullscreenElement
        );

        setIsFullscreen(isNowFullscreen);

        if (!isNowFullscreen && enabled && !hasAutoSubmittedRef.current) {
            logViolation('FULLSCREEN_EXIT', 'User exited fullscreen mode');
        }
    }, [enabled, logViolation]);

    // Handle keyboard shortcuts
    const handleKeyDown = useCallback((e) => {
        if (!enabled) return;

        // Detect Windows+Shift+S (Snipping Tool) - fires as 's' with Meta+Shift
        if (e.key.toLowerCase() === 's' && e.shiftKey && (e.metaKey || e.getModifierState('Meta'))) {
            e.preventDefault();
            e.stopPropagation();
            logViolation('SCREENSHOT_ATTEMPT', 'User attempted Windows+Shift+S snipping tool');
            return;
        }

        // Detect PrintScreen
        if (e.key === 'PrintScreen') {
            e.preventDefault();
            e.stopPropagation();
            logViolation('SCREENSHOT_ATTEMPT', 'User attempted PrintScreen screenshot');
            return;
        }

        // Detect Ctrl+Shift+S (some screenshot tools)
        if (e.key.toLowerCase() === 's' && e.ctrlKey && e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            logViolation('SCREENSHOT_ATTEMPT', 'User attempted Ctrl+Shift+S screenshot');
            return;
        }

        // Block common navigation shortcuts
        const blockedCombinations = [
            { key: 'Escape' },                           // Exit fullscreen
            { key: 'F11' },                              // Toggle fullscreen
            { key: 'Tab', alt: true },                   // Alt+Tab
            { key: 'F4', alt: true },                    // Alt+F4
            { key: 'w', ctrl: true },                    // Ctrl+W close tab
            { key: 't', ctrl: true },                    // Ctrl+T new tab
            { key: 'n', ctrl: true },                    // Ctrl+N new window
            { key: 'r', ctrl: true },                    // Ctrl+R refresh
            { key: 'F5' },                               // Refresh
            { key: 'F12' },                              // Dev tools
            { key: 'i', ctrl: true, shift: true },       // Ctrl+Shift+I dev tools
            { key: 'j', ctrl: true, shift: true },       // Ctrl+Shift+J console
            { key: 'u', ctrl: true },                    // Ctrl+U view source
        ];

        const isBlocked = blockedCombinations.some(blocked => {
            if (blocked.alt && !e.altKey) return false;
            if (blocked.ctrl && !e.ctrlKey) return false;
            if (blocked.shift && !e.shiftKey) return false;
            return e.key.toLowerCase() === blocked.key.toLowerCase();
        });

        if (isBlocked) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, [enabled, logViolation]);

    // Handle copy/paste attempts - allow only in code editor
    const handleCopyPaste = useCallback((e, type) => {
        if (!enabled) return;

        // Allow copy/paste inside Monaco editor (code editor)
        const target = e.target;
        const isInCodeEditor = target.closest('.monaco-editor') ||
            target.closest('[data-allow-copy-paste]') ||
            target.classList.contains('monaco-editor') ||
            target.classList.contains('inputarea');

        if (isInCodeEditor) {
            return; // Allow copy/paste in code editor
        }

        e.preventDefault();
        logViolation(type, `User attempted to ${type.toLowerCase().replace('_', ' ')}`);
    }, [enabled, logViolation]);

    // Set up event listeners
    useEffect(() => {
        if (!enabled) return;

        // Enter fullscreen on mount
        enterFullscreen();

        // Add event listeners
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('keydown', handleKeyDown);

        // Copy/paste handlers
        const handleCopy = (e) => handleCopyPaste(e, 'COPY_ATTEMPT');
        const handlePaste = (e) => handleCopyPaste(e, 'PASTE_ATTEMPT');
        document.addEventListener('copy', handleCopy);
        document.addEventListener('paste', handlePaste);

        // Warn before leaving
        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = 'You are in the middle of a proctored contest. Are you sure you want to leave?';
            return e.returnValue;
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        // Right-click prevention
        const handleContextMenu = (e) => {
            e.preventDefault();
            return false;
        };
        document.addEventListener('contextmenu', handleContextMenu);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('paste', handlePaste);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [enabled, enterFullscreen, handleVisibilityChange, handleBlur, handleFullscreenChange, handleKeyDown, handleCopyPaste]);

    // Close warning and re-enter fullscreen
    const handleDismissWarning = () => {
        setShowWarning(false);
        if (warningCount < maxWarnings) {
            enterFullscreen();
        }
    };

    // Get violation type label
    const getViolationLabel = (type) => {
        const labels = {
            'TAB_SWITCH': 'Tab Switch Detected',
            'FULLSCREEN_EXIT': 'Fullscreen Exit Detected',
            'WINDOW_BLUR': 'Window Focus Lost',
            'COPY_ATTEMPT': 'Copy Attempt Blocked',
            'PASTE_ATTEMPT': 'Paste Attempt Blocked',
            'SCREENSHOT_ATTEMPT': 'Screenshot Attempt Blocked'
        };
        return labels[type] || 'Violation Detected';
    };

    if (!enabled) {
        return <>{children}</>;
    }

    return (
        <>
            {/* Proctoring Status Bar */}
            <div className="fixed top-0 left-0 right-0 z-40 bg-dark-800/90 backdrop-blur border-b border-dark-700 px-4 py-2">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center gap-2 text-sm">
                        <Shield className="w-4 h-4 text-green-500" />
                        <span className="text-gray-300">Proctored Mode Active</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        {!isFullscreen && (
                            <button
                                onClick={enterFullscreen}
                                className="flex items-center gap-1 text-yellow-500 hover:text-yellow-400"
                            >
                                <Maximize className="w-4 h-4" />
                                Enter Fullscreen
                            </button>
                        )}
                        <span className={`${warningCount > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            Warnings: {warningCount}/{maxWarnings}
                        </span>
                    </div>
                </div>
            </div>

            {/* Add padding for status bar */}
            <div className="pt-12">
                {children}
            </div>

            {/* Warning Modal */}
            {showWarning && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-dark-800 border-2 border-red-500 rounded-xl p-8 max-w-md mx-4 text-center animate-pulse-once">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-12 h-12 text-red-500" />
                        </div>

                        <h2 className="text-2xl font-bold text-red-500 mb-2">
                            Warning {warningCount}/{maxWarnings}
                        </h2>

                        <p className="text-xl font-semibold text-white mb-2">
                            {getViolationLabel(violationType)}
                        </p>

                        <p className="text-gray-400 mb-6">
                            {warningCount >= maxWarnings
                                ? 'Maximum warnings reached. Your contest has been auto-submitted due to malpractice.'
                                : 'Please return to the exam. Do not switch tabs, exit fullscreen, or click outside the exam window.'}
                        </p>

                        {warningCount < maxWarnings ? (
                            <button
                                onClick={handleDismissWarning}
                                className="btn-primary w-full py-3 inline-flex items-center justify-center gap-2"
                            >
                                <Maximize className="w-5 h-5" />
                                Return to Exam
                            </button>
                        ) : (
                            <p className="text-red-400 font-semibold">
                                Redirecting to results...
                            </p>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default ProctorGuard;
