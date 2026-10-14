import React, { useState } from 'react';
import { api, apiUrl } from '../services/api';
import { useRouter } from '../context/RouterContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Lock, User, UserPlus } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { navigate } = useRouter();
  const { addToast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      addToast('Please fill in all fields', 'warning');
      return;
    }

    if (password !== confirmPassword) {
      addToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      formData.append('confirmPassword', confirmPassword);

      await api.register(formData);
      addToast('Account created successfully! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = apiUrl('/login');
      }, 1000);
    } catch (err: any) {
      addToast(err.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center text-center mb-6">
            <img src="./images/logo.png" alt="Decypharr" className="w-12 h-12 mb-3 object-contain" />
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Create Account</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Register administrative user</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Username
            </label>
            <input
              type="text"
              placeholder="Username"
              className="w-full h-9 px-3 text-sm rounded-lg bg-elevated border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Password
            </label>
            <input
              type="password"
              placeholder="Password"
              className="w-full h-9 px-3 text-sm rounded-lg bg-elevated border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="Confirm Password"
              className="w-full h-9 px-3 text-sm rounded-lg bg-elevated border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full justify-center"
              disabled={loading}
            >
              <UserPlus className="w-4 h-4" />
              {loading ? 'Creating...' : 'Register'}
            </Button>
          </div>

          <div className="text-center pt-2 text-xs text-muted-foreground">
            <span>Already have an account? </span>
            <button
              type="button"
              className="text-primary hover:underline font-semibold cursor-pointer"
              onClick={() => navigate('/login')}
            >
              Sign In
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};
