import { GoogleGenAI, Type } from "@google/genai";
import { VerificationResponse } from "../types";

// This service mocks the "Verification API" described in the requirements.
// Instead of a Python Flask backend hitting CourtListener, we use Gemini
// to simulate the verification intelligence for this MVP web app.

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key not found in process.env");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const verifyCitationWithGemini = async (citationText: string): Promise<VerificationResponse> => {
  const ai = getAiClient();
  
  if (!ai) {
    return {
      isValid: false,
      caseName: null,
      reason: "API Key missing. Cannot verify."
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Verify this legal citation: "${citationText}". 
      Determine if it is a plausible, real US case citation format and if it corresponds to a well-known case. 
      If it looks like a hallucination (e.g., volume number doesn't exist for that reporter), mark invalid.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN, description: "True if the citation refers to a real legal reporter volume and page format, or a known case." },
            caseName: { type: Type.STRING, description: "The likely case name (e.g. 'Roe v. Wade') if known, or null." },
            reason: { type: Type.STRING, description: "Short explanation of why it is valid or invalid." },
            confidence: { type: Type.INTEGER, description: "Confidence score between 0 and 100 regarding the verification assessment." }
          },
          required: ["isValid", "caseName", "reason", "confidence"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as VerificationResponse;
    }
    
    throw new Error("Empty response from AI");
  } catch (error) {
    console.error("Verification failed", error);
    return {
      isValid: false,
      caseName: null,
      reason: "Verification service unavailable."
    };
  }
};