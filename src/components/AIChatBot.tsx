import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Trash2, 
  MessageSquare,
  Compass,
  Sprout,
  ShieldCheck,
  Droplet
} from 'lucide-react';
import { motion } from 'motion/react';

interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  createdAt?: string;
}

export const AIChatBot: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Suggested agronomical starter prompt chips
  const promptChips = [
    { label: "Optimal Tomato spacing", icon: Sprout },
    { label: "Diagnose coffee leaf rust", icon: ShieldCheck },
    { label: "Organic nitrogen sources", icon: Compass },
    { label: "Sugarcane irrigation cycles", icon: Droplet },
  ];

  // Fetch historic chats
  const fetchChatHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, "ai_chats"), 
        where("userId", "==", user.uid)
      );
      const snap = await getDocs(q).catch(err => handleFirestoreError(err, OperationType.LIST, "ai_chats"));
      
      const docsData: any[] = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort in memory by createdAt ascending
      docsData.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds !== undefined ? a.createdAt.seconds : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.seconds !== undefined ? b.createdAt.seconds : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeA - timeB;
      });

      const loadedMessages: ChatMessage[] = [];
      docsData.forEach(data => {
        loadedMessages.push({
          id: data.id + "-q",
          role: 'user',
          text: data.question,
          createdAt: data.createdAt
        });
        loadedMessages.push({
          id: data.id + "-r",
          role: 'bot',
          text: data.response,
          createdAt: data.createdAt
        });
      });
      setMessages(loadedMessages);
    } catch (err) {
      console.error("Failed to load historical chat sessions:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchChatHistory();
  }, [user]);

  // Handle auto-scroll to latest chat logs
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isTyping) return;
    
    setInputVal('');
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      // Structure the history correctly from existing messages for context-aware chat
      const contextHistory = messages.slice(-6).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.text
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: textToSend,
          history: contextHistory
        })
      });

      if (!res.ok) {
        throw new Error("AgriBot was temporarily unavailable.");
      }

      const data = await res.json();
      const botResponse = data.text;

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: botResponse
      };

      setMessages(prev => [...prev, botMsg]);

      // Save into DB
      if (user) {
        await addDoc(collection(db, "ai_chats"), {
          userId: user.uid,
          question: textToSend,
          response: botResponse,
          createdAt: serverTimestamp()
        }).catch(err => handleFirestoreError(err, OperationType.CREATE, "ai_chats"));
      }

    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        role: 'bot',
        text: "Apologies. I experienced an ecological response loop block. Please check your system configuration."
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[600px]" id="agribot-chat-hub">
      {/* Bot Header */}
      <div className="bg-slate-50 p-4 border-b border-slate-100 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200">
            <Bot className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">AgriBot AI</h3>
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Senior Agronomist Live
            </span>
          </div>
        </div>
        <span className="text-xs font-mono text-slate-400 bg-white px-2.5 py-1 rounded-lg border border-slate-100">
          Model: 3.5 Flash
        </span>
      </div>

      {/* Main Messages Panel */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loadingHistory ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-slate-400 font-mono text-xs">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Synchronizing historic discussions...
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl">
            <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
            <h4 className="font-medium text-slate-700">Conversational Consulting</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Pose structural agronomy questions. Our expert advisor returns organic treatments, soil improvement grids, and irrigation benchmarks.
            </p>
            {/* Quick Suggestions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 max-w-xl w-full">
              {promptChips.map((chip, idx) => {
                const IconComp = chip.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(chip.label)}
                    className="flex items-center gap-2.5 p-3 text-left bg-white border border-slate-100 rounded-xl hover:border-emerald-300 text-xs text-slate-600 font-medium hover:bg-emerald-50/10 cursor-pointer transition-all"
                  >
                    <IconComp className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{chip.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m) => (
              <div 
                key={m.id}
                className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div className={`p-2 rounded-xl shrink-0 h-9 w-9 flex items-center justify-center ${
                  m.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {m.role === 'user' ? "U" : <Bot className="w-5 h-5" />}
                </div>
                <div className={`p-3.5 rounded-2xl text-sm ${
                  m.role === 'user' 
                    ? 'bg-emerald-600 text-white rounded-tr-none' 
                    : 'bg-slate-50 border border-slate-100 rounded-tl-none font-sans text-slate-800 leading-relaxed'
                }`}>
                  <p className="whitespace-pre-line">{m.text}</p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 max-w-[85%] mr-auto items-center">
                <div className="p-2 bg-slate-100 text-slate-600 rounded-xl h-9 w-9 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl rounded-tl-none flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce delay-75" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce delay-150" />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        )}
      </div>

      {/* Suggested quick assistance panel */}
      {messages.length > 0 && (
        <div className="px-6 py-2 bg-slate-50/50 border-t border-slate-100 flex gap-2 overflow-x-auto text-xs shrink-0 whitespace-nowrap">
          {promptChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip.label)}
              className="px-3 py-1 bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700 rounded-lg cursor-pointer transition-colors text-[11px]"
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Chat Interacter Panel */}
      <div className="p-4 border-t border-slate-100 bg-white rounded-b-2xl">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputVal);
          }}
          className="flex items-center gap-2"
        >
          <input 
            type="text" 
            placeholder="Type your agricultural question..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={isTyping}
            className="flex-1 text-sm text-slate-700 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 bg-slate-50 transition-colors"
          />
          <button
            type="submit"
            disabled={isTyping || !inputVal.trim()}
            className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
