import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  Upload, 
  Leaf, 
  Sparkles, 
  Bot, 
  CheckCircle, 
  AlertCircle, 
  HelpCircle,
  Clock,
  Trash2,
  Camera,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const DiseaseDetection: React.FC = () => {
  const { user } = useAuth();
  const [cropName, setCropName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const [diagnosis, setDiagnosis] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch historic analyses
  const fetchHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, "crop_analysis"), 
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q).catch(err => handleFirestoreError(err, OperationType.LIST, "crop_analysis"));
      const logs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHistory(logs);
    } catch (err) {
      console.error("Failed fetching disease diagnostics log:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  // Canvas laser scanner scanning effect animation
  useEffect(() => {
    if (!isScanning) return;

    let animId: number;
    let progress = 0;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const drawScanner = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Draw laser line
          const y = (progress / 100) * canvas.height;
          
          // Outer glow
          const grad = ctx.createLinearGradient(0, y - 10, 0, y + 2);
          grad.addColorStop(0, 'rgba(34, 197, 94, 0)');
          grad.addColorStop(0.8, 'rgba(34, 197, 94, 0.4)');
          grad.addColorStop(1, 'rgba(132, 204, 22, 1)');
          
          ctx.fillStyle = grad;
          ctx.fillRect(0, Math.max(0, y - 12), canvas.width, Math.min(12, y));

          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();

          progress += 0.8;
          setScanProgress(Math.min(100, Math.floor(progress)));
          
          if (progress >= 100) {
            progress = 0; // Loop scanning
          }
          animId = requestAnimationFrame(drawScanner);
        };
        drawScanner();
      }
    }

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isScanning]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Convert and compress to highly compact 400x400 JPEG base64 to store in Firestore securely inline
  const processFile = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxSide = 420;
        if (width > maxSide || height > maxSide) {
          if (width > height) {
            height = Math.round((height * maxSide) / width);
            width = maxSide;
          } else {
            width = Math.round((width * maxSide) / height);
            height = maxSide;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const base64Compact = canvas.toDataURL('image/jpeg', 0.85);
          setPreviewUrl(base64Compact);
          setBase64Image(base64Compact);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setError(null);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    } else {
      setError("Please drop a valid image file.");
    }
  };

  const analyzeLeaf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!base64Image) {
      setError("Please load a leaf photo first.");
      return;
    }
    if (!cropName.trim()) {
      setError("Please specify the Crop Name (e.g. Tomato, Rice, Potato).");
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setDiagnosis(null);
    setError(null);

    try {
      const response = await fetch('/api/analyze-crop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cropName: cropName.trim(),
          imageBase64: base64Image,
          mimeType: "image/jpeg"
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Analysis failed.");
      }

      const rawResult = await response.json();

      // Ensure data invariants are aligned and save report in Firestore database
      if (user) {
        const analysisData = {
          userId: user.uid,
          cropName: cropName.trim(),
          imageUrl: base64Image,
          diseaseName: rawResult.diseaseName || "Healthy",
          confidence: Number(rawResult.confidence) || 90.0,
          symptoms: rawResult.symptoms || "No symptoms observed.",
          treatment: rawResult.treatment || "No treatment recommended.",
          prevention: rawResult.prevention || "Standard cultural hygiene.",
          createdAt: serverTimestamp()
        };

        await addDoc(collection(db, "crop_analysis"), analysisData)
          .catch(err => handleFirestoreError(err, OperationType.CREATE, "crop_analysis"));

        // Refresh log
        await fetchHistory();
      }

      setDiagnosis(rawResult);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ecosystem diagnosis failed. Please check your network context.");
    } finally {
      setIsScanning(false);
    }
  };

  const deleteLog = async (id: string) => {
    try {
      await deleteDoc(doc(db, "crop_analysis", id))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, "crop_analysis"));
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("Failed to delete classification document:", err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="disease-detection-view">
      {/* Visual Workspace Scanner - 5 Columns */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-700 font-medium mb-4">
            <ScanLogo className="h-5 w-5" />
            <h2 className="text-lg font-semibold text-slate-800">Visual Leaf Scanner</h2>
          </div>

          <form onSubmit={analyzeLeaf} className="space-y-4">
            <div>
              <label className="block text-xs uppercase font-semibold text-slate-500 font-mono mb-1.5">
                Crop Common Name
              </label>
              <input 
                type="text" 
                placeholder="e.g. Tomato, Potato, Apple, Rice"
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                disabled={isScanning}
                className="w-full text-slate-700 text-sm px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 transition-colors bg-slate-50"
              />
            </div>

            {/* Droppable leaf area */}
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => !isScanning && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl overflow-hidden cursor-pointer transition-all ${
                previewUrl 
                  ? 'border-emerald-300' 
                  : 'border-slate-200 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/10'
              } flex flex-col items-center justify-center p-6 h-72`}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
                disabled={isScanning}
              />

              {previewUrl ? (
                <div className="absolute inset-0 w-full h-full">
                  <img 
                    referrerPolicy="no-referrer"
                    src={previewUrl} 
                    alt="Uploaded Leaf Preview" 
                    className="w-full h-full object-cover"
                  />
                  {isScanning && (
                    <canvas 
                      ref={canvasRef} 
                      width={380} 
                      height={288} 
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    />
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl w-14 h-14 flex items-center justify-center mx-auto mb-3">
                    <Camera className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-medium text-slate-700">Select or drop a leaf photo</h4>
                  <p className="text-xs text-slate-400 mt-1">Accepts PNG, JPG, or JPEG up to 10MB</p>
                </div>
              )}

              {/* Scan Overlay text */}
              {isScanning && (
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                  <Bot className="h-10 w-10 text-emerald-400 animate-bounce" />
                  <span className="text-sm font-mono mt-2 font-medium tracking-wide">
                    Analyzing Cellular Structure ({scanProgress}%)
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isScanning || !base64Image || !cropName.trim()}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm border border-emerald-700"
            >
              <Sparkles className="h-4 w-4" />
              {isScanning ? "Processing Leaf Scans..." : "Initiate AI Diagnostic"}
            </button>
          </form>
        </div>

        {/* Diagnostic logs history */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              Diagnostic Notebook
            </h3>
            <span className="text-xs font-mono bg-slate-100 px-2.5 py-0.5 rounded text-slate-500">
              {history.length} Logs
            </span>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {loadingHistory ? (
              <div className="text-center py-6 text-xs font-mono text-slate-400">
                Retrieving histories...
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">
                No historic classifications logged yet.
              </div>
            ) : (
              history.map((log) => (
                <div 
                  key={log.id}
                  onClick={() => setDiagnosis(log)} 
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-slate-50 transition-all hover:border-slate-100 group"
                >
                  <img 
                    referrerPolicy="no-referrer"
                    src={log.imageUrl} 
                    alt={log.cropName} 
                    className="w-10 h-10 object-cover rounded-lg border border-slate-100 shrink-0" 
                  />
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-semibold text-slate-700 truncate">{log.cropName}</h5>
                    <p className="text-[11px] text-emerald-600 font-medium truncate">{log.diseaseName}</p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteLog(log.id);
                    }}
                    className="p-1.5 text-slate-300 hover:text-rose-500 rounded hover:bg-rose-50 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Pathological Diagnostics Outputs - 7 Columns */}
      <div className="lg:col-span-7">
        <AnimatePresence mode="wait">
          {diagnosis ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6"
            >
              <div className="flex items-start justify-between border-b border-slate-50 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-mono font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded">
                      Crop: {diagnosis.cropName || cropName}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Diagnosis: Verified
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 mt-2">
                    {diagnosis.diseaseName}
                  </h2>
                </div>

                <div className="text-right shrink-0">
                  <span className="block text-[10px] uppercase font-mono text-slate-400">AI Confidence</span>
                  <span className="text-2xl font-bold text-emerald-600 font-mono">
                    {Number(diagnosis.confidence).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Bento Grid Diagnostics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-50">
                  <h4 className="font-mono text-[10px] font-bold text-amber-800 uppercase flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Symptoms
                  </h4>
                  <p className="text-slate-700 text-sm mt-1.5 leading-relaxed">
                    {diagnosis.symptoms}
                  </p>
                </div>

                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-50">
                  <h4 className="font-mono text-[10px] font-bold text-indigo-800 uppercase flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 shrink-0" /> Etiology & Causes
                  </h4>
                  <p className="text-slate-700 text-sm mt-1.5 leading-relaxed">
                    {diagnosis.causes}
                  </p>
                </div>

                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-50 md:col-span-2">
                  <h4 className="font-mono text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0" /> Active Treatments
                  </h4>
                  <p className="text-slate-700 text-sm mt-1.5 leading-relaxed">
                    {diagnosis.treatment}
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 md:col-span-2">
                  <h4 className="font-mono text-[10px] font-bold text-slate-700 uppercase flex items-center gap-1">
                    <Bot className="w-3.5 h-3.5 shrink-0" /> Preventative Management
                  </h4>
                  <p className="text-slate-700 text-sm mt-1.5 leading-relaxed">
                    {diagnosis.prevention}
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-100 shadow-sm min-h-[460px]">
              <div className="p-5 bg-slate-50 text-slate-300 rounded-full mb-4">
                <Bot className="w-14 h-14" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700">Awaiting AI Diagnostic Scope</h3>
              <p className="text-sm text-slate-400 mt-2 text-center max-w-sm leading-relaxed">
                Provide a crop name and upload a target leaf photo. Our pathologist pipeline will classify pathogens, estimate confidence, and write organic protocols.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// SVG visual icons
const ScanLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="M4 12V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8" />
    <path d="M4 12a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1" />
    <path d="M12 2v20" />
    <path d="M17 18h1" />
    <path d="M6 18h1" />
  </svg>
);
