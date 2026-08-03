import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Palette, 
  Sun, 
  Moon, 
  Monitor, 
  X, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Layers, 
  Type, 
  Maximize2,
  Sliders,
  CheckCircle,
  ShieldCheck,
  Search
} from 'lucide-react';

export type ThemeColor = 'indigo' | 'emerald' | 'teal' | 'violet' | 'rose' | 'amber' | 'ocean' | 'gold' | 'midnight';
export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeDensity = 'comfortable' | 'compact' | 'spacious';
export type ThemeRadius = 'modern' | 'sharp' | 'pill';
export type ThemeFont = 'sans' | 'mono' | 'serif';

export interface SystemThemeSettings {
  color: ThemeColor;
  mode: ThemeMode;
  density: ThemeDensity;
  radius: ThemeRadius;
  font: ThemeFont;
}

export const DEFAULT_THEME_SETTINGS: SystemThemeSettings = {
  color: 'indigo',
  mode: 'light',
  density: 'comfortable',
  radius: 'modern',
  font: 'sans'
};

interface ThemeCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SystemThemeSettings;
  onUpdateSettings: (newSettings: SystemThemeSettings) => void;
  onResetSettings: () => void;
}

const COLOR_OPTIONS: { id: ThemeColor; name: string; bg: string; border: string; ring: string }[] = [
  { id: 'indigo', name: 'Royal Indigo', bg: 'bg-indigo-600', border: 'border-indigo-600', ring: 'ring-indigo-500' },
  { id: 'emerald', name: 'Fresh Emerald', bg: 'bg-emerald-600', border: 'border-emerald-600', ring: 'ring-emerald-500' },
  { id: 'teal', name: 'Ocean Teal', bg: 'bg-teal-600', border: 'border-teal-600', ring: 'ring-teal-500' },
  { id: 'violet', name: 'Deep Violet', bg: 'bg-violet-600', border: 'border-violet-600', ring: 'ring-violet-500' },
  { id: 'rose', name: 'Crimson Rose', bg: 'bg-rose-600', border: 'border-rose-600', ring: 'ring-rose-500' },
  { id: 'amber', name: 'Warm Amber', bg: 'bg-amber-600', border: 'border-amber-600', ring: 'ring-amber-500' },
  { id: 'ocean', name: 'Sky Ocean', bg: 'bg-sky-600', border: 'border-sky-600', ring: 'ring-sky-500' },
  { id: 'gold', name: 'Imperial Gold', bg: 'bg-amber-700', border: 'border-amber-700', ring: 'ring-amber-600' },
  { id: 'midnight', name: 'Cyber Neon', bg: 'bg-indigo-500', border: 'border-indigo-500', ring: 'ring-indigo-400' },
];

const PRESETS: { id: string; name: string; desc: string; icon: string; settings: SystemThemeSettings }[] = [
  {
    id: 'classic',
    name: 'Classic Enterprise',
    desc: 'Professional Indigo theme with crisp light surfaces.',
    icon: '🏢',
    settings: { color: 'indigo', mode: 'light', density: 'comfortable', radius: 'modern', font: 'sans' }
  },
  {
    id: 'cyber',
    name: 'Cyber Midnight',
    desc: 'High-contrast dark mode for night grading and reduced strain.',
    icon: '🌙',
    settings: { color: 'midnight', mode: 'dark', density: 'compact', radius: 'sharp', font: 'mono' }
  },
  {
    id: 'emerald',
    name: 'Eco Emerald',
    desc: 'Clean organic green theme with modern rounded cards.',
    icon: '🌿',
    settings: { color: 'emerald', mode: 'light', density: 'comfortable', radius: 'modern', font: 'sans' }
  },
  {
    id: 'amethyst',
    name: 'Royal Amethyst',
    desc: 'Deep luxury violet dark mode with elegant serif typography.',
    icon: '🍇',
    settings: { color: 'violet', mode: 'dark', density: 'comfortable', radius: 'pill', font: 'serif' }
  },
  {
    id: 'sunset',
    name: 'Warm Sunset',
    desc: 'Spacious amber theme with soft corners and warm highlights.',
    icon: '🌅',
    settings: { color: 'amber', mode: 'light', density: 'spacious', radius: 'pill', font: 'sans' }
  },
  {
    id: 'ocean',
    name: 'Ocean Breeze',
    desc: 'Refreshing teal theme with balanced spacing and modern curves.',
    icon: '🌊',
    settings: { color: 'teal', mode: 'light', density: 'comfortable', radius: 'modern', font: 'sans' }
  },
  {
    id: 'rose',
    name: 'Crimson Luxe',
    desc: 'Vibrant crimson theme with sharp technical typography.',
    icon: '🌹',
    settings: { color: 'rose', mode: 'light', density: 'compact', radius: 'sharp', font: 'sans' }
  },
  {
    id: 'gold',
    name: 'Imperial Gold',
    desc: 'Prestige gold theme with spacious luxury layout.',
    icon: '👑',
    settings: { color: 'gold', mode: 'light', density: 'spacious', radius: 'modern', font: 'serif' }
  }
];

