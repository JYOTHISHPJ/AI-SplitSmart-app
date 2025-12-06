import { GoogleGenAI, Type, Schema, FunctionDeclaration } from "@google/genai";
import { MODEL_NAME, SYSTEM_INSTRUCTION_RECEIPT, SYSTEM_INSTRUCTION_CHAT } from "../constants";
import { ReceiptData, ReceiptItem, ChatMessage, Assignment } from "../types";

// Initialize the API client
// Note: We create a new instance in functions to ensure we get the latest key if needed, 
// though typically process.env.API_KEY is static.
const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Schema for Receipt Parsing
const receiptSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          price: { type: Type.NUMBER },
          quantity: { type: Type.NUMBER },
        },
        required: ["id", "name", "price", "quantity"],
      },
    },
    subtotal: { type: Type.NUMBER },
    tax: { type: Type.NUMBER },
    tip: { type: Type.NUMBER },
    total: { type: Type.NUMBER },
    currency: { type: Type.STRING },
  },
  required: ["items", "subtotal", "tax", "tip", "total", "currency"],
};

// Function Definitions for Chat Tools
const assignItemTool: FunctionDeclaration = {
  name: "assignItem",
  description: "Assigns a specific receipt item to one or more people.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      itemIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "The unique IDs of the items to assign.",
      },
      people: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "The names of the people to assign these items to.",
      },
    },
    required: ["itemIds", "people"],
  },
};

const setTipTool: FunctionDeclaration = {
  name: "setTip",
  description: "Updates the tip amount for the bill.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      amount: { type: Type.NUMBER, description: "The new tip amount." },
    },
    required: ["amount"],
  },
};

/**
 * Analyzes an uploaded receipt image and returns structured data.
 */
export const parseReceiptImage = async (file: File): Promise<ReceiptData> => {
  const ai = getAIClient();
  
  // Convert file to base64
  const base64Data = await fileToGenerativePart(file);

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: {
      parts: [
        { inlineData: { mimeType: file.type, data: base64Data } },
        { text: "Parse this receipt into structured JSON." },
      ],
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_RECEIPT,
      responseMimeType: "application/json",
      responseSchema: receiptSchema,
    },
  });

  if (response.text) {
    return JSON.parse(response.text) as ReceiptData;
  }
  throw new Error("Failed to parse receipt data.");
};

/**
 * Processes a chat message to update assignments.
 */
export const processChatCommand = async (
  message: string,
  history: ChatMessage[],
  receipt: ReceiptData,
  currentAssignments: Assignment[]
): Promise<{ text: string; toolCalls: any[] }> => {
  const ai = getAIClient();

  // Construct context for the model
  const itemsContext = receipt.items
    .map((item) => `ID: ${item.id}, Name: "${item.name}", Price: ${item.price}`)
    .join("\n");
  
  const assignmentsContext = currentAssignments
    .map(a => `Item ${a.itemId} is assigned to: ${a.assignedTo.join(", ")}`)
    .join("\n");

  const contextPrompt = `
    CURRENT RECEIPT CONTEXT:
    ${itemsContext}
    
    CURRENT ASSIGNMENTS:
    ${assignmentsContext}
    
    CURRENT TOTALS:
    Subtotal: ${receipt.subtotal}
    Tax: ${receipt.tax}
    Tip: ${receipt.tip}
  `;

  // We only send the last few messages to keep context concise, plus the robust system instruction
  const recentHistory = history.slice(-6).map(msg => ({
    role: msg.role === 'model' ? 'model' : 'user',
    parts: [{ text: msg.text }],
  }));

  const chat = ai.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION_CHAT + "\n" + contextPrompt,
      tools: [{ functionDeclarations: [assignItemTool, setTipTool] }],
    },
    history: recentHistory,
  });

  const response = await chat.sendMessage({ message });
  
  const text = response.text || "I processed that for you.";
  
  // Extract function calls if any
  const toolCalls: any[] = [];
  const candidates = response.candidates;
  if (candidates && candidates.length > 0) {
    for (const part of candidates[0].content.parts) {
      if (part.functionCall) {
        toolCalls.push(part.functionCall);
      }
    }
  }

  return { text, toolCalls };
};

// Helper: Convert File to Base64
async function fileToGenerativePart(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}