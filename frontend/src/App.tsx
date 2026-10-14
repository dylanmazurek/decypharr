import React from 'react';
import { useRouter } from './context/RouterContext';
import { getMeta } from './services/api';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { DownloadPage } from './pages/DownloadPage';
import { BrowsePage } from './pages/BrowsePage';
import { RepairPage } from './pages/RepairPage';
import { StatsPage } from './pages/StatsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { SetupPage } from './pages/SetupPage';

export const App: React.FC = () => {
  const { currentPath } = useRouter();
  const meta = getMeta();

  // If setup is required and not already on setup page, route to setup
  if (meta.setupRequired && currentPath !== '/setup') {
    return <SetupPage />;
  }

  // Standalone pages (no sidebar / header layout)
  if (currentPath === '/login') {
    return <LoginPage />;
  }
  if (currentPath === '/register') {
    return <RegisterPage />;
  }
  if (currentPath === '/setup') {
    return <SetupPage />;
  }

  // App pages wrapped in responsive layout
  let content: React.ReactNode;
  if (currentPath.startsWith('/download')) {
    content = <DownloadPage />;
  } else if (currentPath.startsWith('/browse')) {
    content = <BrowsePage />;
  } else if (currentPath.startsWith('/repair')) {
    content = <RepairPage />;
  } else if (currentPath.startsWith('/stats')) {
    content = <StatsPage />;
  } else if (currentPath.startsWith('/config') || currentPath.startsWith('/settings')) {
    content = <SettingsPage />;
  } else {
    content = <DashboardPage />;
  }

  return <Layout>{content}</Layout>;
};
