import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { CropAnalysis, SoilReport, WeatherReport, DashboardTab } from '../types';
import { 
  Search, 
  X, 
  Leaf, 
  Layers, 
  CloudSun, 
  Calendar, 
  MapPin, 
  ArrowRight,
  TrendingUp,
  Droplet,
  Compass,
  AlertCircle,
  Activity,
  Bookmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GlobalSearchProps {
  onNavigateTab: (tab: DashboardTab) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [keyword, setKeyword] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cached datasets
  const [cropAnalyses, setCropAnalyses] = useState<CropAnalysis[]>([]);
  const [soilReports, setSoilReports] = useState<SoilReport[]>([]);
  const [weatherReports, setWeatherReports] = useState<WeatherReport[]>([]);
  const [cacheLoaded, setCacheLoaded] = useState(false);

  // Selected item detail modal state
  const [selectedItem, setSelectedItem] = useState<{
    type: 'disease' | 'soil' | 'weather';
    data: any;
  } | null>(null);

  // Fetch all user's reports to search locally for instant keyword matching
  const fetchCache = async () => {
    if (!user || cacheLoaded) return;
    setIsLoading(true);
    try {
      const analysesQuery = query(collection(db, "crop_analysis"), where("userId", "==", user.uid));
      const soilQuery = query(collection(db, "soil_reports"), where("userId", "==", user.uid));
      const weatherQuery = query(collection(db, "weather_reports"), where("userId", "==", user.uid));

      const [analysesSnap, soilSnap, weatherSnap] = await Promise.all([
        getDocs(analysesQuery).catch(err => {
          handleFirestoreError(err, OperationType.LIST, "crop_analysis");
          return { docs: [] } as any;
        }),
        getDocs(soilQuery).catch(err => {
          handleFirestoreError(err, OperationType.LIST, "soil_reports");
          return { docs: [] } as any;
        }),
        getDocs(weatherQuery).catch(err => {
          handleFirestoreError(err, OperationType.LIST, "weather_reports");
          return { docs: [] } as any;
        })
      ]);

      const analysesData = analysesSnap.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as CropAnalysis[];

      const soilData = soilSnap.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as SoilReport[];

      const weatherData = weatherSnap.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as WeatherReport[];

      setCropAnalyses(analysesData);
      setSoilReports(soilData);
      setWeatherReports(weatherData);
      setCacheLoaded(true);
    } catch (err) {
      console.error("Global search failed to construct cache registry:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Close search list on clicking outside the container
  useEffect(() => {
    const clickHandler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", clickHandler);
    return () => document.removeEventListener("mousedown", clickHandler);
  }, []);

  // Soft format timestamp helper
  const formatTimestamp = (createdAt: any) => {
    if (!createdAt) return 'Recent Evaluation';
    if (createdAt.seconds) {
      return new Date(createdAt.seconds * 1000).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    return 'Recent Evaluation';
  };

  // String searching case-insensitive helper
  const matchesKeyword = (text: string | undefined | null, searchStr: string) => {
    if (!text) return false;
    return text.toLowerCase().includes(searchStr.toLowerCase());
  };

  const cleanKeyword = keyword.trim();

  // Filter datasets based on exact matching attributes
  const filteredDiseases = cleanKeyword
    ? cropAnalyses.filter(item => 
        matchesKeyword(item.cropName, cleanKeyword) ||
        matchesKeyword(item.diseaseName, cleanKeyword) ||
        matchesKeyword(item.symptoms, cleanKeyword) ||
        matchesKeyword(item.treatment, cleanKeyword) ||
        matchesKeyword(item.prevention, cleanKeyword)
      )
    : [];

  const filteredSoils = cleanKeyword
    ? soilReports.filter(item => 
        matchesKeyword(item.soilType, cleanKeyword) ||
        matchesKeyword(item.location, cleanKeyword) ||
        matchesKeyword(item.suitableCrops, cleanKeyword) ||
        matchesKeyword(item.fertilizerRecommendations, cleanKeyword) ||
        matchesKeyword(item.soilImprovementPlan, cleanKeyword)
      )
    : [];

  const filteredWeather = cleanKeyword
    ? weatherReports.filter(item => 
        matchesKeyword(item.location, cleanKeyword) ||
        matchesKeyword(item.advisory, cleanKeyword)
      )
    : [];

  const hasAnyResults = filteredDiseases.length > 0 || filteredSoils.length > 0 || filteredWeather.length > 0;

  return (
    <div className="relative w-full max-w-sm md:max-w-md mx-auto" ref={dropdownRef}>
      
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={keyword}
          onFocus={() => {
            setIsFocused(true);
            fetchCache();
          }}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search crop, soil, weather history..."
          className="w-full text-xs font-sans text-slate-800 bg-slate-50/70 hover:bg-slate-50/100 focus:bg-white border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 pl-10 pr-9 py-2 rounded-xl outline-none transition-all"
        />
        {keyword && (
          <button 
            onClick={() => setKeyword('')}
            className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Floating results viewport dropdown */}
      <AnimatePresence>
        {isFocused && cleanKeyword && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="absolute left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden max-h-[420px] overflow-y-auto z-50 p-2"
          >
            {isLoading ? (
              <div className="py-8 px-4 flex flex-col items-center justify-center text-slate-400 space-y-2 text-xs font-mono">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span>Reading indexed telemetry databases...</span>
              </div>
            ) : !hasAnyResults ? (
              <div className="py-10 px-4 text-center">
                <Bookmark className="h-7 w-7 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No telemetry matches found</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
                  We scanned pathology logs, soils, and weather indices but found no match for "{keyword}".
                </p>
              </div>
            ) : (
              <div className="space-y-4 p-1.5">
                
                {/* 1. Crop Pathology Logs */}
                {filteredDiseases.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 border-b border-slate-50">
                      <Leaf className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-[10px] font-mono text-emerald-800 font-bold uppercase tracking-wider">Crop Pathology logs ({filteredDiseases.length})</span>
                    </div>
                    <div className="space-y-1">
                      {filteredDiseases.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedItem({ type: 'disease', data: item });
                            setIsFocused(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100/50 flex justify-between items-center group transition-colors cursor-pointer"
                        >
                          <div className="min-w-0 pr-3">
                            <span className="font-semibold text-slate-800 text-xs block group-hover:text-emerald-700 transition-colors truncate">
                              {item.cropName} — <span className="text-emerald-600">{item.diseaseName}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate max-w-[280px]">
                              {item.symptoms}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400 whitespace-nowrap shrink-0">
                            {formatTimestamp(item.createdAt)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Soil Nutrients Database */}
                {filteredSoils.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 border-b border-slate-50">
                      <Layers className="h-3.5 w-3.5 text-amber-600" />
                      <span className="text-[10px] font-mono text-amber-800 font-bold uppercase tracking-wider">Soil nutrient reports ({filteredSoils.length})</span>
                    </div>
                    <div className="space-y-1">
                      {filteredSoils.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedItem({ type: 'soil', data: item });
                            setIsFocused(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100/50 flex justify-between items-center group transition-colors cursor-pointer"
                        >
                          <div className="min-w-0 pr-3">
                            <span className="font-semibold text-slate-800 text-xs block group-hover:text-amber-700 transition-colors truncate">
                              {item.soilType} Soil — <span className="text-amber-600">{item.location}</span>
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate max-w-[280px]">
                              pH {item.ph} • Moisture {item.moisture}% • {item.suitableCrops}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400 whitespace-nowrap shrink-0">
                            {formatTimestamp(item.createdAt)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Weather Advisories */}
                {filteredWeather.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 border-b border-slate-50">
                      <CloudSun className="h-3.5 w-3.5 text-sky-600" />
                      <span className="text-[10px] font-mono text-sky-800 font-bold uppercase tracking-wider">Meteorology advisories ({filteredWeather.length})</span>
                    </div>
                    <div className="space-y-1">
                      {filteredWeather.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedItem({ type: 'weather', data: item });
                            setIsFocused(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100/50 flex justify-between items-center group transition-colors cursor-pointer"
                        >
                          <div className="min-w-0 pr-3">
                            <span className="font-semibold text-slate-800 text-xs block group-hover:text-sky-700 transition-colors truncate">
                              Advisory for {item.location}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate max-w-[280px]">
                              {item.advisory}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400 whitespace-nowrap shrink-0">
                            {formatTimestamp(item.createdAt)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Structured report visual modal overlay */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]"
            >
              
              {/* Modal header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  {selectedItem.type === 'disease' && <Leaf className="h-5 w-5 text-emerald-600" />}
                  {selectedItem.type === 'soil' && <Layers className="h-5 w-5 text-amber-600" />}
                  {selectedItem.type === 'weather' && <CloudSun className="h-5 w-5 text-sky-600" />}
                  <div>
                    <span className="text-xs uppercase font-mono font-bold text-slate-400">
                      Archive reader / {selectedItem.type} report
                    </span>
                    <span className="font-bold text-slate-800 text-sm block tracking-tight">
                      {selectedItem.type === 'disease' && `Diagnosis: ${selectedItem.data.diseaseName}`}
                      {selectedItem.type === 'soil' && `Assessment: ${selectedItem.data.soilType} Soil`}
                      {selectedItem.type === 'weather' && `Climatology: ${selectedItem.data.location}`}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1 px-2.5 hover:bg-slate-200/60 rounded-lg text-slate-400 hover:text-slate-700 transition-colors text-xs font-semibold cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                
                {/* Visual rendering for Crop pathology */}
                {selectedItem.type === 'disease' && (
                  <div className="space-y-4 text-xs">
                    
                    {/* Log details bar */}
                    <div className="grid grid-cols-3 gap-3 font-mono text-[10px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="block uppercase text-[8px] text-slate-400">Crop Host</span>
                        <span className="font-semibold text-slate-700">{selectedItem.data.cropName}</span>
                      </div>
                      <div>
                        <span className="block uppercase text-[8px] text-slate-400">Confidence</span>
                        <span className="font-semibold text-emerald-600">{selectedItem.data.confidence}%</span>
                      </div>
                      <div>
                        <span className="block uppercase text-[8px] text-slate-400">Recorded At</span>
                        <span className="font-semibold text-slate-700">{formatTimestamp(selectedItem.data.createdAt)}</span>
                      </div>
                    </div>

                    {/* Image visual thumbnail if exists */}
                    {selectedItem.data.imageUrl && (
                      <div className="rounded-xl overflow-hidden border border-slate-100 bg-slate-50 max-h-[180px] flex items-center justify-center">
                        <img 
                          src={selectedItem.data.imageUrl} 
                          alt="Leaf Diagnosis Spot"
                          className="object-cover w-full h-full max-h-[180px]"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    {/* Content subsections */}
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-1">Observed Symptoms</span>
                        <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-5/50">{selectedItem.data.symptoms}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-indigo-500 uppercase font-bold block mb-1">Scientific Treatment</span>
                        <p className="text-slate-600 leading-relaxed bg-indigo-50/20 p-3 rounded-xl border border-indigo-100/30">{selectedItem.data.treatment}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-emerald-600 uppercase font-bold block mb-1">Long-term Prevention</span>
                        <p className="text-slate-600 leading-relaxed bg-emerald-50/25 p-3 rounded-xl border border-emerald-100/30">{selectedItem.data.prevention}</p>
                      </div>
                    </div>

                  </div>
                )}

                {/* Soil report rendering */}
                {selectedItem.type === 'soil' && (
                  <div className="space-y-4 text-xs">
                    
                    {/* metrics gauges */}
                    <div className="grid grid-cols-2 gap-3.5 animate-fade-in">
                      <div className="bg-gradient-to-br from-amber-50 to-amber-100/30 p-3 rounded-xl border border-amber-100 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] uppercase font-mono text-amber-800 font-semibold">Tension pH</span>
                          <span className="text-lg font-bold text-slate-800 block mt-0.5">{selectedItem.data.ph}</span>
                        </div>
                        <Activity className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100/30 p-3 rounded-xl border border-blue-100 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] uppercase font-mono text-blue-800 font-semibold">Moisture Coeff</span>
                          <span className="text-lg font-bold text-slate-800 block mt-0.5">{selectedItem.data.moisture}%</span>
                        </div>
                        <Droplet className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>

                    {/* Metadata line info */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 grid grid-cols-2 gap-3 font-mono text-[10px] text-slate-500">
                      <div>
                        <span className="block uppercase text-[8px] text-slate-400">Soil type</span>
                        <span className="font-bold text-slate-700">{selectedItem.data.soilType}</span>
                      </div>
                      <div>
                        <span className="block uppercase text-[8px] text-slate-400">Analysis Date</span>
                        <span className="font-bold text-slate-700">{formatTimestamp(selectedItem.data.createdAt)}</span>
                      </div>
                    </div>

                    {/* Report Text blocks */}
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] font-mono text-emerald-600 uppercase font-bold block mb-1">Suitable Resilient Crops</span>
                        <p className="text-slate-600 leading-relaxed bg-emerald-50/20 p-3 rounded-xl border border-emerald-100/30">{selectedItem.data.suitableCrops}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-amber-600 uppercase font-bold block mb-1">Nutrient & Fertilisers Actions</span>
                        <p className="text-slate-600 leading-relaxed bg-amber-50/30 p-3 rounded-xl border border-amber-100/30">{selectedItem.data.fertilizerRecommendations}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-mono text-emerald-800 uppercase font-bold block mb-1">Soil Reformation guidelines</span>
                        <p className="text-slate-600 leading-relaxed bg-emerald-50/5 p-3 rounded-xl border border-slate-100">{selectedItem.data.soilImprovementPlan}</p>
                      </div>
                    </div>

                  </div>
                )}

                {/* Weather report advisory rendering */}
                {selectedItem.type === 'weather' && (
                  <div className="space-y-4 text-xs">
                    
                    {/* Climatology gauges */}
                    {selectedItem.data.weatherData && (
                      <div className="grid grid-cols-4 gap-2 font-mono text-center">
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span className="block uppercase text-[7px] text-slate-400">Temperature</span>
                          <span className="text-xs font-bold text-slate-700 mt-0.5 block">{selectedItem.data.weatherData.temperature}°C</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span className="block uppercase text-[7px] text-slate-400">Humidity</span>
                          <span className="text-xs font-bold text-slate-700 mt-0.5 block">{selectedItem.data.weatherData.humidity}%</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span className="block uppercase text-[7px] text-slate-400">Precipitation</span>
                          <span className="text-xs font-bold text-slate-700 mt-0.5 block">{selectedItem.data.weatherData.rainfall}%</span>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <span className="block uppercase text-[7px] text-slate-400">Wind Velocity</span>
                          <span className="text-xs font-bold text-slate-700 mt-0.5 block">{selectedItem.data.weatherData.windSpeed} km/h</span>
                        </div>
                      </div>
                    )}

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between font-mono text-[10px] text-slate-500">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span>Location: <span className="font-bold text-slate-700">{selectedItem.data.location}</span></span>
                      </div>
                      <span>{formatTimestamp(selectedItem.data.createdAt)}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono text-sky-600 uppercase font-bold block mb-1">Agronomic Meteorological Advisory</span>
                      <p className="text-slate-600 leading-relaxed bg-sky-50/15 p-3.5 rounded-xl border border-sky-100/40 whitespace-pre-line">{selectedItem.data.advisory}</p>
                    </div>

                  </div>
                )}

              </div>

              {/* Modal footer action */}
              <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50 gap-2">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 hover:bg-slate-200/50 rounded-xl text-slate-500 hover:text-slate-750 transition-colors text-xs font-medium cursor-pointer"
                >
                  Close Reader
                </button>
                <button
                  onClick={() => {
                    if (selectedItem.type === 'disease') {
                      onNavigateTab(DashboardTab.DISEASE_DETECTION);
                    } else if (selectedItem.type === 'soil') {
                      onNavigateTab(DashboardTab.SOIL_ANALYSIS);
                    } else if (selectedItem.type === 'weather') {
                      onNavigateTab(DashboardTab.WEATHER_INTEL);
                    }
                    setSelectedItem(null);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <span>Go to Section</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
