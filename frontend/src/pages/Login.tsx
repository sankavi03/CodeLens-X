import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuthStore';
import { Cpu, Terminal, ArrowRight, ShieldAlert } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0d10] px-4 font-sans antialiased text-[#e2e8f0]">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-[420px] border border-panel-border bg-panel-bg p-8 rounded-xl shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400 mb-3">
            <Cpu className="h-6 w-6 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
            CodeLens <span className="text-brand-400 font-bold">X</span>
          </h2>
          <p className="text-xs text-panel-text mt-1.5 font-mono">Connect to SDE Platform Workspace</p>
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-red-950/20 border border-red-900/30 text-red-400 p-3 rounded-lg text-sm mb-5 font-mono">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-medium text-panel-text uppercase mb-1.5">Username</label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="developer_id"
                className="w-full bg-[#141820] border border-panel-border focus:border-brand-500 focus:outline-none px-4 py-2.5 rounded-lg text-sm transition-colors text-white placeholder-panel-text/50 font-mono"
              />
              <Terminal className="absolute right-3 top-3 h-4 w-4 text-panel-text/30" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-medium text-panel-text uppercase mb-1.5">Security Token (Password)</label>
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
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-500 text-white font-mono font-medium py-3 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition-all mt-6 cursor-pointer shadow-lg shadow-brand-600/20 disabled:opacity-50"
          >
            {loading ? 'Decrypting credentials...' : 'Initialize Session'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="text-center mt-6 text-xs text-panel-text font-mono">
          New developer?{' '}
          <Link to="/register" className="text-brand-400 hover:underline">
            Register credentials
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
