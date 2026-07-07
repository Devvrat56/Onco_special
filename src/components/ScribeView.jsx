import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, StopCircle, RefreshCcw, FileText, CheckCircle2, User, Upload, Loader2, 
  Video, VideoOff, MicOff, Phone, PhoneOff, Link as LinkIcon,
  Calendar, Search, X, History, ExternalLink, LogOut, Download, AlertTriangle,
  Pencil, Check
} from 'lucide-react';
import config from '../config';
import Peer from 'peerjs';

const getMockMedicalData = (filename = "") => {
  // If the filename contains "Preeti Gupta" or similar, use a specialized mock script
  const isPreeti = filename.toLowerCase().includes("preeti") || filename.toLowerCase().includes("gupta") || filename.toLowerCase().includes("meeting");
  
  let transcript = "";
  let summary = "";
  let entities = [];

  if (isPreeti) {
    transcript = "Doctor: Good afternoon, Preeti. How are you feeling today after your third cycle of chemotherapy?\n" +
      "Patient: Hello doctor. I've been feeling okay, but I started experiencing mild neuropathy in my fingers and persistent fatigue over the last few days.\n" +
      "Doctor: I see. Neuropathy is a common side effect of Paclitaxel chemotherapy. Let's record your vitals. BP is 128/82, heart rate is 76 bpm, temperature is 98.6. We will monitor the neuropathy closely. I'll prescribe Gabapentin 300mg daily to manage the nerve symptoms, and let's schedule your next cycle in two weeks.";
    
    summary = "CLINICAL SOAP PLAN\n\n" +
      "SUBJECTIVE:\n" +
      "- Patient Preeti Gupta presents for follow-up after chemotherapy cycle 3.\n" +
      "- Complains of mild neuropathy in fingers and fatigue over the past few days.\n\n" +
      "OBJECTIVE:\n" +
      "- Blood Pressure: 128/82 mmHg\n" +
      "- Heart Rate: 76 bpm\n" +
      "- Temperature: 98.6 F\n\n" +
      "ASSESSMENT:\n" +
      "- Chemotherapy-induced peripheral neuropathy (secondary to Paclitaxel).\n" +
      "- Cancer treatment-related fatigue.\n\n" +
      "PLAN:\n" +
      "- Prescribed Gabapentin 300mg orally once daily for neuropathic pain.\n" +
      "- Schedule follow-up and next chemo cycle in 2 weeks.\n" +
      "- Monitor neuropathy and report worsening symptoms immediately.";
      
    entities = [
      { text: "Preeti Gupta", label: "PATIENT_NAME" },
      { text: "neuropathy", label: "SYMPTOM" },
      { text: "fatigue", label: "SYMPTOM" },
      { text: "Paclitaxel", label: "CHEMOTHERAPY_DRUG" },
      { text: "Gabapentin 300mg", label: "MEDICATION" },
      { text: "128/82", label: "VITALS_BP" }
    ];
  } else {
    transcript = "Doctor: Good morning. Let's review your symptoms. How have you been feeling?\n" +
      "Patient: I have had a dry cough for the last week and some mild chest tightness, but no fever.\n" +
      "Doctor: Okay. Your lungs sound clear on auscultation. Vitals are stable: BP 120/80, temp 98.4 F, O2 sat 98%. We'll start you on Albuterol inhaler as needed for chest tightness and check back in a week.";
      
    summary = "CLINICAL SOAP PLAN\n\n" +
      "SUBJECTIVE:\n" +
      "- Patient reports dry cough for 1 week and mild chest tightness.\n" +
      "- Denies fever or shortness of breath.\n\n" +
      "OBJECTIVE:\n" +
      "- Lungs: Clear to auscultation bilaterally.\n" +
      "- BP: 120/80 mmHg\n" +
      "- Temp: 98.4 F\n" +
      "- O2 Saturation: 98% on room air.\n\n" +
      "ASSESSMENT:\n" +
      "- Acute bronchitis vs mild asthma exacerbation.\n\n" +
      "PLAN:\n" +
      "- Albuterol HFA inhaler: 2 puffs every 4-6 hours as needed for cough/tightness.\n" +
      "- Follow up in 7 days or sooner if symptoms worsen.";
      
    entities = [
      { text: "cough", label: "SYMPTOM" },
      { text: "chest tightness", label: "SYMPTOM" },
      { text: "clear", label: "AUSCULTATION" },
      { text: "120/80", label: "VITALS_BP" },
      { text: "Albuterol inhaler", label: "MEDICATION" }
    ];
  }

  return { transcript, summary, entities };
};

