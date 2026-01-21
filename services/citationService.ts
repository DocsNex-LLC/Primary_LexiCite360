import { Citation } from '../types';

// Broadened pattern to capture: 
// 1. Standard: 410 U.S. 113
// 2. Modern: 597 U.S. 215
// 3. F.3d/F.Supp: 123 F.3d 456
export const DEFAULT_CITATION_PATTERN = "(\\d{1,4}\\s[A-Z][a-z0-9\\.]*\\s?[A-Z][a-z0-9\\.]*\\s\\d{1,4})|(\\d{1,4}\\s[A-Z]{1,5}\\.\\d?[a-z]?\\s\\d{1,4})";

export const extractCitations = (text: string, pattern: string = DEFAULT_CITATION_PATTERN): Citation[] => {
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, 'g');
  } catch (e) {
    console.error("Invalid Regex provided:", e);
    return [];
  }

  const matches = [...text.matchAll(regex)];
  
  const results = matches.map((match, index) => {
    const content = match[0] || '';
    const startIndex = match.index || 0;
    const stableId = `cite-${startIndex}-${content.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    return {
      id: stableId,
      originalText: content,
      startIndex: startIndex,
      endIndex: startIndex + content.length,
      status: 'pending' as const
    };
  });

  // Filter out duplicates at same start index
  return results.filter((v, i, a) => a.findIndex(t => t.startIndex === v.startIndex) === i);
};

export const highlightText = (text: string, citations: Citation[]): { text: string; isCitation: boolean; citationId?: string }[] => {
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