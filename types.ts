export interface CitationSource {
  uri: string;
  title: string;
}

export type LegalStatus = 'good' | 'overruled' | 'caution' | 'superseded' | 'unknown';

export interface Citation {
  id: string;
  originalText: string;
  startIndex: number;
  endIndex: number;
  status: 'pending' | 'checking' | 'valid' | 'hallucination' | 'error';
  legalStatus?: LegalStatus;
  supersedingCase?: {
    name: string;
    citation: string;
    uri?: string;
  };
  caseName?: string;
  confidence?: number;
  reason?: string;
  sources?: CitationSource[];
}

export interface VerificationResponse {
  isValid: boolean;
  caseName: string | null;
  reason: string;
  confidence?: number;
  legalStatus?: LegalStatus;
  supersedingCase?: {
    name: string;
    citation: string;
    uri?: string;
  };
  sources?: CitationSource[];
}

export interface AnalysisStats {
  total: number;
  valid: number;
  invalid: number;
  pending: number;
}

export type CitationFilter = 'all' | 'issues' | 'valid';

export type SortOption = 'original' | 'name' | 'status' | 'confidence';

export type VerificationMode = 'standard' | 'research';