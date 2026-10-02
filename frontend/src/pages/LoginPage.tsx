import React, { useState } from 'react';
import { api, apiUrl } from '../services/api';
import { useRouter } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';

export const LoginPage: React.FC = () => {
  const { navigate } = useRouter();
  const { addToast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      addToast('Please enter both username and password', 'warning');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      await api.login(formData);
      // Hard redirect to root to refresh cookie & meta
      window.location.href = apiUrl('/');
    } catch (err: any) {
      addToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl border border-base-300">
        <form onSubmit={handleSubmit} className="card-body">
          <div className="flex flex-col items-center mb-4">
            <img src="./images/logo.png" alt="Decypharr" className="w-14 h-14 mb-2 object-contain" />
            <h2 className="card-title text-xl font-bold">Sign In</h2>
            <p className="text-xs text-base-content/60">Decypharr Media Management</p>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium text-xs">Username</span>
            </label>
            <input
              type="text"
              name="username"
              placeholder="Username"
              className="input input-bordered input-sm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-control mt-2">
            <label className="label">
              <span className="label-text font-medium text-xs">Password</span>
            </label>
            <input
              type="password"
              name="password"
              placeholder="Password"
              className="input input-bordered input-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-control mt-6">
            <button
              type="submit"
              className="btn btn-primary btn-sm w-full"
              disabled={loading}
            >
              {loading ? <span className="loading loading-spinner loading-xs"></span> : 'Login'}
            </button>
          </div>

          <div className="text-center mt-3 text-xs">
            <span className="text-base-content/60">Need an account? </span>
            <button
              type="button"
              className="link link-primary font-medium"
              onClick={() => navigate('/register')}
            >
              Register
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
