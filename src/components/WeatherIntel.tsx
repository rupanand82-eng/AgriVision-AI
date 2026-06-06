import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  CloudSun, 
  MapPin, 
  Search, 
  Droplets, 
  Wind, 
  CloudRain, 
  ShieldAlert, 
  Calendar,
  Sparkles,
  Trash2,
  Clock,
  Thermometer,
  Grid,
  Sun,
  Flame,
  RefreshCw,
  Droplet,
  Compass,
  Activity,
  Info,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeatCell {
  id: string;
  x: number;
  y: number;
  zone: string;
  crop: string;
  temp: number;
  humidity: number;
  soilMoisture: number;
  uvIndex: number;
  health: 'optimal' | 'warning' | 'stress';
}

const cropsList = ["Organic Wheat", "Soya Fields", "Maize Plots", "Sweet Potatoes", "Tomato Beds", "Fallow Rest", "Vineyards"];
const zonesList = ["NW", "N", "NE", "W", "C", "E", "SW", "S", "SE"];

const generateInitialHeatmap = (): HeatCell[] => {
  const cellArray: HeatCell[] = [];
  for (let y = 1; y <= 6; y++) {
    for (let x = 1; x <= 6; x++) {
      const zoneName = zonesList[Math.floor(((y - 1) * 6 + (x - 1)) / 4) % zonesList.length];
      const cropName = cropsList[((x * 3) + (y * 7)) % cropsList.length];
      
      // Cohesive thermal and hydric gradients
      const distFromCenter = Math.sqrt((x - 3.5) ** 2 + (y - 3.5) ** 2);
      const temp = parseFloat((25 + (3 - distFromCenter) * 2 + (Math.sin(x) * 1.5)).toFixed(1));
      const humidity = parseFloat((65 - (3 - distFromCenter) * 4 + (Math.cos(y) * 5)).toFixed(1));
      const soilMoisture = parseFloat((38 - distFromCenter * 3 + ((x * y) % 12)).toFixed(1));
      const uv = Math.max(1, Math.min(11, Math.floor(6 + (2.5 - distFromCenter) + Math.sin(x + y))));
      
      let health: 'optimal' | 'warning' | 'stress' = 'optimal';
      if (temp > 29.5 || soilMoisture < 23) {
        health = 'warning';
      }
      if (temp > 32 || soilMoisture < 19) {
        health = 'stress';
      }

      cellArray.push({
        id: `${x}-${y}`,
        x,
        y,
        zone: `${zoneName}-${x}${y}`,
        crop: cropName,
        temp,
        humidity,
        soilMoisture,
        uvIndex: uv,
        health
      });
    }
  }
  return cellArray;
};

const getCellColorStyles = (cell: HeatCell, metric: 'temp' | 'humidity' | 'soilMoisture' | 'uvIndex') => {
  if (metric === 'temp') {
    if (cell.temp < 21) return { bg: 'rgba(16, 185, 129, 0.15)', text: '#047857', border: '#a7f3d0' };
    if (cell.temp < 25) return { bg: 'rgba(234, 179, 8, 0.2)', text: '#713f12', border: '#fef08a' };
    if (cell.temp < 29) return { bg: 'rgba(249, 115, 22, 0.25)', text: '#c2410c', border: '#fed7aa' };
    if (cell.temp < 32) return { bg: 'rgba(239, 68, 68, 0.35)', text: '#b91c1c', border: '#fca5a5' };
    return { bg: 'rgba(220, 38, 38, 0.85)', text: '#ffffff', border: '#991b1b' };
  }
  if (metric === 'humidity') {
    if (cell.humidity < 45) return { bg: 'rgba(14, 165, 233, 0.12)', text: '#0369a1', border: '#bae6fd' };
    if (cell.humidity < 60) return { bg: 'rgba(14, 165, 233, 0.28)', text: '#0369a1', border: '#7dd3fc' };
    if (cell.humidity < 75) return { bg: 'rgba(59, 130, 246, 0.45)', text: '#1e40af', border: '#93c5fd' };
    return { bg: 'rgba(79, 70, 229, 0.82)', text: '#ffffff', border: '#3730a3' };
  }
  if (metric === 'soilMoisture') {
    if (cell.soilMoisture < 22) return { bg: 'rgba(217, 119, 6, 0.18)', text: '#92400e', border: '#fde68a' };
    if (cell.soilMoisture < 35) return { bg: 'rgba(20, 184, 166, 0.22)', text: '#0f766e', border: '#99f6e4' };
    if (cell.soilMoisture < 45) return { bg: 'rgba(20, 184, 166, 0.48)', text: '#115e59', border: '#2dd4bf' };
    return { bg: 'rgba(6, 182, 212, 0.82)', text: '#ffffff', border: '#0891b2' };
  }
  // uvIndex
  if (cell.uvIndex < 3) return { bg: 'rgba(251, 191, 36, 0.12)', text: '#b45309', border: '#fde68a' };
  if (cell.uvIndex < 6) return { bg: 'rgba(251, 191, 36, 0.38)', text: '#b45309', border: '#fcd34d' };
  if (cell.uvIndex < 8) return { bg: 'rgba(249, 115, 22, 0.65)', text: '#ffffff', border: '#ea580c' };
  return { bg: 'rgba(147, 51, 234, 0.82)', text: '#ffffff', border: '#7e22ce' };
};

