import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { VerificationResponse, VerificationMode, CitationSource } from "../types";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key not found in process.env");
    return null;
  }
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
      caseName: null,
      reason: "API Key missing. Cannot verify."
    };
  }

  try {
    const isResearchMode = mode === 'research';
    const model = isResearchMode ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    
    const config: any = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isValid: { type: Type.BOOLEAN, description: "True if the case citation is technically correct and exists." },
          caseName: { type: Type.STRING, description: "Full official case name." },
          legalStatus: { 
            type: Type.STRING, 
            enum: ['good', 'overruled', 'caution', 'superseded', 'unknown'],
            description: "Current legal standing. 'overruled' if a newer landmark case has changed the law." 
          },
          supersedingCase: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Name of the newer case that currently controls this area of law." },
              citation: { type: Type.STRING, description: "The citation of the newer case." }
            },
            description: "If this law is obsolete, what is the newest controlling precedent? Provide the most recent one available."
          },
          reason: { type: Type.STRING, description: "Brief explanation. If overruled, explain why and by what decision." },
          confidence: { type: Type.INTEGER, description: "0-100 score." }
        },
        required: ["isValid", "caseName", "legalStatus", "reason", "confidence"]
      }
    };

    if (isResearchMode) {
      config.tools = [{ googleSearch: {} }];
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: `Verify this legal citation for CURRENCY and VALIDITY: "${citationText}". 
      
      CORE OBJECTIVE: Ensure this is the MOST RECENT and controlling authority for this matter.
      
      1. If the cited case has been OVERRULED or SUPERSEDED (e.g. Roe v. Wade being superseded by Dobbs), you MUST flag it as 'overruled'.
      2. If it is 'overruled', you MUST provide the most recent controlling case name and citation.
      3. Search across CourtListener, LexisNexis public indices, and SCOTUS records.
      4. Pay attention to the DATE. If there is a 2024 or 2025 decision that modifies this precedent, you must include it.`,
      config: config
    });

    let result: VerificationResponse = {
      isValid: false,
      caseName: null,
      reason: "No response from verification engine.",
      confidence: 0,
      legalStatus: 'unknown'
    };

    if (response.text) {
      try {
        const cleanedText = response.text.replace(/```json|```/g, '').trim();
        result = JSON.parse(cleanedText);
      } catch (e) {
        console.error("JSON Parse error:", e);
      }
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      const sources: CitationSource[] = [];
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          sources.push({ uri: chunk.web.uri, title: chunk.web.title || "Reference" });
        }
      });
      result.sources = Array.from(new Map(sources.map(s => [s.uri, s])).values());
    }
    
    return result;
  } catch (error) {
    console.error("Verification failed", error);
    return {
      isValid: false,
      caseName: null,
      reason: "Error during deep precedent scan.",
      legalStatus: 'unknown'
    };
  }
};