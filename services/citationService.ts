import { Citation } from '../types';

// The Regex pattern from the requirements:
// (\d{1,4}\s[A-Z][a-z]?\.?\s?\w{1,5}\.?\s?\w{1,3}\.?\s\d{1,4})
// Adjusted slightly to ensure it captures common variations more robustly in a global search
const CITATION_REGEX = /(\d{1,4}\s[A-Z][a-z]?\.?\s?\w{1,5}\.?\s?\w{1,3}\.?\s\d{1,4})/g;

export const extractCitations = (text: string): Citation[] => {
  const matches = [...text.matchAll(CITATION_REGEX)];
  
  return matches.map((match, index) => {
    // Deterministic ID based on content and position to prevent React key thrashing
    const stableId = `cite-${match.index}-${match[0].replace(/\s/g, '_')}`;
    
    return {
      id: stableId,
      originalText: match[0],
      startIndex: match.index || 0,
      endIndex: (match.index || 0) + match[0].length,
      status: 'pending'
    };
  });
};

export const highlightText = (text: string, citations: Citation[]): { text: string; isCitation: boolean; citationId?: string }[] => {
  if (citations.length === 0) return [{ text, isCitation: false }];

  const sortedCitations = [...citations].sort((a, b) => a.startIndex - b.startIndex);
  const segments: { text: string; isCitation: boolean; citationId?: string }[] = [];
  let lastIndex = 0;

  sortedCitations.forEach((cite) => {
    // Text before citation
    if (cite.startIndex > lastIndex) {
      segments.push({
        text: text.substring(lastIndex, cite.startIndex),
        isCitation: false
      });
    }

    // The citation itself
    segments.push({
      text: text.substring(cite.startIndex, cite.endIndex),
      isCitation: true,
      citationId: cite.id
    });

    lastIndex = cite.endIndex;
  });

  // Remaining text
  if (lastIndex < text.length) {
    segments.push({
      text: text.substring(lastIndex),
      isCitation: false
    });
  }

  return segments;
};