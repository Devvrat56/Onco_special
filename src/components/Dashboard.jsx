import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Mic, 
  FileText, 
  History, 
  Calendar, 
  Settings, 
  LogOut, 
  Plus, 
  Activity, 
  ShieldCheck, 
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import ChatbotView from './ChatbotView';
import ScribeView from './ScribeView';
import ReportView from './ReportView';
import HistoryView from './HistoryView';

const Dashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('carelinq_active_tab') || 'Overview');

  useEffect(() => {
    localStorage.setItem('carelinq_active_tab', activeTab);
  }, [activeTab]);
  
  // -- Frontend Persistence Layer (States lifted for instant updates) --
  const [historyData, setHistoryData] = useState(() => {
    const saved = localStorage.getItem('carelinq_history');
    return saved ? JSON.parse(saved) : { chats: [], scribes: [], reports: [] };
  });

  const addHistoryItem = (category, item) => {
    const newItem = {
      ...item,
      id: item.id || Date.now(),
      category,
      created_at: item.created_at || new Date().toISOString()
    };
    
    setHistoryData(prev => {
      const updated = {
        ...prev,
        [category + 's']: [newItem, ...prev[category + 's']]
      };
      localStorage.setItem('carelinq_history', JSON.stringify(updated));
      return updated;
    });
  };

  const syncWithBackend = (backendData) => {
    setHistoryData(backendData);
    localStorage.setItem('carelinq_history', JSON.stringify(backendData));
  };

  const pillars = [
    {
      id: 'chatbot',
      title: 'Smart AI Chatbot',
      description: 'Check symptoms, ask medical questions, and get triage suggestions instantly.',
      icon: <MessageSquare size={28} aria-hidden="true" />,
      color: '#3b82f6',
      ariaLabel: 'Launch Smart AI Chatbot'
    },
    {
      id: 'scribe',
      title: 'AI Medical Scribe',
      description: 'Convert doctor-patient speech into structured clinical SOAP notes automatically.',
      icon: <Mic size={28} aria-hidden="true" />,
      color: '#6366f1',
      ariaLabel: 'Launch AI Medical Scribe'
    },
    {
      id: 'reports',
      title: 'Report Analyzer',
      description: 'Upload lab reports or PDFs to get simplified AI-generated summaries and alerts.',
      icon: <FileText size={28} aria-hidden="true" />,
      color: '#10b981',
      ariaLabel: 'Launch Report Analyzer'
    }
  ];

  return (
    <div className="dashboard-layout animate-fade-in" role="document">
      {/* Sidebar */}
      <aside className="dashboard-sidebar" role="navigation" aria-label="Main Navigation">
        <div className="sidebar-brand">
          <div className="brand-logo" aria-hidden="true">C</div>
          <span>Carelinq</span>
        </div>
        
        <nav className="sidebar-nav">
          {[
            { name: 'Overview', icon: <Activity size={20} /> },
            { name: 'Chatbot', icon: <MessageSquare size={20} /> },
            { name: 'AI Scribe', icon: <Mic size={20} /> },
            { name: 'Reports', icon: <FileText size={20} /> },
            { name: 'History', icon: <History size={20} /> },
            { name: 'Profile', icon: <Settings size={20} /> }
          ].map((item) => (
            <button 
              key={item.name} 
              className={`nav-item ${activeTab === item.name ? 'active' : ''}`}
              onClick={() => setActiveTab(item.name)}
              aria-current={activeTab === item.name ? 'page' : undefined}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>

        <button className="nav-item logout" onClick={onLogout} aria-label="Sign out of your account">
          <LogOut size={20} aria-hidden="true" />
          Sign Out
        </button>
      </aside>

      {/* Main Content */}
      <main className="dashboard-content" role="main">
        {activeTab !== 'Overview' && (
          <button className="btn-back" onClick={() => setActiveTab('Overview')}>
            <ArrowLeft size={16} /> Back to Overview
          </button>
        )}

        {activeTab === 'Overview' && (
          <>
            <header className="content-header" role="banner">
              <div className="header-user">
                <h1>Good Afternoon, <span className="user-name">John Doe</span></h1>
                <p>Your health metrics look stable today.</p>
              </div>
              <div className="header-actions">
                <button className="btn-secondary" aria-label="View Appointments">
                  <Calendar size={18} aria-hidden="true" />
                  Appointments
                </button>
                <div className="user-avatar" role="img" aria-label="User Profile Avatar">JD</div>
              </div>
            </header>

            <div className="content-grid">
              {/* Health Score Component with SVG Chart */}
              <section className="dashboard-card health-score-card span-2" aria-labelledby="health-score-title">
                <div className="card-header">
                  <h3 id="health-score-title">Health Vitality Index</h3>
                  <span className="badge" aria-label="Value up since yesterday">84% (+2.4%)</span>
                </div>
                
                <div className="score-viz">
                  <div className="chart-container" aria-hidden="true">
                    <svg width="240" height="120" viewBox="0 0 240 120" style={{ overflow: 'visible' }}>
                      {/* Grid Lines */}
                      {[0, 30, 60, 90, 120].map(y => (
                        <line key={y} x1="0" y1={y} x2="240" y2={y} stroke="#f1f5f9" strokeWidth="1" />
                      ))}
                      {/* The actual line chart */}
                      <path 
                        d="M0,80 Q30,70 60,90 T120,50 T180,40 T240,60" 
                        fill="none" 
                        stroke="url(#lineGradient)" 
                        strokeWidth="4" 
                        strokeLinecap="round"
                        className="animate-chart-path"
                      />
                      <defs>
                        <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#60a5fa" />
                          <stop offset="100%" stopColor="#2563eb" />
                        </linearGradient>
                      </defs>
                      {/* Data Points */}
                      <circle cx="120" cy="50" r="6" fill="#2563eb" stroke="white" strokeWidth="2" />
                    </svg>
                  </div>
                  
                  <div className="score-details">
                    <p>Detailed analysis of your vitals from the last 7 days indicates high cardiovascular resilience.</p>
                    <div className="score-metric">
                      <div className="metric-label">Vital Stability <span className="metric-val">92%</span></div>
                      <div className="progress-bar" role="progressbar" aria-valuenow="92" aria-valuemin="0" aria-valuemax="100">
                        <div className="progress-fill" style={{width: '92%'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Quick Actions / Status */}
              <section className="dashboard-card status-card" aria-label="Notifications and Alerts">
                <h3>Medical Intelligence</h3>
                <div className="alert-list" role="list">
                  <div className="alert-item warning" role="listitem">
                    <div className="alert-icon" aria-hidden="true">⚠️</div>
                    <div className="alert-info">
                      <p className="alert-title">Medication Reminder</p>
                      <p className="alert-desc">Metformin dose at 6:00 PM.</p>
                    </div>
                  </div>
                  <div className="alert-item success" role="listitem">
                    <div className="alert-icon" aria-hidden="true">✅</div>
                    <div className="alert-info">
                      <p className="alert-title">Report Analyzed</p>
                      <p className="alert-desc">Blood Lab Jan 2024 summarized.</p>
                    </div>
                  </div>
                </div>
                <button className="btn-text" aria-label="View all health history">
                  Full History <ArrowRight size={14} aria-hidden="true" />
                </button>
              </section>

              {/* AI Pillars Section */}
              <section className="dashboard-section span-full" aria-labelledby="ai-pillars-title">
                <div className="section-header">
                  <h2 id="ai-pillars-title">Operational AI Pillars</h2>
                  <p>Autonomous clinical intelligence at your fingertips.</p>
                </div>
                
                <div className="pillar-grid">
                  {pillars.map((pillar) => (
                    <div key={pillar.id} className="pillar-card group" role="region" aria-label={pillar.title}>
                      <div className="pillar-icon" style={{ backgroundColor: `${pillar.color}15`, color: pillar.color }} aria-hidden="true">
                        {pillar.icon}
                      </div>
                      <div className="pillar-info">
                        <h3>{pillar.title}</h3>
                        <p>{pillar.description}</p>
                      </div>
                      <button 
                        className="pillar-action" 
                        aria-label={pillar.ariaLabel}
                        onClick={() => {
                          if (pillar.id === 'chatbot') setActiveTab('Chatbot');
                          if (pillar.id === 'scribe') setActiveTab('AI Scribe');
                          if (pillar.id === 'reports') setActiveTab('Reports');
                        }}
                      >
                        Access System
                        <ArrowRight size={18} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}

        {activeTab === 'Chatbot' && <ChatbotView addHistoryItem={addHistoryItem} />}
        {activeTab === 'AI Scribe' && <ScribeView addHistoryItem={addHistoryItem} />}
        {activeTab === 'Reports' && <ReportView addHistoryItem={addHistoryItem} />}
        {activeTab === 'History' && (
          <HistoryView 
            historyData={historyData} 
            syncWithBackend={syncWithBackend} 
          />
        )}
        
        {['Profile'].includes(activeTab) && (
          <div className="empty-state-view animate-fade-in">
            <h3>{activeTab} Module</h3>
            <p>This section is currently being updated for clinical-grade security.</p>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <button className="fab-button" aria-label="Quick Action Menu">
        <Plus size={24} aria-hidden="true" />
      </button>
    </div>
  );
};

export default Dashboard;
