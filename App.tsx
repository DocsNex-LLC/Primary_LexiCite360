import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BookOpen, ShieldCheck, Eraser, Play, Layout, Clock, 
  Settings, FileText, Download, ChevronRight, Search, 
  User, CheckCircle, AlertTriangle, Briefcase, Zap
} from 'lucide-react';
import { Citation, AnalysisStats, CitationFilter } from './types';
import { extractCitations, highlightText } from './services/citationService';
import { verifyCitationWithGemini } from './services/geminiService';
import CitationCard from './components/CitationCard';
import StatsPanel from './components/StatsPanel';

const App: React.FC = () => {
  const [inputText, setInputText] = useState<string>(`This is a sample brief.

In the landmark case of Roe v. Wade, 410 U.S. 113 (1973), the Court established key precedents. 
However, recent AI outputs often cite non-existent cases like Smith v. Jones, 999 U.S. 999 (2024), which is a clear hallucination.
Another valid reference is 347 U.S. 483 (1954), commonly known as Brown v. Board of Education.

Please analyze the text above.`);

  const [citations, setCitations] = useState<Citation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<CitationFilter>('all');
  const [documentTitle, setDocumentTitle] = useState("Untitled Legal Brief");
  const [isLiveMode, setIsLiveMode] = useState(false);

  // Debounce ref
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stats calculation
  const stats: AnalysisStats = useMemo(() => {
    return {
      total: citations.length,
      valid: citations.filter(c => c.status === 'valid').length,
      invalid: citations.filter(c => c.status === 'hallucination').length,
      pending: citations.filter(c => c.status === 'pending' || c.status === 'checking').length,
    };
  }, [citations]);

  const filteredCitations = useMemo(() => {
    if (activeTab === 'issues') return citations.filter(c => c.status === 'hallucination');
    if (activeTab === 'valid') return citations.filter(c => c.status === 'valid');
    return citations;
  }, [citations, activeTab]);

  const runAnalysis = async () => {
    if (!inputText.trim()) return;

    setIsAnalyzing(true);
    // Only switch tab if manually triggered or if logic requires it. 
    // For live mode, we might not want to jump tabs unexpectedly, but for now we keep it consistent.
    if (!isLiveMode) setActiveTab('all'); 
    
    // 1. Extract
    const extracted = extractCitations(inputText);
    setCitations(extracted);

    if (extracted.length === 0) {
      setIsAnalyzing(false);
      return;
    }

    // 2. Verify
    const verificationPromises = extracted.map(async (citation) => {
      // Set to checking
      setCitations(prev => prev.map(c => c.id === citation.id ? { ...c, status: 'checking' } : c));

      // Call API
      const result = await verifyCitationWithGemini(citation.originalText);

      // Update Result
      setCitations(prev => prev.map(c => {
        if (c.id === citation.id) {
          return {
            ...c,
            status: result.isValid ? 'valid' : 'hallucination',
            caseName: result.caseName || undefined,
            reason: result.reason,
            confidence: result.confidence
          };
        }
        return c;
      }));
    });

    await Promise.allSettled(verificationPromises);
    setIsAnalyzing(false);
  };

  // Real-time analysis effect
  useEffect(() => {
    if (!isLiveMode) return;

    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      runAnalysis();
    }, 1500); // 1.5 second debounce

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [inputText, isLiveMode]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    // Clear citations on edit to ensure state consistency, highlights will reappear after analysis
    if (citations.length > 0) setCitations([]);
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear the editor?")) {
      setInputText('');
      setCitations([]);
    }
  };

  const renderHighlightedText = () => {
    const segments = highlightText(inputText, citations);
    return segments.map((segment, idx) => {
      if (!segment.isCitation) return <span key={idx}>{segment.text}</span>;

      const citation = citations.find(c => c.id === segment.citationId);
      const colorClass = 
        citation?.status === 'valid' ? 'bg-green-100 text-green-900 border-b-2 border-green-500' :
        citation?.status === 'hallucination' ? 'bg-red-100 text-red-900 border-b-2 border-red-500' :
        citation?.status === 'checking' ? 'bg-blue-100 text-blue-900 animate-pulse' :
        'bg-yellow-100 text-yellow-900';

      return (
        <span 
          key={idx} 
          className={`px-0.5 mx-0.5 rounded-sm cursor-help transition-colors duration-200 ${colorClass}`}
          title={citation?.caseName || citation?.status}
        >
          {segment.text}
        </span>
      );
    });
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
      
      {/* Sidebar - SaaS Navigation */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 flex-shrink-0">
        <div className="p-6 flex items-center space-x-3 text-white">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Briefcase className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">CiteCheck Pro</span>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <div className="text-xs uppercase font-semibold text-slate-500 mb-2 mt-4 px-2">Workspace</div>
          <button className="w-full flex items-center space-x-3 px-3 py-2 bg-slate-800 text-white rounded-md transition-colors">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Current Analysis</span>
          </button>
          <button className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-slate-800 rounded-md transition-colors">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">History</span>
          </button>
          <button className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-slate-800 rounded-md transition-colors">
            <Layout className="w-4 h-4" />
            <span className="text-sm font-medium">Templates</span>
          </button>
          
          <div className="text-xs uppercase font-semibold text-slate-500 mb-2 mt-8 px-2">System</div>
          <button className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-slate-800 rounded-md transition-colors">
            <Settings className="w-4 h-4" />
            <span className="text-sm font-medium">Settings</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="bg-slate-800 rounded-lg p-3">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                JD
              </div>
              <div>
                <div className="text-sm font-medium text-white">Jane Doe</div>
                <div className="text-xs text-blue-400">Pro License</div>
              </div>
            </div>
            <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2">
              <div className="bg-blue-500 h-1.5 rounded-full w-3/4"></div>
            </div>
            <div className="flex justify-between text-[10px] mt-1 text-slate-400">
              <span>750/1000 Checks</span>
              <span>Resets in 5d</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header / Toolbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center space-x-4">
             <div className="flex flex-col">
               <input 
                 type="text" 
                 value={documentTitle}
                 onChange={(e) => setDocumentTitle(e.target.value)}
                 className="font-semibold text-gray-800 border-none focus:ring-0 p-0 text-base"
               />
               <span className="text-xs text-gray-400 flex items-center">
                 Last edited just now <span className="mx-2">•</span> <ShieldCheck className="w-3 h-3 mr-1 text-green-500" /> Protected
               </span>
             </div>
          </div>
          <div className="flex items-center space-x-4">
            
            {/* Live Mode Toggle */}
            <div className="flex items-center space-x-2 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
               <button
                 onClick={() => setIsLiveMode(!isLiveMode)}
                 className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${isLiveMode ? 'bg-green-500' : 'bg-gray-300'}`}
               >
                 <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition duration-200 ease-in-out ${isLiveMode ? 'translate-x-5' : 'translate-x-1'}`} />
               </button>
               <div className="flex items-center space-x-1 pr-1">
                 <Zap className={`w-3 h-3 ${isLiveMode ? 'text-green-600' : 'text-gray-400'}`} />
                 <span className={`text-xs font-medium ${isLiveMode ? 'text-green-700' : 'text-gray-500'}`}>Live Analysis</span>
               </div>
            </div>

            <div className="h-6 w-px bg-gray-200 mx-2"></div>

            <button 
              onClick={() => alert("Mock: Report downloaded as PDF")}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors border border-gray-200"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            
            <button 
              onClick={() => runAnalysis()}
              disabled={isAnalyzing || !inputText}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm transition-all
                ${isAnalyzing || !inputText 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {isAnalyzing ? <Play className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{isAnalyzing ? 'Verifying...' : 'Verify Now'}</span>
            </button>
          </div>
        </header>

        {/* Workspace Split View */}
        <main className="flex-1 flex overflow-hidden">
          
          {/* Left: Document Editor */}
          <div className="flex-1 overflow-y-auto bg-gray-100 p-8 flex justify-center">
            <div className="w-full max-w-3xl bg-white min-h-[calc(100vh-10rem)] shadow-sm border border-gray-200 rounded-sm p-12 relative">
              {citations.length > 0 ? (
                <div className="font-serif text-lg leading-relaxed text-gray-800 whitespace-pre-wrap">
                  {renderHighlightedText()}
                </div>
              ) : (
                <textarea
                  className="w-full h-full min-h-[60vh] resize-none outline-none border-none font-serif text-lg leading-relaxed text-gray-800 placeholder-gray-300"
                  placeholder="Paste your legal brief here..."
                  value={inputText}
                  onChange={handleTextChange}
                  spellCheck={false}
                />
              )}
              
              {citations.length > 0 && (
                <div className="absolute top-4 right-4 group">
                  <button 
                    onClick={() => setCitations([])}
                    className="flex items-center space-x-2 bg-gray-50 text-gray-500 text-xs px-3 py-1.5 rounded-full border border-gray-200 hover:bg-white hover:shadow-sm transition-all"
                  >
                    <Eraser className="w-3 h-3" />
                    <span>Back to Edit Mode</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Inspection Panel */}
          <aside className="w-96 bg-white border-l border-gray-200 flex flex-col flex-shrink-0 z-10 shadow-xl">
             <div className="p-4 border-b border-gray-100">
               <h3 className="font-semibold text-gray-800 mb-4">Verification Results</h3>
               <StatsPanel stats={stats} />
             </div>

             {/* Filter Tabs */}
             <div className="flex border-b border-gray-100 px-4 space-x-6">
                <button 
                  onClick={() => setActiveTab('all')}
                  className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'all' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  All ({citations.length})
                </button>
                <button 
                  onClick={() => setActiveTab('issues')}
                  className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'issues' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  Issues ({stats.invalid})
                </button>
                <button 
                  onClick={() => setActiveTab('valid')}
                  className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'valid' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  Valid ({stats.valid})
                </button>
             </div>

             {/* Results List */}
             <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
                {citations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <Search className="w-12 h-12 mb-3 text-gray-200" />
                    <p className="text-sm font-medium">Ready to Analyze</p>
                    <p className="text-xs mt-1 text-center max-w-[200px]">Paste your document on the left and click Verify.</p>
                  </div>
                ) : filteredCitations.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No citations found in this category.
                  </div>
                ) : (
                  filteredCitations.map(cite => (
                    <CitationCard key={cite.id} citation={cite} />
                  ))
                )}
             </div>

             <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
               <p className="text-[10px] text-gray-400">
                 Results verified via Generative AI. Always verify with official sources.
               </p>
             </div>
          </aside>

        </main>
      </div>
    </div>
  );
};

export default App;