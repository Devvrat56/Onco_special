import React, { useState, useEffect } from 'react';
import { 
  History, 
  MessageSquare, 
  Mic, 
  FileText, 
  Calendar, 
  ChevronRight, 
  Search, 
  Filter,
  RefreshCw,
  Loader2,
  ExternalLink,
  ClipboardList,
  X
} from 'lucide-react';
import config from '../config';

const HistoryView = ({ historyData, syncWithBackend }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${config.API_BASE_URL}/history/all`);
      if (!response.ok) throw new Error("Failed to fetch history");
      const data = await response.json();
      syncWithBackend(data); // Using prop to update global state
    } catch (error) {
      console.error("History fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString([], { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const allItems = [
    ...historyData.chats.map(item => ({ ...item, category: 'chat' })),
    ...historyData.scribes.map(item => ({ ...item, category: 'scribe' })),
    ...historyData.reports.map(item => ({ ...item, category: 'report' }))
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const filteredItems = allItems.filter(item => {
    if (activeSubTab !== 'all' && item.category !== activeSubTab) return false;
    if (searchTerm) {
      const searchStr = searchTerm.toLowerCase();
      if (item.category === 'chat') return item.preview.toLowerCase().includes(searchStr);
      if (item.category === 'scribe') return item.summary.toLowerCase().includes(searchStr);
      if (item.category === 'report') return (item.file_name?.toLowerCase().includes(searchStr) || item.summary?.toLowerCase().includes(searchStr));
    }
    return true;
  });

  return (
    <div className="history-view animate-fade-in">
      <div className="view-header">
        <div className="header-title">
          <div className="title-icon"><History size={24} /></div>
          <div>
            <h2>Clinical Records History</h2>
            <p>Access and review all previous AI interactions and analyzed data.</p>
          </div>
        </div>
        <button className="btn-secondary refresh-btn" onClick={fetchHistory} disabled={isLoading}>
          {isLoading ? <Loader2 className="spin-icon" size={16} /> : <RefreshCw size={16} />}
          Sync Records
        </button>
      </div>

      <div className="history-filters">
        <div className="search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Search summaries and reports..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="tab-pills">
          {['all', 'chat', 'scribe', 'report'].map(tab => (
            <button 
              key={tab} 
              className={`pill ${activeSubTab === tab ? 'active' : ''}`}
              onClick={() => setActiveSubTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}s
            </button>
          ))}
        </div>
      </div>

      <div className="history-list-container">
        {isLoading ? (
          <div className="history-loader">
            <Loader2 className="spin-icon" size={48} />
            <p>Retrieving secure clinical history...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-history">
            <ClipboardList size={64} />
            <h4>No records found</h4>
            <p>Records will appear here automatically after you use the AI features.</p>
          </div>
        ) : (
          <div className="history-grid">
            {filteredItems.map((item) => (
              <div key={`${item.category}-${item.id}`} className={`history-card ${item.category}`}>
                <div className="card-badge">
                  {item.category === 'chat' && <MessageSquare size={14} />}
                  {item.category === 'scribe' && <Mic size={14} />}
                  {item.category === 'report' && <FileText size={14} />}
                  {item.category}
                </div>
                
                <div className="card-top">
                  <span className="timestamp"><Calendar size={14} /> {formatDate(item.created_at)}</span>
                  <button className="view-btn" onClick={() => setSelectedRecord(item)} title="View Detailed Record">
                    <ExternalLink size={16} />
                  </button>
                </div>

                <div className="card-content">
                  {item.category === 'chat' && (
                    <>
                      <h4>AI Consultation Log</h4>
                      <p className="preview">"{item.preview}"</p>
                      <div className="chat-meta">
                        <span className="meta-tag">{item.user_type}</span>
                      </div>
                    </>
                  )}
                  {item.category === 'scribe' && (
                    <>
                      <h4>Scribe: Personalized Care Plan</h4>
                      <p className="preview">{item.summary.length > 120 ? item.summary.slice(0, 120) + '...' : item.summary}</p>
                      <div className="scribe-meta">
                        <span className="meta-tag blue">AI Summary Ready</span>
                      </div>
                    </>
                  )}
                  {item.category === 'report' && (
                    <>
                      <h4>Report Finding Analysis</h4>
                      <p className="preview">{item.summary ? (item.summary.length > 120 ? item.summary.slice(0, 120) + '...' : item.summary) : "Summary pending deployment."}</p>
                      <div className="report-meta">
                        <span className="meta-tag green">{item.file_name}</span>
                      </div>
                    </>
                  )}
                </div>
                
                <button className="card-action-btn" onClick={() => setSelectedRecord(item)}>
                  View Full Result
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <span className={`modal-badge ${selectedRecord.category}`}>
                   {selectedRecord.category.toUpperCase()}
                </span>
                <h3>Detailed Clinical Record</h3>
              </div>
              <button className="close-btn" onClick={() => setSelectedRecord(null)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="meta-details">
                <span className="timestamp"><Calendar size={14} /> Recorded on {formatDate(selectedRecord.created_at)}</span>
                {selectedRecord.file_name && <span className="timestamp"><FileText size={14} /> {selectedRecord.file_name}</span>}
              </div>
              
              <div className="full-content">
                {selectedRecord.category === 'scribe' || selectedRecord.category === 'report' ? (
                  <div className="detailed-summary">
                    <div className="summary-header">
                      <h4>📋 AI Generated Summary</h4>
                    </div>
                    <div className="summary-text-box">
                      {selectedRecord.category === 'scribe' ? (
                         <div className="care-plan-render">
                            {selectedRecord.summary}
                         </div>
                      ) : (
                         <p className="report-render">{selectedRecord.summary || "This report analysis is pending a backend redeployment."}</p>
                      )}
                    </div>
                    
                    {selectedRecord.category === 'scribe' && (
                      <div className="modal-actions">
                        <button className="btn-primary-blue">
                          Download Patient PDF
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="detailed-summary">
                    <h4>Chat Interaction Log</h4>
                    <div className="chat-preview-box">
                      <p className="preview-text">"{selectedRecord.preview}"</p>
                    </div>
                    <p className="hint-text">For full HIPAA-compliant chat logs, please contact system administration.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryView;
