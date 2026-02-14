import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/authService';
import toast from 'react-hot-toast';
import ImageUpload from '../../components/common/ImageUpload';
import {
    Plus,
    Search,
    Filter,
    Edit,
    Trash2,
    CheckCircle,
    XCircle,
    BarChart3,
    Tag
} from 'lucide-react';

const MCQ_CATEGORIES = ['GENERAL', 'APTITUDE', 'TECHNICAL', 'REASONING', 'ENTREPRENEURSHIP'];
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];

const MCQLibrary = () => {
    const { user, isAdmin } = useAuth();
    const [mcqs, setMcqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingMCQ, setEditingMCQ] = useState(null);
    const [filters, setFilters] = useState({ category: '', difficulty: '', search: '' });
    const [poolFilter, setPoolFilter] = useState('all'); // 'all' | 'public' | 'private'

    // Form state
    const [formData, setFormData] = useState({
        question: '',
        options: [
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false }
        ],
        category: 'GENERAL',
        difficulty: 'MEDIUM',
        marks: 1,
        negativeMarks: 0,
        explanation: '',
        tags: '',
        imageUrl: null,
        imagePublicId: null,
        isPublic: true
    });

    useEffect(() => {
        fetchMCQs();
    }, [filters]);

    const fetchMCQs = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.category) params.append('category', filters.category);
            if (filters.difficulty) params.append('difficulty', filters.difficulty);
            if (filters.search) params.append('search', filters.search);

            const response = await api.get(`/mcq/library?${params}`);
            setMcqs(response.data.mcqs);
        } catch (error) {
            toast.error('Failed to fetch MCQs');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate at least one correct answer
        const hasCorrect = formData.options.some(opt => opt.isCorrect);
        if (!hasCorrect) {
            toast.error('Select at least one correct answer');
            return;
        }

        try {
            const payload = {
                ...formData,
                tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
                correctAnswers: formData.options
                    .map((opt, idx) => opt.isCorrect ? idx : -1)
                    .filter(idx => idx !== -1),
                imageUrl: formData.imageUrl,
                imagePublicId: formData.imagePublicId,
                isPublic: isAdmin ? formData.isPublic : false
            };

            if (editingMCQ) {
                await api.put(`/mcq/library/${editingMCQ._id}`, payload);
                toast.success('MCQ updated successfully');
            } else {
                await api.post('/mcq/library', payload);
                toast.success('MCQ created successfully');
            }

            setShowModal(false);
            resetForm();
            fetchMCQs();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save MCQ');
        }
    };

    const handleEdit = (mcq) => {
        setEditingMCQ(mcq);
        setFormData({
            question: mcq.question,
            options: mcq.options,
            category: mcq.category,
            difficulty: mcq.difficulty,
            marks: mcq.marks,
            negativeMarks: mcq.negativeMarks || 0,
            explanation: mcq.explanation || '',
            tags: mcq.tags?.join(', ') || '',
            imageUrl: mcq.imageUrl || null,
            imagePublicId: mcq.imagePublicId || null,
            isPublic: mcq.isPublic || false
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this MCQ from library?')) return;

        try {
            await api.delete(`/mcq/library/${id}`);
            toast.success('MCQ deleted');
            fetchMCQs();
        } catch (error) {
            toast.error('Failed to delete MCQ');
        }
    };

    const resetForm = () => {
        setEditingMCQ(null);
        setFormData({
            question: '',
            options: [
                { text: '', isCorrect: false },
                { text: '', isCorrect: false },
                { text: '', isCorrect: false },
                { text: '', isCorrect: false }
            ],
            category: 'GENERAL',
            difficulty: 'MEDIUM',
            marks: 1,
            negativeMarks: 0,
            explanation: '',
            tags: '',
            imageUrl: null,
            imagePublicId: null,
            isPublic: true
        });
    };

    const updateOption = (index, field, value) => {
        const newOptions = [...formData.options];
        newOptions[index] = { ...newOptions[index], [field]: value };
        setFormData({ ...formData, options: newOptions });
    };

    const getCategoryColor = (cat) => {
        const colors = {
            GENERAL: 'bg-gray-500',
            APTITUDE: 'bg-blue-500',
            TECHNICAL: 'bg-purple-500',
            REASONING: 'bg-orange-500',
            ENTREPRENEURSHIP: 'bg-green-500'
        };
        return colors[cat] || 'bg-gray-500';
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-900 py-8">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">MCQ Library</h1>
                        <p className="text-gray-400">Manage reusable MCQ questions</p>
                    </div>
                    <button
                        onClick={() => { resetForm(); setShowModal(true); }}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Add MCQ
                    </button>
                </div>

                {/* Pool Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setPoolFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${poolFilter === 'all'
                            ? 'bg-primary-500 text-white'
                            : 'bg-dark-700 text-gray-400 hover:text-white hover:bg-dark-600'
                            }`}
                    >
                        All Questions
                        <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-dark-900/50">
                            {mcqs.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setPoolFilter('public')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${poolFilter === 'public'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                            : 'bg-dark-700 text-gray-400 hover:text-white hover:bg-dark-600'
                            }`}
                    >
                        🌐 Public Pool
                        <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-dark-900/50">
                            {mcqs.filter(m => m.isPublic).length}
                        </span>
                    </button>
                    <button
                        onClick={() => setPoolFilter('private')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${poolFilter === 'private'
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                            : 'bg-dark-700 text-gray-400 hover:text-white hover:bg-dark-600'
                            }`}
                    >
                        🔒 {isAdmin ? 'Private Pool' : 'My Questions'}
                        <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs bg-dark-900/50">
                            {mcqs.filter(m => !m.isPublic).length}
                        </span>
                    </button>
                </div>

                {/* Filters */}
                <div className="card mb-6">
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search questions..."
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    className="input pl-10 w-full"
                                />
                            </div>
                        </div>
                        <select
                            value={filters.category}
                            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                            className="input min-w-[150px]"
                        >
                            <option value="">All Categories</option>
                            {MCQ_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <select
                            value={filters.difficulty}
                            onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                            className="input min-w-[150px]"
                        >
                            <option value="">All Difficulties</option>
                            {DIFFICULTIES.map(diff => (
                                <option key={diff} value={diff}>{diff}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* MCQ List */}
                <div className="space-y-4">
                    {(() => {
                        const filteredMcqs = mcqs.filter(mcq => {
                            if (poolFilter === 'public') return mcq.isPublic;
                            if (poolFilter === 'private') return !mcq.isPublic;
                            return true;
                        });
                        return filteredMcqs.length === 0 ? (
                            <div className="card text-center py-12">
                                <p className="text-gray-400">
                                    {poolFilter === 'all'
                                        ? 'No MCQs in library. Create your first one!'
                                        : poolFilter === 'public'
                                            ? 'No public questions in the library.'
                                            : 'No private questions yet. Create one!'}
                                </p>
                            </div>
                        ) : (
                            filteredMcqs.map((mcq, idx) => (
                                <div key={mcq._id} className="card hover:border-dark-600 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(mcq.category)}`}>
                                                    {mcq.category}
                                                </span>
                                                <span className={`badge-${mcq.difficulty.toLowerCase()}`}>
                                                    {mcq.difficulty}
                                                </span>
                                                <span className="text-gray-500 text-sm">
                                                    {mcq.marks} marks
                                                </span>
                                                {mcq.isPublic ? (
                                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                                                        Public
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                                        Private
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-lg font-medium">{mcq.question}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {(isAdmin || (mcq.createdBy === user?._id && !mcq.isPublic)) && (
                                                <>
                                                    <button
                                                        onClick={() => handleEdit(mcq)}
                                                        className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                                                    >
                                                        <Edit className="w-4 h-4 text-blue-400" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(mcq._id)}
                                                        className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-400" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mb-4">
                                        {mcq.options.map((opt, optIdx) => (
                                            <div
                                                key={optIdx}
                                                className={`p-3 rounded-lg border ${opt.isCorrect
                                                    ? 'border-green-500 bg-green-500/10'
                                                    : 'border-dark-600 bg-dark-800'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {opt.isCorrect
                                                        ? <CheckCircle className="w-4 h-4 text-green-500" />
                                                        : <XCircle className="w-4 h-4 text-gray-500" />
                                                    }
                                                    <span>{opt.text}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Metrics */}
                                    <div className="flex items-center gap-6 text-sm text-gray-400 border-t border-dark-700 pt-3">
                                        <div className="flex items-center gap-1">
                                            <BarChart3 className="w-4 h-4" />
                                            <span>Attempted: {mcq.metrics?.attempted || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-green-400">
                                            <CheckCircle className="w-4 h-4" />
                                            <span>Correct: {mcq.metrics?.correct || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-red-400">
                                            <XCircle className="w-4 h-4" />
                                            <span>Wrong: {mcq.metrics?.wrong || 0}</span>
                                        </div>
                                        {mcq.tags?.length > 0 && (
                                            <div className="flex items-center gap-1">
                                                <Tag className="w-4 h-4" />
                                                <span>{mcq.tags.join(', ')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        );
                    })()}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-dark-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-dark-700">
                            <h2 className="text-xl font-bold">
                                {editingMCQ ? 'Edit MCQ' : 'Add New MCQ'}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Question *</label>
                                <textarea
                                    value={formData.question}
                                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                                    className="input w-full h-24"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Category *</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="input w-full"
                                    >
                                        {MCQ_CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Difficulty *</label>
                                    <select
                                        value={formData.difficulty}
                                        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                                        className="input w-full"
                                    >
                                        {DIFFICULTIES.map(diff => (
                                            <option key={diff} value={diff}>{diff}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Options * (check correct answers)</label>
                                <div className="space-y-2">
                                    {formData.options.map((opt, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={opt.isCorrect}
                                                onChange={(e) => updateOption(idx, 'isCorrect', e.target.checked)}
                                                className="w-5 h-5 rounded border-dark-600"
                                            />
                                            <input
                                                type="text"
                                                value={opt.text}
                                                onChange={(e) => updateOption(idx, 'text', e.target.value)}
                                                placeholder={`Option ${idx + 1}`}
                                                className="input flex-1"
                                                required
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Marks</label>
                                    <input
                                        type="number"
                                        value={formData.marks}
                                        onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value) })}
                                        className="input w-full"
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Negative Marks</label>
                                    <input
                                        type="number"
                                        value={formData.negativeMarks}
                                        onChange={(e) => setFormData({ ...formData, negativeMarks: parseFloat(e.target.value) })}
                                        className="input w-full"
                                        min="0"
                                        step="0.25"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Explanation</label>
                                <textarea
                                    value={formData.explanation}
                                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                                    className="input w-full h-20"
                                    placeholder="Explain the correct answer..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
                                <input
                                    type="text"
                                    value={formData.tags}
                                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                    className="input w-full"
                                    placeholder="arrays, loops, basics"
                                />
                            </div>

                            <ImageUpload
                                imageUrl={formData.imageUrl}
                                onImageChange={(url, publicId) => setFormData({ ...formData, imageUrl: url, imagePublicId: publicId })}
                                onImageRemove={() => setFormData({ ...formData, imageUrl: null, imagePublicId: null })}
                            />

                            {isAdmin && (
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-dark-700/50 border border-dark-600">
                                    <label className="text-sm font-medium">Visibility:</label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="isPublic"
                                            checked={formData.isPublic === true}
                                            onChange={() => setFormData({ ...formData, isPublic: true })}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm text-green-400">Public</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="isPublic"
                                            checked={formData.isPublic === false}
                                            onChange={() => setFormData({ ...formData, isPublic: false })}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm text-yellow-400">Private</span>
                                    </label>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); resetForm(); }}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editingMCQ ? 'Update MCQ' : 'Create MCQ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MCQLibrary;
