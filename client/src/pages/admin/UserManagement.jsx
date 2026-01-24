import { useState, useEffect } from 'react';
import { Search, Users, Shield, UserCheck, UserX, ChevronLeft, ChevronRight, DoorOpen, X } from 'lucide-react';
import api from '../../services/authService';
import toast from 'react-hot-toast';
import './UserManagement.css';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

    // Add to room states
    const [rooms, setRooms] = useState([]);
    const [loadingRooms, setLoadingRooms] = useState(false);
    const [showRoomModal, setShowRoomModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const [selectedRoomRole, setSelectedRoomRole] = useState('PARTICIPANT');
    const [addingToRoom, setAddingToRoom] = useState(false);

    const fetchUsers = async (page = 1) => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ page, limit: 20 });
            if (search) params.append('search', search);
            if (roleFilter) params.append('role', roleFilter);

            const response = await api.get(`/admin/users?${params}`);
            setUsers(response.data.users);
            setPagination(response.data.pagination);
        } catch (error) {
            toast.error('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    const fetchRooms = async () => {
        try {
            setLoadingRooms(true);
            const { data } = await api.get('/rooms');
            setRooms(data.rooms);
        } catch (error) {
            console.error('Failed to fetch rooms:', error);
        } finally {
            setLoadingRooms(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchRooms();
    }, [roleFilter]);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchUsers(1);
    };

    const updateRole = async (userId, newRole) => {
        try {
            await api.put(`/admin/users/${userId}/role`, { role: newRole });
            toast.success(`Role updated to ${newRole}`);
            fetchUsers(pagination.page);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update role');
        }
    };

    const openAddToRoomModal = (user) => {
        setSelectedUser(user);
        setSelectedRoomId('');
        setSelectedRoomRole('PARTICIPANT');
        setShowRoomModal(true);
    };

    const handleAddToRoom = async () => {
        if (!selectedRoomId || !selectedUser) {
            toast.error('Please select a room');
            return;
        }

        try {
            setAddingToRoom(true);
            await api.post(`/rooms/${selectedRoomId}/members`, {
                email: selectedUser.email,
                role: selectedRoomRole
            });
            toast.success(`${selectedUser.name} added to room as ${selectedRoomRole === 'ORGANISER' ? 'Co-Organiser' : 'Participant'}`);
            setShowRoomModal(false);
            setSelectedUser(null);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add user to room');
        } finally {
            setAddingToRoom(false);
        }
    };

    const getRoleBadge = (role) => {
        const styles = {
            ADMIN: 'role-badge admin',
            ORGANISER: 'role-badge organiser',
            USER: 'role-badge user'
        };
        return <span className={styles[role]}>{role}</span>;
    };

    return (
        <div className="user-management">
            <div className="page-header">
                <h1><Users size={28} /> User Management</h1>
                <p>Manage platform users and assign roles</p>
            </div>

            <div className="filters-bar">
                <form onSubmit={handleSearch} className="search-form">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button type="submit">Search</button>
                </form>

                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="role-filter"
                >
                    <option value="">All Roles</option>
                    <option value="USER">Users</option>
                    <option value="ORGANISER">Organisers</option>
                    <option value="ADMIN">Admins</option>
                </select>
            </div>

            <div className="users-table-container">
                {loading ? (
                    <div className="loading">Loading users...</div>
                ) : (
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>College</th>
                                <th>Role</th>
                                <th>Verified</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user._id}>
                                    <td>{user.name}</td>
                                    <td>{user.email}</td>
                                    <td>{user.college || '-'}</td>
                                    <td>{getRoleBadge(user.role)}</td>
                                    <td>
                                        {user.isVerified ? (
                                            <UserCheck size={18} className="verified" />
                                        ) : (
                                            <UserX size={18} className="not-verified" />
                                        )}
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            {user.role !== 'ADMIN' && (
                                                <>
                                                    {user.role === 'USER' && (
                                                        <button
                                                            className="make-organiser-btn"
                                                            onClick={() => updateRole(user._id, 'ORGANISER')}
                                                        >
                                                            <Shield size={16} /> Make Organiser
                                                        </button>
                                                    )}
                                                    {user.role === 'ORGANISER' && (
                                                        <button
                                                            className="remove-organiser-btn"
                                                            onClick={() => updateRole(user._id, 'USER')}
                                                        >
                                                            Remove Organiser
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                            <button
                                                className="add-to-room-btn"
                                                onClick={() => openAddToRoomModal(user)}
                                                title="Add to Room"
                                            >
                                                <DoorOpen size={16} /> Add to Room
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="pagination">
                <button
                    disabled={pagination.page === 1}
                    onClick={() => fetchUsers(pagination.page - 1)}
                >
                    <ChevronLeft size={18} />
                </button>
                <span>Page {pagination.page} of {pagination.pages}</span>
                <button
                    disabled={pagination.page === pagination.pages}
                    onClick={() => fetchUsers(pagination.page + 1)}
                >
                    <ChevronRight size={18} />
                </button>
            </div>

            {/* Add to Room Modal */}
            {showRoomModal && selectedUser && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Add User to Room</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowRoomModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p className="user-info">
                                Adding <strong>{selectedUser.name}</strong> ({selectedUser.email})
                            </p>

                            <div className="form-group">
                                <label>Select Room</label>
                                <select
                                    value={selectedRoomId}
                                    onChange={(e) => setSelectedRoomId(e.target.value)}
                                    className="room-select"
                                >
                                    <option value="">-- Select a Room --</option>
                                    {rooms.map((room) => (
                                        <option key={room._id} value={room._id}>
                                            {room.name} ({room.shortCode})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Role in Room</label>
                                <select
                                    value={selectedRoomRole}
                                    onChange={(e) => setSelectedRoomRole(e.target.value)}
                                    className="role-select"
                                >
                                    <option value="PARTICIPANT">Participant</option>
                                    {selectedUser.role === 'ORGANISER' && (
                                        <option value="ORGANISER">Co-Organiser</option>
                                    )}
                                </select>
                                {selectedUser.role === 'USER' && (
                                    <p className="hint-text">
                                        Only Organisers can be added as Co-Organisers
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="cancel-btn"
                                onClick={() => setShowRoomModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="confirm-btn"
                                onClick={handleAddToRoom}
                                disabled={addingToRoom || !selectedRoomId}
                            >
                                {addingToRoom ? 'Adding...' : 'Add to Room'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
