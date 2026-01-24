import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import adminService from '../../services/adminService';
import contestService from '../../services/contestService';
import api from '../../services/authService';
import toast from 'react-hot-toast';
import { Save, X, Plus, Trash2, Calendar, DoorOpen } from 'lucide-react';

const CreateContest = () => {
  const navigate = useNavigate();
  const { contestId } = useParams();
  const [searchParams] = useSearchParams();
  const { isAdmin, isAdminOrOrganiser, user } = useAuth();
  const isEditMode = Boolean(contestId);
  const preselectedRoomId = searchParams.get('roomId');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    duration: 120,
    maxParticipants: '',
    sections: {
      mcq: {
        enabled: true,
        totalMarks: 100,
        proctored: true
      },
      coding: {
        enabled: true,
        totalMarks: 300,
        proctored: true
      },
      forms: {
        enabled: false,
        totalMarks: 0,
        proctored: false
      }
    },
    rules: ['No cheating allowed', 'Complete all questions within time limit'],
    prizes: ['1st Prize: Certificate + Goodies', '2nd Prize: Certificate', '3rd Prize: Certificate'],
    isPublished: false,
    roomId: preselectedRoomId || '' // For room-specific contests
  });

  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  useEffect(() => {
    if (!isAdminOrOrganiser) {
      toast.error('Access denied');
      navigate('/');
      return;
    }

    if (isEditMode) {
      loadContest();
    }

    // Fetch rooms for the organiser
    if (user?.role === 'ORGANISER' || user?.role === 'ADMIN') {
      fetchRooms();
    }
  }, [contestId, isAdminOrOrganiser]);

  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const { data } = await api.get('/rooms');
      console.log('Fetched rooms:', data.rooms); // Debug log

      // Admin sees all rooms, Organiser sees rooms they manage
      if (user?.role === 'ADMIN') {
        setRooms(data.rooms);
      } else {
        // Filter rooms where user is owner or co-organiser (using string comparison)
        const userId = user?._id?.toString() || user?._id;
        const manageableRooms = data.rooms.filter(room => {
          const ownerId = room.owner?._id?.toString() || room.owner?._id;
          const isOwner = ownerId === userId;
          const isCoOrg = room.coOrganisers?.some(co => (co._id?.toString() || co._id) === userId);
          console.log('Room:', room.name, 'ownerId:', ownerId, 'userId:', userId, 'isOwner:', isOwner); // Debug
          return isOwner || isCoOrg;
        });
        setRooms(manageableRooms);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setLoadingRooms(false);
    }
  };

  const loadContest = async () => {
    try {
      setLoading(true);
      const data = await contestService.getContestById(contestId);
      const contest = data.contest;

      // Format dates for datetime-local input
      const formatDateTime = (date) => {
        const d = new Date(date);
        return d.toISOString().slice(0, 16);
      };

      setFormData({
        title: contest.title,
        description: contest.description,
        startTime: formatDateTime(contest.startTime),
        endTime: formatDateTime(contest.endTime),
        duration: contest.duration,
        maxParticipants: contest.maxParticipants || '',
        sections: {
          mcq: {
            enabled: contest.sections?.mcq?.enabled ?? false,
            totalMarks: contest.sections?.mcq?.totalMarks ?? 0,
            proctored: contest.sections?.mcq?.proctored ?? true
          },
          coding: {
            enabled: contest.sections?.coding?.enabled ?? false,
            totalMarks: contest.sections?.coding?.totalMarks ?? 0,
            proctored: contest.sections?.coding?.proctored ?? true
          },
          forms: {
            enabled: contest.sections?.forms?.enabled ?? false,
            totalMarks: contest.sections?.forms?.totalMarks ?? 0,
            proctored: contest.sections?.forms?.proctored ?? false
          }
        },
        rules: contest.rules,
        prizes: contest.prizes,
        isPublished: contest.isPublished
      });
      setLoading(false);
    } catch (error) {
      console.error('Error loading contest:', error);
      toast.error('Failed to load contest');
      navigate('/admin/dashboard');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name.includes('.')) {
      const [parent, child, subChild] = name.split('.');
      if (subChild) {
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: {
              ...prev[parent][child],
              [subChild]: type === 'checkbox' ? checked : value
            }
          }
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: type === 'checkbox' ? checked : value
          }
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleArrayChange = (field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAdminOrOrganiser) {
      toast.error('Access denied');
      return;
    }

    // Validation
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!formData.startTime || !formData.endTime) {
      toast.error('Start time and end time are required');
      return;
    }

    if (new Date(formData.startTime) >= new Date(formData.endTime)) {
      toast.error('End time must be after start time');
      return;
    }

    if (!formData.sections.mcq.enabled && !formData.sections.coding.enabled && !formData.sections.forms?.enabled) {
      toast.error('At least one section (MCQ, Coding, or Forms) must be enabled');
      return;
    }

    setLoading(true);

    try {
      // Convert datetime-local strings to ISO strings (browser interprets as local time)
      const startTimeDate = new Date(formData.startTime);
      const endTimeDate = new Date(formData.endTime);

      const contestData = {
        ...formData,
        startTime: startTimeDate.toISOString(),
        endTime: endTimeDate.toISOString(),
        maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : undefined,
        duration: parseInt(formData.duration),
        sections: {
          mcq: {
            enabled: formData.sections.mcq.enabled,
            totalMarks: parseInt(formData.sections.mcq.totalMarks) || 0,
            proctored: formData.sections.mcq.proctored ?? true
          },
          coding: {
            enabled: formData.sections.coding.enabled,
            totalMarks: parseInt(formData.sections.coding.totalMarks) || 0,
            proctored: formData.sections.coding.proctored ?? true
          },
          forms: {
            enabled: formData.sections.forms?.enabled || false,
            totalMarks: parseInt(formData.sections.forms?.totalMarks) || 0,
            proctored: formData.sections.forms?.proctored ?? false
          }
        },
        rules: formData.rules.filter(r => r.trim()),
        prizes: formData.prizes.filter(p => p.trim())
      };

      if (isEditMode) {
        await adminService.updateContest(contestId, contestData);
        toast.success('Contest updated successfully!');
      } else {
        await adminService.createContest(contestData);
        toast.success('Contest created successfully!');
      }

      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Error saving contest:', error);
      toast.error(error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} contest`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{isEditMode ? 'Edit Contest' : 'Create New Contest'}</h1>
            <p className="text-gray-400">{isEditMode ? 'Update contest details' : 'Fill in the details to create a new contest'}</p>
          </div>

          <button
            onClick={() => navigate('/admin/dashboard')}
            className="btn-secondary"
          >
            <X className="w-5 h-5 mr-2" />
            Cancel
          </button>
        </div>

        {loading && isEditMode ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Basic Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Contest Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="e.g., Weekly Coding Challenge #1"
                    required
                  />
                </div>

                {/* Room Selector - show for all organisers */}
                {(user?.role === 'ORGANISER' || user?.role === 'ADMIN') && !isEditMode && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <DoorOpen className="inline w-4 h-4 mr-1" />
                      Room (Optional)
                    </label>
                    {loadingRooms ? (
                      <p className="text-gray-500 text-sm">Loading rooms...</p>
                    ) : rooms.length > 0 ? (
                      <>
                        <select
                          name="roomId"
                          value={formData.roomId}
                          onChange={handleChange}
                          className="input-field"
                        >
                          <option value="">Public Contest (No Room)</option>
                          {rooms.map(room => (
                            <option key={room._id} value={room._id}>
                              {room.name} ({room.shortCode}) {user?.role === 'ADMIN' && room.owner?.name ? `- by ${room.owner.name}` : ''}
                            </option>
                          ))}
                        </select>
                        {formData.roomId && (
                          <p className="text-xs text-primary-400 mt-1">
                            This contest will be visible only to room members and auto-approved
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="bg-dark-800 border border-dark-700 rounded-lg p-3">
                        <p className="text-gray-400 text-sm mb-2">
                          No rooms available. Create a room to host private contests.
                        </p>
                        <a href="/rooms/create" className="text-primary-400 hover:text-primary-300 text-sm">
                          + Create a Room
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="4"
                    className="input-field resize-none"
                    placeholder="Describe what this contest is about..."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Start Time *
                    </label>
                    <input
                      type="datetime-local"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleChange}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      End Time *
                    </label>
                    <input
                      type="datetime-local"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleChange}
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Duration (minutes) *
                    </label>
                    <input
                      type="number"
                      name="duration"
                      value={formData.duration}
                      onChange={handleChange}
                      className="input-field"
                      min="1"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Max Participants (optional)
                    </label>
                    <input
                      type="number"
                      name="maxParticipants"
                      value={formData.maxParticipants}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="Leave empty for unlimited"
                      min="1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sections Configuration */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Contest Sections</h2>

              <div className="space-y-4">
                {/* MCQ Section */}
                <div className="p-4 bg-dark-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="sections.mcq.enabled"
                        checked={formData.sections.mcq.enabled}
                        onChange={handleChange}
                        className="w-5 h-5 rounded border-gray-600 text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-lg font-semibold">MCQ Section</span>
                    </label>
                  </div>

                  {formData.sections.mcq.enabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Total Marks
                        </label>
                        <input
                          type="number"
                          name="sections.mcq.totalMarks"
                          value={formData.sections.mcq.totalMarks}
                          onChange={handleChange}
                          className="input-field"
                          min="1"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Proctoring
                        </label>
                        <label className="flex items-center gap-2 mt-2 cursor-pointer">
                          <input
                            type="checkbox"
                            name="sections.mcq.proctored"
                            checked={formData.sections.mcq.proctored}
                            onChange={handleChange}
                            className="w-4 h-4 rounded border-gray-600 text-yellow-500 focus:ring-yellow-500"
                          />
                          <span className="text-sm text-gray-400">Enable Proctoring</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Coding Section */}
                <div className="p-4 bg-dark-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="sections.coding.enabled"
                        checked={formData.sections.coding.enabled}
                        onChange={handleChange}
                        className="w-5 h-5 rounded border-gray-600 text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-lg font-semibold">Coding Section</span>
                    </label>
                  </div>

                  {formData.sections.coding.enabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Total Marks
                        </label>
                        <input
                          type="number"
                          name="sections.coding.totalMarks"
                          value={formData.sections.coding.totalMarks}
                          onChange={handleChange}
                          className="input-field"
                          min="1"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Proctoring
                        </label>
                        <label className="flex items-center gap-2 mt-2 cursor-pointer">
                          <input
                            type="checkbox"
                            name="sections.coding.proctored"
                            checked={formData.sections.coding.proctored}
                            onChange={handleChange}
                            className="w-4 h-4 rounded border-gray-600 text-yellow-500 focus:ring-yellow-500"
                          />
                          <span className="text-sm text-gray-400">Enable Proctoring</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Forms Section */}
                <div className="p-4 bg-dark-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="sections.forms.enabled"
                        checked={formData.sections.forms?.enabled || false}
                        onChange={handleChange}
                        className="w-5 h-5 rounded border-gray-600 text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-lg font-semibold">Custom Forms Section</span>
                    </label>
                  </div>

                  {formData.sections.forms?.enabled && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-400">
                        Create assessment forms after saving the contest. Use the Form Builder to add custom fields.
                      </p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="sections.forms.proctored"
                          checked={formData.sections.forms?.proctored || false}
                          onChange={handleChange}
                          className="w-4 h-4 rounded border-gray-600 text-yellow-500 focus:ring-yellow-500"
                        />
                        <span className="text-sm text-gray-400">Enable Proctoring (disable for PPT/file submissions)</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rules */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Contest Rules</h2>
                <button
                  type="button"
                  onClick={() => addArrayItem('rules')}
                  className="btn-secondary text-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Rule
                </button>
              </div>

              <div className="space-y-3">
                {formData.rules.map((rule, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={rule}
                      onChange={(e) => handleArrayChange('rules', index, e.target.value)}
                      className="input-field flex-1"
                      placeholder={`Rule ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeArrayItem('rules', index)}
                      className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-red-400"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Prizes */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Prizes</h2>
                <button
                  type="button"
                  onClick={() => addArrayItem('prizes')}
                  className="btn-secondary text-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Prize
                </button>
              </div>

              <div className="space-y-3">
                {formData.prizes.map((prize, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={prize}
                      onChange={(e) => handleArrayChange('prizes', index, e.target.value)}
                      className="input-field flex-1"
                      placeholder={`Prize ${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeArrayItem('prizes', index)}
                      className="p-2 hover:bg-dark-600 rounded-lg transition-colors text-red-400"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Publish Option */}
            <div className="card">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isPublished"
                  checked={formData.isPublished}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-gray-600 text-primary-500 focus:ring-primary-500"
                />
                <div>
                  <p className="font-semibold">Publish Contest</p>
                  <p className="text-sm text-gray-400">Make this contest visible to users</p>
                </div>
              </label>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => navigate('/admin/dashboard')}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    {isEditMode ? 'Update Contest' : 'Create Contest'}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default CreateContest;
