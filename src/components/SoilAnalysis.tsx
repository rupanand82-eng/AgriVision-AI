import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  Compass, 
  Droplet, 
  Sparkles, 
  Trash2, 
  Sprout, 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  HelpCircle,
  Thermometer,
  Layers,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const SoilAnalysis: React.FC = () => {
  const { user } = useAuth();
  
  // Tab control: "soil" vs "irrigation"
  const [activeSubTab, setActiveSubTab] = useState<'soil' | 'irrigation'>('soil');

  // Soil form values
  const [soilType, setSoilType] = useState('Loam');
  const [ph, setPh] = useState(6.5);
  const [moisture, setMoisture] = useState(40);
  const [location, setLocation] = useState('');
  
  // Irrigation form values
  const [crop, setCrop] = useState('');
  const [irrMoisture, setIrrMoisture] = useState(30);
  const [temperature, setTemperature] = useState(28);

  const [loading, setLoading] = useState(false);
  const [soilResult, setSoilResult] = useState<any | null>(null);
  const [irrResult, setIrrResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [reports, setReports] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch past soil health reports
  const fetchReports = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, "soil_reports"),
        where("userId", "==", user.uid)
      );
      const snap = await getDocs(q).catch(err => handleFirestoreError(err, OperationType.LIST, "soil_reports"));
      const logs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort in memory by createdAt descending
      logs.sort((a: any, b: any) => {
        const timeA = a.createdAt?.seconds !== undefined ? a.createdAt.seconds : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const timeB = b.createdAt?.seconds !== undefined ? b.createdAt.seconds : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return timeB - timeA;
      });
      setReports(logs);
    } catch (err) {
      console.error("Failed loading soil reports:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [user]);

  const handleSoilSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSoilResult(null);
    setError(null);

    try {
      const response = await fetch('/api/analyze-soil', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soilType,
          ph: Number(ph),
          moisture: Number(moisture),
          location: location.trim()
        })
      });

      if (!response.ok) {
        throw new Error("Failed to compile soil evaluation.");
      }

      const data = await response.json();
      setSoilResult(data);

      if (user) {
        // Save report into database
        await addDoc(collection(db, "soil_reports"), {
          userId: user.uid,
          soilType,
          ph: Number(ph),
          moisture: Number(moisture),
          location: location.trim(),
          suitableCrops: data.suitableCrops,
          fertilizerRecommendations: data.fertilizerRecommendations,
          soilImprovementPlan: data.soilImprovementPlan,
          createdAt: serverTimestamp()
        }).catch(err => handleFirestoreError(err, OperationType.CREATE, "soil_reports"));

        fetchReports();
      }

    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Internal soil analyst network error.");
    } finally {
      setLoading(false);
    }
  };

  const handleIrrigationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crop.trim()) {
      setError("Please specify the Crop Name.");
      return;
    }

    setLoading(true);
    setIrrResult(null);
    setError(null);

    try {
      const response = await fetch('/api/irrigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crop: crop.trim(),
          soilMoisture: Number(irrMoisture),
          temperature: Number(temperature)
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate irrigation system advice.");
      }

      const data = await response.json();
      setIrrResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Internal hydric analyst network error.");
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (id: string) => {
    try {
      await deleteDoc(doc(db, "soil_reports", id))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, "soil_reports"));
      setReports(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("Failed to delete soil report:", err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="soil-irrigation-hub">
      
      {/* Parameters Panel - 5 Columns */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Toggle Controls */}
        <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-sm flex">
          <button
            onClick={() => { setActiveSubTab('soil'); setError(null); }}
            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              activeSubTab === 'soil'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-50'
            } flex items-center justify-center gap-1.5 cursor-pointer`}
          >
            <Layers className="w-4 h-4" />
            Pedological Advisor
          </button>
          <button
            onClick={() => { setActiveSubTab('irrigation'); setError(null); }}
            className={`flex-1 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
              activeSubTab === 'irrigation'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-50'
            } flex items-center justify-center gap-1.5 cursor-pointer`}
          >
            <Droplet className="w-4 h-4" />
            Hydric Planner
          </button>
        </div>

        {/* Dynamic Forms */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          {activeSubTab === 'soil' ? (
            <form onSubmit={handleSoilSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold text-slate-500 font-mono mb-1.5">
                  Soil Taxonomy Type
                </label>
                <select 
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  className="w-full text-slate-700 text-sm px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none"
                >
                  <option value="Loam">Sandy Loam</option>
                  <option value="Clay">Silty Clay loam</option>
                  <option value="Sandy">Coarse Sand</option>
                  <option value="Peat">Highly Organic Peat</option>
                  <option value="Chalk">Calcareous Chalk</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs uppercase font-bold text-slate-500 font-mono">
                    Hydrogen Coefficient (pH)
                  </label>
                  <span className="text-sm font-semibold text-emerald-600 font-mono">
                    {ph} (
                    {ph < 6 ? 'Acidic' : ph > 7.5 ? 'Alkaline' : 'Neutral'}
                    )
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="14" 
                  step="0.1"
                  value={ph}
                  onChange={(e) => setPh(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-100 accent-emerald-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs uppercase font-bold text-slate-500 font-mono">
                    Volumetric Water Content (%)
                  </label>
                  <span className="text-sm font-semibold text-emerald-600 font-mono">
                    {moisture}%
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={moisture}
                  onChange={(e) => setMoisture(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-100 accent-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs uppercase font-bold text-slate-500 font-mono mb-1.5">
                  Farming Location (Optional)
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Salinas Valley, CA / semi-arid"
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
                <div className="flex gap-2 text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-sm border border-emerald-700 text-center"
              >
                {loading ? "Generating Report..." : "Evaluate Soil Nutrients"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleIrrigationSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold text-slate-500 font-mono mb-1.5">
                  Watering Crop Name
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Alfalfa, Strawberries, Maize"
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  className="w-full text-slate-700 text-sm px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs uppercase font-bold text-slate-500 font-mono">
                    Current Soil Moisture
                  </label>
                  <span className="text-sm font-semibold text-emerald-600 font-mono">{irrMoisture}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={irrMoisture}
                  onChange={(e) => setIrrMoisture(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-100 accent-emerald-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs uppercase font-bold text-slate-500 font-mono">
                    ambient Air Temperature
                  </label>
                  <span className="text-sm font-semibold text-emerald-600 font-mono">{temperature}°C</span>
                </div>
                <input 
                  type="range" 
                  min="-10" 
                  max="55" 
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-100 accent-emerald-600"
                />
              </div>

              {error && (
                <div className="flex gap-2 text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !crop.trim()}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-sm border border-emerald-700"
              >
                {loading ? "Calculating schedule..." : "Formulate Irrigation"}
              </button>
            </form>
          )}
        </div>

        {/* Historical Soil reports list */}
        {activeSubTab === 'soil' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5 mb-1">
              <Layers className="w-4 h-4 text-slate-400" />
              Soil Diagnosis Reports
            </h3>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {loadingHistory ? (
                <div className="text-center py-4 text-xs text-slate-400">Loading...</div>
              ) : reports.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">No soil reports generated yet.</div>
              ) : (
                reports.map((rep) => (
                  <div 
                    key={rep.id}
                    onClick={() => setSoilResult(rep)}
                    className="p-3 bg-slate-50 rounded-xl hover:bg-emerald-50/10 cursor-pointer border border-slate-100 transition-all flex items-center justify-between group hover:border-emerald-200"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-700">Type: {rep.soilType || 'Loam'}</h4>
                      <p className="text-[10px] font-mono text-slate-500 mt-1">
                        pH: <span className="text-emerald-600 font-semibold">{rep.ph}</span> | Moist: <span className="text-indigo-600 font-semibold">{rep.moisture}%</span>
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
        )}
      </div>

      {/* Advisory Workspace - 7 Columns */}
      <div className="lg:col-span-7">
        <AnimatePresence mode="wait">
          {activeSubTab === 'soil' ? (
            soilResult ? (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6"
              >
                <div className="flex border-b border-slate-50 pb-4 items-center justify-between">
                  <div>
                    <span className="text-xs uppercase font-mono font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded">
                      Type: {soilResult.soilType}
                    </span>
                    <h2 className="text-lg font-bold text-slate-800 mt-2">Soil Health Report</h2>
                  </div>
                  <div className="flex gap-4 text-xs font-mono">
                    <div className="text-center">
                      <span className="block text-slate-400 text-[10px]">pH</span>
                      <span className="font-bold text-slate-800">{soilResult.ph}</span>
                    </div>
                    <div className="text-center">
                      <span className="block text-slate-400 text-[10px]">MOIST</span>
                      <span className="font-bold text-slate-800">{soilResult.moisture}%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                    <h4 className="text-xs uppercase font-bold text-emerald-800 font-mono flex items-center gap-1">
                      <Sprout className="w-4 h-4" /> Suitable Cultivations
                    </h4>
                    <p className="text-slate-700 text-sm mt-1.5 leading-relaxed pl-5 whitespace-pre-line">
                      {soilResult.suitableCrops}
                    </p>
                  </div>

                  <div className="p-4 bg-lime-50/40 border border-lime-100 rounded-xl">
                    <h4 className="text-xs uppercase font-bold text-lime-800 font-mono flex items-center gap-1">
                      <Compass className="w-4 h-4" /> Fertilizer Recommendations
                    </h4>
                    <p className="text-slate-700 text-sm mt-1.5 leading-relaxed pl-5 whitespace-pre-line">
                      {soilResult.fertilizerRecommendations}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                    <h4 className="text-xs uppercase font-bold text-slate-800 font-mono flex items-center gap-1">
                      <Activity className="w-4 h-4" /> Improvement Plan
                    </h4>
                    <p className="text-slate-700 text-sm mt-1.5 leading-relaxed pl-5 whitespace-pre-line">
                      {soilResult.soilImprovementPlan}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-100 shadow-sm min-h-[460px]">
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full mb-4">
                  <Compass className="w-12 h-12" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700">Awaiting Soil Analysis Parameters</h3>
                <p className="text-sm text-slate-400 mt-2 text-center max-w-sm leading-relaxed">
                  Calibrate pH, soil texture taxonomy, and humidity parameters. Our structural agronomical platform logs suitable crops and fertilizer addition programs.
                </p>
              </div>
            )
          ) : (
            irrResult ? (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6"
              >
                <div className="flex border-b border-slate-50 pb-4 items-center justify-between">
                  <div>
                    <span className="text-xs uppercase font-mono font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded">
                      Crop: {crop}
                    </span>
                    <h2 className="text-lg font-bold text-slate-800 mt-2">Irrigation Hydric Plan</h2>
                  </div>
                  <div className="flex gap-4 text-xs font-mono text-center">
                    <div>
                      <span className="block text-slate-400 text-[10px]">TEMP</span>
                      <span className="font-bold text-slate-800">{temperature}°C</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 text-[10px]">MOISTURE</span>
                      <span className="font-bold text-slate-800">{irrMoisture}%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                    <h4 className="text-xs uppercase font-bold text-indigo-800 font-mono flex items-center gap-1">
                      <Droplet className="w-4 h-4" /> Daily Volumetric water requirement
                    </h4>
                    <p className="text-slate-700 text-sm mt-1.5 leading-relaxed pl-5 whitespace-pre-line">
                      {irrResult.waterRequirement}
                    </p>
                  </div>

                  <div className="p-4 bg-cyan-50/40 border border-cyan-100 rounded-xl">
                    <h4 className="text-xs uppercase font-bold text-cyan-800 font-mono flex items-center gap-1">
                      <Activity className="w-4 h-4" /> Recommended Watering Timetable Table
                    </h4>
                    <p className="text-slate-700 text-sm mt-1.5 leading-relaxed pl-5 whitespace-pre-line">
                      {irrResult.schedule}
                    </p>
                  </div>

                  <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-xl">
                    <h4 className="text-xs uppercase font-bold text-emerald-800 font-mono flex items-center gap-1">
                      <Sprout className="w-4 h-4" /> Water Saving Interventions
                    </h4>
                    <p className="text-slate-700 text-sm mt-1.5 leading-relaxed pl-5 whitespace-pre-line">
                      {irrResult.waterSavingTechniques}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-100 shadow-sm min-h-[460px]">
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-4">
                  <Droplet className="w-12 h-12 animate-bounce" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700">Awaiting Irrigation Calculations</h3>
                <p className="text-sm text-slate-400 mt-2 text-center max-w-sm leading-relaxed">
                  Provide crop types and ambient heat levels. The hydric algorithm computes volumetric water quotas and schedules to prevent water stress.
                </p>
              </div>
            )
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};
