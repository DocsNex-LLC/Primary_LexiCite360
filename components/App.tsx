import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShieldCheck, FileText, Settings, Loader2, X, 
  Globe, Scale, AlertCircle, History, BookOpen, 
  Search, Key, Download, ChevronUp, ChevronDown, 
  CheckCircle2, AlertTriangle, Clock, User, LogOut, 
  ChevronRight, Menu, Shield, Briefcase, Activity,
  Home as HomeIcon, Save, Camera, FileUp, Info, CheckCircle, XCircle, 
  Plus, MoreVertical, Edit2, Star, Folder, ExternalLink, Library,
  LayoutDashboard, Bell, Search as SearchIcon, Cpu, Sparkles, Wand2, Map, History as HistoryIcon, Book
} from 'lucide-react';
import { Citation, AnalysisStats, CitationFilter, ReportJournalEntry, ViewState } from './types';
import { extractCitations, highlightText } from './services/citationService';
import { verifyCitationWithGemini } from './services/geminiService';
import { lookupCitationOnCourtListener } from './services/courtListenerService';
import CitationCard from './components/CitationCard';
import StatsPanel from './components/StatsPanel';

const JOURNAL_STORAGE_KEY = 'lexicite_journal_history';
const CL_KEY_STORAGE_KEY = 'lexicite_cl_api_key';
const DEFAULT_CL_KEY = "3149ff4a1dfd96b754c754c75d1afc4366e2177c1f2f";