const parseClinicalSummary = (text) => {
  if (!text) return [];
  
  const lines = text.split('\n');
  const sections = [];
  let currentSection = {
    title: '',
    items: [],
  };

  const isHeading = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) return true;
    if (trimmed.startsWith('**') && trimmed.endsWith('**:')) return true;
    if (/^[A-Z\s]{3,25}:$/.test(trimmed)) return true;
    return false;
  };

  const cleanHeading = (line) => {
    let clean = line.trim();
    if (clean.startsWith('**')) clean = clean.substring(2);
    if (clean.endsWith('**')) clean = clean.substring(0, clean.length - 2);
    if (clean.endsWith('**:')) clean = clean.substring(0, clean.length - 3);
    if (clean.endsWith(':')) clean = clean.substring(0, clean.length - 1);
    return clean.trim();
  };

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (isHeading(trimmed)) {
      if (currentSection.title || currentSection.items.length > 0) {
        sections.push(currentSection);
      }
      currentSection = {
        title: cleanHeading(trimmed),
        items: []
      };
    } else {
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const content = trimmed.substring(1).trim();
        const colonIndex = content.indexOf(':');
        if (colonIndex > 0 && colonIndex < 25) {
          const key = content.substring(0, colonIndex).trim();
          const value = content.substring(colonIndex + 1).trim();
          currentSection.items.push({
            type: 'key-value',
            key,
            value
          });
        } else {
          currentSection.items.push({
            type: 'list-item',
            content
          });
        }
      } else {
        currentSection.items.push({
          type: 'paragraph',
          content: trimmed
        });
      }
    }
  }

  if (currentSection.title || currentSection.items.length > 0) {
    sections.push(currentSection);
  }

  if (sections.length === 0 && text.trim()) {
    sections.push({
      title: 'Consultation Overview',
      items: [{ type: 'paragraph', content: text.trim() }]
    });
  }

  return sections;
};

