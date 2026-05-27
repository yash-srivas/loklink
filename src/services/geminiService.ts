/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ExtractedListingInfo {
  name?: string;
  category?: string;
  subcategory?: string;
  description?: string;
  area?: string;
  landmark?: string;
  city?: string;
  availability?: string;
  phone?: string;
  whatsapp?: string;
  priceRange?: string;
}

export const geminiService = {
  async extractListingInfo(userInput: string, currentContext: any): Promise<ExtractedListingInfo> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Extract listing information from the following user input: "${userInput}". 
        Current context: ${JSON.stringify(currentContext)}.
        Return a JSON object with the following fields (all optional): 
        name, category (must be one of: 'Electrician', 'Plumber', 'Mason', 'Carpenter', 'Painter', 'Domestic Help', 'Driver', 'Labourer', 'Tailor', 'Pest Control', 'Repair', 'Other'), 
        subcategory, description, area, landmark, city, availability, phone, whatsapp, priceRange.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              category: { 
                type: Type.STRING,
                enum: ['Electrician', 'Plumber', 'Mason', 'Carpenter', 'Painter', 'Domestic Help', 'Driver', 'Labourer', 'Tailor', 'Pest Control', 'Repair', 'Other']
              },
              subcategory: { type: Type.STRING },
              description: { type: Type.STRING },
              area: { type: Type.STRING },
              landmark: { type: Type.STRING },
              city: { type: Type.STRING },
              availability: { type: Type.STRING },
              phone: { type: Type.STRING },
              whatsapp: { type: Type.STRING },
              priceRange: { type: Type.STRING }
            }
          }
        }
      });

      return JSON.parse(response.text || '{}');
    } catch (error) {
      console.error("Gemini extraction error:", error);
      return {};
    }
  },

  async generateAiResponse(messages: { role: 'ai' | 'user', content: string }[], currentStep: number): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [{ text: `You are a helpful, friendly Indian local assistant named 'Bharat' on LOKLINK. 
            You are helping a user list a local physical worker or skilled/unskilled helper (e.g. plumber, carpenter, domestic cook, loader, driver, mason) on the community app LOKLINK.
            Use a friendly, 'Bharat-first' personality with occasional Hinglish (e.g., 'Arre', 'Ji', 'Bilkul', 'Shabaash').
            Keep it concise and helpful.
            
            Current conversation:
            ${messages.map(m => `${m.role}: ${m.content}`).join('\n')}
            
            Current step in flow: ${currentStep} of 8.
            
            Generate the next AI response to guide the user. 
            If the user just provided info, acknowledge it warmly and ask for the next piece of info.
            Steps:
            1. What/Who are they? (e.g., Ramesh AC repair, Sita housekeeping)
            2. Name?
            3. Location? (area and city)
            4. Availability? (working hours)
            5. Contact? (phone/whatsapp)
            6. One special thing about them? (description/skills)
            7. Photo?
            8. Confirmation.
            ` }]
          }
        ]
      });

      return response.text || "Arre, something went wrong. Let's try again!";
    } catch (error) {
      console.error("Gemini response error:", error);
      return "Arre, something went wrong. Let's try again!";
    }
  }
};