export const WeatherIntel: React.FC = () => {
  const { user } = useAuth();
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [advisory, setAdvisory] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [weatherHistory, setWeatherHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Climate Heatmap states
  const [metric, setMetric] = useState<'temp' | 'humidity' | 'soilMoisture' | 'uvIndex'>('temp');
  const [cells, setCells] = useState<HeatCell[]>([]);
  const [activeCellId, setActiveCellId] = useState<string | null>("3-3");
  const [isDayMode, setIsDayMode] = useState(true);

  useEffect(() => {
    setCells(generateInitialHeatmap());
  }, []);

  const toggleDiurnalShift = () => {
    setIsDayMode(prev => {
      const targetIsDay = !prev;
      setCells(oldCells => oldCells.map(c => {
        const offset = targetIsDay ? 5.2 : -5.2;
        const humidOffset = targetIsDay ? -12 : 12;
        const uvOffset = targetIsDay ? 3 : -3;
        const newTemp = parseFloat(Math.min(39, Math.max(12, c.temp + offset)).toFixed(1));
        const newHumid = parseFloat(Math.min(98, Math.max(20, c.humidity + humidOffset)).toFixed(1));
        const newUv = Math.max(1, Math.min(11, c.uvIndex + uvOffset));
        
        let health: 'optimal' | 'warning' | 'stress' = 'optimal';
        if (newTemp > 29.5 || c.soilMoisture < 23) health = 'warning';
        if (newTemp > 32 || c.soilMoisture < 19) health = 'stress';

        return {
          ...c,
          temp: newTemp,
          humidity: newHumid,
          uvIndex: newUv,
          health
        };
      }));
      return targetIsDay;
    });
  };

  const triggerHeatwave = () => {
    setCells(oldCells => oldCells.map(c => {
      const isAffected = Math.random() > 0.4;
      if (isAffected) {
        const heatAdd = parseFloat((6 + Math.random() * 4).toFixed(1));
        const moistureLoss = parseFloat((12 + Math.random() * 6).toFixed(1));
        const newTemp = parseFloat(Math.min(42, c.temp + heatAdd).toFixed(1));
        const newSoil = parseFloat(Math.max(10, c.soilMoisture - moistureLoss).toFixed(1));
        
        let health: 'optimal' | 'warning' | 'stress' = 'optimal';
        if (newTemp > 29.5 || newSoil < 23) health = 'warning';
        if (newTemp > 32 || newSoil < 19) health = 'stress';

        return {
          ...c,
          temp: newTemp,
          soilMoisture: newSoil,
          uvIndex: Math.min(11, c.uvIndex + 3),
          health
        };
      }
      return c;
    }));
  };

  const triggerSprinklers = () => {
    setCells(oldCells => oldCells.map(c => {
      const isIrrigated = Math.random() > 0.3;
      if (isIrrigated) {
        const newSoil = parseFloat(Math.min(75, c.soilMoisture + 22).toFixed(1));
        const newTemp = parseFloat(Math.max(16, c.temp - 2.5).toFixed(1));
        
        let health: 'optimal' | 'warning' | 'stress' = 'optimal';
        if (newTemp > 29.5 || newSoil < 23) health = 'warning';
        if (newTemp > 32 || newSoil < 19) health = 'stress';

        return {
          ...c,
          soilMoisture: newSoil,
          temp: newTemp,
          health
        };
      }
      return c;
    }));
  };

  // Fetch historic alerts
  const fetchWeatherHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, "weather_reports"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q).catch(err => handleFirestoreError(err, OperationType.LIST, "weather_reports"));
      const logs = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setWeatherHistory(logs);
    } catch (err) {
      console.error("Failed loading weather advisories:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchWeatherHistory();
  }, [user]);

  const handleSearchWeather = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim()) return;

    setLoading(true);
    setAdvisory(null);
    setError(null);

    try {
      const response = await fetch('/api/weather-advisory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: location.trim() })
      });

      if (!response.ok) {
        throw new Error("Failed to consult microclimate search grounding indices.");
      }

      const data = await response.json();
      setAdvisory(data);

      if (user) {
        // Save into Firestore collection
        await addDoc(collection(db, "weather_reports"), {
          userId: user.uid,
          location: location.trim(),
          weatherData: data.weatherData,
          advisory: data.advisory,
          createdAt: serverTimestamp()
        }).catch(err => handleFirestoreError(err, OperationType.CREATE, "weather_reports"));

        fetchWeatherHistory();
      }

    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Ecosystem weather lookups failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const deleteAdvisory = async (id: string) => {
    try {
      await deleteDoc(doc(db, "weather_reports", id))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, "weather_reports"));
      setWeatherHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("Failed deleting weather advisory:", err);
    }
  };

  return (
    <div className="space-y-8" id="weather-intel-view">
      
      {/* Search & Advisory main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Parameters panel - 5 Columns */}
        <div className="lg:col-span-5 space-y-6">
        
        {/* Search Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-emerald-700 font-medium">
            <CloudSun className="w-5 h-5" />
            <h2 className="text-lg font-semibold text-slate-800">Geographic weather search</h2>
          </div>
          <p className="text-slate-500 text-xs mt-1">Uses Gemini Search Grounding features to parse real live climate datasets.</p>

          <form onSubmit={handleSearchWeather} className="flex gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Region, City, or farming district" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={loading}
                className="w-full text-slate-700 text-sm pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-emerald-500 transition-all font-sans"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !location.trim()}
              className="px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 cursor-pointer shadow-sm disabled:opacity-55 flex items-center justify-center"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-mono font-bold text-slate-450 uppercase block">Suggested Agricultural Plains:</span>
            <div className="flex flex-wrap gap-1">
              {[
                { name: 'Salinas Valley, CA', desc: 'Vegetable belt' },
                { name: 'Iowa Corn Belt', desc: 'Maize & Soy' },
                { name: 'Punjab Plains, India', desc: 'Grain belt' },
                { name: 'Murrumbidgee, AU', desc: 'Citrus & Vines' },
                { name: 'Andalusia, Spain', desc: 'Olives & Citrus' },
                { name: 'Saskatchewan, Canada', desc: 'Wheat Plains' }
              ].map((loc) => (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => setLocation(loc.name)}
                  className="px-2 py-1 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 rounded-lg text-[10px] font-medium text-slate-600 cursor-pointer transition-all"
                  title={loc.desc}
                >
                  📍 {loc.name}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-xs text-rose-600 p-3 bg-rose-50 border border-rose-100 rounded-xl">
              {error}
            </div>
          )}
        </div>

        {/* Historical advisory archives */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              Agrometeorology logs
            </h3>
            <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
              {weatherHistory.length} Reports
            </span>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {loadingHistory ? (
              <div className="text-center py-4 text-xs text-slate-400">Loading...</div>
            ) : weatherHistory.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">
                No past microclimate reports retrieved.
              </div>
            ) : (
              weatherHistory.map((rep) => (
                <div 
                  key={rep.id}
                  onClick={() => setAdvisory(rep)}
                  className="p-3 bg-slate-50 hover:bg-emerald-50/10 cursor-pointer rounded-xl border border-slate-100 transition-all flex items-center justify-between group hover:border-emerald-200"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-slate-700 truncate">{rep.location}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                      <Thermometer className="h-3 w-3 text-emerald-500" />
                      {rep.weatherData?.temperature || 21}°C | Humid: {rep.weatherData?.humidity || 60}%
                    </p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteAdvisory(rep.id); }}
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

      {/* Advisory Displays - 7 columns */}
      <div className="lg:col-span-7">
        <AnimatePresence mode="wait">
          {advisory ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6"
            >
              <div className="border-b border-slate-50 pb-5">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs uppercase font-mono font-bold text-slate-500">
                    Location: {advisory.location}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-800 mt-2">Agrometeorology advisory report</h2>
              </div>

              {/* Weather metrics badges row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-orange-50/40 rounded-xl border border-orange-50/50 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] uppercase font-mono text-orange-700 font-semibold mb-1">Temperature</span>
                  <div className="flex items-center text-slate-800 font-bold font-mono text-lg">
                    <Thermometer className="w-4 h-4 text-orange-500 mr-1" />
                    <span>{advisory.weatherData?.temperature}°C</span>
                  </div>
                </div>

                <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-50/50 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] uppercase font-mono text-indigo-700 font-semibold mb-1">Humidity</span>
                  <div className="flex items-center text-slate-800 font-bold font-mono text-lg">
                    <Droplets className="w-4 h-4 text-indigo-500 mr-1" />
                    <span>{advisory.weatherData?.humidity}%</span>
                  </div>
                </div>

                <div className="p-4 bg-cyan-50/40 rounded-xl border border-cyan-50/50 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] uppercase font-mono text-cyan-700 font-semibold mb-1">Rainfall</span>
                  <div className="flex items-center text-slate-800 font-bold font-mono text-lg">
                    <CloudRain className="w-4 h-4 text-cyan-500 mr-1" />
                    <span>{advisory.weatherData?.rainfall} mm</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] uppercase font-mono text-slate-600 font-semibold mb-1">Wind speed</span>
                  <div className="flex items-center text-slate-800 font-bold font-mono text-lg">
                    <Wind className="w-4 h-4 text-slate-500 mr-1" />
                    <span>{advisory.weatherData?.windSpeed} km/h</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Warning Alert banner */}
              {advisory.weatherData?.temperature > 32 || advisory.weatherData?.rainfall > 50 ? (
                <div className="flex items-start gap-2.5 p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-xs">
                  <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block uppercase font-mono text-[10px] tracking-wide">Extreme Agronomic Alert</span>
                    <span className="mt-1 block font-sans leading-relaxed">
                      Microclimate reports indices showing hydrological stress warnings. Review active pesticide drift boundaries against wind and plan immediate protection operations.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs">
                  <Calendar className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block uppercase font-mono text-[10px] tracking-wide">Optimal Microclimate Operability</span>
                    <span className="mt-1 block font-sans leading-relaxed">
                      Conditions align cleanly within agromet standards. Proceed with generic fertilizing schemes and cover crop aeration programs.
                    </span>
                  </div>
                </div>
              )}

              {/* Comprehensive Advisory block */}
              <div className="p-5 bg-white border border-slate-100 shadow-xs rounded-2xl relative space-y-4">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-500 uppercase border-b border-slate-50 pb-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  AI Weather Agricultural Advisory
                </div>
                <p className="text-sm font-sans text-slate-700 leading-relaxed pl-2 whitespace-pre-line">
                  {advisory.advisory}
                </p>
              </div>

            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-100 shadow-sm min-h-[460px]">
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full mb-4">
                <CloudSun className="w-12 h-12" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700">Awaiting Regional Weather Search</h3>
              <p className="text-sm text-slate-400 mt-2 text-center max-w-sm leading-relaxed">
                Provide a farming district or city coordinates. Our platform parses active web conditions with live Google Search Grounding to write weather-focused agrisensor parameters.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>

      {/* Interactive Climate Heatmap Segment */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6" id="climate-heatmap-section">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-50 pb-4 gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm md:text-base flex items-center gap-1.5">
                Microclimate Cell Telemetry Grid
                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-semibold">
                  36 Fields Simulated
                </span>
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Interactive spatial projection map representing microclimates across localized agrisensor estate.
              </p>
            </div>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            {(['temp', 'humidity', 'soilMoisture', 'uvIndex'] as const).map((mKey) => (
              <button
                key={mKey}
                onClick={() => setMetric(mKey)}
                className={`px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-semibold cursor-pointer transition-all ${
                  metric === mKey
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {mKey === 'temp' && '🌡️ Temp'}
                {mKey === 'humidity' && '💧 Humid'}
                {mKey === 'soilMoisture' && '🌱 Soil'}
                {mKey === 'uvIndex' && '☀️ UV Index'}
              </button>
            ))}
          </div>
        </div>

        {/* Heatmap Grid & Panel split */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-2">
          
          {/* 6x6 Heatmap Interactive Grid - 7 Columns */}
          <div className="md:col-span-7 space-y-4">
            
            {/* Header column indicators */}
            <div className="flex items-center justify-between font-mono text-[9px] text-slate-400 font-bold px-2">
              <span>ESTATE COORDINATES RANGE (6x6 SECTORS)</span>
              <span>W ── EAST</span>
            </div>

            <div className="grid grid-cols-6 gap-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
              {cells.map((cell) => {
                const styles = getCellColorStyles(cell, metric);
                const isActive = cell.id === activeCellId;
                
                return (
                  <button
                    key={cell.id}
                    onClick={() => setActiveCellId(cell.id)}
                    style={{
                      backgroundColor: styles.bg,
                      color: styles.text,
                      borderColor: isActive ? '#059669' : styles.border,
                      borderWidth: isActive ? '2px' : '1px'
                    }}
                    className={`aspect-square relative rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-[104%] hover:shadow-xs focus:outline-none ${
                      isActive ? 'ring-2 ring-emerald-500/25 scale-[1.03]' : ''
                    }`}
                  >
                    <span className="text-[9px] font-mono font-black select-none tracking-tight">
                      {cell.zone.split('-')[0]}
                    </span>
                    <span className="text-xs md:text-sm font-bold font-mono tracking-tighter select-none">
                      {metric === 'temp' && `${Math.round(cell.temp)}°`}
                      {metric === 'humidity' && `${Math.round(cell.humidity)}%`}
                      {metric === 'soilMoisture' && `${Math.round(cell.soilMoisture)}%`}
                      {metric === 'uvIndex' && `${cell.uvIndex}`}
                    </span>
                    
                    {/* Small dot icon representing crop health state */}
                    <span 
                      className={`absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full ${
                        cell.health === 'stress' ? 'bg-rose-500 animate-pulse' :
                        cell.health === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Scale legend */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-slate-400 border-t border-slate-100/70 pt-3 gap-2">
              <div className="flex items-center gap-1">
                <Info className="h-3.5 w-3.5 text-slate-400" />
                <span>Selected Metric: <span className="text-slate-600 font-semibold uppercase">{metric}</span></span>
              </div>
              <div className="flex items-center gap-3">
                <span>Legend Gradient:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">Low</span>
                  <div className="w-24 h-2 rounded-full bg-gradient-to-r from-emerald-100 via-amber-300 to-red-500" />
                  <span className="font-mono">High</span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Real-time Field Telemetry Card - 5 Columns */}
          <div className="md:col-span-5 bg-slate-50/50 p-5 rounded-2xl border border-slate-100 flex flex-col justify-between min-h-[340px]">
            {activeCellId && cells.find(c => c.id === activeCellId) ? (() => {
              const activeCell = cells.find(c => c.id === activeCellId)!;
              return (
                <div className="space-y-4">
                  
                  {/* Sector header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-mono font-extrabold text-slate-400">Selected Telemetry Field</span>
                      <h4 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-1.5 mt-0.5">
                        <Compass className="h-4 w-4 text-emerald-600" />
                        Field Range {activeCell.zone}
                      </h4>
                    </div>
                    <span className={`text-[9px] font-bold font-mono uppercase px-2 py-0.5 rounded-full ${
                      activeCell.health === 'stress' ? 'bg-red-100 text-red-700 border border-red-200 animate-pulse' :
                      activeCell.health === 'warning' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {activeCell.health}
                    </span>
                  </div>

                  {/* Grid info parameters */}
                  <div className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                    <span className="text-xs text-slate-500">Cultivated Crop Cover</span>
                    <span className="text-xs font-bold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-150">{activeCell.crop}</span>
                  </div>

                  {/* Multi telemetry gauges */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-2 border border-slate-100 rounded-xl">
                      <span className="block text-[8px] tracking-tight text-slate-400 font-mono">HEAT INDEX</span>
                      <span className="text-xs font-bold text-slate-700 block mt-0.5 flex items-center gap-1">
                        <Thermometer className="h-3 w-3 text-orange-500 shrink-0" />
                        {activeCell.temp}°C
                      </span>
                    </div>

                    <div className="bg-white p-2 border border-slate-100 rounded-xl">
                      <span className="block text-[8px] tracking-tight text-slate-400 font-mono">HUMID MATRIX</span>
                      <span className="text-xs font-bold text-slate-700 block mt-0.5 flex items-center gap-1">
                        <Droplets className="h-3 w-3 text-blue-500 shrink-0" />
                        {activeCell.humidity}%
                      </span>
                    </div>

                    <div className="bg-white p-2 border border-slate-100 rounded-xl">
                      <span className="block text-[8px] tracking-tight text-slate-400 font-mono">SOIL WATER</span>
                      <span className="text-xs font-bold text-slate-700 block mt-0.5 flex items-center gap-1">
                        <Droplet className="h-3 w-3 text-teal-600 shrink-0" />
                        {activeCell.soilMoisture}%
                      </span>
                    </div>

                    <div className="bg-white p-2 border border-slate-100 rounded-xl">
                      <span className="block text-[8px] tracking-tight text-slate-400 font-mono">SOLAR UV</span>
                      <span className="text-xs font-bold text-slate-700 block mt-0.5 flex items-center gap-1">
                        <Sun className="h-3 w-3 text-amber-500 shrink-0" />
                        {activeCell.uvIndex}/11 UV
                      </span>
                    </div>
                  </div>

                  {/* Contextual Advisory text */}
                  <div className="bg-emerald-50/20 p-3 rounded-xl border border-emerald-100/40 text-[10px] text-slate-600 space-y-1">
                    <div className="flex items-center gap-1 text-emerald-700 font-bold uppercase font-mono text-[8px]">
                      <Sparkles className="w-3.5 h-3.5" />
                      Field Microclimate Prognosis
                    </div>
                    <p className="leading-relaxed">
                      {metric === 'temp' && (activeCell.temp > 30 
                        ? "High absolute temperatures trigger rapid evapotranspiration of topsoils. Advise root hydration overrides immediately." 
                        : "Temperature ranges are perfectly ideal for active enzymatic crop synthesis. No manual thermal shelters needed.")}
                      {metric === 'humidity' && (activeCell.humidity > 70
                        ? "Excess micro-humidity triggers immediate fungal risk vectors. Limit sprinkler irrigation to prevent leaf spots/mildew."
                        : "Relative humidity coefficients are favorable. Retains essential atmospheric moisture balances.")}
                      {metric === 'soilMoisture' && (activeCell.soilMoisture < 23
                        ? "Soil moisture is approaching absolute localized drought parameters. Trigger sprinkler grids immediately."
                        : "Moisture profiles are optimal. Promotes deep water capillary suction without water-logging roots.")}
                      {metric === 'uvIndex' && (activeCell.uvIndex > 6
                        ? "Extreme ultraviolet exposure risks. Guard young shoots or utilize high shade canopies if possible."
                        : "Standard solar rates. Supports standard light reaction pathways.")}
                    </p>
                  </div>

                </div>
              );
            })() : (
              <div className="text-center py-12 text-xs text-slate-400">
                Click a grid square to view localized real-time agronomic telemetry.
              </div>
            )}

            {/* Simulation controls panel */}
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between font-mono text-[9px] text-slate-400 font-bold">
                <span>GRID SIMULATION CONTROLS</span>
                <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={toggleDiurnalShift}
                  className="px-2 py-1.5 bg-white border border-slate-250 hover:border-emerald-500 text-slate-600 hover:text-emerald-700 text-[10px] font-semibold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>{isDayMode ? 'Night Mode' : 'Day Mode'}</span>
                </button>
                <button
                  type="button"
                  onClick={triggerHeatwave}
                  className="px-2 py-1.5 bg-white border border-slate-250 hover:border-orange-500 text-slate-600 hover:text-orange-700 text-[10px] font-semibold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Flame className="h-3 w-3 text-orange-500" />
                  <span>Drought Spike</span>
                </button>
                <button
                  type="button"
                  onClick={triggerSprinklers}
                  className="px-2 py-1.5 bg-white border border-slate-250 hover:border-cyan-500 text-slate-600 hover:text-cyan-700 text-[10px] font-semibold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
                >
                  <Droplet className="h-3 w-3 text-cyan-500" />
                  <span>Sprinklers</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
