import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShieldCheck, Eraser, Settings, FileText, ChevronRight, ChevronLeft, Search, 
  Briefcase, Zap, Loader2, Code, RotateCcw, ArrowUpDown, Menu, X, 
  PanelRightClose, PanelRightOpen, Database, Globe, Scale, AlertCircle
} from 'lucide-react';
import { Citation, AnalysisStats, CitationFilter, SortOption, VerificationMode } from './types';
import { extractCitations, highlightText, DEFAULT_CITATION_PATTERN } from './services/citationService';
import { verifyCitationWithGemini } from './services/geminiService';
import CitationCard from './components/CitationCard';
import StatsPanel from './components/StatsPanel';

const App: React.FC = () => {
  const [inputText, setInputText] = useState<string>(`The legal framework regarding abortion has shifted significantly. 
Previously, the primary authority was Roe v. Wade, 410 U.S. 113 (1973). 
However, modern briefs must account for the ruling in Dobbs v. Jackson Women's Health Organization, 597 U.S. 215 (2022).
For criminal procedure, see Miranda v. Arizona, 384 U.S. 436 (1966).`);

  const [citations, setCitations] = useState<Citation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<CitationFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('status');
  const [documentTitle, setDocumentTitle] = useState("Precedent Verification: High-Value Brief");
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [verificationMode, setVerificationMode] = useState<VerificationMode>('research');
  const [customRegex, setCustomRegex] = useState<string>(DEFAULT_CITATION_PATTERN);
  const [showSettings, setShowSettings] = useState(false);
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isInspectionPanelOpen, setIsInspectionPanelOpen] = useState(true);

  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const validCount = citations.filter(c => c.status === 'valid' && c.legalStatus === 'good').length;
    const issueCount = citations.filter(c => c.status === 'hallucination' || c.legalStatus === 'overruled' || c.legalStatus === 'superseded').length;
    
    return {
      total: citations.length,
      valid: validCount,
      invalid: issueCount,
      pending: citations.filter(c => c.status === 'pending' || c.status === 'checking').length,
    };
  }, [citations]);

  const filteredAndSortedCitations = useMemo(() => {
    let result = [...citations];
    if (activeTab === 'issues') result = result.filter(c => c.status === 'hallucination' || c.legalStatus === 'overruled' || c.legalStatus === 'superseded');
    else if (activeTab === 'valid') result = result.filter(c => c.status === 'valid' && c.legalStatus === 'good');

    result.sort((a, b) => {
      switch (sortBy) {
        case 'original': return a.originalText.localeCompare(b.originalText);
        case 'name': return (a.caseName || '').localeCompare(b.caseName || '');
        case 'status':
          const order: any = { 'overruled': 0, 'hallucination': 1, 'superseded': 2, 'caution': 3, 'good': 4, 'unknown': 5 };
          return (order[a.legalStatus || 'unknown'] || 9) - (order[b.legalStatus || 'unknown'] || 9);
        case 'confidence': return (b.confidence || 0) - (a.confidence || 0);
        default: return 0;
      }
    });
    return result;
  }, [citations, activeTab, sortBy]);

  const runAnalysis = async () => {
    if (!inputText.trim()) return;
    setIsAnalyzing(true);
    if (!isLiveMode) {
        setActiveTab('all'); 
        setIsInspectionPanelOpen(true);
    }
    
    const extracted = extractCitations(inputText, customRegex);
    setCitations(extracted);

    if (extracted.length === 0) {
      setIsAnalyzing(false);
      return;
    }

    const verificationPromises = extracted.map(async (citation) => {
      setCitations(prev => prev.map(c => c.id === citation.id ? { ...c, status: 'checking' } : c));
      const result = await verifyCitationWithGemini(citation.originalText, verificationMode);

      setCitations(prev => prev.map(c => {
        if (c.id === citation.id) {
          return {
            ...c,
            status: result.isValid ? 'valid' : 'hallucination',
            legalStatus: result.legalStatus,
            supersedingCase: result.supersedingCase,
            caseName: result.caseName || undefined,
            reason: result.reason,
            confidence: result.confidence,
            sources: result.sources
          };
        }
        return c;
      }));
    });

    await Promise.allSettled(verificationPromises);
    setIsAnalyzing(false);
  };

  useEffect(() => {
    if (!isLiveMode) return;
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => runAnalysis(), 1500); 
    return () => { if (debounceTimeout.current) clearTimeout(debounceTimeout.current); };
  }, [inputText, isLiveMode, customRegex, verificationMode]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (!isLiveMode && citations.length > 0) setCitations([]);
  };

  const renderHighlightedText = () => {
    const segments = highlightText(inputText, citations);
    return segments.map((segment, idx) => {
      if (!segment.isCitation) return <span key={idx}>{segment.text}</span>;
      const citation = citations.find(c => c.id === segment.citationId);
      const isBadLaw = citation?.legalStatus === 'overruled' || citation?.legalStatus === 'superseded' || citation?.status === 'hallucination';
      
      const colorClass = 
        citation?.status === 'checking' ? 'bg-blue-100 animate-pulse' :
        isBadLaw ? 'bg-red-100 text-red-900 border-b-2 border-red-500' :
        citation?.legalStatus === 'caution' ? 'bg-yellow-100 border-b-2 border-yellow-500' :
        citation?.status === 'valid' ? 'bg-green-100 border-b-2 border-green-500' : 'bg-gray-100';

      return (
        <span 
          key={idx} 
          className={`px-0.5 rounded-sm cursor-help transition-all ${colorClass}`} 
          title={citation?.reason || citation?.caseName}
        >
          {segment.text}
        </span>
      );
    });
  };

  const SidebarContent = () => (
    <>
      <div className={`p-6 flex items-center space-x-3 text-white transition-opacity duration-300 ${isSidebarCollapsed && !isMobileSidebarOpen ? 'opacity-0' : 'opacity-100'}`}>
        <div className="bg-blue-600 p-2 rounded-lg shadow-lg flex-shrink-0"><Scale className="w-5 h-5" /></div>
        <span className="font-bold text-lg tracking-tight whitespace-nowrap">CiteCheck Pro</span>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <div className={`text-[10px] uppercase font-bold text-slate-500 mb-2 mt-4 px-2 tracking-widest ${isSidebarCollapsed && !isMobileSidebarOpen ? 'hidden' : 'block'}`}>Verification Settings</div>
        
        {(!isSidebarCollapsed || isMobileSidebarOpen) && (
          <div className="px-2 py-2 space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                <Globe className="w-3 h-3 mr-2 text-blue-400" /> Grounding Mode
              </label>
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button onClick={() => setVerificationMode('standard')} className={`flex-1 text-[9px] font-bold uppercase py-1.5 rounded transition-all ${verificationMode === 'standard' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Standard</button>
                <button onClick={() => setVerificationMode('research')} className={`flex-1 text-[9px] font-bold uppercase py-1.5 rounded transition-all ${verificationMode === 'research' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Deep Research</button>
              </div>
              <p className="text-[8px] text-slate-500 italic px-1 leading-tight mt-2">
                Deep Research mode performs real-time precedent history checks using web indices.
              </p>
            </div>
          </div>
        )}

        <button onClick={() => !isSidebarCollapsed && setShowSettings(!showSettings)} className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-slate-800 transition-colors">
          <div className="flex items-center space-x-3">
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span className={`text-sm font-medium ${isSidebarCollapsed && !isMobileSidebarOpen ? 'hidden' : 'block'}`}>Integrations</span>
          </div>
          {(!isSidebarCollapsed || isMobileSidebarOpen) && <ChevronRight className={`w-3 h-3 transition-transform ${showSettings ? 'rotate-90' : ''}`} />}
        </button>

        {showSettings && (!isSidebarCollapsed || isMobileSidebarOpen) && (
          <div className="mt-2 px-3 py-3 bg-slate-800/50 rounded-md border border-slate-700/50 space-y-3">
             <div className="space-y-1">
               <label className="text-[9px] font-bold text-slate-400 uppercase">CourtListener Key</label>
               <input type="password" placeholder="Key..." className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-300 focus:ring-1 focus:ring-blue-500" />
             </div>
             <div className="space-y-1 pt-2 border-t border-slate-700">
               <div className="flex items-center justify-between">
                 <label className="text-[9px] font-bold text-slate-400 uppercase">Regex Pattern</label>
                 <button onClick={() => setCustomRegex(DEFAULT_CITATION_PATTERN)} className="text-[9px] text-blue-400 hover:text-blue-300"><RotateCcw className="w-2.5 h-2.5" /></button>
               </div>
               <textarea value={customRegex} onChange={(e) => setCustomRegex(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-[10px] font-mono text-slate-300 h-16 resize-none focus:ring-1 focus:ring-blue-500" />
             </div>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className={`bg-slate-800 rounded-lg border border-slate-700 transition-all ${isSidebarCollapsed && !isMobileSidebarOpen ? 'p-1' : 'p-3'}`}>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs ring-2 ring-blue-400/20 flex-shrink-0">JD</div>
            {(!isSidebarCollapsed || isMobileSidebarOpen) && (
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-white truncate">Jane Doe</div>
                <div className="text-[9px] text-blue-400 font-bold uppercase tracking-widest truncate">Tier: Enterprise</div>
              </div>
            )}
          </div>
        </div>
      </div>
      <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden lg:flex absolute top-1/2 -right-3 h-6 w-6 bg-slate-800 border border-slate-700 text-slate-400 rounded-full items-center justify-center hover:text-white transition-all z-50 transform -translate-y-1/2 shadow-lg">
        {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </>
  );

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden relative">
      <aside className={`hidden md:flex bg-slate-900 text-slate-300 flex-col border-r border-slate-800 flex-shrink-0 transition-all duration-300 relative z-30 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <SidebarContent />
      </aside>
      
      {isMobileSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsMobileSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 bg-slate-900 text-slate-300 flex flex-col w-64 z-50 md:hidden transition-transform duration-300 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute top-4 right-4 text-slate-400"><button onClick={() => setIsMobileSidebarOpen(false)}><X className="w-6 h-6" /></button></div>
        <SidebarContent />
      </aside>
      
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 z-20 shadow-sm">
          <div className="flex items-center space-x-3">
             <button onClick={() => setIsMobileSidebarOpen(true)} className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><Menu className="w-6 h-6" /></button>
             <div className="flex flex-col">
               <input type="text" value={documentTitle} onChange={(e) => setDocumentTitle(e.target.value)} className="font-semibold text-gray-800 border-none focus:ring-0 p-0 text-sm md:text-base bg-transparent hover:bg-gray-50 rounded px-1 max-w-[150px] md:max-w-none truncate" />
               <span className="text-[10px] text-gray-400 flex items-center uppercase font-bold tracking-widest mt-0.5 whitespace-nowrap">
                 <ShieldCheck className="w-3 h-3 mr-1 text-green-500" /> {verificationMode === 'research' ? 'Deep Precedent Audit Active' : 'Basic Verification Active'}
               </span>
             </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => setIsLiveMode(!isLiveMode)} className={`hidden sm:flex items-center space-x-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors`}>
               <div className={`h-2 w-2 rounded-full ${isLiveMode ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
               <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Live Audit</span>
            </button>
            <button 
              onClick={() => runAnalysis()} 
              disabled={isAnalyzing || !inputText} 
              className={`flex items-center space-x-2 px-3 md:px-4 py-2 text-xs md:text-sm font-bold uppercase tracking-wider text-white rounded-md shadow-md transition-all ${isAnalyzing || !inputText ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-95'}`}
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span className="hidden sm:inline">{isAnalyzing ? 'Scanning Authority...' : 'Verify Precedent'}</span>
              <span className="sm:hidden">Verify</span>
            </button>
            <button onClick={() => setIsInspectionPanelOpen(!isInspectionPanelOpen)} className={`p-2 rounded-lg border border-gray-200 transition-colors ${isInspectionPanelOpen ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-500'}`}>
              {isInspectionPanelOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
            </button>
          </div>
        </header>

        <main className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto bg-gray-100/80 p-4 md:p-8 flex justify-center relative">
            <div className="w-full max-w-3xl bg-white min-h-[calc(100vh-12rem)] shadow-xl border border-gray-200 rounded-lg p-6 md:p-16 relative flex flex-col transition-all">
              {isAnalyzing && (
                <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center rounded-lg">
                  <div className="bg-white/90 px-6 py-4 rounded-full shadow-2xl border border-blue-100 flex items-center space-x-3 animate-pulse">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    <span className="text-[10px] md:text-sm font-bold text-blue-800 uppercase tracking-widest">Cross-Referencing Authority...</span>
                  </div>
                </div>
              )}
              {citations.length > 0 && !isLiveMode ? (
                <div className="font-serif text-base md:text-lg leading-relaxed text-gray-900 whitespace-pre-wrap select-text">
                  {renderHighlightedText()}
                </div>
              ) : (
                <textarea 
                  className="w-full flex-1 min-h-[60vh] resize-none outline-none border-none font-serif text-base md:text-lg text-gray-900 placeholder-gray-400 bg-white" 
                  placeholder="Paste your legal brief here. We will check every citation against the most recent controlling case law..." 
                  value={inputText} 
                  onChange={handleTextChange} 
                  spellCheck={false} 
                />
              )}
              {citations.length > 0 && !isLiveMode && (
                <div className="absolute top-4 right-4 md:top-6 md:right-6 z-20">
                  <button onClick={() => setCitations([])} className="flex items-center space-x-2 bg-white text-gray-600 text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-full border border-gray-200 hover:shadow-lg hover:text-blue-600 transition-all">
                    <Eraser className="w-3 h-3" />
                    <span>Clear & Edit</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <aside className={`fixed inset-y-16 right-0 w-full sm:w-80 md:w-96 bg-white border-l border-gray-200 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${isInspectionPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
             <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50/30">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-gray-800 uppercase tracking-widest text-[10px]">Precedent Audit</h3>
                 {verificationMode === 'research' && (
                    <div className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[8px] font-black uppercase rounded flex items-center">
                      <Globe className="w-2.5 h-2.5 mr-1" /> Grounded
                    </div>
                 )}
               </div>
               <StatsPanel stats={stats} />
             </div>
             <div className="flex border-b border-gray-100 px-4 md:px-6 space-x-4 md:space-x-8 overflow-x-auto scrollbar-hide">
                <button onClick={() => setActiveTab('all')} className={`py-4 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === 'all' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>All ({citations.length})</button>
                <button onClick={() => setActiveTab('issues')} className={`py-4 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === 'issues' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Issues ({stats.invalid})</button>
                <button onClick={() => setActiveTab('valid')} className={`py-4 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === 'valid' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>Current ({stats.valid})</button>
             </div>
             <div className="px-4 md:px-6 py-2 bg-gray-50/30 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-2"><ArrowUpDown className="w-3 h-3 text-gray-400" /><span className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sort:</span></div>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="bg-transparent border-none text-[9px] md:text-[10px] font-bold text-blue-600 uppercase tracking-widest focus:ring-0 cursor-pointer p-0">
                  <option value="original">Original</option>
                  <option value="name">Name</option>
                  <option value="status">Legal Standing</option>
                  <option value="confidence">Confidence</option>
                </select>
             </div>
             <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/50 space-y-4">
                {citations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center px-4">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4"><Search className="w-6 h-6 md:w-8 md:h-8 text-gray-300" /></div>
                    <p className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-wider">Awaiting Analysis</p>
                    <p className="text-[10px] md:text-xs mt-2 text-gray-400 leading-relaxed">Submit text to begin temporal precedent verification.</p>
                  </div>
                ) : filteredAndSortedCitations.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 font-medium text-[10px] uppercase tracking-widest flex flex-col items-center">
                    <AlertCircle className="w-6 h-6 mb-2 opacity-20" />
                    <span>No matching results</span>
                  </div>
                ) : (
                  filteredAndSortedCitations.map(cite => <CitationCard key={cite.id} citation={cite} />)
                )}
             </div>
          </aside>
        </main>
      </div>
    </div>
  );
};

export default App;