import { Citation } from '../types';

// The default pattern from the requirements
export const DEFAULT_CITATION_PATTERN = "(\\d{1,4}\\s[A-Z][a-z]?\\.?\\s?\\w{1,5}\\.?\\s?\\w{1,3}\\.?\\s\\d{1,4})";

export const extractCitations = (text: string, pattern: string = DEFAULT_CITATION_PATTERN): Citation[] => {
  let regex: RegExp;
  try {
    // Ensure the pattern is global to find all matches
    regex = new RegExp(pattern, 'g');
  } catch (e) {
    console.error("Invalid Regex provided:", e);
    return [];
  }

  const matches = [...text.matchAll(regex)];
  
  return matches.map((match, index) => {
    // Deterministic ID based on content and position to prevent React key thrashing
    const content = match[0] || '';
    const startIndex = match.index || 0;
    const stableId = `cite-${startIndex}-${content.replace(/\s/g, '_')}`;
    
    return {
      id: stableId,
      originalText: content,
      startIndex: startIndex,
      endIndex: startIndex + content.length,
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