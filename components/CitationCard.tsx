import React from 'react';
import { Citation } from '../types';
import { CheckCircle, XCircle, Loader2, AlertCircle, ExternalLink } from 'lucide-react';

interface CitationCardProps {
  citation: Citation;
}

const CitationCard: React.FC<CitationCardProps> = ({ citation }) => {
  const getStatusColor = () => {
    switch (citation.status) {
      case 'valid': return 'border-green-200 bg-white ring-1 ring-green-100';
      case 'hallucination': return 'border-red-200 bg-white ring-1 ring-red-100';
      case 'checking': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-white';
    }
  };

  const getIcon = () => {
    switch (citation.status) {
      case 'valid': return <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />;
      case 'hallucination': return <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />;
      case 'checking': return <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />;
    }
  };

  const googleScholarUrl = `https://scholar.google.com/scholar?q=${encodeURIComponent(citation.originalText)}`;

  return (
    <div className={`p-4 rounded-lg border shadow-sm transition-all duration-300 ${getStatusColor()}`}>
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            {getIcon()}
            <span className="font-mono text-sm font-bold text-gray-900 tracking-tight break-all">
              {citation.originalText}
            </span>
          </div>
          
          {citation.status !== 'checking' && (
             <div className="mt-2 space-y-1">
                {citation.caseName ? (
                  <div className="text-sm font-serif font-medium text-gray-800">
                    {citation.caseName}
                  </div>
                ) : (
                   <div className="text-xs text-gray-400 italic">No case name identified</div>
                )}
                
                {citation.reason && (
                  <div className={`text-xs leading-relaxed ${citation.status === 'hallucination' ? 'text-red-700 bg-red-50 p-2 rounded' : 'text-gray-600'}`}>
                    {citation.reason}
                  </div>
                )}
             </div>
          )}
        </div>
      </div>

      {citation.status !== 'checking' && citation.status !== 'pending' && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
          <a 
            href={googleScholarUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Check Source <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>
      )}
    </div>
  );
};

export default CitationCard;