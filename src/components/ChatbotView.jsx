import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sparkles } from 'lucide-react';

import config from '../config';

const ChatbotView = ({ addHistoryItem }) => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I am your Carelinq AI assistant. How can I help you today? You can describe your symptoms or ask medical questions.", sender: 'bot' }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  // Clinical Context States
  const [age, setAge] = useState("");
  const [cancerType, setCancerType] = useState("Not specified");
  const [cancerStage, setCancerStage] = useState("Unknown");
  const [symptoms, setSymptoms] = useState("");

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch(`${config.API_BASE_URL}/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          history: messages.map(m => ({ role: m.sender === 'bot' ? 'assistant' : 'user', content: m.text })),
          user_type: "patient",
          cancer_type: cancerType,
          cancer_stage: cancerStage,
          age: age ? parseInt(age) : null,
          symptoms: symptoms,
          session_id: sessionId
        }),
      });

      if (!response.ok) throw new Error('Backend failed to respond');

      const data = await response.json();
      
      // Store session ID for subsequent messages in this conversation
      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
      }
      
      const botMsg = { 
        id: Date.now() + 1, 
        text: data.answer || data.response || "I'm sorry, I couldn't process that. Please try again later.", 
        sender: 'bot' 
      };
      setMessages(prev => [...prev, botMsg]);
      setIsSaved(false); // Reset saved status for new message
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg = { 
        id: Date.now() + 2, 
        text: "System Error: Failed to communicate with the Carelinq AI backend. Please check your network connection.", 
        sender: 'bot' 
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="chatbot-view animate-fade-in">
      <div className="chat-header">
        <div className="header-info">
          <div className="bot-avatar"><Bot size={20} /></div>
          <div>
            <h3>Carelinq Smart Assistant</h3>
            <p className="status"><span className="status-dot"></span> Online | Clinical AI v2.4</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {messages.length > 1 && (
            <button 
              className={`btn-save-history ${isSaved ? 'saved' : ''}`}
              disabled={isSaved || isTyping}
              onClick={async () => {
                if (addHistoryItem) {
                  setIsTyping(true); // Reuse typing state for generating summary
                  try {
                    const response = await fetch(`${config.API_BASE_URL}/chat/summarize`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(messages.map(m => ({ role: m.sender === 'bot' ? 'assistant' : 'user', content: m.text })))
                    });
                    const data = await response.json();
                    
                    addHistoryItem('chat', {
                      preview: data.summary || messages[messages.length - 1].text.slice(0, 80) + "...",
                      user_type: "patient"
                    });
                    setIsSaved(true);
                  } catch (err) {
                    console.error("Manual save failed:", err);
                    // Fallback to preview
                    addHistoryItem('chat', {
                      preview: messages[messages.length - 1].text.slice(0, 80) + "...",
                      user_type: "patient"
                    });
                    setIsSaved(true);
                  } finally {
                    setIsTyping(false);
                  }
                }
              }}
              style={{
                fontSize: '0.8rem',
                padding: '6px 12px',
                borderRadius: '8px',
                background: isSaved ? 'var(--gray-100)' : 'var(--primary-blue)',
                color: isSaved ? 'var(--text-muted)' : 'white',
                border: 'none',
                cursor: isSaved ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isSaved ? "✓ Saved" : "Save Summary"}
            </button>
          )}
          <button 
            className="btn-icon-secondary" 
            onClick={() => setShowProfile(!showProfile)}
            title="Update Patient Profile"
            style={{ 
              background: showProfile ? 'var(--primary-blue)' : 'rgba(255,255,255,0.1)',
              color: showProfile ? 'white' : 'inherit',
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <User size={20} />
          </button>
          <Sparkles className="sparkle-icon" size={20} />
        </div>
      </div>

      <div className="chatbot-content-wrapper" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {showProfile && (
          <div className="patient-profile-sidebar animate-slide-right" style={{
            width: '280px',
            background: 'rgba(255,255,255,0.03)',
            borderRight: '1px solid var(--gray-100)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            overflowY: 'auto'
          }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05rem' }}>Clinical Context</h4>
            
            <div className="input-group">
              <label style={{ fontSize: '0.75rem', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>Patient Age</label>
              <input 
                type="number" 
                value={age} 
                onChange={(e) => setAge(e.target.value)}
                placeholder="Years"
                style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--gray-100)', color: 'white' }}
              />
            </div>

            <div className="input-group">
              <label style={{ fontSize: '0.75rem', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>Cancer Type</label>
              <select 
                value={cancerType} 
                onChange={(e) => setCancerType(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--gray-100)', color: 'white' }}
              >
                <option value="Not specified">Select Type</option>
                <option value="Breast Cancer">Breast Cancer</option>
                <option value="Lung Cancer">Lung Cancer</option>
                <option value="Leukemia">Leukemia</option>
                <option value="Prostate Cancer">Prostate Cancer</option>
                <option value="Colon Cancer">Colon Cancer</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="input-group">
              <label style={{ fontSize: '0.75rem', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>Cancer Stage</label>
              <select 
                value={cancerStage} 
                onChange={(e) => setCancerStage(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--gray-100)', color: 'white' }}
              >
                <option value="Unknown">Select Stage</option>
                <option value="Stage 1">Stage 1</option>
                <option value="Stage 2">Stage 2</option>
                <option value="Stage 3">Stage 3</option>
                <option value="Stage 4">Stage 4</option>
              </select>
            </div>

            <div className="input-group">
              <label style={{ fontSize: '0.75rem', color: 'var(--text-main)', marginBottom: '4px', display: 'block' }}>Current Symptoms</label>
              <textarea 
                value={symptoms} 
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Pain, fatigue, etc."
                style={{ width: '100%', height: '80px', padding: '8px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--gray-100)', color: 'white', resize: 'none' }}
              />
            </div>

            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 'auto' }}>
              Providing context helps the AI tailor its supportive guidance to your specific case.
            </p>
          </div>
        )}

        <div className="messages-container" style={{ flex: 1 }}>
          {messages.map((msg) => (
            <div key={msg.id} className={`message-wrapper ${msg.sender}`}>
              <div className="message-bubble" style={{ whiteSpace: 'pre-wrap' }}>
                <div style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>
                  {msg.text}
                </div>
              </div>
              <span className="message-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
          {isTyping && (
            <div className="message-wrapper bot">
              <div className="message-bubble typing">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form className="chat-input-area" onSubmit={handleSend}>
        <input 
          type="text" 
          placeholder="Describe your symptoms (e.g. 'I have a mild headache')..." 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Type your medical query"
        />
        <button type="submit" className="send-button" aria-label="Send message">
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default ChatbotView;
