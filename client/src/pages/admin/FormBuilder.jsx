import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/authService';
import toast from 'react-hot-toast';
import {
    Plus,
    Trash2,
    GripVertical,
    Save,
    ArrowLeft,
    Type,
    AlignLeft,
    CircleDot,
    CheckSquare,
    Hash,
    Link,
    Calendar,
    Eye
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const FIELD_TYPES = [
    { value: 'TEXT', label: 'Text Input', icon: Type },
    { value: 'TEXTAREA', label: 'Text Area', icon: AlignLeft },
    { value: 'RADIO', label: 'Single Choice (Radio)', icon: CircleDot },
    { value: 'CHECKBOX', label: 'Multiple Choice (Checkbox)', icon: CheckSquare },
    { value: 'NUMBER', label: 'Number', icon: Hash },
    { value: 'URL', label: 'URL', icon: Link },
    { value: 'DATE', label: 'Date', icon: Calendar }
];

const FormBuilder = () => {
    const { contestId, formId } = useParams();
    const navigate = useNavigate();
    const { isAdmin } = useAuth();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [contest, setContest] = useState(null);
    const [showPreview, setShowPreview] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        fields: []
    });

    const [showAddField, setShowAddField] = useState(false);

    useEffect(() => {
        fetchContest();
        if (formId) {
            fetchForm();
        }
    }, [contestId, formId]);

    const fetchContest = async () => {
        try {
            const response = await api.get(`/contests/${contestId}`);
            setContest(response.data.contest);
        } catch (error) {
            toast.error('Failed to load contest');
        }
    };

    const fetchForm = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/forms/${formId}`);
            const form = response.data.form;
            setFormData({
                title: form.title,
                description: form.description,
                fields: form.fields
            });
        } catch (error) {
            toast.error('Failed to load form');
        } finally {
            setLoading(false);
        }
    };

    const addField = (typeValue) => {
        const type = FIELD_TYPES.find(t => t.value === typeValue);
        const newField = {
            fieldId: uuidv4(),
            type: typeValue,
            label: `New ${type.label} Field`,
            required: false,
            placeholder: '',
            options: typeValue === 'RADIO' || typeValue === 'CHECKBOX' ? ['Option 1', 'Option 2'] : [],
            correctAnswers: [],
            isAutoScored: false,
            marks: 0,
            order: formData.fields.length
        };
        setFormData(prev => ({
            ...prev,
            fields: [...prev.fields, newField]
        }));
        setShowAddField(false);
    };

    const updateField = (fieldId, updates) => {
        setFormData(prev => ({
            ...prev,
            fields: prev.fields.map(f =>
                f.fieldId === fieldId ? { ...f, ...updates } : f
            )
        }));
    };

    const removeField = (fieldId) => {
        setFormData(prev => ({
            ...prev,
            fields: prev.fields.filter(f => f.fieldId !== fieldId)
        }));
    };

    const moveField = (index, direction) => {
        const newFields = [...formData.fields];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= newFields.length) return;
        [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
        newFields.forEach((f, i) => f.order = i);
        setFormData(prev => ({ ...prev, fields: newFields }));
    };

    const addOption = (fieldId) => {
        const field = formData.fields.find(f => f.fieldId === fieldId);
        updateField(fieldId, {
            options: [...field.options, `Option ${field.options.length + 1}`]
        });
    };

    const updateOption = (fieldId, optionIndex, value) => {
        const field = formData.fields.find(f => f.fieldId === fieldId);
        const newOptions = [...field.options];
        newOptions[optionIndex] = value;
        updateField(fieldId, { options: newOptions });
    };

    const removeOption = (fieldId, optionIndex) => {
        const field = formData.fields.find(f => f.fieldId === fieldId);
        const newOptions = field.options.filter((_, i) => i !== optionIndex);
        const newCorrect = field.correctAnswers.filter(a => a !== field.options[optionIndex]);
        updateField(fieldId, { options: newOptions, correctAnswers: newCorrect });
    };

    const toggleCorrectAnswer = (fieldId, option) => {
        const field = formData.fields.find(f => f.fieldId === fieldId);
        let newCorrect;
        if (field.type === 'RADIO') {
            newCorrect = [option];
        } else {
            newCorrect = field.correctAnswers.includes(option)
                ? field.correctAnswers.filter(a => a !== option)
                : [...field.correctAnswers, option];
        }
        updateField(fieldId, { correctAnswers: newCorrect });
    };

    const handleSave = async () => {
        if (!formData.title.trim()) {
            toast.error('Form title is required');
            return;
        }
        if (formData.fields.length === 0) {
            toast.error('Add at least one field');
            return;
        }

        try {
            setSaving(true);
            if (formId) {
                await api.put(`/forms/${formId}`, formData);
                toast.success('Form updated successfully');
            } else {
                await api.post('/forms', {
                    ...formData,
                    contestId
                });
                toast.success('Form created successfully');
            }
            navigate(`/admin/dashboard`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save form');
        } finally {
            setSaving(false);
        }
    };

    const totalMarks = formData.fields.reduce((sum, f) => sum + (f.marks || 0), 0);

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-dark-900 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-dark-700 rounded-lg"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-white">
                                {formId ? 'Edit Form' : 'Create Form'}
                            </h1>
                            <p className="text-gray-400 text-sm">{contest?.title}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <Eye className="w-4 h-4" />
                            {showPreview ? 'Edit' : 'Preview'}
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Saving...' : 'Save Form'}
                        </button>
                    </div>
                </div>

                {/* Form Title & Description */}
                <div className="card mb-6">
                    <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Form Title"
                        className="input-field text-xl font-semibold mb-4"
                    />
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Form description (optional)"
                        className="input-field resize-none"
                        rows={2}
                    />
                    <div className="mt-4 text-sm text-gray-400">
                        Total Marks: <span className="text-primary-500 font-semibold">{totalMarks}</span>
                    </div>
                </div>

                {/* Preview Mode */}
                {showPreview ? (
                    <div className="card">
                        <h2 className="text-xl font-bold text-white mb-4">{formData.title || 'Untitled Form'}</h2>
                        {formData.description && <p className="text-gray-400 mb-6">{formData.description}</p>}
                        {formData.fields.map((field, idx) => (
                            <div key={field.fieldId} className="mb-6 p-4 bg-dark-800 rounded-lg">
                                <label className="block text-white font-medium mb-2">
                                    {field.label} {field.required && <span className="text-red-400">*</span>}
                                    <span className="text-gray-500 text-sm ml-2">({field.marks} marks)</span>
                                </label>
                                {field.type === 'TEXT' && (
                                    <input type="text" placeholder={field.placeholder} className="input-field" disabled />
                                )}
                                {field.type === 'TEXTAREA' && (
                                    <textarea placeholder={field.placeholder} className="input-field" rows={3} disabled />
                                )}
                                {field.type === 'NUMBER' && (
                                    <input type="number" placeholder={field.placeholder} className="input-field" disabled />
                                )}
                                {field.type === 'URL' && (
                                    <input type="url" placeholder={field.placeholder || 'https://'} className="input-field" disabled />
                                )}
                                {field.type === 'DATE' && (
                                    <input type="date" className="input-field" disabled />
                                )}
                                {(field.type === 'RADIO' || field.type === 'CHECKBOX') && (
                                    <div className="space-y-2">
                                        {field.options.map((opt, i) => (
                                            <label key={i} className="flex items-center gap-2 text-gray-300">
                                                <input type={field.type.toLowerCase()} disabled />
                                                {opt}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Fields Builder */}
                        <div className="space-y-4 mb-6">
                            {formData.fields.map((field, index) => (
                                <FieldEditor
                                    key={field.fieldId}
                                    field={field}
                                    index={index}
                                    totalFields={formData.fields.length}
                                    onUpdate={updateField}
                                    onRemove={removeField}
                                    onMove={moveField}
                                    onAddOption={addOption}
                                    onUpdateOption={updateOption}
                                    onRemoveOption={removeOption}
                                    onToggleCorrect={toggleCorrectAnswer}
                                />
                            ))}
                        </div>

                        {/* Add Field */}
                        {showAddField ? (
                            <div className="card">
                                <h3 className="text-lg font-semibold text-white mb-4">Select Field Type</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {FIELD_TYPES.map(type => (
                                        <button
                                            key={type.value}
                                            onClick={() => addField(type.value)}
                                            className="flex flex-col items-center gap-2 p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors"
                                        >
                                            <type.icon className="w-6 h-6 text-primary-500" />
                                            <span className="text-sm text-white">{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setShowAddField(false)}
                                    className="mt-4 text-gray-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowAddField(true)}
                                className="w-full border-2 border-dashed border-dark-600 hover:border-primary-500 rounded-lg p-6 flex items-center justify-center gap-2 text-gray-400 hover:text-primary-500 transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                                Add Field
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

// Field Editor Component
const FieldEditor = ({
    field,
    index,
    totalFields,
    onUpdate,
    onRemove,
    onMove,
    onAddOption,
    onUpdateOption,
    onRemoveOption,
    onToggleCorrect
}) => {
    const TypeIcon = FIELD_TYPES.find(t => t.value === field.type)?.icon || Type;
    const canAutoScore = field.type === 'RADIO' || field.type === 'CHECKBOX';

    return (
        <div className="card border border-dark-600">
            {/* Field Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="flex flex-col">
                    <button
                        onClick={() => onMove(index, 'up')}
                        disabled={index === 0}
                        className="text-gray-500 hover:text-white disabled:opacity-30"
                    >
                        ▲
                    </button>
                    <button
                        onClick={() => onMove(index, 'down')}
                        disabled={index === totalFields - 1}
                        className="text-gray-500 hover:text-white disabled:opacity-30"
                    >
                        ▼
                    </button>
                </div>
                <TypeIcon className="w-5 h-5 text-primary-500" />
                <input
                    type="text"
                    value={field.label}
                    onChange={(e) => onUpdate(field.fieldId, { label: e.target.value })}
                    className="flex-1 bg-transparent border-b border-dark-500 text-white font-medium focus:border-primary-500 outline-none"
                />
                <button
                    onClick={() => onRemove(field.fieldId)}
                    className="p-2 text-red-400 hover:bg-red-400/10 rounded"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Field Settings */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => onUpdate(field.fieldId, { required: e.target.checked })}
                        className="rounded"
                    />
                    <span className="text-sm text-gray-400">Required</span>
                </label>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Marks:</span>
                    <input
                        type="number"
                        min="0"
                        value={field.marks}
                        onChange={(e) => onUpdate(field.fieldId, { marks: parseInt(e.target.value) || 0 })}
                        className="w-16 input-field text-sm py-1"
                    />
                </div>
                {canAutoScore && (
                    <label className="flex items-center gap-2 col-span-2">
                        <input
                            type="checkbox"
                            checked={field.isAutoScored}
                            onChange={(e) => onUpdate(field.fieldId, { isAutoScored: e.target.checked })}
                            className="rounded"
                        />
                        <span className="text-sm text-gray-400">Auto-score (set correct answers)</span>
                    </label>
                )}
            </div>

            {/* Placeholder for text fields */}
            {['TEXT', 'TEXTAREA', 'NUMBER', 'URL'].includes(field.type) && (
                <input
                    type="text"
                    value={field.placeholder}
                    onChange={(e) => onUpdate(field.fieldId, { placeholder: e.target.value })}
                    placeholder="Enter placeholder text..."
                    className="input-field text-sm"
                />
            )}

            {/* Options for RADIO/CHECKBOX */}
            {(field.type === 'RADIO' || field.type === 'CHECKBOX') && (
                <div className="space-y-2 mt-4">
                    <p className="text-sm text-gray-400">Options:</p>
                    {field.options.map((option, i) => (
                        <div key={i} className="flex items-center gap-2">
                            {field.isAutoScored && (
                                <input
                                    type={field.type.toLowerCase()}
                                    checked={field.correctAnswers.includes(option)}
                                    onChange={() => onToggleCorrect(field.fieldId, option)}
                                    className="rounded"
                                    title="Mark as correct"
                                />
                            )}
                            <input
                                type="text"
                                value={option}
                                onChange={(e) => onUpdateOption(field.fieldId, i, e.target.value)}
                                className="flex-1 input-field text-sm"
                            />
                            <button
                                onClick={() => onRemoveOption(field.fieldId, i)}
                                className="text-red-400 hover:text-red-300"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => onAddOption(field.fieldId)}
                        className="text-primary-500 hover:text-primary-400 text-sm"
                    >
                        + Add Option
                    </button>
                    {field.isAutoScored && (
                        <p className="text-xs text-green-400 mt-2">
                            ✓ Correct: {field.correctAnswers.join(', ') || 'None selected'}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default FormBuilder;
