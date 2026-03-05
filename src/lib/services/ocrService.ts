import { GoogleGenAI, Type } from '@google/genai';

let ai: GoogleGenAI | null = null;

function getAI() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export async function extractGasometriaFromImage(base64Image: string, mimeType: string) {
  const aiClient = getAI();
  
  const response = await aiClient.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType,
          },
        },
        {
          text: 'Extract the following blood gas (gasometria) values from this printed or handwritten medical report. Return ONLY a JSON object with the exact keys. If a value is not found, do not include the key. Keys: pH, PaCO2, HCO3, PaO2, BE, FiO2, Na, Cl, Albumina, Lactato, Idade. Note: FiO2 might be a percentage (e.g., 21%) or decimal (0.21), return as percentage (21). BE might be negative. PaCO2 is often written as pCO2. HCO3 might be HCO3- or Bic. PaO2 is pO2. Lactato might be Lac.',
        },
      ],
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          pH: { type: Type.NUMBER },
          PaCO2: { type: Type.NUMBER },
          HCO3: { type: Type.NUMBER },
          PaO2: { type: Type.NUMBER },
          BE: { type: Type.NUMBER },
          FiO2: { type: Type.NUMBER },
          Na: { type: Type.NUMBER },
          Cl: { type: Type.NUMBER },
          Albumina: { type: Type.NUMBER },
          Lactato: { type: Type.NUMBER },
          Idade: { type: Type.NUMBER },
        },
      },
    },
  });

  if (response.text) {
    return JSON.parse(response.text);
  }
  return null;
}
