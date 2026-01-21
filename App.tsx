import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShieldCheck, Eraser, Settings, FileText, ChevronRight, ChevronLeft, Search, 
  Briefcase, Zap, Loader2, Code, RotateCcw, ArrowUpDown, Menu, X, 
  PanelRightClose, PanelRightOpen, Database, Globe, Scale, AlertCircle, Check, Trash2
} from 'lucide-react';
import { Citation, AnalysisStats, CitationFilter, SortOption, VerificationMode } from './types';
import { extractCitations, highlightText, DEFAULT_CITATION_PATTERN } from './services/citationService';
import { verifyCitationWithGemini } from './services/geminiService';
import { lookupCitationOnCourtListener } from './services/courtListenerService';
import CitationCard from './components/CitationCard';
import StatsPanel from './components/StatsPanel';

const STORAGE_KEY = 'citeops_saved_text';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

const DEFAULT_TEXT = `The legal framework regarding abortion has shifted significantly. 
Previously, the primary authority was Roe v. Wade, 410 U.S. 113 (1973). 
However, modern briefs must account for the ruling in Dobbs v. Jackson Women's Health Organization, 597 U.S. 215 (2022).
For criminal procedure, see Miranda v. Arizona, 384 U.S. 436 (1966).`;

const App: React.FC = () => {
  const [inputText, setInputText] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved !== null ? saved : DEFAULT_TEXT;
  });

  const [citations, setCitations] = useState<Citation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<CitationFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('status');
  const [documentTitle, setDocumentTitle] = useState("Precedent Verification: High-Value Brief");
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [verificationMode, setVerificationMode] = useState<VerificationMode>('research');
  const [customRegex, setCustomRegex] = useState<string>(DEFAULT_CITATION_PATTERN);
  const [showSettings, setShowSettings] = useState(false);
  const [noCitationsFound, setNoCitationsFound] = useState(false);
  
  // Grounding Engine States
  const [isGoogleSearchEnabled, setIsGoogleSearchEnabled] = useState(true);
  const [isCourtListenerEnabled, setIsCourtListenerEnabled] = useState(true);
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isInspectionPanelOpen, setIsInspectionPanelOpen] = useState(true);

  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textRef = useRef(inputText);

  // Keep ref in sync for periodic auto-save
  useEffect(() => {
    textRef.current = inputText;
  }, [inputText]);

  // Periodic Auto-Save Effect
  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem(STORAGE_KEY, textRef.current);
      console.log('Auto-saved to local storage');
    }, AUTO_SAVE_INTERVAL);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarCollapsed(true);
      if (window.innerWidth < 1280) setIsInspectionPanelOpen(false);
      else setIsInspectionPanelOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const stats: AnalysisStats = useMemo(() => {
    if (!citations || citations.length === 0) {
      return { total: 0, valid: 0, invalid: 0, pending: 0 };
    }
    const validCount = citations.filter(c => c.status === 'valid' && (c.legalStatus === 'good' || c.legalStatus === 'unknown')).length;
    const invalidCount = citations.filter(c => c.status === 'hallucination' || c.legalStatus === 'overruled' || c.legalStatus === 'superseded').length;
    const pendingCount = citations.filter(c => c.status === 'pending' || c.status === 'checking').length;
    
    return {
      total: citations.length,
      valid: validCount,
      invalid: invalidCount,
      pending: pendingCount
    };
  }, [citations]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);
    
    if (isLiveMode) {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
      debounceTimeout.current = setTimeout(() => {
        analyzeText(text);
      }, 1000);
    }
  };

  const handleApplySuperseding = (id: string, newName: string) => {
    setCitations(prev => prev.map(c => 
      c.id === id ? { ...c, status: 'valid', caseName: newName, legalStatus: 'good' as const } : c
    ));
  };

  const clearSavedData = () => {
    localStorage.removeItem(STORAGE_KEY);
    alert('Local saved data has been cleared. The editor content will reset to default on next reload if current session is ended.');
  };

  const analyzeText = async (textToAnalyze: string = inputText) => {
    setIsAnalyzing(true);
    setNoCitationsFound(false);
    
    const extracted = extractCitations(textToAnalyze, customRegex);
    
    if (extracted.length === 0) {
      setCitations([]);
      setNoCitationsFound(true);
      setIsAnalyzing(false);
      return;
    }

    setCitations(extracted);

    const verificationPromises = extracted.map(async (cite) => {
      setCitations(prev => prev.map(c => c.id === cite.id ? { ...c, status: 'checking' } : c));
      
      try {
        // Step 1: Gemini AI Verification (Respect Google Search preference)
        const activeMode = isGoogleSearchEnabled ? verificationMode : 'standard';
        const result = await verifyCitationWithGemini(cite.originalText, activeMode);
        
        let courtListenerData = null;
        // Step 2: Authority Verification (Respect CourtListener preference)
        const courtListenerToken = (process.env as any).COURTLISTENER_API_KEY;
        if (isCourtListenerEnabled && courtListenerToken && result.isValid) {
          courtListenerData = await lookupCitationOnCourtListener(cite.originalText, courtListenerToken);
        }

        setCitations(prev => prev.map(c => {
          if (c.id === cite.id) {
            const isTechnicalError = result.reason.includes("Network Error") || 
                                     result.reason.includes("Rate Limit") || 
                                     result.reason.includes("API Key") ||
                                     result.reason.includes("unexpected error");

            return {
              ...c,
              status: isTechnicalError ? 'error' : (result.isValid ? 'valid' : 'hallucination'),
              caseName: courtListenerData?.caseName || result.caseName || undefined,
              reason: courtListenerData?.error ? `${result.reason} (Note: CourtListener lookup failed: ${courtListenerData.error})` : result.reason,
              legalStatus: result.legalStatus,
              confidence: result.confidence,
              supersedingCase: result.supersedingCase || undefined,
              sources: courtListenerData?.absolute_url 
                ? [{ uri: courtListenerData.absolute_url, title: 'Authoritative Opinion (CourtListener)' }, ...(result.sources || [])]
                : result.sources,
              courtListenerId: courtListenerData?.id || undefined,
              isCourtListenerVerified: !!courtListenerData?.found
            };
          }
          return c;
        }));
      } catch (e) {
        setCitations(prev => prev.map(c => c.id === cite.id ? { 
          ...c, 
          status: 'error', 
          reason: "An unexpected internal error occurred during verification." 
        } : c));
      }
    });

    await Promise.all(verificationPromises);
    setIsAnalyzing(false);
  };

  const filteredCitations = useMemo(() => {
    let filtered = [...citations];
    
    if (activeTab === 'issues') {
      filtered = filtered.filter(c => c.status === 'hallucination' || c.status === 'error' || c.legalStatus === 'overruled' || c.legalStatus === 'superseded');
    } else if (activeTab === 'valid') {
      filtered = filtered.filter(c => c.status === 'valid' && c.legalStatus === 'good');
    } else if (activeTab === 'superseded') {
      filtered = filtered.filter(c => c.legalStatus === 'superseded');
    }

    return filtered.sort((a, b) => {
      if (sortBy === 'name') return (a.caseName || '').localeCompare(b.caseName || '');
      if (sortBy === 'confidence') return (b.confidence || 0) - (a.confidence || 0);
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      return a.startIndex - b.startIndex;
    });
  }, [citations, activeTab, sortBy]);

  const highlightedSegments = useMemo(() => highlightText(inputText, citations), [inputText, citations]);

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className={`${isSidebarCollapsed ? 'w-16' : 'w-64'} bg-gray-900 text-white transition-all duration-300 hidden lg:flex flex-col z-20`}>
        <div className="p-4 flex items-center justify-between border-b border-gray-800">
          {!isSidebarCollapsed && <div className="flex items-center gap-2 font-black text-xl tracking-tighter"><ShieldCheck className="text-blue-400" /> CITEOPS</div>}
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1 hover:bg-gray-800 rounded">
            {isSidebarCollapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
          </button>
        </div>
        
        <nav className="flex-1 p-2 space-y-1">
          <button className="w-full flex items-center gap-3 p-3 bg-blue-600 rounded-lg font-bold text-sm">
            <FileText size={18} /> {!isSidebarCollapsed && "Legal Briefs"}
          </button>
          <button className="w-full flex items-center gap-3 p-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg font-bold text-sm transition-colors">
            <Briefcase size={18} /> {!isSidebarCollapsed && "Case Files"}
          </button>
          <button onClick={() => setShowSettings(!showSettings)} className="w-full flex items-center gap-3 p-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg font-bold text-sm transition-colors">
            <Settings size={18} /> {!isSidebarCollapsed && "Engine Config"}
          </button>
        </nav>

        <div className="p-4 border-t border-gray-800">
          {!isSidebarCollapsed && (
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <div className="text-[10px] font-bold text-gray-500 uppercase mb-2">Verification Engine</div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Gemini 3 Pro
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2" onClick={() => setIsMobileSidebarOpen(true)}><Menu size={20} /></button>
            <input 
              value={documentTitle} 
              onChange={(e) => setDocumentTitle(e.target.value)}
              className="font-bold text-gray-800 border-none bg-transparent focus:ring-0 p-0 text-sm md:text-base"
            />
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            <div className="hidden md:flex items-center bg-gray-100 rounded-full px-3 py-1 gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${isLiveMode ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-[10px] font-bold uppercase text-gray-500">Live Analysis</span>
              <button 
                onClick={() => setIsLiveMode(!isLiveMode)}
                className={`w-8 h-4 rounded-full relative transition-colors ${isLiveMode ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${isLiveMode ? 'left-4.5' : 'left-0.5'}`} />
              </button>
            </div>
            
            <button 
              onClick={() => analyzeText()}
              disabled={isAnalyzing || !inputText.trim()}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-gray-800 disabled:opacity-50 transition-all shadow-sm"
            >
              {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} className="fill-current" />}
              {isAnalyzing ? "Checking..." : "Verify All"}
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Editor Area */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden border-r border-gray-100">
            <div className="flex items-center gap-4 p-2 border-b border-gray-50 bg-gray-50/30">
              <button className="p-1.5 text-gray-500 hover:bg-white rounded border border-transparent hover:border-gray-200 transition-all shadow-sm"><RotateCcw size={14} /></button>
              <div className="h-4 w-[1px] bg-gray-200" />
              <div className="flex gap-1">
                <button 
                  onClick={() => setVerificationMode('standard')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-full border transition-all ${verificationMode === 'standard' ? 'bg-white border-gray-200 text-gray-900 shadow-sm' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                >
                  Standard
                </button>
                <button 
                  onClick={() => setVerificationMode('research')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-full border transition-all ${verificationMode === 'research' ? 'bg-white border-gray-200 text-gray-900 shadow-sm' : 'text-gray-400 border-transparent hover:text-gray-600'}`}
                  disabled={!isGoogleSearchEnabled}
                  title={!isGoogleSearchEnabled ? "Enable Google Search in Engine Config to use Deep Search" : ""}
                >
                  Deep Search
                </button>
              </div>
            </div>
            
            <div className="flex-1 relative overflow-auto p-8 font-serif leading-relaxed text-lg bg-white/50">
              <textarea
                value={inputText}
                onChange={handleTextChange}
                placeholder="Paste legal text here..."
                className="absolute inset-0 w-full h-full p-8 bg-transparent border-none focus:ring-0 resize-none z-10 text-transparent caret-gray-900"
              />
              <div className="pointer-events-none">
                {highlightedSegments.map((segment, i) => (
                  <span 
                    key={i} 
                    className={segment.isCitation ? 
                      `bg-blue-100/50 border-b-2 ${
                        citations.find(c => c.id === segment.citationId)?.status === 'hallucination' ? 'border-red-400 bg-red-50/50' : 
                        citations.find(c => c.id === segment.citationId)?.status === 'error' ? 'border-amber-400 bg-amber-50/50' : 
                        'border-blue-400'
                      }` : 
                      ''
                    }
                  >
                    {segment.text}
                  </span>
                ))}
              </div>
            </div>

            {noCitationsFound && (
              <div className="p-4 bg-yellow-50 border-t border-yellow-100 flex items-center gap-3 text-xs text-yellow-800">
                <AlertCircle size={14} /> No citations detected with the current pattern. Try adjusting regex in settings.
              </div>
            )}
          </div>

          {/* Inspection Panel */}
          <aside className={`${isInspectionPanelOpen ? 'w-full md:w-80 lg:w-96' : 'w-0'} bg-gray-50 border-l border-gray-200 flex flex-col transition-all duration-300 overflow-hidden`}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-gray-400" />
                <h2 className="font-bold text-sm">Findings ({citations.length})</h2>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setSortBy('status')} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><ArrowUpDown size={14} /></button>
                <button onClick={() => setIsInspectionPanelOpen(false)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500"><X size={14} /></button>
              </div>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              <StatsPanel stats={stats} />
              
              <div className="flex p-1 bg-gray-200/50 rounded-lg">
                {(['all', 'issues', 'superseded', 'valid'] as CitationFilter[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-md transition-all ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {filteredCitations.map(cite => (
                  <CitationCard 
                    key={cite.id} 
                    citation={cite} 
                    onApplySuperseding={handleApplySuperseding}
                  />
                ))}
                {filteredCitations.length === 0 && !isAnalyzing && (
                  <div className="py-12 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <Scale className="text-gray-300" />
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No matching results</p>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {!isInspectionPanelOpen && (
            <button 
              onClick={() => setIsInspectionPanelOpen(true)}
              className="absolute right-0 top-1/2 -translate-y-1/2 bg-white border border-gray-200 p-2 rounded-l-xl shadow-lg hover:bg-gray-50 z-20"
            >
              <ChevronLeft size={20} />
            </button>
          )}
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-black tracking-tight flex items-center gap-2"><Settings className="text-blue-600" /> Verification Settings</h3>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-2">Extraction Pattern (Regex)</label>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200 font-mono text-xs">
                    <Code size={14} className="text-gray-400" />
                    <input 
                      value={customRegex}
                      onChange={(e) => setCustomRegex(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 p-0 w-full"
                    />
                  </div>
                  <button 
                    onClick={() => setCustomRegex(DEFAULT_CITATION_PATTERN)}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-2">Grounding Engines</label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Google Search Toggle */}
                  <button 
                    onClick={() => setIsGoogleSearchEnabled(!isGoogleSearchEnabled)}
                    className={`p-3 border-2 rounded-xl relative overflow-hidden text-left transition-all ${
                      isGoogleSearchEnabled 
                      ? 'border-blue-600 bg-blue-50/50 shadow-sm' 
                      : 'border-gray-100 bg-gray-50/50 grayscale opacity-60'
                    }`}
                  >
                    <div className="absolute top-2 right-2">
                      {isGoogleSearchEnabled ? (
                        <div className="bg-blue-600 text-white rounded-full p-0.5"><Check size={12} /></div>
                      ) : (
                        <Globe className="text-gray-300" size={16} />
                      )}
                    </div>
                    <div className={`text-xs font-black mb-1 ${isGoogleSearchEnabled ? 'text-blue-900' : 'text-gray-400'}`}>Google Search</div>
                    <div className={`text-[10px] leading-snug ${isGoogleSearchEnabled ? 'text-blue-700' : 'text-gray-400'}`}>Deep verification against current web data and news archives.</div>
                  </button>

                  {/* CourtListener Toggle */}
                  <button 
                    onClick={() => setIsCourtListenerEnabled(!isCourtListenerEnabled)}
                    className={`p-3 border-2 rounded-xl relative overflow-hidden text-left transition-all ${
                      isCourtListenerEnabled 
                      ? 'border-blue-600 bg-blue-50/50 shadow-sm' 
                      : 'border-gray-100 bg-gray-50/50 grayscale opacity-60'
                    }`}
                  >
                    <div className="absolute top-2 right-2">
                      {isCourtListenerEnabled ? (
                        <div className="bg-blue-600 text-white rounded-full p-0.5"><Check size={12} /></div>
                      ) : (
                        <Database className="text-gray-300" size={16} />
                      )}
                    </div>
                    <div className={`text-xs font-black mb-1 ${isCourtListenerEnabled ? 'text-blue-900' : 'text-gray-400'}`}>CourtListener</div>
                    <div className={`text-[10px] leading-snug ${isCourtListenerEnabled ? 'text-blue-700' : 'text-gray-400'}`}>Authoritative lookup against 10M+ legal opinions.</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-2">Data & Storage</label>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs font-bold text-gray-800">Local Auto-Save</div>
                      <div className="text-[10px] text-gray-500">Editor content is saved every 30s for crash recovery.</div>
                    </div>
                    <div className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[8px] font-black uppercase">Active</div>
                  </div>
                  <button 
                    onClick={clearSavedData}
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 text-xs font-bold py-1 px-2 hover:bg-red-50 rounded transition-all"
                  >
                    <Trash2 size={14} /> Clear Saved Local Data
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 bg-gray-50 flex justify-end">
              <button onClick={() => setShowSettings(false)} className="bg-gray-900 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-gray-800 transition-all">Apply & Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;