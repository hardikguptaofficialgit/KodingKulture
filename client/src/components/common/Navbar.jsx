import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Code2, Trophy, LogOut, User, LayoutDashboard, Menu, X, DoorOpen } from 'lucide-react';
import { useState } from 'react';

const Navbar = () => {
  const { user, isAuthenticated, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-dark-900 border-b border-dark-800 sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-2 rounded-lg group-hover:scale-110 transition-transform duration-200">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">
              <span className="text-primary-500">FAKT</span>
              <span className="text-white"> CHECK</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/contests" className="text-gray-300 hover:text-primary-500 transition-colors duration-200 font-medium">
              Contests
            </Link>
            <Link to="/leaderboard" className="text-gray-300 hover:text-primary-500 transition-colors duration-200 font-medium flex items-center gap-1">
              <Trophy className="w-4 h-4" />
              Leaderboard
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <Link to="/rooms" className="text-gray-300 hover:text-primary-500 transition-colors duration-200 flex items-center gap-1">
                  <DoorOpen className="w-4 h-4" />
                  Rooms
                </Link>
                {(isAdmin || user?.role === 'ORGANISER') && (
                  <Link to="/admin/dashboard" className="btn-outline py-2 px-4 flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    {isAdmin ? 'Admin' : 'Organiser'}
                  </Link>
                )}
                <Link to="/dashboard" className="text-gray-300 hover:text-primary-500 transition-colors duration-200 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {user?.name}
                </Link>
                <button onClick={handleLogout} className="btn-secondary py-2 px-4 flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/login" className="btn-secondary py-2 px-4">
                  Login
                </Link>
                <Link to="/register" className="btn-primary py-2 px-4">
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-gray-300 hover:text-primary-500"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-3 border-t border-dark-800">
            <Link to="/contests" className="block text-gray-300 hover:text-primary-500 py-2">
              Contests
            </Link>
            <Link to="/leaderboard" className="block text-gray-300 hover:text-primary-500 py-2">
              Leaderboard
            </Link>
            {isAuthenticated ? (
              <>
                {(isAdmin || user?.role === 'ORGANISER') && (
                  <Link to="/admin/dashboard" className="block text-gray-300 hover:text-primary-500 py-2">
                    {isAdmin ? 'Admin Dashboard' : 'Organiser Dashboard'}
                  </Link>
                )}
                <Link to="/rooms" className="block text-gray-300 hover:text-primary-500 py-2">
                  My Rooms
                </Link>
                <Link to="/dashboard" className="block text-gray-300 hover:text-primary-500 py-2">
                  My Dashboard
                </Link>
                <button onClick={handleLogout} className="w-full btn-secondary py-2">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="block w-full btn-secondary py-2 text-center">
                  Login
                </Link>
                <Link to="/register" className="block w-full btn-primary py-2 text-center">
                  Register
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
