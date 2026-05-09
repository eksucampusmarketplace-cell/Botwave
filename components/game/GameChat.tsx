'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, QUICK_CHAT_MESSAGES, EMOJI_REACTIONS } from '@/lib/game/types';

interface GameChatProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, type: 'player' | 'spectator' | 'emoji') => void;
  isSpectator?: boolean;
  myPlayerId: string;
}

export default function GameChat({ messages, onSendMessage, isSpectator, myPlayerId }: GameChatProps) {
  const [input, setInput] = useState('');
  const [showQuick, setShowQuick] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim(), isSpectator ? 'spectator' : 'player');
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-gray-800/40 rounded-xl border border-gray-700 overflow-hidden">
      <div className="px-3 py-2 bg-gray-800/80 border-b border-gray-700 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-300">
          {isSpectator ? 'Spectator Chat' : 'Game Chat'}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => { setShowEmoji(!showEmoji); setShowQuick(false); }}
            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
          >
            React
          </button>
          <button
            onClick={() => { setShowQuick(!showQuick); setShowEmoji(false); }}
            className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 transition-colors"
          >
            Quick
          </button>
        </div>
      </div>

      {/* Quick chat / emoji panels */}
      {showQuick && (
        <div className="p-2 border-b border-gray-700 flex flex-wrap gap-1">
          {QUICK_CHAT_MESSAGES.map((msg) => (
            <button
              key={msg}
              onClick={() => { onSendMessage(msg, isSpectator ? 'spectator' : 'player'); setShowQuick(false); }}
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-blue-600 rounded-full text-gray-300 transition-colors"
            >
              {msg}
            </button>
          ))}
        </div>
      )}
      {showEmoji && (
        <div className="p-2 border-b border-gray-700 flex gap-2">
          {EMOJI_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { onSendMessage(emoji, 'emoji'); setShowEmoji(false); }}
              className="text-xl hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0" style={{ maxHeight: '250px' }}>
        {messages.length === 0 && (
          <p className="text-sm text-gray-500 text-center mt-4">No messages yet</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`text-sm ${msg.senderId === myPlayerId ? 'text-right' : ''}`}>
            {msg.type === 'emoji' ? (
              <div className={`inline-block text-2xl animate-bounce ${msg.senderId === myPlayerId ? 'ml-auto' : ''}`}>
                {msg.message}
              </div>
            ) : msg.type === 'system' ? (
              <div className="text-center text-gray-500 text-xs italic">{msg.message}</div>
            ) : (
              <div className={`inline-block max-w-[80%] ${msg.senderId === myPlayerId ? 'ml-auto' : ''}`}>
                <span className={`text-xs font-medium ${msg.type === 'spectator' ? 'text-yellow-400' : 'text-blue-400'}`}>
                  {msg.senderName}
                  {msg.type === 'spectator' && ' (spectator)'}
                </span>
                <div className={`mt-0.5 px-3 py-1.5 rounded-lg ${
                  msg.senderId === myPlayerId
                    ? 'bg-blue-600/30 text-blue-100'
                    : 'bg-gray-700/50 text-gray-200'
                }`}>
                  {msg.message}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-2 border-t border-gray-700 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          maxLength={200}
          className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={handleSend}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
