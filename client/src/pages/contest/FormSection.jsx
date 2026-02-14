import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/authService';
import toast from 'react-hot-toast';
import { useContestTimer } from '../../context/ContestTimerContext';
import {
    ArrowLeft,
    ArrowRight,
    Send,
    ClipboardList,
    CheckCircle,
    Clock,
    Loader2
} from 'lucide-react';

const FormSection = () => {
    const { contestId } = useParams();
    const navigate = useNavigate();
    const { remainingTime, formattedTime } = useContestTimer();

    const [forms, setForms] = useState([]);
    const [currentFormIndex, setCurrentFormIndex] = useState(0);
    const [responses, setResponses] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submittedForms, setSubmittedForms] = useState([]);
    const [mySubmissions, setMySubmissions] = useState([]);
    const [formStartTimes, setFormStartTimes] = useState({}); // Track when each form was started

    useEffect(() => {
        fetchForms();
        fetchMySubmissions();
    }, [contestId]);

    const fetchForms = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/forms/contest/${contestId}`);
            setForms(response.data.forms);
        } catch (error) {
            toast.error('Failed to load forms');
        } finally {
            setLoading(false);
        }
    };

    const fetchMySubmissions = async () => {
        try {
            const response = await api.get(`/form-submissions/my/${contestId}`);
            setMySubmissions(response.data.submissions);
            setSubmittedForms(response.data.submissions.map(s => s.formId._id || s.formId));
        } catch (error) {
            console.error('Failed to load submissions:', error);
        }
    };

    // Start tracking time when form changes or when first interacting
    const startTrackingForm = (formId) => {
        if (!formStartTimes[formId]) {
            setFormStartTimes(prev => ({
                ...prev,
                [formId]: Date.now()
            }));
        }
    };

    // Calculate time spent on a form in seconds
    const getTimeSpent = (formId) => {
        const startTime = formStartTimes[formId];
        if (!startTime) return 0;
        return Math.floor((Date.now() - startTime) / 1000);
    };

    const handleInputChange = (formId, fieldId, value) => {
        // Start tracking time when user starts filling the form
        startTrackingForm(formId);
        setResponses(prev => ({
            ...prev,
            [formId]: {
                ...prev[formId],
                [fieldId]: value
            }
        }));
    };

    const handleCheckboxChange = (formId, fieldId, option, checked) => {
        setResponses(prev => {
            const currentValues = prev[formId]?.[fieldId] || [];
            const newValues = checked
                ? [...currentValues, option]
                : currentValues.filter(v => v !== option);
            return {
                ...prev,
                [formId]: {
                    ...prev[formId],
                    [fieldId]: newValues
                }
            };
        });
    };

    const handleSubmitForm = async (form) => {
        // Validate required fields
        const formResponses = responses[form._id] || {};
        for (const field of form.fields) {
            if (field.required && !formResponses[field.fieldId]) {
                toast.error(`Please fill in: ${field.label}`);
                return;
            }
        }

        try {
            setSubmitting(true);
            const responseArray = form.fields.map(field => ({
                fieldId: field.fieldId,
                value: formResponses[field.fieldId] || null
            }));

            await api.post('/form-submissions', {
                formId: form._id,
                contestId,
                responses: responseArray,
                timeTaken: getTimeSpent(form._id)
            });

            toast.success('Form submitted successfully!');
            setSubmittedForms(prev => [...prev, form._id]);

            // Move to next form if available, otherwise redirect to hub for final submission
            if (currentFormIndex < forms.length - 1) {
                setCurrentFormIndex(prev => prev + 1);
            } else {
                // Last form submitted — redirect to Contest Hub for final submission
                toast.success('All forms completed! Redirecting to final submission...', { duration: 2000 });
                setTimeout(() => {
                    navigate(`/contest/${contestId}/hub`);
                }, 1500);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to submit form');
        } finally {
            setSubmitting(false);
        }
    };

    const currentForm = forms[currentFormIndex];
    const isCurrentFormSubmitted = submittedForms.includes(currentForm?._id);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    if (forms.length === 0) {
        return (
            <div className="min-h-screen bg-dark-900 p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="card text-center py-12">
                        <ClipboardList className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-300 mb-2">No Forms Available</h2>
                        <p className="text-gray-400">There are no forms to fill in this contest.</p>
                        <button
                            onClick={() => navigate(`/contest/${contestId}/hub`)}
                            className="btn-primary mt-6"
                        >
                            Back to Contest Hub
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-900 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => navigate(`/contest/${contestId}/hub`)}
                        className="flex items-center gap-2 text-gray-400 hover:text-white"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Hub
                    </button>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold ${remainingTime < 300 ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-dark-700 text-white'}`}>
                        <Clock className="w-5 h-5" />
                        <span>{formattedTime}</span>
                    </div>
                    <div className="text-right">
                        <span className="text-gray-400">Form {currentFormIndex + 1} of {forms.length}</span>
                    </div>
                </div>

                {/* Form Navigation */}
                {forms.length > 1 && (
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                        {forms.map((form, idx) => (
                            <button
                                key={form._id}
                                onClick={() => setCurrentFormIndex(idx)}
                                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${idx === currentFormIndex
                                    ? 'bg-primary-500 text-white'
                                    : submittedForms.includes(form._id)
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                                        : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
                                    }`}
                            >
                                {submittedForms.includes(form._id) && (
                                    <CheckCircle className="w-4 h-4 inline mr-2" />
                                )}
                                {form.title}
                            </button>
                        ))}
                    </div>
                )}

                {/* Current Form */}
                {currentForm && (
                    <div className="card">
                        <div className="flex items-center gap-3 mb-4">
                            <ClipboardList className="w-6 h-6 text-primary-500" />
                            <h1 className="text-2xl font-bold text-white">{currentForm.title}</h1>
                        </div>
                        {currentForm.description && (
                            <p className="text-gray-400 mb-6">{currentForm.description}</p>
                        )}
                        <p className="text-sm text-gray-500 mb-6">
                            Total Marks: {currentForm.totalMarks}
                        </p>

                        {isCurrentFormSubmitted ? (
                            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 text-center">
                                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                                <h3 className="text-lg font-semibold text-green-400">Form Submitted!</h3>
                                <p className="text-gray-400 mt-2">You have already submitted this form.</p>
                            </div>
                        ) : (
                            <>
                                {/* Form Fields */}
                                <div className="space-y-6">
                                    {currentForm.fields.map((field, idx) => (
                                        <div key={field.fieldId} className="p-4 bg-dark-700 rounded-lg">
                                            <label className="block text-white font-medium mb-2">
                                                {field.label}
                                                {field.required && <span className="text-red-400 ml-1">*</span>}
                                                <span className="text-gray-500 text-sm ml-2">({field.marks} marks)</span>
                                            </label>

                                            {field.type === 'TEXT' && (
                                                <input
                                                    type="text"
                                                    value={responses[currentForm._id]?.[field.fieldId] || ''}
                                                    onChange={(e) => handleInputChange(currentForm._id, field.fieldId, e.target.value)}
                                                    placeholder={field.placeholder}
                                                    className="input-field"
                                                />
                                            )}

                                            {field.type === 'TEXTAREA' && (
                                                <textarea
                                                    value={responses[currentForm._id]?.[field.fieldId] || ''}
                                                    onChange={(e) => handleInputChange(currentForm._id, field.fieldId, e.target.value)}
                                                    placeholder={field.placeholder}
                                                    className="input-field resize-none"
                                                    rows={4}
                                                />
                                            )}

                                            {field.type === 'NUMBER' && (
                                                <input
                                                    type="number"
                                                    value={responses[currentForm._id]?.[field.fieldId] || ''}
                                                    onChange={(e) => handleInputChange(currentForm._id, field.fieldId, e.target.value)}
                                                    placeholder={field.placeholder}
                                                    className="input-field"
                                                />
                                            )}

                                            {field.type === 'URL' && (
                                                <input
                                                    type="url"
                                                    value={responses[currentForm._id]?.[field.fieldId] || ''}
                                                    onChange={(e) => handleInputChange(currentForm._id, field.fieldId, e.target.value)}
                                                    placeholder={field.placeholder || 'https://'}
                                                    className="input-field"
                                                />
                                            )}

                                            {field.type === 'DATE' && (
                                                <input
                                                    type="date"
                                                    value={responses[currentForm._id]?.[field.fieldId] || ''}
                                                    onChange={(e) => handleInputChange(currentForm._id, field.fieldId, e.target.value)}
                                                    className="input-field"
                                                />
                                            )}

                                            {field.type === 'RADIO' && (
                                                <div className="space-y-2">
                                                    {field.options.map((option, i) => (
                                                        <label key={i} className="flex items-center gap-3 p-3 bg-dark-800 rounded cursor-pointer hover:bg-dark-600 transition-colors">
                                                            <input
                                                                type="radio"
                                                                name={`${currentForm._id}-${field.fieldId}`}
                                                                value={option}
                                                                checked={responses[currentForm._id]?.[field.fieldId] === option}
                                                                onChange={(e) => handleInputChange(currentForm._id, field.fieldId, e.target.value)}
                                                                className="w-4 h-4 text-primary-500"
                                                            />
                                                            <span className="text-gray-300">{option}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}

                                            {field.type === 'CHECKBOX' && (
                                                <div className="space-y-2">
                                                    {field.options.map((option, i) => (
                                                        <label key={i} className="flex items-center gap-3 p-3 bg-dark-800 rounded cursor-pointer hover:bg-dark-600 transition-colors">
                                                            <input
                                                                type="checkbox"
                                                                checked={(responses[currentForm._id]?.[field.fieldId] || []).includes(option)}
                                                                onChange={(e) => handleCheckboxChange(currentForm._id, field.fieldId, option, e.target.checked)}
                                                                className="w-4 h-4 rounded text-primary-500"
                                                            />
                                                            <span className="text-gray-300">{option}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Submit Button */}
                                <div className="flex justify-between items-center mt-8">
                                    <button
                                        onClick={() => setCurrentFormIndex(prev => Math.max(0, prev - 1))}
                                        disabled={currentFormIndex === 0}
                                        className="btn-secondary disabled:opacity-50"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Previous
                                    </button>

                                    <button
                                        onClick={() => handleSubmitForm(currentForm)}
                                        disabled={submitting}
                                        className="btn-primary flex items-center gap-2"
                                    >
                                        {submitting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                        {submitting ? 'Submitting...' : 'Submit Form'}
                                    </button>

                                    <button
                                        onClick={() => setCurrentFormIndex(prev => Math.min(forms.length - 1, prev + 1))}
                                        disabled={currentFormIndex === forms.length - 1}
                                        className="btn-secondary disabled:opacity-50"
                                    >
                                        Next
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FormSection;
