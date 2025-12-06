import React, { useState, useMemo, useEffect } from 'react';
import { ReceiptData, Assignment, ChatMessage, LoadingState, PersonSummary, ReceiptItem } from './types';
import { parseReceiptImage, processChatCommand } from './services/geminiService';
import ReceiptViewer from './components/ReceiptViewer';
import ChatInterface from './components/ChatInterface';
import SummaryCard from './components/SummaryCard';

const App: React.FC = () => {
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [error, setError] = useState<string | null>(null);

  // Calculate the per-person summary based on current assignments and receipt data
  const peopleSummary = useMemo<PersonSummary[]>(() => {
    if (!receipt) return [];

    const peopleMap = new Map<string, PersonSummary>();

    // Helper to get or create person entry
    const getPerson = (name: string) => {
      if (!peopleMap.has(name)) {
        peopleMap.set(name, {
          name,
          items: [],
          subtotal: 0,
          taxShare: 0,
          tipShare: 0,
          totalOwed: 0,
        });
      }
      return peopleMap.get(name)!;
    };

    // Distribute items
    receipt.items.forEach((item) => {
      const assignment = assignments.find((a) => a.itemId === item.id);
      if (assignment && assignment.assignedTo.length > 0) {
        const splitCount = assignment.assignedTo.length;
        const priceShare = item.price / splitCount;

        assignment.assignedTo.forEach((personName) => {
          const person = getPerson(personName);
          person.items.push(item);
          person.subtotal += priceShare;
        });
      }
    });

    // Calculate totals with tax and tip distributed proportionally based on subtotal share
    const totalSubtotalAssigned = Array.from(peopleMap.values()).reduce((acc, p) => acc + p.subtotal, 0);
    
    // Avoid division by zero if nothing is assigned yet
    const safeTotalSubtotal = totalSubtotalAssigned || 1; 

    Array.from(peopleMap.values()).forEach((person) => {
      // Calculate ratio based on their share of the assigned subtotal
      // Or should it be based on the receipt subtotal? 
      // Usually, unassigned items are left out, but tax/tip applies to the whole bill.
      // Strategy: Tax/Tip is proportional to the person's subtotal vs total receipt subtotal.
      // This means unassigned items leave some tax/tip unassigned (which is correct).
      
      const ratio = person.subtotal / receipt.subtotal;
      
      person.taxShare = receipt.tax * ratio;
      person.tipShare = receipt.tip * ratio;
      person.totalOwed = person.subtotal + person.taxShare + person.tipShare;
    });

    return Array.from(peopleMap.values());
  }, [receipt, assignments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingState(LoadingState.ANALYZING_RECEIPT);
    setError(null);

    try {
      const data = await parseReceiptImage(file);
      setReceipt(data);
      setAssignments([]); // Reset assignments
      setChatHistory([
        {
          id: 'welcome-msg',
          role: 'model',
          text: `I've analyzed your receipt! It has ${data.items.length} items totaling ${data.currency}${data.total}. You can now tell me who ordered what.`,
          timestamp: new Date(),
        },
      ]);
    } catch (err: any) {
      console.error(err);
      setError("Failed to analyze receipt. Please try another image.");
    } finally {
      setLoadingState(LoadingState.IDLE);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!receipt) return;

    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date(),
    };

    setChatHistory((prev) => [...prev, newUserMsg]);
    setLoadingState(LoadingState.PROCESSING_CHAT);

    try {
      const { text: responseText, toolCalls } = await processChatCommand(
        text,
        chatHistory,
        receipt,
        assignments
      );

      // Handle Tool Calls (Assignments)
      if (toolCalls && toolCalls.length > 0) {
        let newAssignments = [...assignments];
        let receiptUpdates = { ...receipt }; // Shallow copy for potential tip updates

        toolCalls.forEach((call) => {
          if (call.name === 'assignItem') {
            const { itemIds, people } = call.args as { itemIds: string[], people: string[] };
            
            // Normalize people names (simple title case)
            const cleanPeople = people.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase());

            itemIds.forEach((id) => {
              // Remove existing assignment for this item if needed, or overwrite? 
              // Let's overwrite for simplicity as "assign" usually implies "set".
              newAssignments = newAssignments.filter(a => a.itemId !== id);
              newAssignments.push({ itemId: id, assignedTo: cleanPeople });
            });
          } else if (call.name === 'setTip') {
            const { amount } = call.args as { amount: number };
             receiptUpdates.tip = amount;
             receiptUpdates.total = receiptUpdates.subtotal + receiptUpdates.tax + amount;
          }
        });

        setAssignments(newAssignments);
        setReceipt(receiptUpdates);
      }

      const newModelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date(),
      };

      setChatHistory((prev) => [...prev, newModelMsg]);

    } catch (err) {
      console.error(err);
      setChatHistory((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'model',
          text: "Sorry, I had trouble processing that request.",
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setLoadingState(LoadingState.IDLE);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 text-white p-2 rounded-lg">
            <span className="material-icons-round text-xl">splitscreen</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800">SplitSmart</h1>
        </div>
        
        {!receipt && (
           <p className="text-sm text-slate-500 hidden sm:block">Upload a receipt to get started</p>
        )}

        {receipt && (
          <button 
            onClick={() => {
              if(confirm("Start over with a new receipt?")) {
                setReceipt(null);
                setAssignments([]);
                setChatHistory([]);
              }
            }}
            className="text-sm text-slate-500 hover:text-indigo-600 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Reset
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden p-4 md:p-6">
        {!receipt ? (
          // Empty State / Upload
          <div className="h-full flex flex-col items-center justify-center animate-fade-in">
            <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="material-icons-round text-4xl">add_a_photo</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Upload Receipt</h2>
              <p className="text-slate-500 mb-8">
                Take a photo or upload an image of your bill. AI will extract the items for you.
              </p>
              
              <label className={`block w-full cursor-pointer ${loadingState !== LoadingState.IDLE ? 'pointer-events-none opacity-70' : ''}`}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2">
                  {loadingState === LoadingState.ANALYZING_RECEIPT ? (
                    <>
                      <span className="animate-spin material-icons-round text-sm">refresh</span>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <span className="material-icons-round">upload_file</span>
                      Select Image
                    </>
                  )}
                </div>
              </label>
              
              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2 justify-center">
                  <span className="material-icons-round text-sm">error</span>
                  {error}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Split Interface
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full max-h-full">
            
            {/* Left Column: Receipt & Summary */}
            <div className="md:col-span-7 lg:col-span-8 flex flex-col gap-6 h-full overflow-hidden">
              <div className="flex-1 min-h-0">
                <ReceiptViewer receipt={receipt} assignments={assignments} />
              </div>
              <div className="h-auto md:h-1/3 min-h-[200px]">
                <SummaryCard people={peopleSummary} currency={receipt.currency} />
              </div>
            </div>

            {/* Right Column: Chat */}
            <div className="md:col-span-5 lg:col-span-4 h-full min-h-0">
              <ChatInterface 
                history={chatHistory} 
                onSendMessage={handleSendMessage}
                loadingState={loadingState}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;