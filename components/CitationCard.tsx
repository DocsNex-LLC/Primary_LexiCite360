import React from 'react';
import { Citation } from '../types';
import { 
  ExternalLink, Globe, Wand2, History, Check, Sparkles, Scale, Briefcase, Info
} from 'lucide-react';

interface CitationCardProps {
  citation: Citation;
  onApplySuperseding?: (id: string, newCitation: string, newCaseName: string) => void;
  fullText?: string;
}

const CitationCard: React.FC<CitationCardProps> = ({ citation, onApplySuperseding, fullText }) => {
  const isObsolete = citation.legalStatus === 'overruled' || citation.legalStatus === 'superseded' || citation.legalStatus === 'retracted';
  const isError = citation.status === 'error';
  
  const getStatusConfig = () => {
    if (citation.status === 'checking') return { icon: 'sync', color: 'text-blue-500', bg: 'bg-blue-50', label: 'Checking...' };
    if (citation.status === 'hallucination') return { icon: 'error', color: 'text-red-500', bg: 'bg-red-50', label: 'HALLUCINATION' };
    if (isError) return { icon: 'warning', color: 'text-amber-500', bg: 'bg-amber-50', label: 'ERROR' };
    
    switch (citation.legalStatus) {
      case 'overruled': 
      case 'retracted': return { icon: 'dangerous', color: 'text-red-600', bg: 'bg-red-50', label: 'OVERRULED' };
      case 'superseded': return { icon: 'update', color: 'text-orange-500', bg: 'bg-orange-50', label: 'SUPERSEDED' };
      case 'good':
      case 'verified': return { icon: 'check_circle', color: 'text-green-500', bg: 'bg-green-50', label: 'VALID LAW' };
      default: return { icon: 'help', color: 'text-gray-400', bg: 'bg-gray-50', label: 'PENDING' };
    }
  };

  const config = getStatusConfig();

  const getContextSnippets = () => {
    if (!fullText) return null;
    const padding = 60;
    const start = Math.max(0, citation.startIndex - padding);
    const end = Math.min(fullText.length, citation.endIndex + padding);
    const before = fullText.substring(start, citation.startIndex);
    const after = fullText.substring(citation.endIndex, end);
    
    return {
      draft: (
        <>{before}<span className="text-red-600 bg-red-50 font-bold">{citation.originalText}</span>{after}</>
      ),
      preview: citation.supersedingCase ? (
        <>{before}<span className="text-green-600 bg-green-50 font-bold">{citation.supersedingCase.citation}</span>{after}</>
      ) : null
    };
  };

  const snippets = getContextSnippets();
  const showSuperseding = !!citation.supersedingCase && (isObsolete || citation.status === 'hallucination');

  if (showSuperseding) {
    return (
      <div className="bg-white rounded-3xl border border-[#e6edf4] overflow-hidden shadow-sm mb-4">
        <div className="p-5 border-b border-[#e6edf4] bg-[#f6f8fb] flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-widest text-[#0b3a6f]">Precedent Replacement</span>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-600 rounded-full text-[9px] font-bold uppercase">
             <span className="material-symbols-outlined text-[14px]">dangerous</span> Overruled
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50/50 rounded-2xl p-4 border border-red-100 text-center">
              <span className="text-[9px] font-black text-red-500 uppercase tracking-widest block mb-1">Outdated</span>
              <div className="text-red-700 font-bold text-xs line-through">{citation.originalText}</div>
            </div>
            <div className="bg-green-50/50 rounded-2xl p-4 border border-green-100 text-center">
              <span className="text-[9px] font-black text-green-500 uppercase tracking-widest block mb-1">Updated</span>
              <div className="text-green-700 font-bold text-xs">{citation.supersedingCase!.citation}</div>
            </div>
          </div>

          <div className="bg-orange-50/50 rounded-2xl p-5 border border-orange-100">
             <div className="flex gap-4">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-orange-500/10">
                   <Wand2 size={20} />
                </div>
                <div>
                   <h4 className="text-[#0b3a6f] font-bold text-sm">LexiCite Suggestion</h4>
                   <p className="text-[11px] text-gray-500 leading-relaxed mt-1">This law was modified by <strong>{citation.supersedingCase!.name}</strong>. Apply the fix to your draft?</p>
                </div>
             </div>
             <button 
               onClick={() => onApplySuperseding?.(citation.id, citation.supersedingCase!.citation, citation.supersedingCase!.name)}
               className="w-full mt-4 bg-[#0b3a6f] text-white h-12 rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-[#092a52] transition-all flex items-center justify-center gap-2"
             >
               <Sparkles size={14} /> Insert Current Precedent
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-2xl border border-[#e6edf4] bg-white hover:border-[#0b3a6f]/20 transition-all cursor-default flex items-start gap-4`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.color} ${config.bg} shrink-0`}>
        <span className="material-symbols-outlined">{config.icon}</span>
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
           <span className="font-mono text-[11px] font-bold text-[#1f2937]">{citation.originalText}</span>
           <span className={`text-[9px] font-black uppercase tracking-widest ${config.color}`}>{config.label}</span>
        </div>
        <div className="text-sm font-bold text-[#1f2937] leading-tight line-clamp-2">
          {citation.caseName || (citation.status === 'checking' ? 'Analyzing Precedent...' : 'Case Title Unidentified')}
        </div>
        
        {citation.areaOfLaw && (
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-[#f39200] uppercase tracking-wider">
            <span className="material-symbols-outlined text-[14px]">balance</span>
            {citation.areaOfLaw}
          </div>
        )}

        {citation.reason && (
          <div className="text-[10px] text-gray-400 font-medium leading-relaxed bg-[#f6f8fb] p-2 rounded-lg mt-2 border border-[#e6edf4]">
            {citation.reason}
          </div>
        )}
      </div>
    </div>
  );
};

export default CitationCard;