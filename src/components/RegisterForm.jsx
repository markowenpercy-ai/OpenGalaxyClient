import { useState } from 'react';
import { register as registerApi } from '../services/api';

export default function RegisterForm({ onSwitch, onSuccess }) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const data = await registerApi(email, username, password, 'captcha');
      if (data.success) {
        onSuccess();
      } else {
        setError(data.error || 'Registration failed');
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
        Create Account
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            placeholder="Enter your email"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input-field"
            placeholder="Choose a username"
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
            placeholder="Create a password"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input-field"
            placeholder="Confirm your password"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="mt-6 text-center text-gray-400">
        Already have an account?{' '}
        <button
          onClick={onSwitch}
          className="text-space-accent hover:text-space-accent-dim transition-colors"
        >
          Sign in
        </button>
      </p>
    </div>
  );
}
