import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { Bell, Gavel, Heart, LayoutDashboard, TrendingUp, User, Shield, LogOut, LogIn, Plus, Video } from 'lucide-react';
import { NotificationTray } from './NotificationTray';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navItems = [
    { path: '/', label: 'Auctions', icon: Gavel },
    { path: '/watchlist', label: 'Watchlist', icon: Heart },
    { path: '/buyer-dashboard', label: 'My Bids', icon: LayoutDashboard },
    { path: '/seller-dashboard', label: 'Selling', icon: TrendingUp },
    ...(user?.role === 'admin' ? [{ path: '/admin', label: 'Admin', icon: Shield }] : []),
  ];

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-slate-900/50 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur-sm group-hover:blur-md transition-all" />
                <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 p-2 rounded-lg">
                  <Gavel className="w-6 h-6" />
                </div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  AURA
                </h1>
                <p className="text-xs text-gray-400 -mt-1">Auction</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  {/* Create Auction Button */}
                  <Link
                    to="/create-auction"
                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-medium text-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Auction
                  </Link>

                  <Link
                    to="/create-auction"
                    state={{ liveMode: true }}
                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 rounded-lg font-medium text-sm transition-colors"
                  >
                    <Video className="w-4 h-4" />
                    Go Live
                  </Link>

                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 rounded-lg hover:bg-white/10 transition-all group"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
                  </button>

                  {/* User Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-all"
                      aria-label="User profile"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                        {user?.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-sm font-medium">
                            {user?.name?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="hidden sm:block text-sm">{user?.name?.split(' ')[0]}</span>
                    </button>

                    {/* Dropdown Menu */}
                    {showUserMenu && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-slate-800 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                        <div className="p-4 border-b border-white/10">
                          <p className="font-medium">{user?.name}</p>
                          <p className="text-sm text-gray-400">{user?.email}</p>
                          <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs ${
                            user?.role === 'admin'
                              ? 'bg-purple-500/20 text-purple-400'
                              : user?.role === 'seller'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {user?.role?.charAt(0).toUpperCase()}{user?.role?.slice(1)}
                          </span>
                        </div>
                        <div className="p-2">
                          <Link
                            to="/buyer-dashboard"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
                          >
                            <User className="w-4 h-4" />
                            My Profile
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/login"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-medium transition-colors"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Click outside to close menus */}
      {(showNotifications || showUserMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowNotifications(false);
            setShowUserMenu(false);
          }}
        />
      )}

      {/* Notification Tray */}
      {showNotifications && (
        <NotificationTray onClose={() => setShowNotifications(false)} />
      )}

      {/* Main Content */}
      <main className="relative">
        <Outlet />
      </main>

      {/* Mobile Floating Action Button - Create Auction */}
      {isAuthenticated && (
        <Link
          to="/create-auction"
          className="md:hidden fixed bottom-20 right-4 z-50 w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/30"
        >
          <Plus className="w-6 h-6" />
        </Link>
      )}

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 z-40">
        <div className="flex items-center justify-around py-2">
          {navItems.slice(0, 4).map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                  isActive ? 'text-purple-400' : 'text-gray-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
          {isAuthenticated ? (
            <Link
              to="/buyer-dashboard"
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                location.pathname.includes('dashboard') ? 'text-purple-400' : 'text-gray-400'
              }`}
            >
              <User className="w-5 h-5" />
              <span className="text-xs">Profile</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all text-gray-400"
            >
              <LogIn className="w-5 h-5" />
              <span className="text-xs">Sign in</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
