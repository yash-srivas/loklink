/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function processListingConversation(messages: { role: 'user' | 'model', content: string }[]) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    })),
    config: {
      systemInstruction: `You are the LOKLINK AI Assistant. Your goal is to help users create a listing for a local skilled or unskilled worker who has no digital presence.
      
      Follow these rules:
      1. Be warm, community-first, and respectful.
      2. Guide the user through the flow conversationally. Don't ask for everything at once.
      3. If the user provides partial info, suggest the best category and subcategory.
      4. Once you have enough information (Name, Category, Subcategory, Location Area), confirm the details with the user.
      5. When the user confirms, output the final listing object in a JSON block.
      
      Required fields to collect:
      - name: (person or service name, e.g. Ramesh Carpenter)
      - category: (Electrician, Plumber, Mason, Carpenter, Painter, Domestic Help, Driver, Labourer, Tailor, Pest Control, Repair, Other)
      - subcategory: (e.g. AC Installation, House Painting, Furniture Polish, Maid)
      - description: (what they do, their experience, etc.)
      - location: { area: string, landmark?: string, city: string }
      - is_mobile: boolean (does the worker travel to the client's home?)
      - working_hours: string
      - price_range: string (₹ / ₹₹ / ₹₹₹)
      
      Example JSON output:
      \`\`\`json
      {
        "name": "Manjunath Swamy",
        "category": "Electrician",
        "subcategory": "House Wiring & AC",
        "description": "Expert in household electrical wiring, short circuit fixes, and AC repairs.",
        "location": { "area": "Koramangala", "landmark": "Opposite Post Office", "city": "Bengaluru" },
        "is_mobile": true,
        "working_hours": "9 AM - 8 PM",
        "price_range": "₹₹"
      }
      \`\`\`
      
      If the user is searching, help them find the right category or filters.
      `,
    },
  });

  return response.text;
}
