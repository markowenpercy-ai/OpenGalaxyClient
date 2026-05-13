import { useState } from 'react';
import { login as loginApi } from '../services/api';

export default function LoginForm({ onSwitch, onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await loginApi(username, password);
      if (data.success && data.token) {
        sessionStorage.setItem('token', data.token);
        onSuccess(data);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <h2 className="text-3xl font-bold text-center mb-8 glow-text text-space-accent">
        Welcome Back
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Email or Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input-field"
            placeholder="Enter your email or username"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
            placeholder="Enter your password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <p className="mt-6 text-center text-gray-400">
        Don't have an account?{' '}
        <button
          onClick={onSwitch}
          className="text-space-accent hover:text-space-accent-dim transition-colors"
        >
          Create one
        </button>
      </p>
    </div>
  );
}
