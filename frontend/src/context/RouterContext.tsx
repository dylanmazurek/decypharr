import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMeta } from '../services/api';

interface RouterContextType {
  currentPath: string;
  navigate: (path: string, replace?: boolean) => void;
  urlBase: string;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const meta = getMeta();
  const urlBase = meta.urlBase;

  // Extract relative path from window.location.pathname
  const getRelativePath = useCallback(() => {
    let p = window.location.pathname;
    if (urlBase && p.startsWith(urlBase)) {
      p = p.substring(urlBase.length);
    }
    if (!p.startsWith('/')) p = `/${p}`;
    return p;
  }, [urlBase]);

  const [currentPath, setCurrentPath] = useState<string>(getRelativePath);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(getRelativePath());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getRelativePath]);

  const navigate = useCallback((to: string, replace = false) => {
    const fullPath = urlBase ? `${urlBase}${to.startsWith('/') ? to : `/${to}`}` : to;
    if (replace) {
      window.history.replaceState({}, '', fullPath);
    } else {
      window.history.pushState({}, '', fullPath);
    }
    setCurrentPath(to.startsWith('/') ? to : `/${to}`);
  }, [urlBase]);

  return (
    <RouterContext.Provider value={{ currentPath, navigate, urlBase }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = () => {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
};
