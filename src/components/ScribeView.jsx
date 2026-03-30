import React, { useState, useEffect, useRef } from 'react';
import { Mic, StopCircle, RefreshCcw, FileText, CheckCircle2, User, UserPlus, Upload, Loader2 } from 'lucide-react';
import config from '../config';

const ScribeView = ({ addHistoryItem }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasNotes, setHasNotes] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState("");
  const [sessionTime, setSessionTime] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [soapNotes, setSoapNotes] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef(null);

  const mockPhrases = [
    "Patient reports mild chest pain and fatigue... ",
    "Duration of symptoms: 3 days... ",
    "Patient's blood pressure was slightly elevated... ",
    "Recommendation for a follow-up EKG... ",
    "Suspected stress-induced anxiety... "
  ];

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        setSessionTime(prev => prev + 1);
        if (Math.random() > 0.7) {
          const phrase = mockPhrases[Math.floor(Math.random() * mockPhrases.length)];
          setLiveTranscription(prev => prev + phrase);
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleStart = () => {
    setIsRecording(true);
    setHasNotes(false);
    setLiveTranscription("");
    setSessionTime(0);
    setSoapNotes(null);
    setIsSaved(false);
  };

  const handleStop = async () => {
    setIsRecording(false);
    setIsAnalyzing(true);
    
    try {
      const response = await fetch(`${config.API_BASE_URL}/scribe/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: liveTranscription || "Patient reports chest pain." }),
      });

      if (!response.ok) throw new Error('Analysis failed');

      const data = await response.json();
      setSoapNotes(data);
      setHasNotes(true);
      setIsSaved(false);
    } catch (error) {
      console.error("Scribe Error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setHasNotes(false);
    setLiveTranscription("");
    setSoapNotes(null);
    setIsSaved(false);
    setIsTranscribing(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // 1. Transcribe
      const transResponse = await fetch(`${config.API_BASE_URL}/scribe/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!transResponse.ok) throw new Error('Transcription failed');
      const transData = await transResponse.json();
      setLiveTranscription(transData.transcript);
      setIsTranscribing(false);
      
      // 2. Analyze
      setIsAnalyzing(true);
      const analyzeResponse = await fetch(`${config.API_BASE_URL}/scribe/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transData.transcript }),
      });

      if (!analyzeResponse.ok) throw new Error('Analysis failed');
      const analyzeData = await analyzeResponse.json();
      setSoapNotes(analyzeData);
      setHasNotes(true);
      setIsSaved(false);
    } catch (error) {
      console.error("Audio Upload Error Trace:", error);
      alert("AI Scribe Feature Error: " + error.message + ". Please ensure your audio file is under 25MB and is a valid audio format.");
      setIsTranscribing(false);
      setIsAnalyzing(false);
    } finally {
      setIsTranscribing(false);
      setIsAnalyzing(false);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="scribe-view animate-fade-in">
      <div className="scribe-controls">
        <div className="scribe-header-info">
          <h2>AI Medical Scribe <span>v2.0</span></h2>
          <p>Autonomous Doctor-Patient Clinical Documentation</p>
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="audio/*" 
          onChange={handleAudioUpload}
        />

        <div className="scribe-actions-group" style={{ display: 'flex', gap: '12px' }}>
          {!isRecording ? (
            <>
              <button className="btn-record start" onClick={handleStart} aria-label="Start recording session">
                <Mic size={24} />
                Start New Session
              </button>
              <button className="btn-secondary" onClick={triggerUpload} disabled={isTranscribing || isAnalyzing}>
                <Upload size={20} />
                Upload Recording
              </button>
            </>
          ) : (
            <button className="btn-record stop" onClick={handleStop} aria-label="Stop recording and generate notes">
              <StopCircle size={24} />
              Finalize Note ({Math.floor(sessionTime / 60)}:{(sessionTime % 60).toString().padStart(2, '0')})
            </button>
          )}
        </div>
      </div>

      <div className="scribe-main-grid">
        <section className="live-transcription-card dashboard-card">
          <div className="card-header">
            <h3>Live Intelligence Stream</h3>
            {isRecording && <span className="recording-indicator blink">Recording Live...</span>}
            {isTranscribing && <span className="recording-indicator">Transcribing Audio...</span>}
            {isAnalyzing && <span className="recording-indicator">AI Analyzing...</span>}
          </div>
          <div className="transcription-well">
            {liveTranscription || (
              isRecording ? "Listening for speech..." : 
              isTranscribing ? "Wait while we transcribe your file..." : 
              "Awaiting recording or file upload..."
            )}
            {(isRecording || isTranscribing) && <div className="pulse-wave">
              <div className="wave-bar bar-1"></div>
              <div className="wave-bar bar-2"></div>
              <div className="wave-bar bar-3"></div>
              <div className="wave-bar bar-4"></div>
            </div>}
          </div>
        </section>

        <section className={`soap-notes-card dashboard-card ${hasNotes ? 'final' : 'pending'}`}>
          <div className="card-header">
            <h3>Your Personalized Care Plan</h3>
            {hasNotes && <span className="status-badge success"><CheckCircle2 size={14} /> Carelinq AI verified</span>}
          </div>
          <div className="notes-content">
            {!hasNotes ? (
              <div className="empty-state">
                {(isAnalyzing || isTranscribing) ? (
                  <Loader2 size={48} className="spin-icon icon-blue" />
                ) : (
                  <RefreshCcw size={48} className="icon-muted" />
                )}
                <p>{(isAnalyzing || isTranscribing) ? "Creating your care plan..." : "Complete a session to see your consultation summary."}</p>
              </div>
            ) : (
              <div className="structured-notes care-plan-layout">
                <div className="soap-section care-overview">
                  <p style={{ fontSize: '1.1rem', lineHeight: '1.7', color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                    {soapNotes?.summary || "Your summary is being prepared."}
                  </p>
                </div>
                
                {soapNotes?.entities && soapNotes.entities.length > 0 && (
                  <div className="soap-section entities-highlight">
                    <label style={{ color: 'var(--cobalt)', fontSize: '0.9rem', marginBottom: '12px', display: 'block' }}>IMPORTANT MEDICAL DETAILS</label>
                    <div className="entities-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {soapNotes.entities.map((ent, idx) => (
                        <span key={idx} className="badge info-pill" style={{ 
                          padding: '6px 12px', 
                          borderRadius: '20px', 
                          fontSize: '0.85rem', 
                          background: 'rgba(55, 114, 255, 0.08)', 
                          color: 'var(--primary-blue)',
                          border: '1px solid rgba(55, 114, 255, 0.15)',
                          fontWeight: '500'
                        }}>
                          {ent.text} • <small style={{ opacity: 0.7 }}>{ent.label.replace('_', ' ')}</small>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="notes-actions" style={{ marginTop: '40px', borderTop: '1px solid var(--gray-100)', paddingTop: '24px', display: 'flex', gap: '16px' }}>
                  <button 
                    className="btn-secondary" 
                    style={{ flex: 1 }}
                    onClick={async () => {
                      if (!soapNotes) return;
                      try {
                        const response = await fetch(`${config.API_BASE_URL}/scribe/generate-pdf`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            transcript: soapNotes.transcript,
                            entities: soapNotes.entities,
                            summary_text: soapNotes.summary
                          })
                        });
                        if (!response.ok) throw new Error('PDF Generation failed');
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Scribe_CarePlan_${Date.now()}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                      } catch (err) {
                        console.error("PDF Download failed:", err);
                        alert("Could not generate PDF. Please try again.");
                      }
                    }}
                  >
                    Download PDF
                  </button>
                  <button 
                    className={`btn-save ${isSaved ? 'btn-saved' : 'btn-primary-blue'}`} 
                    style={{ flex: 1, background: isSaved ? 'var(--gray-300)' : 'var(--primary-blue)' }}
                    disabled={isSaved}
                    onClick={() => {
                      if (addHistoryItem && soapNotes) {
                        addHistoryItem('scribe', {
                          summary: soapNotes.summary,
                          entities: soapNotes.entities,
                          transcript: soapNotes.transcript
                        });
                        setIsSaved(true);
                      }
                    }}
                  >
                    {isSaved ? "Saved to History" : "Save to History"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ScribeView;
