import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import contestService from '../../services/contestService';
import ContestCard from '../../components/contest/ContestCard';
import Loader from '../../components/common/Loader';
import api from '../../services/authService';
import { User, Trophy, Target, Calendar, Edit, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

const UserDashboard = () => {
  const { user, updateUser } = useAuth();
  const [myContests, setMyContests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit profile state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    college: '',
    phone: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMyContests();
  }, []);

  useEffect(() => {
    if (user) {
      setEditForm({
        name: user.name || '',
        college: user.college || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  const fetchMyContests = async () => {
    try {
      const data = await contestService.getMyContests();
      setMyContests(data.contests);
    } catch (error) {
      toast.error('Failed to fetch contests');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = async (e) => {
    e.preventDefault();

    if (!editForm.name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      setSaving(true);
      const response = await api.put('/auth/profile', editForm);

      if (response.data.success) {
        // Update user in context and localStorage
        updateUser({
          ...user,
          name: response.data.user.name,
          college: response.data.user.college,
          phone: response.data.user.phone
        });
        toast.success('Profile updated successfully!');
        setShowEditModal(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Loader fullScreen />;
  }

  return (
    <div className="min-h-screen bg-dark-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="card mb-8">
          <div className="flex items-center gap-6">
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-6 rounded-2xl">
              <User className="w-12 h-12 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-1">{user?.name}</h1>
              <p className="text-gray-400">{user?.email}</p>
              {user?.college && (
                <p className="text-gray-500 text-sm mt-1">{user.college}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors border border-primary-500/30"
              >
                <Edit className="w-4 h-4" />
                Edit Profile
              </button>
              <div className="text-right">
                <div className="text-sm text-gray-400 mb-1">Role</div>
                <span className="badge-primary text-lg">{user?.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="bg-primary-500/10 p-4 rounded-xl">
                <Calendar className="w-8 h-8 text-primary-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{myContests.length}</div>
                <div className="text-gray-400 text-sm">Contests Joined</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="bg-primary-500/10 p-4 rounded-xl">
                <Target className="w-8 h-8 text-primary-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{user?.totalScore || 0}</div>
                <div className="text-gray-400 text-sm">Total Score</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center gap-4">
              <div className="bg-primary-500/10 p-4 rounded-xl">
                <Trophy className="w-8 h-8 text-primary-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{user?.rank || 'N/A'}</div>
                <div className="text-gray-400 text-sm">Global Rank</div>
              </div>
            </div>
          </div>
        </div>

        {/* My Contests */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">My Contests</h2>
          {myContests.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-gray-400 mb-4">You haven't joined any contests yet.</p>
              <a
                href="/contests"
                className="btn-primary inline-block"
              >
                Browse Contests
              </a>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myContests.map(contest => (
                <ContestCard key={contest._id} contest={contest} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-xl w-full max-w-md border border-dark-700">
            <div className="flex items-center justify-between p-6 border-b border-dark-700">
              <h3 className="text-xl font-bold text-white">Edit Profile</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditProfile} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                  placeholder="Your name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  College
                </label>
                <input
                  type="text"
                  value={editForm.college}
                  onChange={(e) => setEditForm({ ...editForm, college: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                  placeholder="Your college/university"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                  placeholder="Your phone number"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-3 bg-dark-700 text-gray-300 rounded-lg hover:bg-dark-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
