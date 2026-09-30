/**
 * LIFEGRID AI — Prototype 0.2 HeaderBar
 * Command bar with state_hash concurrency guard status, step controls,
 * scenario session switcher, and active view tabs.
 */

import React from 'react';
import {
  Play,
  Pause,
  StepForward,
  RotateCcw,
  ShieldCheck,
  Hash,
  Activity,
  Layers,
  Sparkles,
  GitCompare,
  Sliders,
  Radio,
} from 'lucide-react';

interface HeaderBarProps {
  scenarioTitle: string;
  step: number;
  maxSteps: number;
  stateHash: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onReset: () => void;
  onSelectScenario: (presetId: string) => void;
  activeTab: 'map' | 'interventions' | 'comparison' | 'hazards' | 'copilot';
  setActiveTab: (tab: 'map' | 'interventions' | 'comparison' | 'hazards' | 'copilot') => void;
  concurrencyConflict: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  scenarioTitle,
  step,
  maxSteps,
  stateHash,
  isPlaying,
  onTogglePlay,
  onStepForward,
  onReset,
  onSelectScenario,
  activeTab,
  setActiveTab,
  concurrencyConflict,
}) => {
  return (
    <header className="bg-slate-950/95 border-b border-slate-800/90 px-4 py-2.5 backdrop-blur-md sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 shadow-xl">
      {/* Brand & Concurrency Guard Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-black text-slate-950 text-sm shadow-lg shadow-cyan-500/20">
            LG
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm tracking-wide text-white font-mono">
                LIFEGRID AI
              </h1>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 font-mono px-1.5 py-0.2 rounded border border-cyan-500/40">
                PROTOTYPE 0.2
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
              <span>Cascade Simulator</span>
              <span>•</span>
              {/* state_hash optimistic concurrency guard indicator */}
              <span
                className={`flex items-center gap-1 px-1.5 py-0.2 rounded ${
                  concurrencyConflict
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                    : 'bg-slate-900 text-slate-300 border border-slate-800'
                }`}
                title="Optimistic concurrency state_hash prevents desynchronization across multi-process runs"
              >
                <Hash className="w-2.5 h-2.5 text-cyan-400" />
                state_hash: {stateHash.slice(0, 10)}…
              </span>
            </div>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="hidden lg:block pl-3 border-l border-slate-800">
          <select
            onChange={(e) => onSelectScenario(e.target.value)}
            className="bg-slate-900 border border-slate-750 text-slate-200 text-xs font-mono rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-400"
          >
            <option value="scenario_hurricane_katrina_01">
              Coastal Metropolis — Hurricane Surge (Cat 4)
            </option>
            <option value="scenario_seismic_cascadia_02">
              Cascadia Metro — Subduction Seismic (M8.2)
            </option>
          </select>
        </div>
      </div>

      {/* Center View Tabs */}
      <div className="flex items-center bg-slate-900/90 rounded-lg p-1 border border-slate-800 text-xs font-mono">
        <button
          onClick={() => setActiveTab('map')}
          className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
            activeTab === 'map'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Tactical Map
        </button>

        <button
          onClick={() => setActiveTab('interventions')}
          className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
            activeTab === 'interventions'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Interventions
        </button>

        <button
          onClick={() => setActiveTab('comparison')}
          className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
            activeTab === 'comparison'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitCompare className="w-3.5 h-3.5" />
          Before/After
        </button>

        <button
          onClick={() => setActiveTab('hazards')}
          className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
            activeTab === 'hazards'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Hazards
        </button>

        <button
          onClick={() => setActiveTab('copilot')}
          className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition ${
            activeTab === 'copilot'
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          Gemini AI
        </button>
      </div>

      {/* Step Controls */}
      <div className="flex items-center gap-2 font-mono text-xs">
        <div className="bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 text-slate-300">
          <span className="text-slate-500 text-[10px] block">STEP:</span>
          <span className="font-bold text-cyan-400">{step}</span> / {maxSteps}
        </div>

        <button
          onClick={onStepForward}
          disabled={step >= maxSteps || isPlaying}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg border border-slate-700 flex items-center gap-1 transition disabled:opacity-40"
          title="Advance single multi-hop cascade propagation step"
        >
          <StepForward className="w-3.5 h-3.5 text-cyan-400" />
          Step
        </button>

        <button
          onClick={onTogglePlay}
          disabled={step >= maxSteps}
          className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition ${
            isPlaying
              ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-md shadow-amber-500/20'
              : 'bg-cyan-600 text-slate-950 hover:bg-cyan-500 shadow-md shadow-cyan-500/20'
          }`}
          title={isPlaying ? 'Pause auto-simulation' : 'Play continuous cascade simulation'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          {isPlaying ? 'Pause' : 'Auto'}
        </button>

        <button
          onClick={onReset}
          className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition"
          title="Reset scenario to step 0"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
