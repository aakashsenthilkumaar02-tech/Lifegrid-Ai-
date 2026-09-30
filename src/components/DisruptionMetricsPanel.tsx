/**
 * LIFEGRID AI — Prototype 0.2 Disruption Metrics Panel
 * Renders normalized 0..1 service disruption metrics across all critical sectors
 * and community resilience indicators.
 */

import React from 'react';
import { DisruptionMetrics, StepHistoryPoint } from '../types/lifegrid';
import {
  Zap,
  Droplet,
  Radio,
  Activity,
  Truck,
  ShieldCheck,
  AlertOctagon,
  Users,
  Flame,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

interface DisruptionMetricsPanelProps {
  metrics: DisruptionMetrics;
  history: StepHistoryPoint[];
  step: number;
  maxSteps: number;
}

export const DisruptionMetricsPanel: React.FC<DisruptionMetricsPanelProps> = ({
  metrics,
  history,
  step,
  maxSteps,
}) => {
  const getDisruptionBadge = (val: number) => {
    if (val >= 0.85) return { label: 'CRITICAL SEVERITY', color: 'text-red-400 bg-red-950/60 border-red-500/40' };
    if (val >= 0.50) return { label: 'SEVERE DEGRADATION', color: 'text-orange-400 bg-orange-950/60 border-orange-500/40' };
    if (val >= 0.20) return { label: 'MODERATE STRAIN', color: 'text-yellow-400 bg-yellow-950/60 border-yellow-500/40' };
    return { label: 'NOMINAL STABILITY', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40' };
  };

  const getMetricBarColor = (val: number) => {
    if (val >= 0.85) return '#ef4444';
    if (val >= 0.50) return '#f97316';
    if (val >= 0.20) return '#eab308';
    return '#10b981';
  };

  const badge = getDisruptionBadge(metrics.overallCommunityDisruption);

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 p-4 shadow-xl flex flex-col gap-4">
      {/* Top Header & Resilience Index */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
            METRICS MATRIX // 0..1 NORMALIZED DISRUPTION
          </div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            Community Resilience Overview
          </h3>
        </div>
        <div className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold border ${badge.color}`}>
          {badge.label}
        </div>
      </div>

      {/* Main High-Impact KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Resilience Index */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/90 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Resilience Index</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-white">
            {(metrics.resilienceIndex * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            Normalized: {metrics.resilienceIndex.toFixed(3)} / 1.000
          </div>
        </div>

        {/* Overall Disruption */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/90 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Community Disruption</span>
            <Flame className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-red-400">
            {(metrics.overallCommunityDisruption * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            Normalized: {metrics.overallCommunityDisruption.toFixed(3)}
          </div>
        </div>

        {/* Population Impacted */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/90">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Population at Risk</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-amber-400">
            {metrics.totalPopulationImpacted.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
            Cross-Sector Aggregate
          </div>
        </div>

        {/* Critical Facilities Failed */}
        <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/90">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Critical Nodes Severed</span>
            <AlertOctagon className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-white">
            {metrics.criticalFacilitiesFailed} <span className="text-xs text-slate-500 font-normal">nodes</span>
          </div>
          <div className="text-[10px] text-red-400/90 font-mono mt-0.5">
            Status: Critical / Failed
          </div>
        </div>
      </div>

      {/* Cross-Sector 0..1 Breakdown Gauges */}
      <div className="space-y-3 pt-1">
        <div className="text-xs font-mono font-semibold text-slate-300 flex items-center justify-between">
          <span>SECTOR DISRUPTION METRICS (0.00..1.00)</span>
          <span className="text-slate-500 text-[10px]">SIMULATION STEP {step} / {maxSteps}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Power Grid */}
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 font-medium text-amber-300">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Power Grid Disruption
              </span>
              <span className="font-mono font-bold text-slate-200">
                {metrics.powerDisruption.toFixed(3)} ({(metrics.powerDisruption * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${metrics.powerDisruption * 100}%`,
                  backgroundColor: getMetricBarColor(metrics.powerDisruption),
                }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 font-mono">
              <span>Without Power:</span>
              <span className="text-slate-300 font-bold">{metrics.populationWithoutPower.toLocaleString()}</span>
            </div>
          </div>

          {/* Water & Sanitation */}
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 font-medium text-cyan-300">
                <Droplet className="w-3.5 h-3.5 text-cyan-400" />
                Water & Sanitation Disruption
              </span>
              <span className="font-mono font-bold text-slate-200">
                {metrics.waterDisruption.toFixed(3)} ({(metrics.waterDisruption * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${metrics.waterDisruption * 100}%`,
                  backgroundColor: getMetricBarColor(metrics.waterDisruption),
                }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 font-mono">
              <span>Without Water:</span>
              <span className="text-slate-300 font-bold">{metrics.populationWithoutWater.toLocaleString()}</span>
            </div>
          </div>

          {/* Telecommunications & 911 */}
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 font-medium text-purple-300">
                <Radio className="w-3.5 h-3.5 text-purple-400" />
                Telecom & 911 Disruption
              </span>
              <span className="font-mono font-bold text-slate-200">
                {metrics.telecomDisruption.toFixed(3)} ({(metrics.telecomDisruption * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${metrics.telecomDisruption * 100}%`,
                  backgroundColor: getMetricBarColor(metrics.telecomDisruption),
                }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 font-mono">
              <span>Without Telecom:</span>
              <span className="text-slate-300 font-bold">{metrics.populationWithoutTelecom.toLocaleString()}</span>
            </div>
          </div>

          {/* Healthcare & Trauma Facilities */}
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 font-medium text-red-300">
                <Activity className="w-3.5 h-3.5 text-red-400" />
                Hospital & ICU Disruption
              </span>
              <span className="font-mono font-bold text-slate-200">
                {metrics.healthcareDisruption.toFixed(3)} ({(metrics.healthcareDisruption * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${metrics.healthcareDisruption * 100}%`,
                  backgroundColor: getMetricBarColor(metrics.healthcareDisruption),
                }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 font-mono">
              <span>Surge Status:</span>
              <span className="text-amber-400 font-bold">
                {metrics.healthcareDisruption > 0.4 ? 'Emergency Generator Backup' : 'Nominal Power'}
              </span>
            </div>
          </div>

          {/* Transportation & Evacuation Corridors */}
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 md:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5 font-medium text-blue-300">
                <Truck className="w-3.5 h-3.5 text-blue-400" />
                Transportation & Evacuation Transit Disruption
              </span>
              <span className="font-mono font-bold text-slate-200">
                {metrics.transportDisruption.toFixed(3)} ({(metrics.transportDisruption * 100).toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${metrics.transportDisruption * 100}%`,
                  backgroundColor: getMetricBarColor(metrics.transportDisruption),
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Step History Timeline Track */}
      {history.length > 1 && (
        <div className="pt-2 border-t border-slate-800/80">
          <div className="text-[10px] font-mono text-slate-400 mb-1.5 flex items-center justify-between">
            <span>CASCADE TIMELINE PROPAGATION PROGRESS</span>
            <span>STEPS RECORDED: {history.length}</span>
          </div>
          <div className="flex items-end gap-1.5 h-12 bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
            {history.map((pt, idx) => {
              const heightPct = Math.max(10, Math.round(pt.metrics.overallCommunityDisruption * 100));
              const isCurrent = pt.step === step;
              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center gap-1 group relative"
                >
                  <div
                    className={`w-full rounded-t transition-all ${
                      isCurrent
                        ? 'bg-cyan-400 shadow-md shadow-cyan-400/50'
                        : 'bg-slate-700 hover:bg-slate-500'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[8px] font-mono text-slate-400">
                    S{pt.step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