const VerificationOverlay: React.FC = () => {
  const [msgIndex, setMsgIndex] = useState(0);
  const messages = [
    "Consulting Legal Repositories...",
    "Auditing Precedential History...",
    "Scanning for Hallucinations...",
    "Synchronizing with CourtListener...",
    "Validating Bluebook Formatting...",
    "Cross-referencing Overruling Decisions...",
    "Finalizing Authority Trust Scores..."
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-[2000] bg-[#0b3a6f]/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-white animate-in fade-in duration-500">
      <div className="scan-line" />
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
         {[...Array(15)].map((_, i) => (
           <div 
             key={i} 
             className="absolute text-[10px] font-mono text-orange-400 particle"
             style={{
               left: `${Math.random() * 100}%`,
               top: `${Math.random() * 100}%`,
               '--tw-translate-x': `${(Math.random() - 0.5) * 200}px`,
               '--tw-translate-y': `${(Math.random() - 0.5) * 200}px`,
               animationDelay: `${Math.random() * 5}s`,
               animationDuration: `${3 + Math.random() * 4}s`
             } as any}
           >
             {Math.random() > 0.5 ? "410 U.S. 113" : "F.3d 456"}
           </div>
         ))}
      </div>

      <div className="relative">
        <div className="absolute inset-0 bg-orange-500 rounded-full blur-[80px] opacity-30 animate-pulse-fast" />
        <div className="relative w-40 h-40 flex items-center justify-center">
           <div className="absolute inset-0 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin-slow" />
           <div className="absolute inset-4 border-2 border-white/10 border-b-white/40 rounded-full animate-spin-slow" style={{ animationDirection: 'reverse' }} />
           <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-2xl">
             <Scale size={48} className="text-orange-400 drop-shadow-[0_0_15px_rgba(243,146,0,0.8)]" />
           </div>
        </div>
      </div>

      <div className="mt-12 text-center space-y-4 max-w-sm">
        <h2 className="text-2xl font-black tracking-tighter italic uppercase text-orange-100 font-sans">AI Authority Audit</h2>
        <div className="h-6 flex items-center justify-center">
          <p className="text-sm font-bold text-orange-400 uppercase tracking-[0.2em] animate-in slide-in-from-bottom-2 duration-300" key={msgIndex}>
            {messages[msgIndex]}
          </p>
        </div>
        <div className="w-48 h-1 bg-white/10 rounded-full mx-auto overflow-hidden relative">
           <div className="absolute inset-0 bg-orange-500 animate-loading" />
        </div>
      </div>

      <div className="absolute bottom-12 flex items-center gap-3 text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">
         <ShieldCheck size={14} />
         Secured Encrypted Connection
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('library');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [courtListenerKey, setCourtListenerKey] = useState(() => localStorage.getItem(CL_KEY_STORAGE_KEY) || DEFAULT_CL_KEY);
  
  const [inputText, setInputText] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [activeTab, setActiveTab] = useState<CitationFilter>('all');
  const [isInspectionPanelOpen, setIsInspectionPanelOpen] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [journal, setJournal] = useState<ReportJournalEntry[]>(() => {
    const saved = localStorage.getItem(JOURNAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [
      {
        id: '1',
        timestamp: Date.now() - 7200000,
        documentTitle: "Smith v. Jones Research",
        stats: { total: 14, valid: 14, invalid: 0, pending: 0 },
        findings: [{ text: "384 U.S. 436", status: "valid", caseName: "Miranda v. Arizona", legalStatus: "good" }],
        status: 'verified',
        thumbnail: 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?auto=format&fit=crop&q=80&w=400'
      },
      {
        id: '2',
        timestamp: Date.now() - 86400000,
        documentTitle: "Appellate Brief - Oct 2023",
        stats: { total: 8, valid: 5, invalid: 3, pending: 0 },
        findings: [{ text: "410 U.S. 113", status: "hallucination", caseName: "Roe v. Wade", legalStatus: "overruled" }],
        status: 'pending',
        thumbnail: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=400'
      }
    ];
  });

  useEffect(() => {
    if (currentView === 'editor' && inputText.trim()) {
      const extracted = extractCitations(inputText);
      setCitations(prev => {
        return extracted.map(newCite => {
          const existing = prev.find(p => p.originalText === newCite.originalText && p.startIndex === newCite.startIndex);
          return existing || newCite;
        });
      });
    }
  }, [inputText, currentView]);

  useEffect(() => {
    localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(journal));
  }, [journal]);

  const stats: AnalysisStats = useMemo(() => {
    if (!citations.length) return { total: 0, valid: 0, invalid: 0, pending: 0 };
    return {
      total: citations.length,
      valid: citations.filter(c => c.status === 'valid' && (c.legalStatus === 'good' || c.legalStatus === 'verified' || c.legalStatus === 'unknown')).length,
      invalid: citations.filter(c => ['hallucination', 'error'].includes(c.status) || ['overruled', 'superseded', 'retracted'].includes(c.legalStatus || '')).length,
      pending: citations.filter(c => c.status === 'pending' || c.status === 'checking').length
    };
  }, [citations]);

  const filteredCitations = useMemo(() => {
    if (activeTab === 'all') return citations;
    if (activeTab === 'issues') return citations.filter(c => ['hallucination', 'error'].includes(c.status) || ['overruled', 'superseded'].includes(c.legalStatus || ''));
    if (activeTab === 'valid') return citations.filter(c => c.status === 'valid' && ['good', 'verified'].includes(c.legalStatus || ''));
    return citations;
  }, [citations, activeTab]);

  const runVerificationBatch = async () => {
    if (!inputText.trim()) return;
    setIsAnalyzing(true);
    
    await new Promise(r => setTimeout(r, 2000));
    
    const extracted = extractCitations(inputText);
    setCitations(extracted);

    const promises = extracted.map(async (cite) => {
      setCitations(p => p.map(c => c.id === cite.id ? { ...c, status: 'checking' } : c));
      try {
        const result = await verifyCitationWithGemini(cite.originalText, 'standard');
        let clData = null;
        if (courtListenerKey && result.isValid) {
          clData = await lookupCitationOnCourtListener(cite.originalText, courtListenerKey);
        }

        const updatedCite: Citation = {
          ...cite,
          status: result.isValid ? 'valid' : 'hallucination',
          caseName: clData?.caseName || result.caseName || undefined,
          legalStatus: result.legalStatus,
          reason: result.reason,
          sources: clData?.absolute_url ? [{ uri: clData.absolute_url, title: 'CourtListener' }, ...(result.sources || [])] : result.sources,
          supersedingCase: result.supersedingCase
        };

        setCitations(p => p.map(c => c.id === cite.id ? updatedCite : c));
        return updatedCite;
      } catch (e) {
        const errorCite: Citation = { ...cite, status: 'error', reason: "Verification failed." };
        setCitations(p => p.map(c => c.id === cite.id ? errorCite : c));
        return errorCite;
      }
    });

    await Promise.all(promises);
    setIsAnalyzing(false);
    setIsInspectionPanelOpen(true);
  };

  const applyCorrection = (id: string, newCitation: string, newCaseName: string) => {
    const cite = citations.find(c => c.id === id);
    if (!cite) return;

    const newText = inputText.substring(0, cite.startIndex) + newCitation + inputText.substring(cite.endIndex);
    setInputText(newText);
    setCitations(prev => prev.filter(c => c.id !== id));
  };

  const renderLibrary = () => (
    <div className="flex-1 overflow-y-auto pb-12 px-6 sm:px-12 pt-10">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Hello Greeting */}
        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 bg-[#e6f0fb] text-[#0b3a6f] rounded-2xl flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px]">shield</span>
          </div>
          <h1 className="text-[34px] font-extrabold text-[#1f2937] tracking-tight">Hello, Advocate.</h1>
        </div>

        {/* Start Card */}
        <div className="bg-white rounded-[1.5rem] border border-[#e6edf4] p-8 card-shadow space-y-6">
          <div>
            <h2 className="text-[22px] font-bold text-[#1f2937] mb-1">Ready to Verify? Start here!</h2>
            <p className="text-[#6b7280]">Quick search for case law or statutes</p>
          </div>
          
          <div className="flex h-16 border border-[#e6edf4] rounded-2xl overflow-hidden shadow-sm group focus-within:ring-2 focus-within:ring-[#0b3a6f]/10">
            <div className="w-16 flex items-center justify-center text-[#0b3a6f]">
              <span className="material-symbols-outlined">search</span>
            </div>
            <input 
              type="text" 
              placeholder="e.g., 347 U.S. 483"
              className="flex-1 px-4 text-lg border-none focus:ring-0 placeholder-gray-400"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                   setInputText((e.target as HTMLInputElement).value);
                   setCurrentView('editor');
                   runVerificationBatch();
                }
              }}
            />
            <button 
              onClick={() => {
                const input = document.querySelector('input') as HTMLInputElement;
                if (input.value) {
                  setInputText(input.value);
                  setCurrentView('editor');
                }
              }}
              className="bg-[#0b3a6f] text-white px-8 font-bold tracking-[0.1em] hover:bg-[#092a52] transition-colors"
            >
              VERIFY
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <button onClick={() => setCurrentView('editor')} className="flex items-center justify-center gap-3 h-[120px] bg-[#0b3a6f] text-white rounded-2xl font-bold text-lg shadow-xl shadow-[#0b3a6f]/20 hover:translate-y-[-2px] transition-all">
              <span className="material-symbols-outlined">photo_camera</span>
              Scan Case
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-3 h-[120px] bg-white border border-[#e6edf4] text-[#1f2937] rounded-2xl font-bold text-lg hover:bg-gray-50 transition-all">
              <span className="material-symbols-outlined text-[#f39200]">upload_file</span>
              Upload PDF
            </button>
            <input type="file" ref={fileInputRef} className="hidden" />
          </div>
        </div>

        {/* Ecosystem */}
        <div>
          <h3 className="text-[13px] font-black uppercase tracking-[0.3em] text-[#9aa7b6] mb-4">LexiCite Ecosystem</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: 'map', label: 'Precedent Map', color: '#f59e0b', bg: '#fff3e0' },
              { icon: 'history_edu', label: 'Historical Context', color: '#2563eb', bg: '#e8f1ff' },
              { icon: 'menu_book', label: 'Bluebook Guide', color: '#64748b', bg: '#eef2f7' },
              { icon: 'search', label: 'Case Finder', color: '#16a34a', bg: '#eaf8ef' }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-4 bg-white border border-[#e6edf4] rounded-2xl hover:border-[#0b3a6f]/20 transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: item.bg, color: item.color }}>
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                </div>
                <span className="text-[14px] font-bold text-[#1f2937]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="border-t border-[#e6edf4] pt-8">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-black uppercase tracking-[0.2em] text-[#1f2937]">Recent Activity</h3>
              <button className="text-[13px] font-bold text-[#1d4ed8] hover:underline">Clear All</button>
           </div>
           
           <div className="space-y-3">
             {journal.map(entry => (
               <div key={entry.id} onClick={() => { setInputText(entry.documentTitle); setCurrentView('editor'); }} className="flex items-center gap-4 bg-white border border-[#e6edf4] rounded-2xl p-4 hover:border-[#0b3a6f]/30 transition-all cursor-pointer group">
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-sm ${entry.status === 'verified' ? 'bg-[#22c55e]' : 'bg-[#f59e0b]'}`}>
                   {entry.status === 'verified' ? '✓' : '!'}
                 </div>
                 <div className="flex-1">
                    <div className="font-bold text-[#1f2937]">{entry.documentTitle}</div>
                    <div className={`text-[11px] font-bold uppercase tracking-wider ${entry.status === 'verified' ? 'text-[#16a34a]' : 'text-[#f59e0b]'}`}>
                      {entry.status === 'verified' ? 'VALID LAW • VERIFIED' : 'PENDING REVIEW • AUDIT REQUIRED'}
                    </div>
                 </div>
                 <div className="text-[12px] text-[#9aa7b6] font-medium">
                   {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </div>
               </div>
             ))}
           </div>
        </div>

      </div>
    </div>
  );

  const renderEditor = () => (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      {/* Editor Header */}
      <div className="h-20 sm:h-24 px-10 border-b flex justify-between items-center bg-white shrink-0 z-10">
        <div className="flex items-center gap-6">
          <button onClick={() => setCurrentView('library')} className="flex items-center gap-2 text-[#0b3a6f] font-bold text-xs uppercase tracking-[0.2em] hover:bg-[#eef2f7] px-4 py-2.5 rounded-xl transition-all">
            <ChevronRight className="rotate-180" size={20} /> Dashboard
          </button>
          <div className="hidden sm:flex items-center gap-3 text-[#1f2937] font-extrabold text-xl tracking-tight">
            <span className="material-symbols-outlined text-[#0b3a6f] text-[28px]">description</span>
            <input 
              defaultValue="Untitled Legal Research Brief" 
              className="border-none focus:ring-0 p-0 font-extrabold text-[#1f2937] bg-transparent min-w-[300px]"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={() => { setInputText(''); setCitations([]); }} className="p-3 text-[#94a3b8] hover:text-[#ef4444] hover:bg-[#ef4444]/5 rounded-2xl transition-all">
             <span className="material-symbols-outlined">delete</span>
           </button>
           <button 
             onClick={runVerificationBatch}
             disabled={isAnalyzing || !inputText.trim()}
             className="bg-[#0b3a6f] text-white px-10 h-14 rounded-2xl text-[13px] font-bold uppercase tracking-[0.15em] shadow-xl shadow-[#0b3a6f]/20 disabled:opacity-50 flex items-center gap-3 hover:translate-y-[-1px] transition-all"
           >
             {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <span className="material-symbols-outlined text-[20px]">verified_user</span>}
             Verify Now
           </button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 relative overflow-y-auto scrollbar-hide bg-[#f6f8fb] p-8">
          <div className="max-w-4xl mx-auto w-full relative bg-white min-h-[calc(100vh-200px)] rounded-[2rem] border border-[#e6edf4] shadow-sm overflow-hidden">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="absolute inset-0 w-full h-full p-12 sm:p-20 font-serif text-[18px] sm:text-[21px] leading-relaxed bg-transparent border-none focus:ring-0 resize-none z-10 text-transparent caret-[#0b3a6f]"
              spellCheck={false}
              placeholder="Paste legal text here for instant verification..."
            />
            <div className="p-12 sm:p-20 font-serif text-[18px] sm:text-[21px] leading-relaxed pointer-events-none break-words whitespace-pre-wrap">
              {highlightText(inputText, citations).map((s, i) => {
                const cite = citations.find(c => c.id === s.citationId);
                const isInvalid = cite?.status === 'hallucination' || ['overruled', 'superseded'].includes(cite?.legalStatus || '');
                const isChecking = cite?.status === 'checking';
                
                return (
                  <span key={i} className={s.isCitation ? `border-b-[4px] transition-all cursor-pointer pointer-events-auto rounded-sm ${isChecking ? 'bg-blue-50 border-[#0b3a6f] animate-pulse' : isInvalid ? 'bg-red-50 border-[#ef4444]' : 'bg-green-50/40 border-[#22c55e]'}` : ''} onClick={() => s.isCitation && setIsInspectionPanelOpen(true)}>
                    {s.text}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {isInspectionPanelOpen && (
          <aside className="hidden xl:flex w-[480px] bg-white border-l flex-col animate-in slide-in-from-right duration-500 relative z-20 overflow-hidden">
            <div className="p-8 border-b flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                 <span className="material-symbols-outlined text-[#0b3a6f] text-[28px]">fact_check</span>
                 <h2 className="font-extrabold text-[#1f2937] uppercase tracking-[0.2em] text-[14px]">Precedent Inspector</h2>
              </div>
              <button onClick={() => setIsInspectionPanelOpen(false)} className="p-3 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
              <StatsPanel stats={stats} />
              <div className="flex p-1.5 bg-[#f6f8fb] rounded-2xl border border-[#e6edf4]">
                  {(['all', 'issues', 'valid'] as CitationFilter[]).map(t => (
                    <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-3 text-[11px] font-bold uppercase rounded-xl transition-all ${activeTab === t ? 'bg-white text-[#0b3a6f] shadow-md border border-[#e6edf4]' : 'text-[#94a3b8] hover:text-[#1f2937]'}`}>{t}</button>
                  ))}
              </div>
              <div className="space-y-6">
                {filteredCitations.map(c => <CitationCard key={c.id} citation={c} fullText={inputText} onApplySuperseding={applyCorrection} />)}
                {filteredCitations.length === 0 && (
                  <div className="py-24 text-center flex flex-col items-center gap-6 text-gray-200">
                    <span className="material-symbols-outlined text-[64px] opacity-10">search_off</span>
                    <p className="font-bold uppercase tracking-[0.3em] text-xs">No Audit Results</p>
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#f6f8fb] text-[#1f2937] overflow-hidden font-sans">
      {isAnalyzing && <VerificationOverlay />}
      
      {/* Top Bar */}
      <header className="h-20 sm:h-[88px] bg-white border-b border-[#e6edf4] shrink-0 z-50">
        <div className="max-w-[1200px] mx-auto h-full px-6 flex items-center justify-between">
           <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setCurrentView('library')}>
              <div className="w-11 h-11 bg-[#0b3a6f] rounded-xl flex items-center justify-center text-white relative">
                 <span className="material-symbols-outlined">account_balance</span>
                 <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#f39200] rounded-full border-2 border-white shadow-sm" />
              </div>
              <span className="text-[26px] font-extrabold tracking-tight text-[#0b3a6f]">Lexi<span className="text-[#f39200]">Cite</span>360</span>
           </div>
           
           <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col text-right mr-2">
                 <p className="text-[13px] font-extrabold text-[#1f2937]">Advocate Sarah</p>
                 <p className="text-[10px] font-bold text-[#f39200] uppercase tracking-widest">Master Council</p>
              </div>
              <button onClick={() => setShowAdmin(true)} className="w-11 h-11 rounded-full bg-[#eef2f7] flex items-center justify-center text-gray-500 hover:bg-[#e2e8f0] transition-all">
                <span className="material-symbols-outlined">account_circle</span>
              </button>
           </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {currentView === 'library' && renderLibrary()}
        {currentView === 'editor' && renderEditor()}
      </div>

      {/* Footer / Nav & Ticker Section */}
      <div className="shrink-0 flex flex-col">
        {/* Nav Bar (Mobile Only) */}
        <nav className="h-[84px] bg-white border-t border-[#e6edf4] flex items-center justify-around px-6 lg:hidden">
          {[
            { id: 'library', label: 'Home', icon: 'home' },
            { id: 'recent', label: 'History', icon: 'history' },
            { id: 'starred', label: 'Starred', icon: 'grade' },
            { id: 'settings', label: 'Config', icon: 'settings' }
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => {
                if (item.id === 'settings') setShowAdmin(true);
                else setCurrentView(item.id as ViewState);
              }}
              className={`flex flex-col items-center gap-1 transition-all ${currentView === item.id ? 'text-[#0b3a6f]' : 'text-[#94a3b8]'}`}
            >
              <span className="material-symbols-outlined text-[28px]">{item.icon}</span>
              <span className="text-[10px] font-extrabold uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Status Ticker - Placed at the very bottom as requested */}
        <div className="h-10 bg-[#f39200] text-white flex items-center justify-center px-6 overflow-hidden relative">
           <div className="flex items-center gap-8 animate-[marquee_20s_linear_infinite] whitespace-nowrap">
             <div className="flex items-center gap-3">
                <span className="text-[12px] font-extrabold tracking-[0.12em] uppercase">Citations Verified to Date • 342,891+ Citations</span>
             </div>
             <div className="flex items-center gap-3">
                <span className="text-[12px] font-extrabold tracking-[0.12em] uppercase">Real-Time Sync Active • {stats.total} Citations in current buffer</span>
             </div>
             <div className="flex items-center gap-3">
                <span className="text-[12px] font-extrabold tracking-[0.12em] uppercase">Binding Authority Check: Online • Google Search Grounding: Ready</span>
             </div>
           </div>
        </div>
      </div>

      {/* Admin Panel */}
      {showAdmin && (
        <div className="fixed inset-0 z-[2000] bg-black/40 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col animate-in zoom-in duration-300 overflow-hidden">
              <div className="p-8 flex items-center justify-between border-b border-[#e6edf4] bg-[#f6f8fb]">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#0b3a6f] text-white rounded-2xl"><span className="material-symbols-outlined">settings</span></div>
                    <h2 className="text-2xl font-extrabold text-[#0b3a6f] tracking-tight">System Configuration</h2>
                 </div>
                 <button onClick={() => setShowAdmin(false)} className="p-3 bg-white hover:bg-gray-100 border border-[#e6edf4] rounded-full transition-all"><X size={24} /></button>
              </div>
              <div className="p-10 space-y-10">
                 <div className="flex items-center gap-8 p-8 bg-[#e6f0fb] rounded-[2rem] border border-[#0b3a6f]/10">
                    <div className="w-24 h-24 bg-[#0b3a6f] rounded-[1.8rem] flex items-center justify-center text-white text-4xl font-black italic">SJ</div>
                    <div>
                       <h3 className="text-2xl font-extrabold text-[#0b3a6f]">Sarah Jenkins</h3>
                       <p className="text-gray-500 font-bold">Managing Partner | LexiCite Enterprise</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                   <label className="text-[12px] font-black text-gray-400 uppercase tracking-widest block">CourtListener API Token</label>
                   <input 
                     type="password"
                     value={courtListenerKey}
                     onChange={(e) => {setCourtListenerKey(e.target.value); localStorage.setItem(CL_KEY_STORAGE_KEY, e.target.value);}}
                     className="w-full bg-[#f6f8fb] border-2 border-[#e6edf4] rounded-2xl py-6 px-8 font-mono focus:ring-4 focus:ring-[#0b3a6f]/5 outline-none"
                     placeholder="Enter Token..."
                   />
                 </div>

                 <div className="flex gap-4">
                   <button onClick={() => setShowAdmin(false)} className="flex-1 bg-[#0b3a6f] text-white h-16 rounded-2xl font-bold uppercase tracking-widest hover:bg-[#092a52] transition-all shadow-lg">Save Changes</button>
                   <button onClick={() => setShowAdmin(false)} className="flex-1 bg-white border border-[#e6edf4] text-[#ef4444] h-16 rounded-2xl font-bold uppercase tracking-widest hover:bg-red-50 transition-all">Logout</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;