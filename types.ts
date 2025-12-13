export interface Citation {
  id: string;
  originalText: string;
  startIndex: number;
  endIndex: number;
  status: 'pending' | 'checking' | 'valid' | 'hallucination' | 'error';
  caseName?: string;
  confidence?: number;
  reason?: string;
}

export interface VerificationResponse {
  isValid: boolean;
  caseName: string | null;
  reason: string;
  confidence?: number;
}

export interface AnalysisStats {
  total: number;
  valid: number;
  invalid: number;
  pending: number;
}

export type CitationFilter = 'all' | 'issues' | 'valid';