import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuthStore';
import { useToastStore } from '../hooks/useToastStore';
import { LensMascot } from '../components/LensMascot';
import { 
  Cpu, Sparkles, Layers, GitFork, Terminal, ShieldAlert, 
  ArrowRight, ShieldCheck, Mail, Lock, User as UserIcon, Loader2 
} from 'lucide-react';
import api from '../services/api';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);
  const googleLogin = useAuthStore((state) => state.googleLogin);
  const addToast = useToastStore((state) => state.addToast);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Live validation states
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [emailMessage, setEmailMessage] = useState('');

  // Password requirements met
  const [passLength, setPassLength] = useState(false);
  const [passNumber, setPassNumber] = useState(false);
  const [passUpper, setPassUpper] = useState(false);
  const [passSpecial, setPassSpecial] = useState(false);

  // Form states
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Simulated Google Sign In Modal State
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('developer.google@codelensx.com');
  const [googleName, setGoogleName] = useState('Google SDE Developer');

  // Debounced Username availability check
  useEffect(() => {
    if (!username.trim()) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      return;
    }
    setUsernameStatus('checking');
    setUsernameMessage('Checking...');

    const timer = setTimeout(() => {
      api.get('/api/auth/check-username', { params: { username } })
        .then((res) => {
          if (res.data.success) {
            setUsernameStatus('available');
            setUsernameMessage('✓ Username available');
          } else {
            setUsernameStatus('taken');
            setUsernameMessage('✕ Username already taken');
          }
        })
        .catch(() => {
          setUsernameStatus('idle');
          setUsernameMessage('');
        });
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  // Debounced Email validation & availability check
  useEffect(() => {
    if (!email.trim()) {
      setEmailStatus('idle');
      setEmailMessage('');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailStatus('invalid');
      setEmailMessage('✕ Invalid email format');
      return;
    }

    setEmailStatus('checking');
    setEmailMessage('Checking...');

    const timer = setTimeout(() => {
      api.get('/api/auth/check-email', { params: { email } })
        .then((res) => {
          if (res.data.success) {
            setEmailStatus('available');
            setEmailMessage('✓ Email available');
          } else {
            setEmailStatus('taken');
            setEmailMessage('✕ Email already registered');
          }
        })
        .catch(() => {
          setEmailStatus('idle');
          setEmailMessage('');
        });
    }, 400);

    return () => clearTimeout(timer);
  }, [email]);

  // Live Password check
  useEffect(() => {
    setPassLength(password.length >= 8);
    setPassNumber(/\d/.test(password));
    setPassUpper(/[A-Z]/.test(password));
    setPassSpecial(/[^A-Za-z0-9]/.test(password));
  }, [password]);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (usernameStatus === 'taken') {
      setError('Username is already taken.');
      return;
    }
    if (emailStatus === 'taken' || emailStatus === 'invalid') {
      setError('Email address validation failed.');
      return;
    }
    if (!passLength || !passNumber || !passUpper || !passSpecial) {
      setError('Password requirements not met.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register(username, email, password);
      setSuccess(true);
      addToast('Account created successfully!', 'success');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please check field details.');
      addToast('Registration failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGoogleModalOpen(false);
    setLoading(true);
    setError(null);

    try {
      await googleLogin(
        googleEmail, 
        googleName, 
        'https://api.dicebear.com/7.x/bottts/svg?seed=' + googleName.replace(/\s+/g, ''),
        'google-mock-jwt-token'
      );
      setSuccess(true);
      addToast('Signed in with Google!', 'success');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Google OAuth failed.');
      addToast('Google Sign-In failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col md:flex-row bg-[#0D1117] text-[#F0F6FC] font-sans antialiased relative overflow-hidden">
      
      {/* REDIRECTING SUCCESS DIALOG */}
      {success && (
        <div className="fixed inset-0 bg-[#0D1117] z-50 flex flex-col items-center justify-center font-mono">
          <LensMascot size={64} mood="happy" className="mb-4" />
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <ShieldCheck className="h-5 w-5 animate-pulse" />
            <span>✓ Account created successfully</span>
          </div>
          <span className="text-xs text-[#8B949E] mt-1.5 animate-pulse">Redirecting to login dashboard...</span>
        </div>
      )}

      {/* LEFT COLUMN: Mascot Intro & Brand Details */}
      <div className="w-full md:w-[55%] border-b md:border-b-0 md:border-r border-[#30363D] bg-[#161B22]/30 p-8 md:p-16 flex flex-col justify-between select-none">
        <div>
          <div className="flex items-center gap-3 mb-10">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 text-[#7C5CFC]">
              <Cpu className="h-4.5 w-4.5" />
            </div>
            <span className="font-mono text-xs font-bold tracking-tight text-white flex items-center gap-0.5">
              CodeLens <span className="text-[#7C5CFC]">X</span>
            </span>
          </div>

          <div className="space-y-4 max-w-lg text-left">
            <h1 className="text-3xl font-bold tracking-tight text-white font-mono leading-tight">Welcome to CodeLens-X</h1>
            <p className="text-xs text-[#8B949E] leading-relaxed">
              Understand, visualize and explore any codebase with AI-powered workspace intelligence.
            </p>
          </div>

          {/* 4 Feature Highlights */}
          <div className="mt-12 space-y-6 max-w-lg text-left">
            <div className="flex gap-4">
              <div className="h-8 w-8 rounded border border-[#30363D] bg-[#0D1117] flex items-center justify-center text-[#7C5CFC] shrink-0 mt-0.5">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white font-mono">AI Workspace Intelligence</h4>
                <p className="text-[10px] text-[#8B949E] mt-0.5">Understand thousands of lines of code in seconds.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="h-8 w-8 rounded border border-[#30363D] bg-[#0D1117] flex items-center justify-center text-[#58A6FF] shrink-0 mt-0.5">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white font-mono">Architecture Visualization</h4>
                <p className="text-[10px] text-[#8B949E] mt-0.5">Automatically generate architecture diagrams from your project.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="h-8 w-8 rounded border border-[#30363D] bg-[#0D1117] flex items-center justify-center text-[#22C55E] shrink-0 mt-0.5">
                <GitFork className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white font-mono">Dependency Analysis</h4>
                <p className="text-[10px] text-[#8B949E] mt-0.5">Visualize relationships between modules and packages.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="h-8 w-8 rounded border border-[#30363D] bg-[#0D1117] flex items-center justify-center text-[#a78bfa] shrink-0 mt-0.5">
                <Terminal className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white font-mono">Developer Workspace</h4>
                <p className="text-[10px] text-[#8B949E] mt-0.5">Navigate large projects through an intelligent IDE.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Companion Mascot Badge */}
        <div className="flex items-center gap-3 border-t border-[#30363D]/40 pt-6 mt-8 md:mt-0 max-w-sm">
          <LensMascot size={32} mood="neutral" className="shrink-0" />
          <div className="text-[9px] font-mono text-[#8B949E] leading-relaxed text-left">
            "Hi, I'm <span className="text-white font-bold">Lens</span>. Enroll your secure developer account to trace health scores and diagram structures."
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Centered Register Card */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-[480px] bg-[#161B22] border border-[#30363D] p-8 rounded-xl shadow-xl flex flex-col justify-center my-6">
          
          <div className="text-left mb-6 font-mono select-none">
            <h2 className="text-lg font-bold text-white mb-1">Create your developer workspace</h2>
            <p className="text-[10px] text-[#8B949E]">Start exploring your projects with AI-powered insights.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-950/20 border border-red-900/30 text-red-400 p-3 rounded mb-5 font-mono text-left">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="text-[10px] leading-relaxed">{error}</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-left font-mono">
              <label className="block text-[10px] font-medium text-[#8B949E] uppercase mb-1.5">Username</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose unique username"
                  className="w-full bg-[#0D1117] border border-[#30363D] focus:border-[#7C5CFC] focus:outline-none pl-9 pr-3 py-2 rounded text-xs text-white placeholder-[#8B949E]/30"
                />
                <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-[#8B949E]/30" />
              </div>
              
              {/* Live username feedback */}
              {usernameStatus !== 'idle' && (
                <div className={`text-[10px] mt-1.5 flex items-center gap-1 ${
                  usernameStatus === 'checking' ? 'text-[#8B949E]' :
                  usernameStatus === 'available' ? 'text-emerald-400 font-bold' : 'text-[#EF4444] font-bold'
                }`}>
                  {usernameStatus === 'checking' && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>{usernameMessage}</span>
                </div>
              )}
            </div>

            <div className="text-left font-mono">
              <label className="block text-[10px] font-medium text-[#8B949E] uppercase mb-1.5">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-[#0D1117] border border-[#30363D] focus:border-[#7C5CFC] focus:outline-none pl-9 pr-3 py-2 rounded text-xs text-white placeholder-[#8B949E]/30"
                />
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#8B949E]/30" />
              </div>

              {/* Live email feedback */}
              {emailStatus !== 'idle' && (
                <div className={`text-[10px] mt-1.5 flex items-center gap-1 ${
                  emailStatus === 'checking' ? 'text-[#8B949E]' :
                  emailStatus === 'available' ? 'text-emerald-400 font-bold' : 'text-[#EF4444] font-bold'
                }`}>
                  {emailStatus === 'checking' && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>{emailMessage}</span>
                </div>
              )}
            </div>

            <div className="text-left font-mono">
              <label className="block text-[10px] font-medium text-[#8B949E] uppercase mb-1.5">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-[#0D1117] border border-[#30363D] focus:border-[#7C5CFC] focus:outline-none pl-9 pr-3 py-2 rounded text-xs text-white placeholder-[#8B949E]/30"
                />
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#8B949E]/30" />
              </div>

              {/* Live password requirements list */}
              <div className="mt-2.5 bg-[#0D1117] border border-[#30363D]/40 p-2.5 rounded grid grid-cols-2 gap-2 text-[9px] select-none text-left">
                <div className={`flex items-center gap-1.5 ${passLength ? 'text-emerald-400 font-bold' : 'text-[#8B949E]'}`}>
                  <span>{passLength ? '✓' : '○'}</span>
                  <span>8+ characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passNumber ? 'text-emerald-400 font-bold' : 'text-[#8B949E]'}`}>
                  <span>{passNumber ? '✓' : '○'}</span>
                  <span>1+ number</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passUpper ? 'text-emerald-400 font-bold' : 'text-[#8B949E]'}`}>
                  <span>{passUpper ? '✓' : '○'}</span>
                  <span>1+ uppercase</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passSpecial ? 'text-emerald-400 font-bold' : 'text-[#8B949E]'}`}>
                  <span>{passSpecial ? '✓' : '○'}</span>
                  <span>1+ special symbol</span>
                </div>
              </div>
            </div>

            <div className="text-left font-mono">
              <label className="block text-[10px] font-medium text-[#8B949E] uppercase mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type password"
                  className="w-full bg-[#0D1117] border border-[#30363D] focus:border-[#7C5CFC] focus:outline-none pl-9 pr-3 py-2 rounded text-xs text-white placeholder-[#8B949E]/30"
                />
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#8B949E]/30" />
              </div>

              {/* Live confirmation feedback */}
              {confirmPassword.length > 0 && (
                <div className={`text-[10px] mt-1.5 flex items-center gap-1 font-bold ${
                  passwordsMatch ? 'text-emerald-400' : 'text-[#EF4444]'
                }`}>
                  <span>{passwordsMatch ? '✓ Passwords match' : '✕ Passwords do not match'}</span>
                </div>
              )}
            </div>

            <div className="text-[9px] font-mono text-[#8B949E] text-left pt-1 select-none">
              I agree to the <span className="text-[#7C5CFC] hover:underline cursor-pointer">Terms of Service</span> and <span className="text-[#7C5CFC] hover:underline cursor-pointer">Privacy Policy</span>.
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-[#7C5CFC] hover:bg-[#6845f9] text-white font-mono font-bold py-2 px-4 rounded text-xs flex items-center justify-center gap-1.5 transition-all mt-6 cursor-pointer shadow-md disabled:opacity-50"
            >
              {loading ? 'Creating workspace...' : 'Register Credentials'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Google Sign-in */}
          <div className="relative my-6 select-none">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[#30363D]/40" /></div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono"><span className="bg-[#161B22] px-2.5 text-[#8B949E]/50">Or oauth connect</span></div>
          </div>

          <button
            type="button"
            onClick={() => setIsGoogleModalOpen(true)}
            className="w-full bg-[#0D1117] hover:bg-[#1C2128] border border-[#30363D] hover:border-[#8B949E] text-white font-mono py-2 px-4 rounded text-xs flex items-center justify-center gap-2.5 transition-colors cursor-pointer select-none"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="text-center mt-6 text-[10px] text-[#8B949E] font-mono select-none">
            Already registered?{' '}
            <Link to="/login" className="text-[#7C5CFC] hover:underline font-bold">
              Initialize session
            </Link>
          </div>
        </div>
      </div>

      {/* MOCK GOOGLE LOGIN DIALOG */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 font-mono select-none">
          <div className="bg-[#161B22] border border-[#30363D] w-full max-w-sm rounded-lg shadow-xl overflow-hidden flex flex-col">
            <div className="h-10 border-b border-[#30363D] bg-[#0d1017] px-4 flex items-center justify-between text-xs text-white font-bold">
              <span>Google Account Simulator</span>
              <button onClick={() => setIsGoogleModalOpen(false)} className="hover:text-[#EF4444] text-xs">×</button>
            </div>
            <form onSubmit={handleGoogleSubmit} className="p-4 space-y-4 text-xs text-[#8B949E] text-left">
              <p className="text-[10px] leading-relaxed">
                Choose simulated parameters for OAuth callbacks. This links securely to `/api/auth/google`.
              </p>
              <div>
                <label className="block text-[9px] uppercase font-bold text-[#8B949E] mb-1">Email address</label>
                <input 
                  type="email"
                  required
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  className="w-full bg-[#0D1117] border border-[#30363D] focus:border-[#7C5CFC] focus:outline-none p-2 rounded text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-[#8B949E] mb-1">Display Name</label>
                <input 
                  type="text"
                  required
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  className="w-full bg-[#0D1117] border border-[#30363D] focus:border-[#7C5CFC] focus:outline-none p-2 rounded text-xs text-white"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsGoogleModalOpen(false)}
                  className="px-3 py-1.5 bg-[#21262D] hover:bg-[#30363D] text-[#8B949E] hover:text-white rounded border border-[#30363D] cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-3 py-1.5 bg-[#7C5CFC] hover:bg-[#6845f9] text-white rounded font-bold cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