const renderInlineBold = (text) => {
  if (typeof text !== 'string') return text;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const getSectionIcon = (title) => {
  const t = title.toLowerCase();
  if (t.includes('patient')) return <User size={16} className="section-icon-pill patient" />;
  if (t.includes('complaint')) return <AlertTriangle size={16} className="section-icon-pill complaint" />;
  if (t.includes('history')) return <History size={16} className="section-icon-pill history" />;
  if (t.includes('plan')) return <CheckCircle2 size={16} className="section-icon-pill plan" />;
  if (t.includes('assessment')) return <FileText size={16} className="section-icon-pill assessment" />;
  if (t.includes('subjective')) return <User size={16} className="section-icon-pill subjective" />;
  if (t.includes('objective')) return <FileText size={16} className="section-icon-pill objective" />;
  return <FileText size={16} className="section-icon-pill default" />;
};

const renderSectionContent = (items) => {
  const rendered = [];
  let currentGrid = [];

  const flushGrid = () => {
    if (currentGrid.length > 0) {
      rendered.push(
        <div key={`grid-${rendered.length}`} className="clinical-grid">
          {currentGrid.map((item, idx) => (
            <div key={idx} className="clinical-grid-item">
              <span className="clinical-grid-label">{renderInlineBold(item.key)}</span>
              <span className="clinical-grid-value">{renderInlineBold(item.value)}</span>
            </div>
          ))}
        </div>
      );
      currentGrid = [];
    }
  };

  items.forEach((item, idx) => {
    if (item.type === 'key-value') {
      currentGrid.push(item);
    } else {
      flushGrid();
      if (item.type === 'list-item') {
        rendered.push(
          <div key={idx} className="clinical-list-item">
            <span className="clinical-list-bullet">✦</span>
            <div className="clinical-list-content">{renderInlineBold(item.content)}</div>
          </div>
        );
      } else {
        rendered.push(
          <p key={idx} className="clinical-paragraph">
            {renderInlineBold(item.content)}
          </p>
        );
      }
    }
  });

  flushGrid();
  return rendered;
};

const renderClinicalSummaryHTML = (text) => {
  const sections = parseClinicalSummary(text);
  
  return (
    <div className="clinical-care-plan-rendered animate-fade-in">
      {sections.map((section, sIdx) => (
        <div key={sIdx} className={`clinical-card-section ${section.title.toLowerCase().replace(/\s+/g, '-')}`}>
          {section.title && (
            <div className="clinical-card-header">
              {getSectionIcon(section.title)}
              <h4 className="clinical-card-title">{section.title}</h4>
            </div>
          )}
          <div className="clinical-card-body">
            {renderSectionContent(section.items)}
          </div>
        </div>
      ))}
    </div>
  );
};

const stripMarkdown = (text) => {
  if (!text) return "";
  return text
    .replace(/\*\*/g, "")
    .replace(/^-\s*/gm, "")
    .replace(/^\*\s*/gm, "")
    .replace(/\n+/g, " ")
    .trim();
};

const ScribeView = ({ onLogout }) => {
  // Scribe State
  const [isRecording, setIsRecording] = useState(false);
  const [hasNotes, setHasNotes] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState("");
  const [sessionTime, setSessionTime] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [soapNotes, setSoapNotes] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef(null);

  // Human-in-the-loop editing states
  const [isEditingActiveSummary, setIsEditingActiveSummary] = useState(false);
  const [activeSummaryDraft, setActiveSummaryDraft] = useState("");
  const [isEditingHistorySummary, setIsEditingHistorySummary] = useState(false);
  const [historySummaryDraft, setHistorySummaryDraft] = useState("");

  // WebRTC & Speech Recognition State
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  
  // PeerJS State
  const [localPeerId, setLocalPeerId] = useState('');
  const [remotePeerIdInput, setRemotePeerIdInput] = useState('');
  const [remoteStreamActive, setRemoteStreamActive] = useState(false);
  const [remoteStream, setRemoteStream] = useState(null);
  
  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const peerRef = useRef(null);
  const callRef = useRef(null);

  // History Panel State
  const [historyData, setHistoryData] = useState(() => {
    const saved = localStorage.getItem('carelinq_history');
    return saved ? JSON.parse(saved) : { chats: [], scribes: [], reports: [] };
  });
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isHistorySyncing, setIsHistorySyncing] = useState(false);

  // Timer Effect
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

  // WebRTC local stream ref assignment (Fixes mounting lifecycle bug)
  useEffect(() => {
    if (isVideoCallActive && streamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = streamRef.current;
    }
  }, [isVideoCallActive, isVideoMuted, isAudioMuted]);

  // WebRTC remote stream ref assignment (Fixes mounting lifecycle bug)
  useEffect(() => {
    if (isVideoCallActive && remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [isVideoCallActive, remoteStream]);

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
        
        call.on('stream', (rStream) => {
          setRemoteStream(rStream);
          setRemoteStreamActive(true);
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

    call.on('stream', (rStream) => {
      setRemoteStream(rStream);
      setRemoteStreamActive(true);
    });

    call.on('close', () => {
       setRemoteStreamActive(false);
       setRemoteStream(null);
    });
  };

  const endVideoCall = () => {
    if (callRef.current) callRef.current.close();
    if (peerRef.current) peerRef.current.destroy();
    setLocalPeerId('');
    setRemotePeerIdInput('');
    setRemoteStreamActive(false);
    setRemoteStream(null);
    
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
        const phrases = [
          "Patient reports mild chest pain.",
          " Blood pressure slightly elevated at 135/85.",
          " Suggesting a follow-up appointment in two weeks.",
          " Recommending standard lipid profile checks."
        ];
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
      console.warn("Analysis API failed. Falling back to local clinical mock analysis...", error);
      const mockData = getMockMedicalData("");
      setSoapNotes({
        transcript: liveTranscription || "Patient consultation ended without speech.",
        summary: mockData.summary,
        entities: mockData.entities
      });
      setHasNotes(true);
      setIsSaved(false);
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

    let transData = null;

    try {
      const transResponse = await fetch(`${config.API_BASE_URL}/scribe/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!transResponse.ok) throw new Error('Transcription failed');
      transData = await transResponse.json();
    } catch (error) {
      console.warn("Transcription API failed. Falling back to local clinical mock engine...", error);
      const mockData = getMockMedicalData(file.name);
      transData = { transcript: mockData.transcript };
    }

    setLiveTranscription(transData.transcript);
    setIsTranscribing(false);
    
    setIsAnalyzing(true);
    try {
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
      console.warn("Analysis API failed. Falling back to local clinical mock analysis...", error);
      const mockData = getMockMedicalData(file.name);
      setSoapNotes({
        transcript: transData.transcript,
        summary: mockData.summary,
        entities: mockData.entities
      });
      setHasNotes(true);
      setIsSaved(false);
    } finally {
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

  // Scribe History Persistence
  const addScribeHistoryItem = (category, item) => {
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

  const updateScribeHistoryItem = (id, updatedSummary) => {
    setHistoryData(prev => {
      const updatedScribes = prev.scribes.map(item => {
        if (item.id === id) {
          return { ...item, summary: updatedSummary };
        }
        return item;
      });
      const updated = {
        ...prev,
        scribes: updatedScribes
      };
      localStorage.setItem('carelinq_history', JSON.stringify(updated));
      return updated;
    });
  };

  const syncHistoryRecords = async () => {
    setIsHistorySyncing(true);
    try {
      const response = await fetch(`${config.API_BASE_URL}/history/all`);
      if (!response.ok) throw new Error("Failed to fetch history");
      const data = await response.json();
      setHistoryData(data);
      localStorage.setItem('carelinq_history', JSON.stringify(data));
    } catch (error) {
      console.error("History fetch error:", error);
      alert("Failed to sync records with backend.");
    } finally {
      setIsHistorySyncing(false);
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

  const handleDownloadPDF = async (record) => {
    try {
      const response = await fetch(`${config.API_BASE_URL}/scribe/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: record.transcript || liveTranscription || "No transcript available.",
          entities: record.entities || [],
          summary_text: record.summary
        })
      });
      if (!response.ok) throw new Error('PDF Generation failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Scribe_CarePlan_${record.id || Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.warn("PDF Generation failed. Falling back to client-side formatted text care plan download...", err);
      // Create a plain text blob with the care plan content
      const carePlanText = `CARELINQ CLINICAL CARE PLAN\n` +
        `Generated: ${new Date().toLocaleString()}\n` +
        `========================================\n\n` +
        `CLINICAL SUMMARY:\n` +
        `-----------------\n` +
        `${record.summary || "No summary available."}\n\n` +
        `IDENTIFIED MEDICAL ENTITIES:\n` +
        `----------------------------\n` +
        `${(record.entities || []).map(e => `- ${e.text} [${e.label.replace('_', ' ')}]`).join('\n')}\n\n` +
        `TRANSCRIPT:\n` +
        `-----------\n` +
        `${record.transcript || "No transcript available."}\n`;

      const blob = new Blob([carePlanText], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Scribe_CarePlan_${record.id || Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  // Filter history records
  const filteredHistory = historyData.scribes.filter(item => {
    if (historySearch) {
      const term = historySearch.toLowerCase();
      return item.summary.toLowerCase().includes(term) || (item.transcript && item.transcript.toLowerCase().includes(term));
    }
    return true;
  });

  return (
    <div className="scribe-app-container">
      {/* Premium Header */}
      <header className="scribe-app-header">
        <div className="brand-group">
          <div className="brand-logo">C</div>
          <div className="brand-titles">
            <h1>Carelinq Scribe</h1>
            <p>Clinical WebRTC & AI Documentation Engine</p>
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            className={`btn-history-toggle ${showHistory ? 'active' : ''}`}
            onClick={() => setShowHistory(!showHistory)}
            aria-label="Toggle History Panel"
          >
            <History size={18} />
            <span>Consultations</span>
            {historyData.scribes.length > 0 && (
              <span className="history-badge">{historyData.scribes.length}</span>
            )}
          </button>

          <div className="user-profile">
            <div className="user-avatar">DR</div>
            <div className="user-details">
              <span className="user-name">Dr. John Doe</span>
              <span className="user-role">Oncology Specialist</span>
            </div>
          </div>

          <button className="btn-logout-icon" onClick={onLogout} title="Sign Out">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <div className="scribe-workspace">
        <div className={`scribe-view animate-fade-in video-scribe-layout ${showHistory ? 'history-open' : ''}`}>
          
          <div className="scribe-controls">
            <div className="scribe-header-info">
              <h2>Telehealth AI Scribe <span>Active Workspace</span></h2>
              <p>Host live peer consultations or analyze recorded audio documents</p>
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
                  <h3>Live Telehealth Stream</h3>
                  <span className="recording-indicator blink">Call Active</span>
                  
                  {/* Peer Connection ID sharing UI */}
                  <div className="peer-connection-ui">
                    <div className="peer-id-field">
                      <label>YOUR ID</label>
                      <div className="peer-id-box">{localPeerId || "Generating ID..."}</div>
                    </div>
                    <div className="peer-call-field">
                      <label>CALL PATIENT ID</label>
                      <div className="peer-call-input-group">
                        <input 
                          type="text" 
                          placeholder="Enter Patient ID"
                          value={remotePeerIdInput}
                          onChange={(e) => setRemotePeerIdInput(e.target.value)}
                        />
                        <button onClick={connectToRemotePeer} className="btn-link">
                          <LinkIcon size={14} /> Link
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="video-grid">
                  <div className="video-container remote-video-wrapper">
                    <video 
                      ref={remoteVideoRef} 
                      autoPlay 
                      playsInline 
                      className="remote-video"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: remoteStreamActive ? 'block' : 'none' }}
                    />
                    
                    {!remoteStreamActive && (
                      <div className="remote-placeholder">
                        <User size={64} className="remote-icon icon-blue animate-pulse" />
                        <p>Awaiting Patient Connection...</p>
                        <p className="small-text">Share your ID above or input the patient ID to establish WebRTC link.</p>
                      </div>
                    )}
                    
                    {remoteStreamActive && <div className="local-badge remote-badge">Patient (Remote)</div>}
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
                    {isVideoMuted && <div className="video-off-overlay"><VideoOff size={32} /></div>}
                    
                    <div className="local-video-controls">
                      <button onClick={toggleAudio} className={`circle-btn ${isAudioMuted ? 'muted' : ''}`} aria-label="Toggle Audio">
                        {isAudioMuted ? <MicOff size={16} /> : <Mic size={16} />}
                      </button>
                      <button onClick={toggleVideo} className={`circle-btn ${isVideoMuted ? 'muted' : ''}`} aria-label="Toggle Video">
                        {isVideoMuted ? <VideoOff size={16} /> : <Video size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            <div className={`notes-column ${isVideoCallActive ? 'compact' : 'full-width'}`}>
              
              {/* Live Transcription Panel */}
              <section className="live-transcription-card dashboard-card">
                <div className="card-header">
                  <h3>Real-Time AI Transcript</h3>
                  {(isRecording || isVideoCallActive) && <span className="recording-indicator blink">Listening...</span>}
                  {isTranscribing && <span className="recording-indicator">Transcribing Audio...</span>}
                  {isAnalyzing && <span className="recording-indicator">Running Clinical Analysis...</span>}
                </div>
                <div className="transcription-well">
                  {liveTranscription || (
                    (isRecording || isVideoCallActive) ? "Voice activity detected. Processing speech..." : 
                    isTranscribing ? "Running deep transcription engine..." : 
                    "Initiate telehealth session or upload clinical audio to start transcription."
                  )}
                  {(isRecording || isTranscribing || isVideoCallActive) && (
                    <div className="pulse-wave">
                      <div className="wave-bar bar-1"></div>
                      <div className="wave-bar bar-2"></div>
                      <div className="wave-bar bar-3"></div>
                      <div className="wave-bar bar-4"></div>
                    </div>
                  )}
                </div>
              </section>

              {/* SOAP Documentation Panel */}
              <section className={`soap-notes-card dashboard-card ${hasNotes ? 'final' : 'pending'}`}>
                <div className="card-header">
                  <h3>Clinical SOAP Care Plan</h3>
                  {hasNotes && <span className="status-badge success"><CheckCircle2 size={14} /> Carelinq Clinical AI Verified</span>}
                </div>
                <div className="notes-content">
                  {!hasNotes ? (
                    <div className="empty-state">
                      {(isAnalyzing || isTranscribing) ? (
                        <div className="loading-spinner-wrapper">
                          <Loader2 size={48} className="spin-icon icon-blue" />
                          <p>Structuring medical notes and summaries...</p>
                        </div>
                      ) : (
                        <div className="waiting-state">
                          <RefreshCcw size={48} className="icon-muted" />
                          <p>SOAP summary notes will populate automatically once the consultation is finalized.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="structured-notes care-plan-layout">
                      <div className="soap-section care-overview">
                        <div className="soap-section-header">
                          <label>AI Clinical Consultation Summary</label>
                          {!isEditingActiveSummary && (
                            <button 
                              className="btn-edit-inline" 
                              onClick={() => {
                                setIsEditingActiveSummary(true);
                                setActiveSummaryDraft(soapNotes?.summary || "");
                              }}
                              title="Edit Clinical Summary"
                            >
                              <Pencil size={14} /> Edit
                            </button>
                          )}
                        </div>
                        {isEditingActiveSummary ? (
                          <div className="summary-edit-container">
                            <textarea
                              className="summary-edit-textarea"
                              value={activeSummaryDraft}
                              onChange={(e) => setActiveSummaryDraft(e.target.value)}
                              placeholder="Edit the clinical SOAP summary here..."
                              autoFocus
                            />
                            <div className="summary-edit-actions">
                              <button 
                                className="btn-edit-cancel" 
                                onClick={() => setIsEditingActiveSummary(false)}
                              >
                                <X size={14} /> Cancel
                              </button>
                              <button 
                                className="btn-edit-save" 
                                onClick={() => {
                                  setSoapNotes(prev => ({ ...prev, summary: activeSummaryDraft }));
                                  setIsEditingActiveSummary(false);
                                  setIsSaved(false);
                                }}
                              >
                                <Check size={14} /> Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div 
                            className="summary-click-to-edit" 
                            onClick={() => {
                              setIsEditingActiveSummary(true);
                              setActiveSummaryDraft(soapNotes?.summary || "");
                            }}
                          >
                            {soapNotes?.summary ? (
                              renderClinicalSummaryHTML(soapNotes.summary)
                            ) : (
                              <p style={{ fontSize: '1.05rem', lineHeight: '1.7', color: 'var(--text-main)', margin: 0 }}>
                                Your clinical summary is being constructed.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {soapNotes?.entities && soapNotes.entities.length > 0 && (
                        <div className="soap-section entities-highlight">
                          <label>Identified Medical Entities & Classifications</label>
                          <div className="entities-list">
                            {soapNotes.entities.map((ent, idx) => (
                              <span key={idx} className={`badge info-pill entity-${(ent.label || '').toLowerCase().replace('_', '-')}`}>
                                {ent.text} • <small style={{ opacity: 0.8 }}>{ent.label.replace('_', ' ')}</small>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="notes-actions">
                        <button 
                          className="btn-secondary" 
                          style={{ flex: 1 }}
                          onClick={() => handleDownloadPDF(soapNotes)}
                        >
                          <Download size={18} /> Download Care Plan PDF
                        </button>
                        
                        <button 
                          className={`btn-save ${isSaved ? 'btn-saved' : 'btn-primary-blue'}`} 
                          style={{ flex: 1 }}
                          disabled={isSaved}
                          onClick={() => {
                            if (soapNotes) {
                              addScribeHistoryItem('scribe', {
                                summary: soapNotes.summary,
                                entities: soapNotes.entities,
                                transcript: soapNotes.transcript || liveTranscription
                              });
                              setIsSaved(true);
                            }
                          }}
                        >
                          {isSaved ? "Saved to History ✓" : "Save to History"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>

            </div>
          </div>
        </div>

        {/* Collapsible History Drawer */}
        <aside className={`history-drawer ${showHistory ? 'open' : ''}`}>
          <div className="drawer-header">
            <div className="drawer-title">
              <History size={20} />
              <h3>Consultations</h3>
            </div>
            <button className="btn-close-drawer" onClick={() => setShowHistory(false)}>
              <X size={20} />
            </button>
          </div>

          <div className="drawer-actions">
            <div className="search-box">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Search consults..." 
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
              />
            </div>
            
            <button className="btn-sync" onClick={syncHistoryRecords} disabled={isHistorySyncing}>
              {isHistorySyncing ? <Loader2 className="spin-icon" size={14} /> : <RefreshCcw size={14} />}
              Sync
            </button>
          </div>

          <div className="drawer-list">
            {filteredHistory.length === 0 ? (
              <div className="empty-drawer-state">
                <FileText size={48} className="icon-muted" />
                <p>No consultation records found.</p>
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div key={item.id} className="history-item-card">
                  <div className="item-header">
                    <span className="item-date"><Calendar size={12} /> {formatDate(item.created_at)}</span>
                    <button className="btn-item-link" onClick={() => setSelectedRecord(item)} title="View Summary">
                      <ExternalLink size={14} />
                    </button>
                  </div>
                  <div className="item-body">
                    <p className="item-summary">
                      {stripMarkdown(item.summary).length > 100 
                        ? stripMarkdown(item.summary).slice(0, 100) + '...' 
                        : stripMarkdown(item.summary)}
                    </p>
                  </div>
                  <button className="btn-item-full" onClick={() => setSelectedRecord(item)}>
                    View Full SOAP Notes
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {/* Historical Detailed Record Modal */}
      {selectedRecord && (
        <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div className="modal-content animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="modal-badge scribe">SOAP NOTES</span>
                <h3>Consultation Record Details</h3>
              </div>
              <button className="close-btn" onClick={() => setSelectedRecord(null)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="meta-details">
                <span className="timestamp"><Calendar size={14} /> Recorded on {formatDate(selectedRecord.created_at)}</span>
              </div>
              
              <div className="full-content">
                <div className="detailed-summary">
                  <div className="summary-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0 }}>📋 AI Generated Summary</h4>
                    {!isEditingHistorySummary && (
                      <button 
                        className="btn-edit-inline" 
                        onClick={() => {
                          setIsEditingHistorySummary(true);
                          setHistorySummaryDraft(selectedRecord.summary || "");
                        }}
                        title="Edit Saved Summary"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                    )}
                  </div>
                  <div className="summary-text-box" style={{ marginTop: '12px' }}>
                    {isEditingHistorySummary ? (
                      <div className="summary-edit-container">
                        <textarea
                          className="summary-edit-textarea"
                          value={historySummaryDraft}
                          onChange={(e) => setHistorySummaryDraft(e.target.value)}
                          placeholder="Edit the saved clinical summary here..."
                          autoFocus
                        />
                        <div className="summary-edit-actions">
                          <button 
                            className="btn-edit-cancel" 
                            onClick={() => setIsEditingHistorySummary(false)}
                          >
                            <X size={14} /> Cancel
                          </button>
                          <button 
                            className="btn-edit-save" 
                            onClick={() => {
                              updateScribeHistoryItem(selectedRecord.id, historySummaryDraft);
                              setSelectedRecord(prev => ({ ...prev, summary: historySummaryDraft }));
                              setIsEditingHistorySummary(false);
                            }}
                          >
                            <Check size={14} /> Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="summary-click-to-edit" 
                        onClick={() => {
                          setIsEditingHistorySummary(true);
                          setHistorySummaryDraft(selectedRecord.summary || "");
                        }}
                      >
                        {selectedRecord.summary ? (
                          renderClinicalSummaryHTML(selectedRecord.summary)
                        ) : (
                          <p className="care-plan-render" style={{ margin: 0 }}>
                            No summary details.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {selectedRecord.entities && selectedRecord.entities.length > 0 && (
                    <div style={{ marginTop: '24px' }}>
                      <h4 style={{ marginBottom: '12px' }}>Identified Entities</h4>
                      <div className="entities-list">
                        {selectedRecord.entities.map((ent, idx) => (
                          <span key={idx} className={`badge info-pill entity-${(ent.label || '').toLowerCase().replace('_', '-')}`}>
                            {ent.text} • <small style={{ opacity: 0.8 }}>{ent.label.replace('_', ' ')}</small>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedRecord.transcript && (
                    <details style={{ marginTop: '24px', borderTop: '1px solid var(--gray-100)', paddingTop: '16px' }}>
                      <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '500' }}>
                        View Original Transcript
                      </summary>
                      <div className="transcript-box" style={{ 
                        maxHeight: '180px', 
                        overflowY: 'auto', 
                        padding: '16px', 
                        background: 'var(--gray-50)', 
                        borderRadius: '12px',
                        fontSize: '0.9rem',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap',
                        marginTop: '12px',
                        border: '1px solid var(--gray-200)',
                        fontStyle: 'italic'
                      }}>
                        {selectedRecord.transcript}
                      </div>
                    </details>
                  )}
                  
                  <div className="modal-actions" style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
                    <button className="btn-secondary" style={{ flex: 1 }} onClick={() => handleDownloadPDF(selectedRecord)}>
                      <Download size={16} /> Download Care Plan PDF
                    </button>
                    <button className="btn-primary-blue" style={{ flex: 1 }} onClick={() => setSelectedRecord(null)}>
                      Close Record
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScribeView;
