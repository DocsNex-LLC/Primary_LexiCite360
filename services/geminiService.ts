import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { VerificationResponse, VerificationMode, CitationSource } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const verifyCitationWithGemini = async (
  citationText: string, 
  mode: VerificationMode = 'standard'
): Promise<VerificationResponse> => {
  const ai = getAiClient();
  if (!ai) {
    return { 
      isValid: false, 
      citationType: 'legal',
      caseName: null, 
      reason: "Configuration Error: API Key missing.", 
      legalStatus: 'unknown' 
    };
  }

  try {
    const isResearchMode = mode === 'research';
    const modelName = 'gemini-3-pro-preview';
    
    const config: any = {
      temperature: 0.1,
    };

    if (!isResearchMode) {
      config.responseMimeType = "application/json";
      config.responseSchema = {
        type: Type.OBJECT,
        properties: {
          isValid: { type: Type.BOOLEAN },
          citationType: { type: Type.STRING, enum: ['legal'] },
          caseName: { type: Type.STRING },
          areaOfLaw: { type: Type.STRING },
          legalStatus: { type: Type.STRING, enum: ['good', 'overruled', 'caution', 'superseded', 'verified', 'not_found', 'unknown'] },
          reason: { type: Type.STRING },
          confidence: { type: Type.INTEGER },
          supersedingCase: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              citation: { type: Type.STRING },
              uri: { type: Type.STRING }
            }
          }
        },
        required: ["isValid", "citationType", "caseName", "legalStatus", "reason", "confidence", "areaOfLaw"]
      };
    } else {
      config.tools = [{ googleSearch: {} }];
    }

    const prompt = `Legal Citation Verification Task: Verify "${citationText}". 
    
    LEGAL MODE: Verify using Bluebook/Legal standards. Focus on case law, current status (Good Law), and identify any overruling decisions.
    
    Step 1: Identify if the string is a valid legal reporter or statute citation.
    Step 2: ${isResearchMode ? 'Search web for the current status of this precedent.' : 'Verify existence in legal databases.'}
    Step 3: Check if the case has been overruled, reversed, or superseded.
    Step 4: Assess structural integrity (proper reporter abbreviations, volume, and page).
    
    Output JSON:
    {
      "isValid": boolean,
      "citationType": "legal",
      "caseName": "Name of the Case or Statute Title",
      "areaOfLaw": "e.g., Constitutional Law, Tort, Criminal Procedure",
      "legalStatus": "good" | "overruled" | "caution" | "superseded",
      "reason": "Clear explanation of the case status and any discrepancies found.",
      "confidence": 0-100,
      "supersedingCase": { "name": "Name", "citation": "Cite", "uri": "Link" } or null
    }`;

    if (!navigator.onLine) throw new Error("NETWORK_OFFLINE");

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: config
    });

    let result: VerificationResponse = {
      isValid: false,
      citationType: 'legal',
      caseName: null,
      areaOfLaw: 'Unspecified',
      reason: "Empty response.",
      confidence: 0,
      legalStatus: 'unknown'
    };

    if (response.text) {
      try {
        const text = response.text;
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
          result = JSON.parse(text.substring(start, end + 1));
        }
      } catch (e) {
        result.reason = "Parsing error.";
      }
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      const sources: CitationSource[] = [];
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) sources.push({ uri: chunk.web.uri, title: chunk.web.title || "Source" });
      });
      result.sources = Array.from(new Map(sources.map(s => [s.uri, s])).values());
    }
    
    return result;
  } catch (error: any) {
    return { 
      isValid: false, 
      citationType: 'legal',
      caseName: null, 
      reason: error.message === "NETWORK_OFFLINE" ? "Offline" : "Error", 
      legalStatus: 'unknown' 
    };
  }
};