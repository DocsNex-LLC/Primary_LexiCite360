import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { VerificationResponse, VerificationMode, CitationSource } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

/**
 * Verifies a legal citation using Gemini's reasoning capabilities and search grounding.
 * Improved error handling for network, API, and parsing errors.
 */
export const verifyCitationWithGemini = async (
  citationText: string, 
  mode: VerificationMode = 'standard'
): Promise<VerificationResponse> => {
  const ai = getAiClient();
  if (!ai) {
    return { 
      isValid: false, 
      caseName: null, 
      reason: "Configuration Error: API Key missing in environment variables.", 
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
          caseName: { type: Type.STRING },
          legalStatus: { type: Type.STRING, enum: ['good', 'overruled', 'caution', 'superseded', 'unknown'] },
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
        required: ["isValid", "caseName", "legalStatus", "reason", "confidence"]
      };
    } else {
      config.tools = [{ googleSearch: {} }];
    }

    const prompt = `Legal Research Task: Verify citation "${citationText}". 
    
    ${isResearchMode ? 'Step 1: Use Google Search to check if this precedent is still "Good Law". Step 2: If overruled or superseded (like Roe v. Wade), identify the LATEST controlling decision.' : 'Verify if this case citation exists.'}
    
    Step 3: Output your findings strictly as a JSON object matching this schema:
    {
      "isValid": boolean,
      "caseName": "Official Case Name or null",
      "legalStatus": "good" | "overruled" | "caution" | "superseded",
      "reason": "Detailed explanation of validity and subsequent history.",
      "confidence": number 0-100,
      "supersedingCase": { "name": "Name of newest case", "citation": "cite", "uri": "url" } or null
    }
    
    IMPORTANT: If grounded results show a newer case from 2022-2025 that changed the law, mark status as 'overruled'.`;

    // Check for network connectivity before attempt
    if (!navigator.onLine) {
      throw new Error("NETWORK_OFFLINE");
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: config
    });

    let result: VerificationResponse = {
      isValid: false,
      caseName: null,
      reason: "Received empty response from the verification engine.",
      confidence: 0,
      legalStatus: 'unknown'
    };

    if (response.text) {
      try {
        const text = response.text;
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        
        if (start !== -1 && end !== -1) {
          const jsonStr = text.substring(start, end + 1);
          result = JSON.parse(jsonStr);
        } else {
          // If no JSON, maybe it's direct text? (Happens sometimes in research mode)
          result.reason = text;
          result.isValid = text.toLowerCase().includes("valid") || text.toLowerCase().includes("good law");
        }
      } catch (e) {
        result.reason = "Parsing Error: The AI returned an invalid data format. Detailed reasoning: " + response.text.substring(0, 100) + "...";
      }
    }

    // Grounding data extraction
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      const sources: CitationSource[] = [];
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          sources.push({ uri: chunk.web.uri, title: chunk.web.title || "Reference Source" });
        }
      });
      result.sources = Array.from(new Map(sources.map(s => [s.uri, s])).values());
    }
    
    return result;
  } catch (error: any) {
    console.error("Verification Engine Failure:", error);
    
    let userFriendlyReason = "The verification engine encountered an unexpected error.";
    
    if (error.message === "NETWORK_OFFLINE") {
      userFriendlyReason = "Network Error: Please check your internet connection and try again.";
    } else if (error.message?.includes("API_KEY_INVALID") || error.message?.includes("API key not valid")) {
      userFriendlyReason = "Authentication Error: The provided API key is invalid or has expired.";
    } else if (error.message?.includes("quota") || error.status === 429) {
      userFriendlyReason = "Rate Limit Exceeded: Too many requests. Please wait a moment before trying again.";
    } else if (error.message?.includes("Safety") || error.message?.includes("blocked")) {
      userFriendlyReason = "Safety Block: The query was flagged by the AI's safety filters.";
    }
    
    return { 
      isValid: false, 
      caseName: null, 
      reason: userFriendlyReason, 
      legalStatus: 'unknown' 
    };
  }
};