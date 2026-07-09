import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuthStore';
import { ShieldCheck, ArrowRight, ShieldAlert } from 'lucide-react';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register(username, email, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create user. Credentials may already be taken.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0d10] px-4 font-sans antialiased text-[#e2e8f0]">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-[420px] border border-panel-border bg-panel-bg p-8 rounded-xl shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 mb-3">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold font-mono tracking-tight text-white">Create SDE Account</h2>
          <p className="text-xs text-panel-text mt-1.5 font-mono">Enroll new credentials for CodeLens X</p>
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-red-950/20 border border-red-900/30 text-red-400 p-3 rounded-lg text-sm mb-5 font-mono">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 p-4 rounded-lg text-sm mb-5 font-mono text-center">
            Credentials enrolled successfully! Redirecting to login session...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-medium text-panel-text uppercase mb-1.5">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. sde_intern"
              className="w-full bg-[#141820] border border-panel-border focus:border-brand-500 focus:outline-none px-4 py-2.5 rounded-lg text-sm transition-colors text-white placeholder-panel-text/50 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-panel-text uppercase mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. dev@codelensx.com"
              className="w-full bg-[#141820] border border-panel-border focus:border-brand-500 focus:outline-none px-4 py-2.5 rounded-lg text-sm transition-colors text-white placeholder-panel-text/50 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-panel-text uppercase mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#141820] border border-panel-border focus:border-brand-500 focus:outline-none px-4 py-2.5 rounded-lg text-sm transition-colors text-white placeholder-panel-text/50 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-mono font-medium py-3 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition-all mt-6 cursor-pointer shadow-lg shadow-brand-600/20 disabled:opacity-50"
          >
            {loading ? 'Creating credentials...' : 'Register Credentials'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="text-center mt-6 text-xs text-panel-text font-mono">
          Already registered?{' '}
          <Link to="/login" className="text-brand-400 hover:underline">
            Initialize session
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
