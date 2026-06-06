/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardTab } from './types';
import { DashboardOverview } from './components/DashboardOverview';
import { DiseaseDetection } from './components/DiseaseDetection';
import { AIChatBot } from './components/AIChatBot';
import { SoilAnalysis } from './components/SoilAnalysis';
import { WeatherIntel } from './components/WeatherIntel';
import { EnvMonitoring } from './components/EnvMonitoring';
import { GlobalSearch } from './components/GlobalSearch';
import { 
  Bot, 
  Compass, 
  CloudSun, 
  Globe, 
  Layers, 
  Leaf, 
  LogOut, 
  Menu, 
  User as UserIcon, 
  X, 
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Zap,
  TrendingUp,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function DashboardContent() {
  const { user, logout, dbUser } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>(DashboardTab.OVERVIEW);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileCard, setShowProfileCard] = useState(false);

  // Navigations Links
  const sideLinks = [
    { name: "Overview Hub", tab: DashboardTab.OVERVIEW, icon: TrendingUp },
    { name: "Visual Classifier", tab: DashboardTab.DISEASE_DETECTION, icon: Leaf },
    { name: "AgriBot AI", tab: DashboardTab.AI_CHAT, icon: Bot },
    { name: "Soil & Watering", tab: DashboardTab.SOIL_ANALYSIS, icon: Layers },
    { name: "Meteorology Advises", tab: DashboardTab.WEATHER_INTEL, icon: CloudSun },
    { name: "Ecosystem Health", tab: DashboardTab.ENV_MONITORING, icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="applet-dashboard">
      
      {/* Upper Navigation Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 py-3.5 px-6 sticky top-0 z-40 flex flex-col md:flex-row gap-3.5 md:gap-0 items-center justify-between">
        <div className="flex items-center justify-between w-full md:w-auto gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-mono font-bold shadow-sm border border-emerald-700">
              A
            </div>
            <div>
              <span className="font-semibold text-slate-800 text-sm tracking-tight block">AgriVision AI</span>
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Environment Intelligence Platform</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:hidden">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 text-slate-600 hover:bg-slate-50 rounded-xl"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Global Search Centered Section */}
        <div className="w-full md:flex-1 md:max-w-md md:mx-6">
          <GlobalSearch onNavigateTab={(tab) => {
            setActiveTab(tab);
          }} />
        </div>

        {/* Desktop profile actions */}
        <div className="hidden md:flex items-center gap-3">
          <button 
            onClick={() => setShowProfileCard(!showProfileCard)}
            className="flex items-center gap-2 px-3.5 py-1.5 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl cursor-pointer transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center text-xs font-semibold">
              {dbUser?.name?.slice(0, 2).toUpperCase() || "FR"}
            </div>
            <div className="hidden md:block text-left text-xs">
              <span className="font-semibold text-slate-700 block max-w-[120px] truncate">{dbUser?.name || "Farmer"}</span>
              <span className="text-slate-400 font-mono scale-90 block">Active Farmer</span>
            </div>
          </button>

          <button 
            onClick={logout}
            className="p-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 transition-colors cursor-pointer"
            title="Sign out"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      {/* Main layout container with grid */}
      <div className="flex-1 flex flex-col md:flex-row relative">
        
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 bg-white border-r border-slate-100 py-6 px-4 shrink-0 space-y-6">
          <div className="space-y-1.5">
            <span className="px-3 text-[10px] font-mono uppercase font-bold text-slate-400 tracking-wider">Navigation Hub</span>
            <nav className="space-y-1 mt-2">
              {sideLinks.map((link) => {
                const IconComp = link.icon;
                const isSelected = activeTab === link.tab;
                return (
                  <button
                    key={link.tab}
                    onClick={() => setActiveTab(link.tab)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm font-bold'
                        : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/10'
                    } cursor-pointer`}
                  >
                    <IconComp className="h-4.5 w-4.5" />
                    <span>{link.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="pt-6 border-t border-slate-50 text-xs text-slate-400 space-y-2 font-mono px-2">
            <div>
              <span className="block text-slate-300">GEOZONE:</span>
              <span className="text-slate-600 font-semibold block uppercase">Salinas Valley</span>
            </div>
            <div>
              <span className="block text-slate-300">FARM ID:</span>
              <span className="text-slate-600 block font-semibold truncate bg-slate-50 px-1 py-0.5 rounded border border-slate-100">{user?.uid.slice(0, 8)}...</span>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.3 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 bg-black z-40 md:hidden"
              />
              <motion.aside 
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="fixed inset-y-0 left-0 w-64 bg-white z-50 p-6 flex flex-col justify-between shadow-xl md:hidden"
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 text-sm">Navigation Drawer</span>
                    <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <nav className="space-y-2.5">
                    {sideLinks.map((link) => {
                      const IconComp = link.icon;
                      const isSelected = activeTab === link.tab;
                      return (
                        <button
                          key={link.tab}
                          onClick={() => { setActiveTab(link.tab); setMobileMenuOpen(false); }}
                          className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-colors ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-slate-600 hover:bg-slate-50'
                          } cursor-pointer`}
                        >
                          <IconComp className="h-4.5 w-4.5" />
                          <span>{link.name}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>
                <div className="pt-6 border-t border-slate-100 text-[11px] font-mono text-slate-400">
                  <span>Farm Registry ID: </span>
                  <span className="font-bold text-slate-600">{user?.uid.slice(0, 10)}</span>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Expandable Profile Customizer Card */}
        <AnimatePresence>
          {showProfileCard && (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="absolute right-6 top-4 bg-white rounded-2xl border border-slate-100 shadow-xl p-5 z-50 w-72 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                <span className="font-bold text-slate-800 text-xs uppercase font-mono tracking-wider">Farmer Profile Registry</span>
                <button onClick={() => setShowProfileCard(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="block text-slate-400 font-mono uppercase text-[9px]">Registered Name</span>
                  <span className="font-semibold text-slate-700 block mt-0.5">{dbUser?.name}</span>
                </div>
                <div>
                  <span className="block text-slate-400 font-mono uppercase text-[9px]">Verified Credentials</span>
                  <span className="font-semibold text-slate-700 block mt-0.5">{dbUser?.email}</span>
                </div>
                <div>
                  <span className="block text-slate-400 font-mono uppercase text-[9px]">Cloud Authentication Provider</span>
                  <span className="font-semibold text-slate-700 block mt-0.5">Firebase JWT auth</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Tab Page Canvas - Framer Motion Transition */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {activeTab === DashboardTab.OVERVIEW && <DashboardOverview onTabChange={(tab) => setActiveTab(tab as DashboardTab)} />}
              {activeTab === DashboardTab.DISEASE_DETECTION && <DiseaseDetection />}
              {activeTab === DashboardTab.AI_CHAT && <AIChatBot />}
              {activeTab === DashboardTab.SOIL_ANALYSIS && <SoilAnalysis />}
              {activeTab === DashboardTab.WEATHER_INTEL && <WeatherIntel />}
              {activeTab === DashboardTab.ENV_MONITORING && <EnvMonitoring />}
            </motion.div>
          </AnimatePresence>
        </main>

      </div>
    </div>
  );
}

// User Sign-up/Login Component
function AuthPortal() {
  const { loginWithGoogle, loginWithEmail, signUpWithEmail, errorMsg, setErrorMsg } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Please fill out credentials fully.");
      return;
    }

    if (isRegister) {
      if (!name.trim()) {
        setErrorMsg("Please specify your farmer/registrant name.");
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Passwords do not match.");
        return;
      }
    }

    setAuthLoading(true);
    try {
      if (isRegister) {
        await signUpWithEmail(name.trim(), email.trim(), password);
      } else {
        await loginWithEmail(email.trim(), password);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans" id="auth-portal-fullscreen">
      
      {/* Editorial branding visual half */}
      <div className="bg-emerald-800 text-white md:w-1/2 p-12 flex flex-col justify-between relative overflow-hidden shrink-0">
        
        {/* Abstract vector backgrounds decoration */}
        <div className="absolute inset-0 opacity-10 font-mono text-[9px] pointer-events-none select-none">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="whitespace-nowrap mt-4 rotate-3 transform">
              AGRO-DIAG-METRIC-EVALS-HYDRIC-MICROCLIM [NODE-ACTIVE] [{new Date().toISOString()}]
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2.5 relative z-10">
          <div className="w-10 h-10 bg-white text-emerald-900 rounded-xl flex items-center justify-center font-bold text-lg font-mono">
            A
          </div>
          <div>
            <span className="font-bold text-sm tracking-wide block">AgriVision AI</span>
            <span className="text-[9px] uppercase tracking-wider text-emerald-250 font-semibold font-mono">Ecosystem Modeling System</span>
          </div>
        </div>

        <div className="max-w-md relative z-10 space-y-4 my-auto">
          <h1 className="text-3xl font-bold tracking-tight">Eco-Intelligence and Pathology Diagnostics</h1>
          <p className="text-emerald-100 text-xs leading-relaxed">
            Monitor soil nutrients coefficients, design volumetric watering timetables, and diagnose crop illnesses using full-scale image visual classification.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-4 text-xs font-mono">
            <div className="flex items-center gap-2 bg-emerald-700/30 p-2 rounded-lg">
              <ShieldCheck className="h-4 w-4 text-lime-400 shrink-0" />
              <span>Diagnostic Sync</span>
            </div>
            <div className="flex items-center gap-2 bg-emerald-700/30 p-2 rounded-lg">
              <Zap className="h-4 w-4 text-lime-400 shrink-0" />
              <span>Real-time Advisories</span>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-emerald-200/60 font-mono relative z-10">
          <span>Google AI Studio Build & Firebase Server Persistence</span>
        </div>
      </div>

      {/* Auth Panel Input Form */}
      <div className="md:w-1/2 flex items-center justify-center p-8 md:p-12 bg-slate-50">
        <div className="max-w-sm w-full bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
              {isRegister ? "Farmer Registration" : "Portal Access"}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isRegister ? "Join AgriVision to synchronize soil and crop datasets." : "Enter credentials or use Google auth."}
            </p>
          </div>

          <form onSubmit={handleCredentialSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs uppercase font-bold text-slate-500 font-mono mb-1">Full Name</label>
                <input 
                  type="text" 
                  placeholder="Farmer Name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-sm text-slate-700 px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs uppercase font-bold text-slate-500 font-mono mb-1">Email Coordinates</label>
              <input 
                type="email" 
                placeholder="address@domain.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm text-slate-700 px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-bold text-slate-500 font-mono mb-1">Secure Passphrase</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm text-slate-700 px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 outline-none"
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-xs uppercase font-bold text-slate-500 font-mono mb-1">Verify Passphrase</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full text-sm text-slate-700 px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 outline-none"
                />
              </div>
            )}

            {errorMsg && (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-100 p-4 rounded-xl space-y-2.5">
                {errorMsg.includes('auth/unauthorized-domain') ? (
                  <div className="space-y-2 text-left">
                    <p className="font-bold text-rose-800">🔐 Firebase Domain Authorization Required</p>
                    <p className="text-[11px] leading-relaxed text-rose-600">
                      Your Firebase project (<code className="font-mono bg-rose-100 px-1 py-0.5 rounded text-rose-800">agri-e98b2</code>) has blocked this domain from running Authentication. You need to white-list this URL.
                    </p>
                    <div className="font-mono text-[10px] bg-white border border-rose-100 p-2.5 rounded-xl space-y-1.5 mt-1.5 shadow-sm">
                      <div className="flex justify-between items-center text-slate-400">
                        <span>DOMAIN TO AUTHORIZE:</span>
                        <button 
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.host);
                            setCopiedDomain(true);
                            setTimeout(() => setCopiedDomain(false), 2000);
                          }}
                          className="text-emerald-600 hover:text-emerald-700 font-sans font-semibold cursor-pointer"
                        >
                          {copiedDomain ? "✓ Copied" : "Copy"}
                        </button>
                      </div>
                      <div className="font-bold text-slate-700 tracking-tight text-xs font-mono select-all bg-slate-50 p-1.5 rounded border border-slate-100 break-all">{window.location.host}</div>
                    </div>
                    <div className="text-[11px] space-y-1.5 text-slate-600 leading-relaxed pt-1.5 border-t border-rose-100/55 mt-2">
                      <p className="font-bold text-slate-700 font-sans">How to authorize in 30 seconds:</p>
                      <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 font-sans">
                        <li>Go to the <a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline font-bold inline-flex items-center gap-0.5">Firebase Console</a>.</li>
                        <li>Open your project <strong className="text-slate-800">agri-e98b2</strong>.</li>
                        <li>Click <strong>Build &gt; Authentication</strong> &gt; <strong>Settings</strong> &gt; <strong>Authorized domains</strong>.</li>
                        <li>Click <strong>Add domain</strong> and paste <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">{window.location.host}</code>.</li>
                      </ol>
                    </div>
                  </div>
                ) : (
                  <span>{errorMsg}</span>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer text-center"
            >
              {authLoading ? "Synchronizing Auth..." : isRegister ? "Submit Registration" : "Sign In"}
            </button>
          </form>

          {/* Social Google Login */}
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink mx-4 text-slate-400 font-mono text-[10px] uppercase">Or Authenticate via</span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          <button
            onClick={loginWithGoogle}
            disabled={authLoading}
            className="w-full py-2.5 border border-slate-200 text-slate-600 hover:border-emerald-300 rounded-xl hover:bg-emerald-50/10 transition-colors text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer bg-white"
          >
            {/* Google Vector Icon */}
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.454-2.678 4.285-6.887 4.285-4.524 0-8.213-3.692-8.213-8.214s3.689-8.214 8.213-8.214c2.083 0 3.972.78 5.421 2.057l3.054-3.054C18.232 1.137 15.394 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.38 0 11.232-4.484 11.232-11.24 0-.766-.08-1.503-.223-2.215h-11.01z"/>
            </svg>
            Connect with Google
          </button>

          <div className="text-center">
            <button
              onClick={() => { setIsRegister(!isRegister); setErrorMsg(null); }}
              className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline font-semibold cursor-pointer"
            >
              {isRegister ? "Already registered? Sign In" : "Need a farmer registry? Register here"}
            </button>
          </div>

          {/* Verification notice for Firebase auth console configuration */}
          <div className="text-[10px] text-slate-400 font-mono text-center leading-relaxed">
            Note: If logging in with email, ensure the "Email/Password" auth provider is active in your Firebase dashboard console.
          </div>
        </div>
      </div>

    </div>
  );
}

function MainApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-mono text-xs text-slate-400">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span>Synchronizing AgriVision AI Secure Environment...</span>
      </div>
    );
  }

  return user ? <DashboardContent /> : <AuthPortal />;
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
