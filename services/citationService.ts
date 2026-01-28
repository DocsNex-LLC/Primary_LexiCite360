import { Citation } from '../types';

/**
 * Regex to capture legal citations: 
 * 1. Legal: 410 U.S. 113, 123 F.3d 456, 45 U.S.C. § 123, 12 S. Ct. 34
 */
export const DEFAULT_CITATION_PATTERN = 
  // Legal Reporter Standard (Vol Reporter Page) - captures common legal series
  "(?:\\d{1,4}\\s(?:U\\.?S\\.?|F\\.?\\s?[23]d|S\\.?\\s?Ct\\.?|L\\.?\\s?Ed\\.?\\s?2d|F\\.?\\s?Supp\\.?|A\\.?\\s?2d|P\\.?\\s?[23]d|N\\.?\\s?E\\.?\\s?2d|S\\.?\\s?W\\.?\\s?2d|So\\.?\\s?[23]d|N\\.?\\s?W\\.?\\s?2d|Cal\\.?\\s?Rptr\\.?\\s?[23]d|N\\.?\\s?Y\\.?\\s?S\\.?\\s?2d)\\s\\d{1,4}(?:\\s\\(\\d{4}\\))?)" +
  // Statute/Code formats (e.g., 28 U.S.C. § 1234)
  "|(?:\\d{1,4}\\s[A-Z]{1,5}\\.\\s?(?:C\\.|S\\.)\\s?\\d{1,5}(?:\\s?§\\s?\\d{1,5})?)";

export const extractCitations = (text: string, pattern: string = DEFAULT_CITATION_PATTERN): Citation[] => {
  if (!text.trim()) return [];
  
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, 'g');
  } catch (e) {
    console.error("Invalid Regex provided:", e);
    return [];
  }

  const matches = [...text.matchAll(regex)];
  
  const results = matches.map((match) => {
    const content = match[0] || '';
    const startIndex = match.index || 0;
    const stableId = `cite-${startIndex}-${content.length}`;
    
    return {
      id: stableId,
      originalText: content,
      startIndex: startIndex,
      endIndex: startIndex + content.length,
      status: 'pending' as const,
      citationType: 'legal' as const
    };
  });

  return results
    .filter((v, i, a) => a.findIndex(t => t.startIndex === v.startIndex) === i)
    .filter(v => v.originalText.length > 3);
};

export const highlightText = (text: string, citations: Citation[]): { text: string; isCitation: boolean; citationId?: string }[] => {
  if (!text) return [];
  if (citations.length === 0) return [{ text, isCitation: false }];

  const sortedCitations = [...citations].sort((a, b) => a.startIndex - b.startIndex);
  const segments: { text: string; isCitation: boolean; citationId?: string }[] = [];
  let lastIndex = 0;

  sortedCitations.forEach((cite) => {
    if (cite.startIndex > lastIndex) {
      segments.push({
        text: text.substring(lastIndex, cite.startIndex),
        isCitation: false
      });
    }

    segments.push({
      text: text.substring(cite.startIndex, cite.endIndex),
      isCitation: true,
      citationId: cite.id
    });

    lastIndex = cite.endIndex;
  });

  if (lastIndex < text.length) {
    segments.push({
      text: text.substring(lastIndex),
      isCitation: false
    });
  }

  return segments;
};