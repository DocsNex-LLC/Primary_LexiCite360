
import React from 'react';
import { Citation } from '../types';
import { 
  CheckCircle, XCircle, Loader2, AlertCircle, 
  ExternalLink, Globe, AlertTriangle, ShieldAlert,
  History, ArrowRight, Info, Scale
} from 'lucide-react';

interface CitationCardProps {
  citation: Citation;
}

const CitationCard: React.FC<CitationCardProps> = ({ citation }) => {
  const isObsolete = citation.legalStatus === 'overruled' || citation.legalStatus === 'superseded';
  
  const getStatusStyles = () => {
    if (citation.status === 'checking') return 'border-blue-200 bg-blue-50/30';
    if (citation.status === 'hallucination') return 'border-red-200 bg-red-50/20';
    
    switch (citation.legalStatus) {
      case 'overruled': return 'border-red-500 bg-red-50 ring-2 ring-red-100';
      case 'superseded': return 'border-orange-400 bg-orange-50';
      case 'caution': return 'border-yellow-400 bg-yellow-50';
      case 'good': return 'border-green-200 bg-white shadow-sm hover:shadow-md';
      default: return 'border-gray-200 bg-white';
    }
  };

  const getStatusBadge = () => {
    if (citation.status === 'hallucination') return (
      <span className="flex items-center text-[8px] font-black uppercase bg-red-100 text-red-600 px-1.5 py-0.5 rounded tracking-tighter">
        Hallucination
      </span>
    );
    switch (citation.legalStatus) {
      case 'good': return (
        <span className="flex items-center text-[8px] font-black uppercase bg-green-100 text-green-700 px-1.5 py-0.5 rounded tracking-tighter">
          <CheckCircle className="w-2 h-2 mr-1" /> Current Precedent
        </span>
      );
      case 'overruled': return (
        <span className="flex items-center text-[8px] font-black uppercase bg-red-600 text-white px-1.5 py-0.5 rounded tracking-tighter shadow-sm animate-pulse">
          <ShieldAlert className="w-2 h-2 mr-1" /> Obsolete Law
        </span>
      );
      case 'superseded': return (
        <span className="flex items-center text-[8px] font-black uppercase bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded tracking-tighter">
          <History className="w-2 h-2 mr-1" /> Superseded
        </span>
      );
      default: return null;
    }
  };

  return (
    <div className={`p-4 rounded-lg border transition-all duration-300 group ${getStatusStyles()}`}>
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="flex items-center space-x-2">
          {citation.status === 'checking' ? (
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
          ) : citation.status === 'hallucination' ? (
            <XCircle className="w-4 h-4 text-red-600" />
          ) : isObsolete ? (
            <AlertTriangle className="w-4 h-4 text-red-600" />
          ) : (
            <CheckCircle className="w-4 h-4 text-green-600" />
          )}
          <span className="font-mono text-[11px] font-bold text-gray-900 truncate max-w-[160px]">
            {citation.originalText}
          </span>
        </div>
        {getStatusBadge()}
      </div>
      
      {citation.status !== 'checking' && (
        <div className="space-y-3">
          <div className="text-xs font-serif font-bold text-gray-800 leading-tight">
            {citation.caseName || "Unidentified Legal Reference"}
          </div>

          {citation.reason && (
            <div className={`text-[10px] leading-relaxed p-2 rounded border ${isObsolete ? 'bg-red-100/30 border-red-200 text-red-900' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
              <div className="flex items-start">
                <Info className="w-3 h-3 mr-1.5 mt-0.5 flex-shrink-0 opacity-50" />
                <span>{citation.reason}</span>
              </div>
            </div>
          )}

          {/* SUGGESTION BOX: THE MOST RECENT PRECEDENT */}
          {citation.supersedingCase && (
            <div className="mt-2 bg-gradient-to-br from-blue-50 to-white border-2 border-blue-200 rounded-md p-3 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-1 opacity-10">
                <Scale className="w-8 h-8 rotate-12" />
              </div>
              <div className="flex items-center text-[9px] font-black text-blue-800 uppercase tracking-widest mb-1.5">
                <ArrowRight className="w-3 h-3 mr-1" /> Correct Current Authority
              </div>
              <div className="text-xs font-bold text-blue-900 flex items-center justify-between">
                <span>{citation.supersedingCase.name}</span>
                <span className="text-[8px] bg-blue-600 text-white px-1 rounded ml-2">LATEST</span>
              </div>
              <div className="text-[10px] font-mono text-blue-600 mt-0.5">
                {citation.supersedingCase.citation}
              </div>
              <button 
                onClick={() => alert(`Applied ${citation.supersedingCase?.name} to document`)}
                className="mt-2.5 w-full text-[9px] font-bold uppercase py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center"
              >
                Apply Correct Citation
              </button>
            </div>
          )}

          {/* Evidence Log Links */}
          {citation.sources && citation.sources.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                <Globe className="w-2.5 h-2.5 mr-1 text-blue-400" /> Grounded Evidence
              </div>
              <div className="flex flex-wrap gap-1">
                {citation.sources.map((source, i) => (
                  <a 
                    key={i} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center px-1.5 py-1 bg-white text-gray-500 border border-gray-100 rounded text-[8px] hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all truncate max-w-[140px]"
                  >
                    <span className="truncate">{source.title}</span>
                    <ExternalLink className="w-2.5 h-2.5 ml-1 opacity-50" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CitationCard;
