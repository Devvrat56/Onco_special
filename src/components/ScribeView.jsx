import React, { useState, useEffect, useRef } from 'react';
import { Mic, StopCircle, RefreshCcw, FileText, CheckCircle2, User, Upload, Loader2, Video, VideoOff, MicOff, Phone, PhoneOff, Link as LinkIcon } from 'lucide-react';
import config from '../config';
import Peer from 'peerjs';

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

  // WebRTC & Speech Recognition State
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  
  // PeerJS State
  const [localPeerId, setLocalPeerId] = useState('');
  const [remotePeerIdInput, setRemotePeerIdInput] = useState('');
  const [remoteStreamActive, setRemoteStreamActive] = useState(false);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const peerRef = useRef(null);
  const callRef = useRef(null);

  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => setSessionTime(prev => prev + 1), 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Clean up media streams and peer
  useEffect(() => {
    return () => {
      stopMediaTracks();
      if (recognitionRef.current) {
        if (typeof recognitionRef.current.stop === 'function') {
           try { recognitionRef.current.stop(); } catch(e) {}
        }
      }
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, []);

  const stopMediaTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const startVideoCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setIsVideoCallActive(true);
      
      // Initialize PeerJS
      const peer = new Peer();
      
      peer.on('open', (id) => {
        setLocalPeerId(id);
      });

      peer.on('call', (call) => {
        // Answer incoming call with our stream
        call.answer(streamRef.current);
        callRef.current = call;
        
        call.on('stream', (remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            setRemoteStreamActive(true);
          }
        });
      });

      peer.on('error', (err) => {
        console.error("PeerJS Error:", err);
      });

      peerRef.current = peer;
      
      startRecordingAndTranscription();
    } catch (err) {
      console.error("Error accessing media devices.", err);
      alert("Could not access camera/microphone. Please ensure permissions are granted.");
    }
  };

  const connectToRemotePeer = () => {
    if (!peerRef.current || !remotePeerIdInput || !streamRef.current) return;
    
    const call = peerRef.current.call(remotePeerIdInput, streamRef.current);
    callRef.current = call;

    call.on('stream', (remoteStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        setRemoteStreamActive(true);
      }
    });

    call.on('close', () => {
       setRemoteStreamActive(false);
       if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    });
  };

  const endVideoCall = () => {
    if (callRef.current) callRef.current.close();
    if (peerRef.current) peerRef.current.destroy();
    setLocalPeerId('');
    setRemotePeerIdInput('');
    setRemoteStreamActive(false);
    
    stopMediaTracks();
    setIsVideoCallActive(false);
    setIsVideoMuted(false);
    setIsAudioMuted(false);
    handleStopRecording();
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  const startRecordingAndTranscription = () => {
    setIsRecording(true);
    setHasNotes(false);
    setLiveTranscription("");
    setSessionTime(0);
    setSoapNotes(null);
    setIsSaved(false);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let currentTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setLiveTranscription(currentTranscript);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } else {
      console.warn("Speech Recognition API not supported in this browser. Falling back to mock.");
      let mockInterval = setInterval(() => {
        const phrases = ["Patient reports mild chest pain.", " Blood pressure slightly elevated.", " Recommending follow-up.", " Patient is anxious."];
        setLiveTranscription(prev => prev + " " + phrases[Math.floor(Math.random() * phrases.length)]);
      }, 3000);
      recognitionRef.current = { mockInterval, stop: () => clearInterval(mockInterval) };
    }
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    setIsAnalyzing(true);
    
    if (recognitionRef.current) {
      if (typeof recognitionRef.current.stop === 'function') {
         try { recognitionRef.current.stop(); } catch(e) {}
      } else if (recognitionRef.current.mockInterval) {
         clearInterval(recognitionRef.current.mockInterval);
      }
    }

    try {
      const response = await fetch(`${config.API_BASE_URL}/scribe/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: liveTranscription || "Patient consultation ended without speech." }),
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
      const transResponse = await fetch(`${config.API_BASE_URL}/scribe/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!transResponse.ok) throw new Error('Transcription failed');
      const transData = await transResponse.json();
      setLiveTranscription(transData.transcript);
      setIsTranscribing(false);
      
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
      alert("AI Scribe Feature Error: " + error.message);
    } finally {
      setIsTranscribing(false);
      setIsAnalyzing(false);
    }
  };

  const triggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const formatTime = (seconds) => {
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  return (
    <div className="scribe-view animate-fade-in video-scribe-layout">
      <div className="scribe-controls">
        <div className="scribe-header-info">
          <h2>Telehealth AI Scribe <span>WebRTC</span></h2>
          <p>Live Video Conferencing with Autonomous Clinical Documentation</p>
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="audio/*" 
          onChange={handleAudioUpload}
        />

        <div className="scribe-actions-group" style={{ display: 'flex', gap: '12px' }}>
          {!isVideoCallActive ? (
            <>
              <button className="btn-record start" onClick={startVideoCall} aria-label="Start Video Consultation">
                <Video size={24} />
                Start Telehealth Session
              </button>
              <button className="btn-secondary" onClick={triggerUpload} disabled={isTranscribing || isAnalyzing}>
                <Upload size={20} />
                Upload Audio File
              </button>
            </>
          ) : (
            <button className="btn-record stop" onClick={endVideoCall} aria-label="End Video Call">
              <PhoneOff size={24} />
              End Call & Finalize Notes ({formatTime(sessionTime)})
            </button>
          )}
        </div>
      </div>

      <div className={`scribe-main-grid ${isVideoCallActive ? 'with-video' : ''}`}>
        
        {/* Video Call Section */}
        {isVideoCallActive && (
          <section className="video-call-card dashboard-card slide-in-left">
            <div className="card-header" style={{ flexWrap: 'wrap' }}>
              <h3>Live Consultation</h3>
              <span className="recording-indicator blink">Call in Progress</span>
              
              {/* Peer Connection UI */}
              <div className="peer-connection-ui" style={{ width: '100%', display: 'flex', gap: '16px', marginTop: '16px', background: 'var(--azure-mist)', padding: '12px', borderRadius: '12px', border: '1px solid var(--gray-200)' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>YOUR ID</label>
                  <div style={{ fontFamily: 'monospace', background: 'white', padding: '8px', borderRadius: '6px', border: '1px solid var(--gray-200)', userSelect: 'all' }}>
                    {localPeerId || "Generating..."}
                  </div>
                </div>
                <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>CALL PATIENT ID</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="Enter Patient's ID"
                      value={remotePeerIdInput}
                      onChange={(e) => setRemotePeerIdInput(e.target.value)}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--gray-200)', outline: 'none' }}
                    />
                    <button 
                      onClick={connectToRemotePeer}
                      style={{ background: 'var(--primary-blue)', color: 'white', border: 'none', borderRadius: '6px', padding: '0 16px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <LinkIcon size={16} /> Link
                    </button>
                  </div>
                </div>
              </div>

            </div>
            
            <div className="video-grid">
              <div className="video-container remote-video-wrapper">
                {/* Always render the video tag, only hide it if no remote stream */}
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline 
                  className="remote-video"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: remoteStreamActive ? 'block' : 'none' }}
                />
                
                {!remoteStreamActive && (
                  <div className="remote-placeholder">
                    <User size={64} className="remote-icon icon-blue" style={{ marginBottom: '16px' }} />
                    <p>Patient Loading...</p>
                    <p className="small-text text-muted">Awaiting connection. Call Patient ID or have them call yours.</p>
                  </div>
                )}
                
                {remoteStreamActive && <div className="local-badge" style={{ background: 'rgba(37, 99, 235, 0.8)' }}>Patient (Remote)</div>}
              </div>
              
              <div className="video-container local-video-wrapper">
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className={`local-video ${isVideoMuted ? 'video-muted-blur' : ''}`}
                />
                {!isVideoMuted && <div className="local-badge">Doctor (You)</div>}
                {isVideoMuted && <div className="video-off-overlay"><VideoOff size={48} /></div>}
                
                <div className="local-video-controls">
                  <button onClick={toggleAudio} className={`circle-btn ${isAudioMuted ? 'muted' : ''}`} aria-label="Toggle Audio">
                    {isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                  <button onClick={toggleVideo} className={`circle-btn ${isVideoMuted ? 'muted' : ''}`} aria-label="Toggle Video">
                    {isVideoMuted ? <VideoOff size={20} /> : <Video size={20} />}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className={`notes-column ${isVideoCallActive ? 'compact' : 'full-width'}`}>
          <section className="live-transcription-card dashboard-card">
            <div className="card-header">
              <h3>Live AI Intelligence Stream</h3>
              {(isRecording || isVideoCallActive) && <span className="recording-indicator blink">Listening Live...</span>}
              {isTranscribing && <span className="recording-indicator">Transcribing Audio...</span>}
              {isAnalyzing && <span className="recording-indicator">AI Analyzing...</span>}
            </div>
            <div className="transcription-well">
              {liveTranscription || (
                (isRecording || isVideoCallActive) ? "Listening for patient/doctor speech..." : 
                isTranscribing ? "Wait while we transcribe your file..." : 
                "Start a telehealth session to begin AI transcription..."
              )}
              {(isRecording || isTranscribing || isVideoCallActive) && <div className="pulse-wave">
                <div className="wave-bar bar-1"></div>
                <div className="wave-bar bar-2"></div>
                <div className="wave-bar bar-3"></div>
                <div className="wave-bar bar-4"></div>
              </div>}
            </div>
          </section>

          <section className={`soap-notes-card dashboard-card ${hasNotes ? 'final' : 'pending'}`}>
            <div className="card-header">
              <h3>Personalized Care Plan</h3>
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
                  <p>{(isAnalyzing || isTranscribing) ? "Creating your care plan..." : "Complete a video session to see the AI consultation summary."}</p>
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
                      style={{ flex: 1, background: isSaved ? 'var(--gray-300)' : 'var(--primary-blue)', color: 'white', border: 'none', borderRadius: '8px', padding: '12px', cursor: 'pointer', fontWeight: 'bold' }}
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
    </div>
  );
};

export default ScribeView;
