import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertTriangle, ArrowRight, Table, RefreshCw } from 'lucide-react';
import config from '../config';

const ReportView = ({ addHistoryItem }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState("");
  const [summary, setSummary] = useState("");
  const [fileName, setFileName] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setIsUploading(true);
    setProgress(0);
    setIsAnalyzed(false);

    // Simulate progress while uploading
    const progressInt = setInterval(() => {
      setProgress(prev => (prev < 90 ? prev + 10 : prev));
    }, 200);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${config.API_BASE_URL}/chat/upload-report`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('OCR Analysis failed');

      const data = await response.json();
      
      clearInterval(progressInt);
      setProgress(100);
      
      setTimeout(() => {
        setIsUploading(false);
        setIsAnalyzed(true);
        setExtractedText(data.extracted_text);
        setSummary(data.summary);
        setIsSaved(false);
      }, 800);
    } catch (error) {
// ... existing catch logic
      console.error("OCR Error:", error);
      clearInterval(progressInt);
      setIsUploading(false);
      alert("Failed to analyze report. Please ensure the backend is healthy.");
    }
  };

  const triggerUpload = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="report-view animate-fade-in">
      <div className="report-header">
        <h2>Report Analyzer <span>Powered by LLM v4.0</span></h2>
        <p>Extract clinical abnormalities and medical insights from lab reports and imaging PDFs.</p>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileUpload}
        accept=".pdf,.png,.jpg,.jpeg"
      />

      {!isAnalyzed ? (
        <div className="dropzone-container active">
          <div className={`dropzone-card ${isUploading ? 'analyzing' : ''}`} onClick={!isUploading ? triggerUpload : undefined}>
            {isUploading ? (
              <div className="upload-progress">
                <RefreshCwIcon className="spin-icon" size={48} />
                <h3>Analyzing medical document...</h3>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <p>Running OCR and Extraction Engine ({progress}%)</p>
              </div>
            ) : (
              <div className="upload-prompt">
                <Upload size={48} className="icon-blue" />
                <h3>Upload Your Lab Report</h3>
                <p>Drag and drop PDF, PNG, or JPEG files here.</p>
                <button className="btn-upload">Browse Files</button>
              </div>
            )}
          </div>
          <div className="discovery-tips">
            <h4>Common Discoveries:</h4>
            <ul>
              <li><CheckCircle2 size={16} /> Blood Lipid Profile</li>
              <li><CheckCircle2 size={16} /> MRI & CT scan summaries</li>
              <li><CheckCircle2 size={16} /> CBC & Sugar levels</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="analysis-results animate-fade-in">
          <div className="results-header">
            <CheckCircle2 size={24} className="text-emerald-500" />
            <h3>Analysis Complete: {fileName}</h3>
            <button className="btn-secondary small" onClick={() => setIsAnalyzed(false)}>Upload Another</button>
          </div>

          <div className="findings-grid">
            <div className="finding-card info dashboard-card span-full summary">
              <h4>📋 AI Clinical Finding Summary</h4>
              <p style={{ fontSize: '1.05rem', lineHeight: '1.6', color: 'var(--text-main)', margin: '16px 0', borderLeft: '4px solid var(--primary-blue)', paddingLeft: '16px' }}>
                {summary || "Analyzing findings..."}
              </p>
              
              <details style={{ marginTop: '24px', borderTop: '1px solid var(--gray-100)', paddingTop: '16px' }}>
                <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '500' }}>
                  View Raw Extracted Text (OCR)
                </summary>
                <div style={{ 
                  maxHeight: '200px', 
                  overflowY: 'auto', 
                  padding: '16px', 
                  background: 'var(--gray-50)', 
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  lineHeight: '1.5',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  marginTop: '12px',
                  border: '1px solid var(--gray-200)'
                }}>
                  {extractedText || "No text could be extracted."}
                </div>
              </details>
            </div>

            <div className="finding-card warning">
              <div className="finding-icon"><AlertTriangle size={20} /></div>
              <div className="finding-content">
                <label>Hyperglycemia Alert (Demo)</label>
                <p>Initial scan suggests elevated glucose levels. Please review the extracted text for specific values.</p>
              </div>
            </div>
            
            <div className="save-action-footer span-full" style={{ 
              marginTop: '32px', 
              display: 'flex', 
              justifyContent: 'center',
              borderTop: '1px solid var(--gray-100)',
              paddingTop: '24px'
            }}>
              <button 
                className={`btn-save-report ${isSaved ? 'saved' : 'primary'}`}
                disabled={isSaved}
                onClick={() => {
                  if (addHistoryItem) {
                    addHistoryItem('report', {
                      file_name: fileName,
                      summary: summary,
                      extracted_text: extractedText
                    });
                    setIsSaved(true);
                  }
                }}
                style={{
                  padding: '12px 32px',
                  borderRadius: '12px',
                  background: isSaved ? 'var(--gray-300)' : 'var(--primary-blue)',
                  color: 'white',
                  border: 'none',
                  fontWeight: '600',
                  cursor: isSaved ? 'default' : 'pointer',
                  fontSize: '1rem',
                  transition: 'all 0.2s ease',
                  boxShadow: isSaved ? 'none' : '0 4px 12px rgba(55, 114, 255, 0.2)'
                }}
              >
                {isSaved ? "Saved to Records ✅" : "Save Analysis to History"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Internal icon for the spin
const RefreshCwIcon = ({ className, size }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
    <path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
    <path d="M3 21v-5h5"/>
  </svg>
);

export default ReportView;
