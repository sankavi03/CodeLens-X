import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Cpu, Terminal, Layers, Activity, GitFork, ArrowRight, 
  BookOpen, Code2, Sparkles 
} from 'lucide-react';
import { LensMascot } from '../components/LensMascot';

const Landing: React.FC = () => {
  const [activeTabMock, setActiveTabMock] = useState<'editor' | 'graph'>('editor');

  return (
    <div className="min-h-screen bg-[#0D1117] text-[#F0F6FC] font-sans antialiased overflow-x-hidden relative">
      {/* Subtle thin background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#30363D_0.5px,transparent_0.5px),linear-gradient(to_bottom,#30363D_0.5px,transparent_0.5px)] bg-[size:5rem_5rem] pointer-events-none opacity-[0.08]" />

      {/* Navigation Header */}
      <header className="border-b border-[#30363D] bg-[#0D1117]/85 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between select-none max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 text-[#7C5CFC]">
            <Cpu className="h-4.5 w-4.5" />
          </div>
          <span className="font-mono text-xs font-bold tracking-tight text-white flex items-center gap-0.5">
            CodeLens <span className="text-[#7C5CFC]">X</span>
          </span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8 text-xs font-mono text-[#8B949E]">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
          <a href="#testimonials" className="hover:text-white transition-colors">Scenarios</a>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a>
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/login" className="text-xs font-mono text-[#8B949E] hover:text-white transition-colors">
            Sign In
          </Link>
          <Link
            to="/register"
            className="text-xs font-mono bg-[#7C5CFC] hover:bg-[#6845f9] text-white px-3.5 py-1.5 rounded transition-all flex items-center gap-1.5 shadow-md shadow-[#7C5CFC]/10 font-bold"
          >
            Get Started
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 pt-16 pb-20 text-center max-w-4xl mx-auto relative z-10 select-none">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1C2128] border border-[#30363D] text-[10px] font-mono text-[#7C5CFC] mb-6"
        >
          <LensMascot size={16} mood="happy" className="shrink-0" />
          <span>Meet Lens — Your trusted engineering companion</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6 leading-[1.12] max-w-3xl mx-auto"
        >
          Understand Any Codebase Faster.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="text-sm md:text-base text-[#8B949E] max-w-xl mx-auto mb-10 leading-relaxed font-sans"
        >
          Upload any project ZIP and instantly explore internal dependency couplings, auto-generated architecture summaries, AST outlines, and contextual Gemini answers.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.22 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            to="/register"
            className="bg-[#7C5CFC] hover:bg-[#6845f9] text-white font-mono font-bold py-2.5 px-6 rounded text-xs transition-all flex items-center gap-2 shadow-md cursor-pointer"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#features"
            className="bg-[#161B22] border border-[#30363D] hover:border-[#8B949E] text-[#8B949E] hover:text-white font-mono py-2.5 px-6 rounded text-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            Watch Demo
          </a>
        </motion.div>
      </section>

      {/* Simulated Premium IDE Preview Card */}
      <section className="px-6 pb-24 max-w-5xl mx-auto select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="border border-[#30363D] bg-[#161B22] rounded-xl shadow-2xl overflow-hidden relative flex flex-col h-[400px] md:h-[480px]"
        >
          {/* Windows Header styling */}
          <div className="bg-[#0d1017] border-b border-[#30363D] px-4 py-2.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] inline-block opacity-75"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] inline-block opacity-75"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] inline-block opacity-75"></span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveTabMock('editor')}
                className={`px-3 py-0.5 rounded text-[10px] font-mono border transition-all ${activeTabMock === 'editor' ? 'bg-[#7C5CFC]/20 border-[#7C5CFC] text-white' : 'bg-transparent border-[#30363D] text-[#8B949E]'}`}
              >
                Code View
              </button>
              <button 
                onClick={() => setActiveTabMock('graph')}
                className={`px-3 py-0.5 rounded text-[10px] font-mono border transition-all ${activeTabMock === 'graph' ? 'bg-[#7C5CFC]/20 border-[#7C5CFC] text-white' : 'bg-transparent border-[#30363D] text-[#8B949E]'}`}
              >
                Dependency Map
              </button>
            </div>
            <span className="text-[10px] font-mono text-[#8B949E]">workspace_preview.zip</span>
          </div>

          {/* IDE Content Columns */}
          <div className="flex-1 min-h-0 flex">
            {/* Sidebar Explorer mock */}
            <div className="w-48 bg-[#0D1117] border-r border-[#30363D] p-3.5 font-mono text-[10px] text-left hidden md:block select-none">
              <div className="text-[#8B949E] uppercase font-bold tracking-wider mb-3 text-[9px]">Workspace Files</div>
              <div className="space-y-2">
                <div className="text-white font-semibold flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-[#7C5CFC]" /> src/main/java</div>
                <div className="pl-4 text-[#8B949E] flex items-center gap-1.5 hover:text-white"><Code2 className="h-3.5 w-3.5 text-[#58A6FF]" /> ProjectController.java</div>
                <div className="pl-4 text-[#8B949E] flex items-center gap-1.5 hover:text-white"><Code2 className="h-3.5 w-3.5 text-[#58A6FF]" /> MetricParserService.java</div>
                <div className="pl-4 text-[#8B949E] flex items-center gap-1.5 hover:text-white"><Code2 className="h-3.5 w-3.5 text-[#58A6FF]" /> DatabasePool.java</div>
                <div className="text-[#8B949E] flex items-center gap-1.5 hover:text-white mt-4"><GitFork className="h-3.5 w-3.5" /> pom.xml</div>
              </div>
            </div>

            {/* Central Editor / Graphical Mock area */}
            <div className="flex-1 bg-[#0D1117] p-5 font-mono text-[11px] overflow-auto text-left relative">
              {activeTabMock === 'editor' ? (
                <div className="space-y-3">
                  <div className="text-[#8B949E] border-b border-[#30363D]/30 pb-1.5 flex justify-between items-center text-[10px]">
                    <span>MetricParserService.java</span>
                    <span className="text-[#3FB950] font-bold">100% PARSED</span>
                  </div>
                  <pre className="text-[#8B949E] leading-relaxed">
{`public class MetricParserService {
    private final AnalysisEngine engine;

    public MetricParserService(AnalysisEngine ae) {
        this.engine = ae;
    }

    public ProjectScore parse(Workspace ws) {
        // Detected Design Pattern: Strategy
        return engine.calculateScore(ws.getFiles());
    }
}`}
                  </pre>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <GitFork className="h-10 w-10 text-[#7C5CFC] mb-2 animate-pulse" />
                  <span className="text-white font-bold text-xs mb-1">Visual Dependency Coupling Graph</span>
                  <span className="text-[10px] text-[#8B949E]">Zoom & Pan enabled. 3 Modules, 12 Coupling Links mapped.</span>
                  
                  {/* Miniature Nodes Mock */}
                  <div className="mt-4 flex gap-4 items-center select-none">
                    <div className="px-2.5 py-1 rounded border border-[#30363D] bg-[#1C2128] text-[#58A6FF] text-[9px]">ParserService</div>
                    <div className="h-px w-6 bg-[#30363D]" />
                    <div className="px-2.5 py-1 rounded border border-[#7C5CFC] bg-[#1C2128] text-white text-[9px]">AnalysisEngine</div>
                  </div>
                </div>
              )}
            </div>

            {/* Copilot Sidebar Panel */}
            <div className="w-56 bg-[#161B22] border-l border-[#30363D] p-3.5 font-mono text-[10px] text-left hidden lg:block select-none">
              <div className="text-[#7C5CFC] font-bold mb-2.5 flex items-center gap-1.5 border-b border-[#30363D]/40 pb-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Companion AI
              </div>
              <p className="text-[#8B949E] leading-relaxed mb-4 text-[9px]">
                This service calculates the codebase health score by reviewing file size distributions and counts of detected circular imports.
              </p>
              <div className="text-[#D29922] font-bold mb-1.5 text-[8px] tracking-wider uppercase">Extracted Details</div>
              <div className="bg-[#0D1117] p-2 border border-[#30363D] rounded space-y-1 text-[9px]">
                <div className="text-[#8B949E]">Complexity: <span className="text-white font-bold">Low</span></div>
                <div className="text-[#8B949E]">Pattern: <span className="text-[#7C5CFC] font-bold">Strategy</span></div>
                <div className="text-[#8B949E]">Smells: <span className="text-[#3FB950] font-bold">0 Clean</span></div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Trust Indicators */}
      <section className="px-6 py-6 border-y border-[#30363D] bg-[#161B22]/40 select-none">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-x-8 gap-y-4 text-[10px] font-mono font-bold uppercase tracking-wider text-[#8B949E]">
          <div className="flex items-center gap-1.5">✓ AI Powered</div>
          <div className="flex items-center gap-1.5">✓ Architecture Analysis</div>
          <div className="flex items-center gap-1.5">✓ Dependency Visualization</div>
          <div className="flex items-center gap-1.5">✓ Workspace Intelligence</div>
          <div className="flex items-center gap-1.5">✓ Fast Parsing</div>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section id="features" className="px-6 py-20 max-w-5xl mx-auto select-none">
        <div className="text-center mb-16 font-mono">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-3">Workspace Intelligence Engines</h2>
          <p className="text-xs text-[#8B949E] max-w-md mx-auto">
            CodeLens-X provides a professional suite of analysis pipelines that extract relationships directly from directories.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
          {/* Card 1 */}
          <div className="border border-[#30363D] bg-[#161B22] p-5 rounded-lg hover:border-[#7C5CFC]/50 hover:-translate-y-0.5 transition-all text-left group">
            <div className="h-9 w-9 bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 text-[#7C5CFC] rounded-md flex items-center justify-center mb-4">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-white font-bold text-xs mb-1.5">AI Code Understanding</h3>
            <p className="text-[10px] text-[#8B949E] leading-relaxed">
              Query files using Gemini context engines, without leaking unmapped folders.
            </p>
          </div>

          {/* Card 2 */}
          <div className="border border-[#30363D] bg-[#161B22] p-5 rounded-lg hover:border-[#7C5CFC]/50 hover:-translate-y-0.5 transition-all text-left group">
            <div className="h-9 w-9 bg-[#58A6FF]/10 border border-[#58A6FF]/20 text-[#58A6FF] rounded-md flex items-center justify-center mb-4">
              <GitFork className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-white font-bold text-xs mb-1.5">Dependency Graph</h3>
            <p className="text-[10px] text-[#8B949E] leading-relaxed">
              Visualize internal modules and trace imports using interactive highlights.
            </p>
          </div>

          {/* Card 3 */}
          <div className="border border-[#30363D] bg-[#161B22] p-5 rounded-lg hover:border-[#7C5CFC]/50 hover:-translate-y-0.5 transition-all text-left group">
            <div className="h-9 w-9 bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] rounded-md flex items-center justify-center mb-4">
              <Layers className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-white font-bold text-xs mb-1.5">Architecture Viewer</h3>
            <p className="text-[10px] text-[#8B949E] leading-relaxed">
              Compile design schemas matching components automatically from imports.
            </p>
          </div>

          {/* Card 4 */}
          <div className="border border-[#30363D] bg-[#161B22] p-5 rounded-lg hover:border-[#7C5CFC]/50 hover:-translate-y-0.5 transition-all text-left group">
            <div className="h-9 w-9 bg-[#D29922]/10 border border-[#D29922]/20 text-[#D29922] rounded-md flex items-center justify-center mb-4">
              <BookOpen className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-white font-bold text-xs mb-1.5">Auto Documentation</h3>
            <p className="text-[10px] text-[#8B949E] leading-relaxed">
              Build clean interface guidelines and README overviews with a click.
            </p>
          </div>

          {/* Card 5 */}
          <div className="border border-[#30363D] bg-[#161B22] p-5 rounded-lg hover:border-[#7C5CFC]/50 hover:-translate-y-0.5 transition-all text-left group">
            <div className="h-9 w-9 bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444] rounded-md flex items-center justify-center mb-4">
              <Activity className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-white font-bold text-xs mb-1.5">Workspace Intelligence</h3>
            <p className="text-[10px] text-[#8B949E] leading-relaxed">
              Identify code smells, circular logic, and trace metrics dynamically.
            </p>
          </div>

          {/* Card 6 */}
          <div className="border border-[#30363D] bg-[#161B22] p-5 rounded-lg hover:border-[#7C5CFC]/50 hover:-translate-y-0.5 transition-all text-left group">
            <div className="h-9 w-9 bg-[#a78bfa]/10 border border-[#a78bfa]/20 text-[#a78bfa] rounded-md flex items-center justify-center mb-4">
              <Terminal className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-white font-bold text-xs mb-1.5">Project Explorer</h3>
            <p className="text-[10px] text-[#8B949E] leading-relaxed">
              Draggable sidebar panes, Monaco files editing, and disk-synced operations.
            </p>
          </div>
        </div>
      </section>

      {/* Why CodeLens-X Flow Section */}
      <section id="workflow" className="px-6 py-20 bg-[#161B22]/30 border-t border-[#30363D] select-none">
        <div className="max-w-4xl mx-auto font-mono text-center">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-10">Product Pipeline</h2>

          {/* Horizontal Step Timeline */}
          <div className="grid grid-cols-5 gap-4 relative">
            {[
              { num: '01', title: 'Upload Project', desc: 'Secure ZIP streaming' },
              { num: '02', title: 'Analyze', desc: 'Rebuild AST matrices' },
              { num: '03', title: 'Understand', desc: 'AI-guided context' },
              { num: '04', title: 'Document', desc: 'Build clear guides' },
              { num: '05', title: 'Develop', desc: 'Sync code writes' },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center relative">
                <div className="h-10 w-10 rounded-lg bg-[#0D1117] border border-[#30363D] flex items-center justify-center text-xs font-bold text-white mb-3">
                  {step.num}
                </div>
                <div className="text-[10px] font-bold text-white mb-0.5">{step.title}</div>
                <div className="text-[9px] text-[#8B949E] text-center">{step.desc}</div>
              </div>
            ))}
          </div>

          {/* Linear workflow map representation */}
          <div className="mt-16 bg-[#0D1117] border border-[#30363D] p-5 rounded-lg inline-flex items-center gap-3 text-[10px] text-[#8B949E]">
            <span>ZIP Upload</span>
            <span className="text-[#30363D]">→</span>
            <span className="text-white">Parser Engine</span>
            <span className="text-[#30363D]">→</span>
            <span>Dependency Matrix</span>
            <span className="text-[#30363D]">→</span>
            <span className="text-white">Gemini Model</span>
            <span className="text-[#30363D]">→</span>
            <span>API Docs Output</span>
          </div>
        </div>
      </section>

      {/* Testimonials / Real Scenarios */}
      <section id="testimonials" className="px-6 py-20 max-w-4xl mx-auto select-none">
        <div className="text-center mb-12 font-mono">
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-white mb-2">Usage Scenarios</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-left">
          <div className="bg-[#1C2128] border border-[#30363D] p-5 rounded-lg">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C5CFC]">Backend Engineer</span>
            <p className="text-[11px] text-[#8B949E] mt-3 leading-relaxed">
              "Trace imports and isolate class couplings to map out architectural components before editing legacy systems."
            </p>
          </div>
          <div className="bg-[#1C2128] border border-[#30363D] p-5 rounded-lg">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C5CFC]">Student Developer</span>
            <p className="text-[11px] text-[#8B949E] mt-3 leading-relaxed">
              "Upload complex codebases, visualize flow dependencies instantly, and prompt explanations for circular references."
            </p>
          </div>
          <div className="bg-[#1C2128] border border-[#30363D] p-5 rounded-lg">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7C5CFC]">Engineering Lead</span>
            <p className="text-[11px] text-[#8B949E] mt-3 leading-relaxed">
              "Scan uploaded ZIP repositories to compile structural outlines, health metrics, and API README guides for onboarding."
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-20 border-t border-[#30363D] bg-[#161B22]/10 select-none text-center">
        <div className="max-w-md mx-auto font-mono">
          <LensMascot size={40} mood="happy" className="mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Ready to understand your project faster?</h2>
          <p className="text-[10px] text-[#8B949E] mb-6">Create a secure workspace and unpack repository details in seconds.</p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-[#7C5CFC] hover:bg-[#6845f9] text-white font-bold py-2 px-5 rounded text-xs transition-colors cursor-pointer"
          >
            Create Workspace
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#30363D] py-10 px-6 bg-[#0D1117] select-none">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between text-[10px] text-[#8B949E] font-mono gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-[#7C5CFC]" />
            <span>CodeLens-X — Platform console.</span>
          </div>
          <div className="flex items-center gap-6">
            <span>v1.0.0</span>
            <span>Built with React, Spring Boot, PostgreSQL, Gemini AI</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
