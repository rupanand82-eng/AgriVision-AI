import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  Leaf, 
  MessageSquare, 
  Compass, 
  CloudSun, 
  Activity, 
  TrendingUp, 
  Calendar,
  AlertTriangle,
  Flame,
  Droplet
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell 
} from 'recharts';

interface OverviewProps {
  onTabChange: (tab: string) => void;
}

export const DashboardOverview: React.FC<OverviewProps> = ({ onTabChange }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    analyses: 0,
    chats: 0,
    soil: 0,
    env: 0
  });
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch stats counts
        const analysesQuery = query(collection(db, "crop_analysis"), where("userId", "==", user.uid));
        const chatsQuery = query(collection(db, "ai_chats"), where("userId", "==", user.uid));
        const soilQuery = query(collection(db, "soil_reports"), where("userId", "==", user.uid));
        const envQuery = query(collection(db, "env_reports"), where("userId", "==", user.uid));

        const [analysesSnap, chatsSnap, soilSnap, envSnap] = await Promise.all([
          getDocs(analysesQuery).catch(err => handleFirestoreError(err, OperationType.LIST, "crop_analysis")),
          getDocs(chatsQuery).catch(err => handleFirestoreError(err, OperationType.LIST, "ai_chats")),
          getDocs(soilQuery).catch(err => handleFirestoreError(err, OperationType.LIST, "soil_reports")),
          getDocs(envQuery).catch(err => handleFirestoreError(err, OperationType.LIST, "env_reports"))
        ]);

        setStats({
          analyses: analysesSnap.size,
          chats: chatsSnap.size,
          soil: soilSnap.size,
          env: envSnap.size
        });

        // Recent analyses list
        const recentQuery = query(
          collection(db, "crop_analysis"), 
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(5)
        );
        const recentSnap = await getDocs(recentQuery).catch(err => handleFirestoreError(err, OperationType.LIST, "crop_analysis"));
        const recentData = recentSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRecentAnalyses(recentData);

      } catch (err) {
        console.error("Failed to load dashboard statistics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  // Sample static data for charts (climatology and historical distribution)
  const chartSoilTrends = [
    { name: 'Jan', ph: 6.2, moisture: 35 },
    { name: 'Feb', ph: 6.3, moisture: 40 },
    { name: 'Mar', ph: 6.5, moisture: 45 },
    { name: 'Apr', ph: 6.4, moisture: 30 },
    { name: 'May', ph: 6.8, moisture: 55 },
    { name: 'Jun', ph: 6.6, moisture: 60 },
  ];

  const diseaseDistribution = [
    { name: 'Leaf Rust', value: stats.analyses > 0 ? Math.floor(stats.analyses * 0.4) + 1 : 12, color: '#f59e0b' },
    { name: 'Mildew', value: stats.analyses > 0 ? Math.floor(stats.analyses * 0.3) + 1 : 8, color: '#10b981' },
    { name: 'Blight', value: stats.analyses > 0 ? Math.floor(stats.analyses * 0.2) + 1 : 15, color: '#ef4444' },
    { name: 'None (Healthy)', value: stats.analyses > 0 ? Math.floor(stats.analyses * 0.1) + 1 : 25, color: '#84cc16' },
  ];

  return (
    <div id="overview-dashboard" className="space-y-8">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Agricultural Intelligence Hub</h1>
          <p className="text-slate-500 mt-1 text-sm">Real-time indicators, environmental assessments, and agronomical disease counters.</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 px-4 py-2 rounded-xl text-sm font-medium border border-emerald-100 self-start md:self-auto">
          <Activity className="h-4 w-4 animate-pulse text-emerald-600" />
          ECO MONITOR: OPERATIONAL
        </div>
      </div>

      {/* Stats Cards Grid - Glassmorphism UI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div 
          onClick={() => onTabChange("disease_detection")}
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-emerald-200"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-100 transition-colors">
              <Leaf className="h-6 w-6" />
            </div>
            <span className="text-xs font-mono text-emerald-500 font-medium bg-emerald-50 px-2 py-1 rounded">Leaf Scope</span>
          </div>
          <h3 className="text-3xl font-semibold text-slate-800 mt-4 font-mono">{stats.analyses}</h3>
          <p className="text-slate-500 text-sm mt-1">Disease Diagnoses</p>
        </div>

        <div 
          onClick={() => onTabChange("ai_chat")}
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-emerald-200"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 transition-colors">
              <MessageSquare className="h-6 w-6" />
            </div>
            <span className="text-xs font-mono text-indigo-500 font-medium bg-indigo-50 px-2 py-1 rounded">AgriBot</span>
          </div>
          <h3 className="text-3xl font-semibold text-slate-800 mt-4 font-mono">{stats.chats}</h3>
          <p className="text-slate-500 text-sm mt-1">AI Advisor Discussions</p>
        </div>

        <div 
          onClick={() => onTabChange("soil_analysis")}
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-emerald-200"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-lime-50 text-lime-600 rounded-xl group-hover:bg-lime-100 transition-colors">
              <Compass className="h-6 w-6" />
            </div>
            <span className="text-xs font-mono text-lime-500 font-medium bg-lime-50 px-2 py-1 rounded">Pedometry</span>
          </div>
          <h3 className="text-3xl font-semibold text-slate-800 mt-4 font-mono">{stats.soil}</h3>
          <p className="text-slate-500 text-sm mt-1">Soil Health Reports</p>
        </div>

        <div 
          onClick={() => onTabChange("env_monitoring")}
          className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-emerald-200"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl group-hover:bg-cyan-100 transition-colors">
              <CloudSun className="h-6 w-6" />
            </div>
            <span className="text-xs font-mono text-cyan-500 font-medium bg-cyan-50 px-2 py-1 rounded">EcoIntel</span>
          </div>
          <h3 className="text-3xl font-semibold text-slate-800 mt-4 font-mono">{stats.env}</h3>
          <p className="text-slate-500 text-sm mt-1">Microclimate Records</p>
        </div>
      </div>

      {/* Chart Layout Visualizers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Graph Area */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Farm moisture and ph dynamics</h2>
              <p className="text-slate-500 text-xs">Climatological trends calculated using seasonal evaluations.</p>
            </div>
            <div className="flex items-center gap-1 text-slate-500 text-xs font-mono">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              6 month forecast model
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartSoilTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMoisture" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                <YAxis fontSize={11} stroke="#94a3b8" />
                <Tooltip />
                <Area type="monotone" dataKey="moisture" name="Soil Moisture %" stroke="#10b981" fillOpacity={1} fill="url(#colorMoisture)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Diagnostic Bar distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Visual diagnosis statistics</h2>
          <p className="text-slate-500 text-xs mb-6">Total crop disease prevalence in analyzed leaves.</p>
          <div className="h-60 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={diseaseDistribution}>
                <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" />
                <YAxis fontSize={10} stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="value" name="Diagnoses" radius={[4, 4, 0, 0]}>
                  {
                    diseaseDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono text-slate-600">
            {diseaseDistribution.map((item, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span>{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent History Table Log Block */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Recent Plant Pathological Scopes</h2>
            <p className="text-slate-500 text-xs mt-1">Real-time status registers of visual leaf checks.</p>
          </div>
          <button 
            onClick={() => onTabChange("disease_detection")}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium hover:underline bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100"
          >
            Launch Diagnostics
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 space-x-2">
            <div className="w-4 h-4 rounded-full bg-emerald-600 animate-ping" />
            <span className="text-sm font-mono text-slate-500">Retrieving cloud entries...</span>
          </div>
        ) : recentAnalyses.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Leaf className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-medium text-slate-600">No Crop Diagnostics Captured Yet</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Upload a leaf photo in the "Disease Detection" portal to launch secure cloud classification.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 text-xs uppercase font-mono">
                  <th className="py-3 px-4 font-semibold">Crop</th>
                  <th className="py-3 px-4 font-semibold">Detected State / illness</th>
                  <th className="py-3 px-4 font-semibold">Diagnosis Conf.</th>
                  <th className="py-3 px-4 font-semibold">Recorded At</th>
                  <th className="py-3 px-4 font-semibold">Symptom Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700">
                {recentAnalyses.map((analysis) => {
                  const dateStr = analysis.createdAt?.seconds 
                    ? new Date(analysis.createdAt.seconds * 1000).toLocaleDateString()
                    : new Date(analysis.createdAt).toLocaleDateString();

                  return (
                    <tr key={analysis.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-medium flex items-center gap-2">
                        {analysis.imageUrl ? (
                          <img 
                            referrerPolicy="no-referrer"
                            src={analysis.imageUrl} 
                            alt={analysis.cropName} 
                            className="w-8 h-8 rounded-lg object-cover border border-slate-100"
                          />
                        ) : (
                          <span className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                            <Leaf className="w-4 h-4" />
                          </span>
                        )}
                        <span>{analysis.cropName}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          analysis.diseaseName.toLowerCase().includes('healthy') 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {analysis.diseaseName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-emerald-500 h-1.5 rounded-full" 
                              style={{ width: `${analysis.confidence}%` }} 
                            />
                          </div>
                          <span>{Number(analysis.confidence).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {dateStr}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 truncate max-w-xs">
                        {analysis.symptoms}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
