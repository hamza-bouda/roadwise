import React, { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  Sun,
  Moon,
  LayoutDashboard,
  AlertTriangle,
  Map as MapIcon,
  Calendar,
  Group as GroupIcon,
  Menu,
  X,
  User2Icon,
  LogOut,
  AlertCircle,
  CalendarArrowUpIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Layout = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  const navItems = [
    { title: 'Tableau de bord', path: '/', icon: LayoutDashboard },
    { title: 'Signalements', path: '/reports', icon: AlertTriangle },
    { title: 'Carte', path: '/map', icon: MapIcon },
    { title: 'Maintenance', path: '/maintenances', icon: Calendar },
     { title: 'Maintenance en attente', path: '/pendingmaintenances', icon: CalendarArrowUpIcon },
    { title: 'Teams', path: '/teams', icon: GroupIcon },
    { title: 'Profile', path: '/profile', icon: User2Icon },
   
  ];

  const handleLogoutClick = () => setShowLogoutConfirm(true);
  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };
  const handleCancelLogout = () => setShowLogoutConfirm(false);

  return (
    <div className={`min-h-screen w-full flex ${theme}`}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-20 bg-background border-r border-muted flex flex-col justify-between transition-width duration-500 ease-in-out ${
          isSidebarOpen ? 'w-64' : 'w-16'
        }`}
        style={{ transitionProperty: 'width' }}
      >
        <div>
          <div className="h-16 flex items-center justify-between px-4 border-b border-muted relative">
            <h1
              className={`text-xl font-bold whitespace-nowrap transition-opacity duration-400 ease-in-out transform origin-left ${
                isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
              }`}
              style={{ transitionProperty: 'opacity, transform', minWidth: 0 }}
            >
              RoadWise Manager
            </h1>

            <button
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
              className="ml-2 flex-shrink-0"
              style={{ position: 'relative', zIndex: 10 }}
            >
              {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          <nav className="flex flex-col gap-2 p-2">
            {navItems.map(({ title, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm font-medium
                   ${
                     isActive
                       ? 'bg-accent text-accent-foreground'
                       : 'text-foreground hover:bg-muted'
                   }`
                }
                style={{ userSelect: 'none' }}
              >
                <div
                  className="flex items-center justify-center shrink-0 rounded-md"
                  style={{
                    width: isSidebarOpen ? 36 : 24,
                    height: isSidebarOpen ? 36 : 24,
                    padding: isSidebarOpen ? 6 : 4,
                  }}
                >
                  <Icon className="w-full h-full" style={{ display: 'block' }} strokeWidth={2} />
                </div>
                <span
                  className={`whitespace-nowrap transition-opacity duration-400 ease-in-out transform origin-left ${
                    isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
                  }`}
                  style={{ transitionProperty: 'opacity, transform' }}
                >
                  {title}
                </span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Logout button at bottom - now matching other nav items */}
        <div className="p-2 border-t border-muted">
          <button
            onClick={handleLogoutClick}
            className="flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Logout"
          >
            <div
              className="flex items-center justify-center shrink-0 rounded-md"
              style={{
                width: isSidebarOpen ? 36 : 24,
                height: isSidebarOpen ? 36 : 24,
                padding: isSidebarOpen ? 6 : 4,
              }}
            >
              <LogOut className="w-full h-full" style={{ display: 'block' }} strokeWidth={2} />
            </div>
            <span
              className={`whitespace-nowrap transition-opacity duration-400 ease-in-out transform origin-left ${
                isSidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
              }`}
              style={{ transitionProperty: 'opacity, transform' }}
            >
              Déconnexion
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col transition-margin duration-500 ease-in-out ${
          isSidebarOpen ? 'ml-64' : 'ml-16'
        }`}
        style={{ transitionProperty: 'margin' }}
      >
        <header className="h-16 sticky top-0 z-10 bg-background border-b border-muted px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={toggleSidebar} aria-label="Toggle sidebar" className="md:hidden">
              <Menu className="h-6 w-6" />
            </button>
            {!isSidebarOpen && <h1 className="text-xl font-bold">RoadWise Manager</h1>}
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} aria-label="Toggle theme">
              {theme === 'light' ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Improved logout confirmation modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4">
          <div className="bg-background border border-border rounded-lg shadow-2xl max-w-md w-full p-6 space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Confirmer la déconnexion</h3>
                <p className="text-sm text-muted-foreground">Cette action vous déconnectera de votre session.</p>
              </div>
            </div>
            
            <p className="text-foreground">
              Êtes-vous sûr de vouloir vous déconnecter ? Vous devrez vous reconnecter pour accéder à votre compte.
            </p>
            
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleCancelLogout}
                className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmLogout}
                className="px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive hover:bg-destructive/90 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;