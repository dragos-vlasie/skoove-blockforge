
import { GoogleGenAI, Type } from "@google/genai";
import { BlockType } from "../types";

const getApiKey = () => {
  const key = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!key || key === "PLACEHOLDER_API_KEY") return null;
  return key;
};

export async function generateBlockContent(type: BlockType, prompt: string) {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("Gemini generation skipped: set GEMINI_API_KEY in .env.local.");
    return null;
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";
  
  const systemInstructions = `
    You are an expert content strategist for BlockForge.
    You generate content in structured JSON format.
    
    IMPORTANT: For TEXT blocks, you MUST generate a Tiptap-compatible JSON object for the "nodes" property.
    Structure:
    {
      "type": "doc",
      "content": [
        { "type": "heading", "attrs": { "level": 1|2|3 }, "content": [{ "type": "text", "text": "..." }] },
        { "type": "paragraph", "content": [{ "type": "text", "text": "..." }] },
        { "type": "bulletList", "content": [{ "type": "listItem", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "..." }] }] }] },
        { "type": "blockquote", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "..." }] }] },
        { "type": "horizontalRule" }
      ]
    }
    
    DO NOT use raw strings for nodes. DO NOT use HTML. ONLY return valid Tiptap JSON.
  `;

  let schema: any = {};

  switch (type) {
    case BlockType.HERO:
      schema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          subtitle: { type: Type.STRING },
          buttonText: { type: Type.STRING },
          bgImage: { type: Type.STRING }
        },
        required: ["title", "subtitle", "buttonText", "bgImage"]
      };
      break;
    case BlockType.TEXT:
      schema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          nodes: { type: Type.OBJECT } // Gemini will follow prompt instructions for the shape
        },
        required: ["title", "nodes"]
      };
      break;
    case BlockType.CTA:
      schema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          subtitle: { type: Type.STRING },
          buttonText: { type: Type.STRING }
        },
        required: ["title", "subtitle", "buttonText"]
      };
      break;
    case BlockType.FEATURES:
      schema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["title", "description"]
            }
          }
        },
        required: ["title", "items"]
      };
      break;
    case BlockType.IMAGE_GALLERY:
      schema = {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          images: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["title", "images"]
      };
      break;
    case BlockType.STATS:
      schema = {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                value: { type: Type.STRING }
              },
              required: ["label", "value"]
            }
          }
        },
        required: ["items"]
      };
      break;
    default:
      return null;
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Generate content for a ${type} block. User request: ${prompt}`,
      config: {
        systemInstruction: systemInstructions,
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini generation failed:", error);
    return null;
  }
}
