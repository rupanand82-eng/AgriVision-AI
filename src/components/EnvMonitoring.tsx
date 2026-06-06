import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  Compass, 
  Droplet, 
  Activity, 
  Trash2, 
  ShieldAlert, 
  Leaf,
  Clock,
  Sparkles,
  Zap,
  Globe,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const EnvMonitoring: React.FC = () => {
  const { user } = useAuth();
  
  // Form inputs
  const [airQuality, setAirQuality] = useState('Satisfactory (Carbon metrics neutral)');
  const [waterQuality, setWaterQuality] = useState('Satisfactory (No chemical runoff)');
  const [pollutionLevel, setPollutionLevel] = useState('Low');
  const [location, setLocation] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [reports, setReports] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchEcoReports = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, "env_reports"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q).catch(err => handleFirestoreError(err, OperationType.LIST, "env_reports"));
      const logs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReports(logs);
    } catch (err) {
      console.error("Failed loading ecological datasets:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchEcoReports();
  }, [user]);

  const handleEnvSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/environmental-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          airQuality,
          waterQuality,
          pollutionLevel,
          location: location.trim()
        })
      });

      if (!response.ok) {
        throw new Error("Failed to produce environmental metrics evaluation.");
      }

      const data = await response.json();
      setResult(data);

      if (user) {
        // Save to Firestore DB
        await addDoc(collection(db, "env_reports"), {
          userId: user.uid,
          location: location.trim() || "Regional Farmlands",
          airQuality,
          waterQuality,
          pollutionLevel,
          insights: data.insights,
          recommendations: data.recommendations,
          createdAt: serverTimestamp()
        }).catch(err => handleFirestoreError(err, OperationType.CREATE, "env_reports"));

        fetchEcoReports();
      }

    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Ecosystem analysis network loop failed.");
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (id: string) => {
    try {
      await deleteDoc(doc(db, "env_reports", id))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, "env_reports"));
      setReports(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("Failed deleting ecological report:", err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="env-intel-workspace">
      
      {/* Parameters Controls Panel - 5 Columns */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-emerald-700 font-medium">
            <Globe className="w-5 h-5" />
            <h2 className="text-lg font-semibold text-slate-800">Ecosystem inputs</h2>
          </div>
          <p className="text-slate-500 text-xs mt-1">Configure microclimatic chemical parameters to generate AI carbon/toxicity risk estimates.</p>

          <form onSubmit={handleEnvSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase font-bold text-slate-500 font-mono mb-1.5">
                Local Air Quality Index Status
              </label>
              <select 
                value={airQuality}
                onChange={(e) => setAirQuality(e.target.value)}
                className="w-full text-slate-700 text-sm px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none"
              >
                <option value="Excellent (Pristine clean ozone)">Excellent (Pristine clean ozone)</option>
                <option value="Satisfactory (Carbon metrics neutral)">Satisfactory (Carbon metrics neutral)</option>
                <option value="Moderate (Mild smog / dust)">Moderate (Mild smog / dust)</option>
                <option value="Unhealthy (High toxic particle count)">Unhealthy (High toxic particle count)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase font-bold text-slate-500 font-mono mb-1.5">
                Water Resource Quality Status
              </label>
              <select 
                value={waterQuality}
                onChange={(e) => setWaterQuality(e.target.value)}
                className="w-full text-slate-700 text-sm px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none"
              >
                <option value="Pristine (Filtered natural springs)">Pristine (Filtered natural springs)</option>
                <option value="Satisfactory (No chemical runoff)">Satisfactory (No chemical runoff)</option>
                <option value="Compromised (Mild fertilizer pesticide concentration)">Compromised (Mild fertilizer pesticide concentration)</option>
                <option value="Acidified (Dumping and industrial toxicity)">Acidified (Dumping and industrial toxicity)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase font-bold text-slate-500 font-mono mb-1.5">
                Overall pollutant assessment
              </label>
              <select 
                value={pollutionLevel}
                onChange={(e) => setPollutionLevel(e.target.value)}
                className="w-full text-slate-700 text-sm px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none"
              >
                <option value="Low">Low</option>
                <option value="Moderate">Moderate</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase font-bold text-slate-500 font-mono mb-1.5">
                Location Area context
              </label>
              <input 
                type="text" 
                placeholder="e.g. Salinas Farmland / Central Valley"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full text-slate-700 text-sm px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none"
              />
              <div className="space-y-1 pt-1.5">
                <span className="text-[9px] font-mono font-bold text-slate-400 uppercase block">Suggested Agricultural Plains:</span>
                <div className="flex flex-wrap gap-1">
                  {[
                    'Salinas Valley, CA',
                    'Iowa Corn Belt',
                    'Punjab Plains, India',
                    'Murrumbidgee, AU',
                    'Andalusia, Spain',
                    'Saskatchewan, Canada'
                  ].map((locName) => (
                    <button
                      key={locName}
                      type="button"
                      onClick={() => setLocation(locName)}
                      className="px-2 py-0.5 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-250 rounded-md text-[9px] font-medium text-slate-600 cursor-pointer transition-colors"
                    >
                      {locName}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-sm border border-emerald-700"
            >
              {loading ? "Generating Insight..." : "Generate Ecosystem Analysis"}
            </button>
          </form>
        </div>

        {/* Historic logs list */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              Ecosystem logs
            </h3>
            <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
              {reports.length} Records
            </span>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {loadingHistory ? (
              <div className="text-center py-4 text-xs text-slate-400">Loading...</div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">No ecological diagnostics logged yet.</div>
            ) : (
              reports.map((rep) => (
                <div 
                  key={rep.id}
                  onClick={() => setResult(rep)}
                  className="p-3 bg-slate-50 rounded-xl hover:bg-emerald-50/10 cursor-pointer border border-slate-100 transition-all flex items-center justify-between group hover:border-emerald-200"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-700 truncate">{rep.location || 'Farmlands'}</h4>
                    <p className="text-[10px] text-slate-500 mt-1 truncate">
                      Air: <span className="font-bold text-emerald-600">{rep.airQuality || 'Excellent'}</span>
                    </p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteReport(rep.id); }}
                    className="p-1 text-slate-300 hover:text-rose-500 rounded shrink-0 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Advice Workplace - 7 Columns */}
      <div className="lg:col-span-7">
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6"
            >
              <div className="flex border-b border-slate-50 pb-4 items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-mono font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded">
                    Area Context: {result.location || location || 'Farmlands'}
                  </span>
                  <h2 className="text-lg font-bold text-slate-800 mt-2">Ecosystem Health insights</h2>
                </div>
                <div className="flex gap-3 text-xs font-mono">
                  <div className="text-center">
                    <span className="block text-slate-400 text-[10px]">POLLUTION</span>
                    <span className={`font-bold uppercase ${result.pollutionLevel === 'Critical' ? 'text-rose-600' : 'text-emerald-600'}`}>{result.pollutionLevel}</span>
                  </div>
                </div>
              </div>

              {/* Bento diagnostics parameters overview summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="block font-mono text-[9px] uppercase font-bold text-slate-400">Carbon/Ozone status</span>
                  <span className="block text-xs font-semibold text-slate-700 mt-1 truncate">{result.airQuality || airQuality}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="block font-mono text-[9px] uppercase font-bold text-slate-400">hydrological metrics</span>
                  <span className="block text-xs font-semibold text-slate-700 mt-1 truncate">{result.waterQuality || waterQuality}</span>
                </div>
              </div>

              <div className="space-y-5">
                <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                  <h4 className="text-xs uppercase font-bold text-emerald-800 font-mono flex items-center gap-1.5 border-b border-emerald-100 pb-2 mb-2">
                    <Activity className="w-4 h-4 shrink-0 text-emerald-600" /> Critical Scientific Insights
                  </h4>
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line pl-1">
                    {result.insights}
                  </p>
                </div>

                <div className="p-5 bg-cyan-50/50 border border-cyan-100 rounded-xl">
                  <h4 className="text-xs uppercase font-bold text-cyan-800 font-mono flex items-center gap-1.5 border-b border-cyan-100 pb-2 mb-2">
                    <Leaf className="w-4 h-4 shrink-0 text-cyan-600" /> sustainability & Organic practices
                  </h4>
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line pl-1">
                    {result.recommendations}
                  </p>
                </div>
              </div>

              {result.pollutionLevel === 'Critical' && (
                <div className="flex gap-2.5 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs">
                  <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold font-mono text-[10px] uppercase tracking-wide">Ecosystem threat activated</span>
                    <p className="mt-1 font-sans leading-relaxed">
                      Ecotoxicology levels reported are critical. Monitor soil acidification vectors, avoid any non-organic fertilizers, and implement filter buffer zones around water resources immediately.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-100 shadow-sm min-h-[460px]">
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full mb-4">
                <Globe className="w-12 h-12" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700">Awaiting Ecological Diagnostics</h3>
              <p className="text-sm text-slate-400 mt-2 text-center max-w-sm leading-relaxed">
                Tune ozone indicators and agricultural runoff levels. The environmental model generates custom carbon metrics forecasts and organic remediation protocols.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};
