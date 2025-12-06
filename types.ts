export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface ReceiptData {
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  currency: string;
}

export interface Assignment {
  itemId: string;
  assignedTo: string[]; // List of names
}

export interface PersonSummary {
  name: string;
  items: ReceiptItem[];
  subtotal: number;
  taxShare: number;
  tipShare: number;
  totalOwed: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
  isError?: boolean;
}

export enum LoadingState {
  IDLE = 'IDLE',
  ANALYZING_RECEIPT = 'ANALYZING_RECEIPT',
  PROCESSING_CHAT = 'PROCESSING_CHAT',
}