export function ThemeCustomizerModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetSettings
}: ThemeCustomizerModalProps) {
  if (!isOpen) return null;

  const update = (partial: Partial<SystemThemeSettings>) => {
    onUpdateSettings({ ...settings, ...partial });
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto custom-scrollbar">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden my-auto flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 md:p-6 bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/30">
              <Palette size={22} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                System Appearance & Themes
                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  v2.5 Live Engine
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Personalize layout colors, dark/light modes, density, and typography across the portal.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onResetSettings}
              className="px-3 py-2 text-xs font-extrabold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
              title="Reset to default theme"
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">Reset Defaults</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
          
          {/* Quick Preset Themes Carousel */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" /> Quick Theme Presets
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PRESETS.map((preset) => {
                const isActive = 
                  settings.color === preset.settings.color &&
                  settings.mode === preset.settings.mode &&
                  settings.font === preset.settings.font &&
                  settings.radius === preset.settings.radius &&
                  settings.density === preset.settings.density;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onUpdateSettings(preset.settings)}
                    className={`p-3 rounded-2xl border text-left transition-all relative cursor-pointer flex flex-col justify-between h-24 ${
                      isActive
                        ? 'bg-indigo-50/90 dark:bg-indigo-950/50 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                        : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    <div>
                      <div className="text-lg leading-none mb-1">{preset.icon}</div>
                      <p className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight line-clamp-1">{preset.name}</p>
                    </div>
                    {isActive && (
                      <span className="self-end text-[9px] bg-indigo-600 text-white font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <hr className="border-slate-150 dark:border-slate-800" />

          {/* Color Palette Selector */}
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-3">
              <Palette size={14} className="text-indigo-500" /> Accent Color Palette
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
              {COLOR_OPTIONS.map((c) => {
                const isSelected = settings.color === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => update({ color: c.id })}
                    className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full ${c.bg} shadow-sm flex items-center justify-center`}>
                      {isSelected && <Check size={13} className="text-white" />}
                    </div>
                    <span className="text-[10px] font-bold text-center truncate w-full">{c.name.split(' ')[1] || c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mode & Density Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Appearance Mode */}
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-3">
                <Sun size={14} className="text-amber-500" /> Appearance Mode
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'light', label: 'Light', icon: <Sun size={16} /> },
                  { id: 'dark', label: 'Dark', icon: <Moon size={16} /> },
                  { id: 'system', label: 'Auto', icon: <Monitor size={16} /> }
                ].map((m) => {
                  const isSelected = settings.mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => update({ mode: m.id as ThemeMode })}
                      className={`py-3 px-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-extrabold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {m.icon}
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Typography Font Preset */}
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-3">
                <Type size={14} className="text-indigo-500" /> Typography Family
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'sans', label: 'Modern Sans', style: 'font-sans' },
                  { id: 'mono', label: 'Tech Mono', style: 'font-mono' },
                  { id: 'serif', label: 'Classic Serif', style: 'font-serif' }
                ].map((f) => {
                  const isSelected = settings.font === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => update({ font: f.id as ThemeFont })}
                      className={`py-3 px-2 rounded-2xl border text-center text-xs font-bold transition-all cursor-pointer ${f.style} ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Radius & Density Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* UI Density */}
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-3">
                <Sliders size={14} className="text-indigo-500" /> Display Density
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'compact', label: 'Compact' },
                  { id: 'comfortable', label: 'Balanced' },
                  { id: 'spacious', label: 'Spacious' }
                ].map((d) => {
                  const isSelected = settings.density === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => update({ density: d.id as ThemeDensity })}
                      className={`py-2.5 px-2 rounded-2xl border text-center text-xs font-extrabold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Corner Radius */}
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-3">
                <Layers size={14} className="text-indigo-500" /> Corner Radius
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'sharp', label: 'Sharp 4px', class: 'rounded-md' },
                  { id: 'modern', label: 'Modern 16px', class: 'rounded-2xl' },
                  { id: 'pill', label: 'Curved 28px', class: 'rounded-full' }
                ].map((r) => {
                  const isSelected = settings.radius === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => update({ radius: r.id as ThemeRadius })}
                      className={`py-2.5 px-2 border text-center text-xs font-extrabold transition-all cursor-pointer ${r.class} ${
                        isSelected
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Real-time Live Interactive Preview Box */}
          <div className="pt-2">
            <span className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-2">
              Live Theme Preview
            </span>
            <div className="p-4 rounded-3xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl theme-primary-bg text-white flex items-center justify-center font-black text-xs shadow-md">
                    CL
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white">Sample Class Record</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Grade 10 - Diamond &bull; SY 2025-2026</p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full theme-primary-light-bg theme-primary-text">
                  Enrolled Active
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    disabled
                    placeholder="Search learners or LRN..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
                  />
                </div>
                <button
                  type="button"
                  className="px-4 py-1.5 text-xs font-black text-white theme-primary-bg rounded-xl shadow-sm"
                >
                  Action
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 md:p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Settings automatically persist to your browser session.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white theme-primary-bg rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
