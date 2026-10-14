import React, { useState } from 'react';
import { useRouter } from '../context/RouterContext';
import { api, getMeta } from '../services/api';
import {
  LayoutDashboard,
  CloudDownload,
  FolderOpen,
  Wrench,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  Shield,
} from 'lucide-react';
import { cn } from '../lib/utils';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentPath, navigate } = useRouter();
  const meta = getMeta();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Download', path: '/download', icon: CloudDownload },
    { label: 'Browse', path: '/browse', icon: FolderOpen },
    { label: 'Repair', path: '/repair', icon: Wrench },
    { label: 'Stats', path: '/stats', icon: BarChart3 },
    { label: 'Settings', path: '/config', icon: Settings },
  ];

  const handleLogout = async () => {
    await api.logout();
  };

  const renderNavLinks = (onItemClick?: () => void) => (
    <nav className="space-y-1 px-3 py-2">
      {navItems.map((item) => {
        const isActive =
          item.path === '/'
            ? currentPath === '/'
            : currentPath.startsWith(item.path);
        const Icon = item.icon;
        return (
          <button
            key={item.path}
            type="button"
            onClick={() => {
              navigate(item.path);
              if (onItemClick) onItemClick();
            }}
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left cursor-pointer select-none',
              isActive
                ? 'bg-raised text-foreground font-semibold shadow-selected-y'
                : 'text-muted-foreground hover:text-foreground hover:bg-elevated'
            )}
          >
            <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row antialiased font-sans">
      {/* Desktop Fixed Left Rail (240px) */}
      <aside className="w-60 shrink-0 h-screen sticky top-0 hidden md:flex flex-col bg-card/85 backdrop-blur-md border-r border-border select-none z-30">
        {/* Brand Lockup */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="./images/logo.png"
              alt="Decypharr"
              className="w-7 h-7 rounded-md object-contain shrink-0"
              onError={(e) => {
                // Fallback icon if logo image not found
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="min-w-0">
              <span className="font-semibold text-base tracking-tight text-foreground block truncate">
                Decypharr
              </span>
              <span className="text-[11px] font-medium text-muted-foreground block truncate">
                Media Manager
              </span>
            </div>
          </div>
          {meta.version && (
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-md bg-elevated border border-border text-muted-foreground shrink-0">
              {meta.version}
            </span>
          )}
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto py-3">
          {renderNavLinks()}
        </div>

        {/* Footer info & User Auth */}
        <div className="p-3 border-t border-border mt-auto space-y-2">
          {meta.authEnabled && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-full flex items-center justify-between p-2 rounded-lg bg-elevated hover:bg-raised border border-border text-xs transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-primary/20 text-accent-foreground font-semibold flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="font-medium text-foreground truncate">
                    {meta.user || 'Authenticated'}
                  </span>
                </div>
                <Shield className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute bottom-full left-0 right-0 mb-1 z-50 rounded-lg bg-elevated border border-border shadow-lg p-1 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate('/config');
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-raised transition-colors cursor-pointer text-left"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Settings
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-destructive-text hover:bg-destructive/10 transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="text-[11px] text-center text-muted-foreground font-mono flex items-center justify-center gap-1.5 pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success inline-block"></span>
            Decypharr v{meta.version || '1.1.5'}
          </div>
        </div>
      </aside>

      {/* Mobile Top Navbar */}
      <header className="md:hidden sticky top-0 z-30 h-14 bg-card/90 backdrop-blur-md border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-elevated"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <img src="./images/logo.png" alt="Decypharr" className="w-6 h-6 rounded-sm object-contain" />
          <span className="font-semibold text-sm tracking-tight text-foreground">Decypharr</span>
        </div>
        <div className="flex items-center gap-2">
          {meta.version && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-elevated border border-border text-muted-foreground">
              {meta.version}
            </span>
          )}
          {meta.authEnabled && (
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 text-muted-foreground hover:text-destructive-text"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <aside className="relative w-64 max-w-[80vw] h-full bg-card border-r border-border flex flex-col z-50 shadow-2xl">
            <div className="h-14 flex items-center justify-between px-4 border-b border-border">
              <div className="flex items-center gap-2">
                <img src="./images/logo.png" alt="Decypharr" className="w-6 h-6 rounded-sm object-contain" />
                <span className="font-semibold text-sm">Decypharr</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-elevated"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-3">
              {renderNavLinks(() => setMobileDrawerOpen(false))}
            </div>
            <div className="p-4 border-t border-border text-xs text-muted-foreground font-mono text-center">
              Decypharr v{meta.version || '1.1.5'}
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-x-hidden max-w-[1800px] w-full mx-auto">
        {children}
      </main>
    </div>
  );
};
