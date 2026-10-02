import React, { useState, useEffect } from 'react';
import { useRouter } from '../context/RouterContext';
import { getMeta, api } from '../services/api';

const THEMES = [
  'dark',
  'light',
  'synthwave',
  'cyberpunk',
  'dracula',
  'night',
  'dim',
  'sunset',
  'nord',
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentPath, navigate } = useRouter();
  const meta = getMeta();
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('decypharr-theme') || 'dark';
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('decypharr-theme', currentTheme);
  }, [currentTheme]);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: 'bi-speedometer2' },
    { label: 'Download', path: '/download', icon: 'bi-cloud-download' },
    { label: 'Browse', path: '/browse', icon: 'bi-folder2-open' },
    { label: 'Repair', path: '/repair', icon: 'bi-tools' },
    { label: 'Stats', path: '/stats', icon: 'bi-graph-up' },
    { label: 'Settings', path: '/config', icon: 'bi-gear' },
  ];

  const handleLogout = async () => {
    await api.logout();
  };

  return (
    <div className="drawer lg:drawer-open min-h-screen bg-base-200 text-base-content">
      <input
        id="main-drawer"
        type="checkbox"
        className="drawer-toggle"
        checked={drawerOpen}
        onChange={(e) => setDrawerOpen(e.target.checked)}
      />

      <div className="drawer-content flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="navbar bg-base-100 border-b border-base-300 px-4 sticky top-0 z-30 shadow-xs">
          <div className="flex-none lg:hidden">
            <label htmlFor="main-drawer" className="btn btn-square btn-ghost">
              <i className="bi bi-list text-2xl"></i>
            </label>
          </div>

          <div className="flex-1 flex items-center gap-2">
            <img src="./images/logo.png" alt="Decypharr" className="w-8 h-8 rounded-sm object-contain" />
            <span className="font-bold text-lg tracking-wide hidden sm:inline">Decypharr</span>
            <span className="badge badge-sm badge-neutral">{meta.version}</span>
          </div>

          <div className="flex-none flex items-center gap-2">
            {/* Theme selector */}
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-sm">
                <i className="bi bi-palette text-base mr-1"></i>
                <span className="capitalize hidden md:inline">{currentTheme}</span>
              </div>
              <ul
                tabIndex={0}
                className="dropdown-content menu p-2 shadow-sm bg-base-100 rounded-box w-40 z-50 border border-base-300 max-h-80 overflow-y-auto"
              >
                {THEMES.map((theme) => (
                  <li key={theme}>
                    <button
                      className={theme === currentTheme ? 'active' : ''}
                      onClick={() => setCurrentTheme(theme)}
                    >
                      {theme}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* User profile / Logout */}
            {meta.authEnabled && (
              <div className="dropdown dropdown-end">
                <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar placeholder">
                  <div className="bg-primary text-primary-content rounded-full w-8">
                    <span className="text-xs uppercase">
                      {meta.user ? meta.user.substring(0, 2) : <i className="bi bi-person"></i>}
                    </span>
                  </div>
                </div>
                <ul
                  tabIndex={0}
                  className="dropdown-content menu p-2 shadow-sm bg-base-100 rounded-box w-48 z-50 border border-base-300"
                >
                  {meta.user && (
                    <li className="menu-title px-4 py-2 border-b border-base-300">
                      <span className="font-semibold">{meta.user}</span>
                    </li>
                  )}
                  <li>
                    <button onClick={() => navigate('/config')}>
                      <i className="bi bi-gear mr-2"></i>Settings
                    </button>
                  </li>
                  <li>
                    <button onClick={handleLogout} className="text-error">
                      <i className="bi bi-box-arrow-right mr-2"></i>Logout
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Sidebar Drawer */}
      <div className="drawer-side z-40">
        <label htmlFor="main-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
        <aside className="bg-base-100 w-64 min-h-full border-r border-base-300 flex flex-col justify-between">
          <div>
            <div className="p-4 flex items-center gap-3 border-b border-base-300">
              <img src="./images/logo.png" alt="Decypharr" className="w-9 h-9 object-contain" />
              <div>
                <h1 className="font-extrabold text-lg leading-tight">Decypharr</h1>
                <p className="text-xs opacity-60">Media Manager</p>
              </div>
            </div>

            <ul className="menu p-4 gap-1 text-base">
              {navItems.map((item) => {
                const isActive =
                  item.path === '/'
                    ? currentPath === '/'
                    : currentPath.startsWith(item.path);
                return (
                  <li key={item.path}>
                    <button
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                        isActive
                          ? 'active bg-primary text-primary-content'
                          : 'hover:bg-base-200'
                      }`}
                      onClick={() => {
                        navigate(item.path);
                        setDrawerOpen(false);
                      }}
                    >
                      <i className={`bi ${item.icon} text-lg`}></i>
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="p-4 border-t border-base-300 text-xs text-center opacity-60">
            Decypharr {meta.version}
          </div>
        </aside>
      </div>
    </div>
  );
};
