import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Cpu, Terminal, Layers, Activity, GitFork, ArrowRight, Eye, Code2 } from 'lucide-react';

const Landing: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#07090e] text-[#e2e8f0] font-sans antialiased overflow-x-hidden relative">
      {/* Mesh grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-45"></div>

      {/* Decorative colored glow circles */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-brand-600/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Header Bar */}
      <header className="border-b border-[#131b2e] bg-[#07090e]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-400">
            <Cpu className="h-5 w-5" />
          </div>
          <span className="font-mono text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
            CodeLens <span className="text-brand-400">X</span>
          </span>
        </div>
        <nav className="flex items-center gap-6">
          <Link to="/login" className="text-sm font-mono text-panel-text hover:text-white transition-colors">
            Sign In
          </Link>
          <Link
            to="/register"
            className="text-sm font-mono bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-brand-600/20"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="px-6 pt-20 pb-32 text-center max-w-5xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#131d35] border border-[#213560] text-xs font-mono text-brand-300 mb-6"
        >
          <Terminal className="h-3.5 w-3.5" />
          CodeLens X Platform v1.0 Released
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-6xl font-bold font-mono tracking-tight text-white mb-6 leading-[1.15]"
        >
          AI-Powered Code Understanding <br />
          <span className="bg-gradient-to-r from-brand-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Built for Modern SDEs
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg text-panel-text max-w-2xl mx-auto mb-10 font-mono"
        >
          A flagship workspace parsing codebase syntax, extracting internal dependency graphs, detecting design patterns, and feeding enriched contextual metadata directly to Gemini.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            to="/register"
            className="bg-brand-600 hover:bg-brand-500 text-white font-mono font-medium py-3.5 px-8 rounded-lg transition-all flex items-center gap-2 shadow-xl shadow-brand-600/30 cursor-pointer text-sm"
          >
            Launch SDE Workspace
            <ArrowRight className="h-4.5 w-4.5" />
          </Link>
          <Link
            to="/login"
            className="bg-[#101420] border border-panel-border hover:border-brand-500/50 text-[#e2e8f0] font-mono font-medium py-3.5 px-8 rounded-lg transition-all flex items-center gap-2 cursor-pointer text-sm"
          >
            Restore Session
            <Eye className="h-4.5 w-4.5" />
          </Link>
        </motion.div>
      </section>

      {/* Interactive Architecture Preview / IDE Simulation */}
      <section className="px-6 pb-32 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="border border-[#1f293d] bg-panel-bg rounded-xl shadow-2xl overflow-hidden relative"
        >
          {/* Windows Header styling */}
          <div className="bg-panel-sidebar border-b border-panel-border px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ef4444] inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-[#eab308] inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-[#22c55e] inline-block"></span>
            </div>
            <span className="text-xs font-mono text-panel-text">CodeLens X IDE Preview — sample-project.zip</span>
            <div className="w-16"></div>
          </div>

          <div className="grid grid-cols-12 h-[340px] md:h-[450px]">
            {/* Sidebar tree mock */}
            <div className="col-span-3 bg-panel-sidebar border-r border-panel-border p-4 font-mono text-xs hidden md:block">
              <div className="text-panel-text uppercase font-bold tracking-wider mb-3 text-[10px]">Explorer</div>
              <div className="space-y-2">
                <div className="text-brand-300 font-semibold flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> src</div>
                <div className="pl-4 text-panel-text flex items-center gap-1.5"><Code2 className="h-3.5 w-3.5" /> UserService.java</div>
                <div className="pl-4 text-panel-text flex items-center gap-1.5"><Code2 className="h-3.5 w-3.5" /> UserRepository.java</div>
                <div className="pl-4 text-panel-text flex items-center gap-1.5"><Code2 className="h-3.5 w-3.5" /> AuthController.java</div>
                <div className="text-panel-text flex items-center gap-1.5 mt-4"><GitFork className="h-3.5 w-3.5" /> pom.xml</div>
              </div>
            </div>

            {/* Monaco code view mock */}
            <div className="col-span-12 md:col-span-6 bg-panel-editor p-6 font-mono text-xs overflow-y-auto text-[#a9b1d6]">
              <div className="text-panel-text mb-4 border-b border-panel-border/30 pb-2 flex items-center justify-between">
                <span>UserService.java</span>
                <span className="text-[10px] text-emerald-400">Detected: Java</span>
              </div>
              <pre className="text-left leading-relaxed">
{`public class UserService {
    private final UserRepository repository;
    private final TokenProvider tokenProvider;

    public UserService(UserRepository repo, TokenProvider tp) {
        this.repository = repo;
        this.tokenProvider = tp;
    }

    public UserResponse registerUser(UserRequest req) {
        // Pattern matches: Factory / Singleton
        return repository.save(req.toEntity());
    }
}`}
              </pre>
            </div>

            {/* AI Context sidebar mock */}
            <div className="col-span-3 bg-panel-bg p-4 font-mono text-xs hidden md:block border-l border-panel-border text-left">
              <div className="text-[#a78bfa] font-bold mb-3 flex items-center gap-1.5">
                <Cpu className="h-4 w-4" /> AI Explanation
              </div>
              <p className="text-panel-text text-[11px] leading-relaxed mb-4">
                This class acts as the service coordinator layer. It exposes registration operations and relies on database mapper repositories.
              </p>
              <div className="text-[#f43f5e] font-bold mb-1.5 text-[10px]">METRICS:</div>
              <div className="bg-[#181d28] p-2 border border-panel-border rounded space-y-1 text-[10px]">
                <div className="text-panel-text">Complexity: <span className="text-white">Medium</span></div>
                <div className="text-panel-text">Nesting levels: <span className="text-emerald-400">1</span></div>
                <div className="text-panel-text">Design Pattern: <span className="text-[#a78bfa]">Factory</span></div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="px-6 py-20 bg-[#090b10] border-t border-[#131b2e]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold font-mono tracking-tight text-white mb-4">Structural Understanding</h2>
            <p className="text-sm font-mono text-panel-text max-w-xl mx-auto">
              Our analysis pipeline parses source directories into metadata models rather than directly dumping raw source files into the LLM context.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
            {/* Feature 1 */}
            <div className="border border-panel-border bg-panel-bg p-6 rounded-lg hover:border-brand-500/50 transition-all text-left">
              <div className="h-10 w-10 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-lg flex items-center justify-center mb-4">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="text-white font-bold mb-2">Static Analysis</h3>
              <p className="text-xs text-panel-text leading-relaxed">
                Extracts packages, imports, records, interfaces, and annotations for Java, Python, and JS/TS on the fly.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="border border-panel-border bg-panel-bg p-6 rounded-lg hover:border-brand-500/50 transition-all text-left">
              <div className="h-10 w-10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center mb-4">
                <GitFork className="h-5 w-5" />
              </div>
              <h3 className="text-white font-bold mb-2">Dependency Graphs</h3>
              <p className="text-xs text-panel-text leading-relaxed">
                Builds interactive internal module dependency maps using React Flow and parses external Maven, NPM, and Pip dependency manifests.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="border border-panel-border bg-panel-bg p-6 rounded-lg hover:border-brand-500/50 transition-all text-left">
              <div className="h-10 w-10 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center mb-4">
                <Activity className="h-5 w-5" />
              </div>
              <h3 className="text-white font-bold mb-2">Pattern & Insights</h3>
              <p className="text-xs text-panel-text leading-relaxed">
                Identifies architectural design patterns (Singleton, Builder, Factory) and complexity metric warnings inside the workspace.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#131b2e] py-12 px-6 bg-[#07090e]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs text-panel-text font-mono gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-brand-400" />
            <span>CodeLens X — Flagship AI IDE.</span>
          </div>
          <div>
            Built with Spring Boot, React, and Gemini. All rights reserved 2026.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
