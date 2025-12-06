import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, LoadingState } from '../types';

interface ChatInterfaceProps {
  history: ChatMessage[];
  onSendMessage: (text: string) => void;
  loadingState: LoadingState;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ history, onSendMessage, loadingState }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, loadingState]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loadingState !== LoadingState.IDLE) return;
    onSendMessage(input);
    setInput('');
  };

  const isProcessing = loadingState === LoadingState.PROCESSING_CHAT;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <h2 className="font-semibold text-slate-700 flex items-center gap-2">
          <span className="material-icons-round text-indigo-500">smart_toy</span>
          Split Assistant
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Type commands like "John had the burger" or "Split the pizza between Sarah and Mike"
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {history.length === 0 && (
          <div className="text-center text-slate-400 my-10 px-6">
            <span className="material-icons-round text-4xl mb-2">chat</span>
            <p>Ready to help! Try saying:</p>
            <p className="text-sm italic mt-2">"Alice and Bob shared the Appetizer"</p>
          </div>
        )}
        
        {history.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 bg-white border-t border-slate-100">
        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Who ordered what?"
            disabled={isProcessing}
            className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
          >
            <span className="material-icons-round">send</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;