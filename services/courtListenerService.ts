import { CourtListenerLookupResult } from '../types';

/**
 * Performs a targeted lookup of a legal citation on the CourtListener API.
 * This provides authoritative grounding against a repository of millions of opinions.
 * 
 * @param citation The citation string to verify (e.g., "410 U.S. 113")
 * @param apiKey The CourtListener API token (Authorization: Token <key>)
 */
export const lookupCitationOnCourtListener = async (
  citation: string,
  apiKey: string
): Promise<CourtListenerLookupResult> => {
  const endpoint = 'https://www.courtlistener.com/api/rest/v3/citation-lookup/';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${apiKey}`
      },
      body: JSON.stringify({ q: citation })
    });

    if (response.status === 401 || response.status === 403) {
      return {
        found: false,
        caseName: null,
        citation: null,
        id: null,
        absolute_url: null,
        error: 'Authentication failed: Invalid CourtListener API token.'
      };
    }

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // CourtListener returns { count: number, results: Array<Case> }
    if (data.count > 0 && data.results && data.results.length > 0) {
      const topResult = data.results[0];
      return {
        found: true,
        caseName: topResult.case_name || topResult.citation_string,
        citation: topResult.citation_string,
        id: topResult.id,
        absolute_url: topResult.absolute_url ? `https://www.courtlistener.com${topResult.absolute_url}` : null
      };
    }

    return {
      found: false,
      caseName: null,
      citation: null,
      id: null,
      absolute_url: null
    };

  } catch (error: any) {
    console.error('CourtListener Lookup Failure:', error);
    return {
      found: false,
      caseName: null,
      citation: null,
      id: null,
      absolute_url: null,
      error: error.message || 'An unexpected error occurred during CourtListener lookup.'
    };
  }
};