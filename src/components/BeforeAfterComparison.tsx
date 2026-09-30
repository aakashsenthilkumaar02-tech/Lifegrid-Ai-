/**
 * LIFEGRID AI — Prototype 0.2 Before/After Intervention Comparison
 * Side-by-side and differential impact analysis between unmitigated baseline
 * and intervened cascade states.
 */

import React from 'react';
import {
  DisruptionMetrics,
  InfrastructureNode,
  ActiveIntervention,
  InterventionType,
} from '../types/lifegrid';
import {
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  Zap,
  Droplet,
  Radio,
  Activity,
  Truck,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface BeforeAfterComparisonProps {
  currentMetrics: DisruptionMetrics;
  baselineMetrics?: DisruptionMetrics;
  currentNodes: InfrastructureNode[];
  baselineNodes?: InfrastructureNode[];
  activeInterventions: ActiveIntervention[];
  catalog: InterventionType[];
}

export const BeforeAfterComparison: React.FC<BeforeAfterComparisonProps> = ({
  currentMetrics,
  baselineMetrics,
  currentNodes,
  baselineNodes,
  activeInterventions,
  catalog,
}) => {
  const base = baselineMetrics || currentMetrics;

  const deltaDisruption = currentMetrics.overallCommunityDisruption - base.overallCommunityDisruption;
  const deltaResilience = currentMetrics.resilienceIndex - base.resilienceIndex;
  const deltaPopProtected = Math.max(0, base.totalPopulationImpacted - currentMetrics.totalPopulationImpacted);
  const deltaPower = currentMetrics.powerDisruption - base.powerDisruption;
  const deltaWater = currentMetrics.waterDisruption - base.waterDisruption;
  const deltaTelecom = currentMetrics.telecomDisruption - base.telecomDisruption;
  const deltaHealth = currentMetrics.healthcareDisruption - base.healthcareDisruption;
  const deltaTransport = currentMetrics.transportDisruption - base.transportDisruption;

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 p-5 shadow-2xl space-y-6 text-slate-200">
      {/* Title & summary header */}
      <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
            DIFFERENTIAL CASCADE ASSESSMENT // BEFORE VS AFTER
          </div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            Intervention Mitigation Impact Comparison
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <span className="text-slate-400">Deployed Interventions:</span>
          <span className="text-cyan-400 font-bold">{activeInterventions.length} active</span>
        </div>
      </div>

      {/* Delta Metric Summary Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Net Disruption Delta */}
        <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800">
          <div className="text-xs text-slate-400 font-medium mb-1">Net Community Disruption</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-white">
              {(currentMetrics.overallCommunityDisruption * 100).toFixed(1)}%
            </span>
            <span
              className={`text-xs font-mono font-bold flex items-center ${
                deltaDisruption <= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {deltaDisruption <= 0 ? <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> : <TrendingUp className="w-3.5 h-3.5 mr-0.5" />}
              {Math.abs(deltaDisruption * 100).toFixed(1)}%
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">
            Baseline: {(base.overallCommunityDisruption * 100).toFixed(1)}%
          </div>
        </div>

        {/* Resilience Boost */}
        <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800">
          <div className="text-xs text-slate-400 font-medium mb-1">Community Resilience Index</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-white">
              {(currentMetrics.resilienceIndex * 100).toFixed(1)}%
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
              +{(deltaResilience * 100).toFixed(1)}%
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">
            Baseline: {(base.resilienceIndex * 100).toFixed(1)}%
          </div>
        </div>

        {/* Population Shielded */}
        <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800">
          <div className="text-xs text-slate-400 font-medium mb-1">Citizens Protected from Outage</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono font-bold text-cyan-400">
              +{deltaPopProtected.toLocaleString()}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">
            Impact reduced from {base.totalPopulationImpacted.toLocaleString()} to {currentMetrics.totalPopulationImpacted.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Sector-by-Sector Side-by-Side Comparison */}
      <div className="space-y-3">
        <h4 className="text-xs font-mono font-semibold text-slate-300">
          CROSS-SECTOR IMPACT COMPARISON (BASELINE VS CURRENT)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Power */}
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-amber-300">
                <Zap className="w-4 h-4 text-amber-400" /> Power Grid Disruption
              </span>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                {deltaPower <= 0 ? `${(deltaPower * 100).toFixed(1)}%` : `+${(deltaPower * 100).toFixed(1)}%`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Baseline Outage:</span>
                <span className="text-slate-300 font-bold">{(base.powerDisruption * 100).toFixed(1)}%</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Mitigated Outage:</span>
                <span className="text-cyan-400 font-bold">{(currentMetrics.powerDisruption * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Water */}
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-cyan-300">
                <Droplet className="w-4 h-4 text-cyan-400" /> Water Filtration & Supply
              </span>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                {deltaWater <= 0 ? `${(deltaWater * 100).toFixed(1)}%` : `+${(deltaWater * 100).toFixed(1)}%`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Baseline Outage:</span>
                <span className="text-slate-300 font-bold">{(base.waterDisruption * 100).toFixed(1)}%</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-cyan-400 font-bold">{(currentMetrics.waterDisruption * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Telecom */}
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-purple-300">
                <Radio className="w-4 h-4 text-purple-400" /> Telecom & 911 Comms
              </span>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                {deltaTelecom <= 0 ? `${(deltaTelecom * 100).toFixed(1)}%` : `+${(deltaTelecom * 100).toFixed(1)}%`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Baseline Outage:</span>
                <span className="text-slate-300 font-bold">{(base.telecomDisruption * 100).toFixed(1)}%</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-cyan-400 font-bold">{(currentMetrics.telecomDisruption * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Healthcare */}
          <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-red-300">
                <Activity className="w-4 h-4 text-red-400" /> Trauma Hospital Surge
              </span>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                {deltaHealth <= 0 ? `${(deltaHealth * 100).toFixed(1)}%` : `+${(deltaHealth * 100).toFixed(1)}%`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-slate-400 text-[10px] block">Baseline Outage:</span>
                <span className="text-slate-300 font-bold">{(base.healthcareDisruption * 100).toFixed(1)}%</span>
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-cyan-400 font-bold">{(currentMetrics.healthcareDisruption * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Node Differential Table */}
      <div>
        <h4 className="text-xs font-mono font-semibold text-slate-300 mb-2">
          CRITICAL NODE DISRUPTION DELTA
        </h4>
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
              <tr>
                <th className="p-2.5">Node Name</th>
                <th className="p-2.5">Sector</th>
                <th className="p-2.5">Baseline</th>
                <th className="p-2.5">Current</th>
                <th className="p-2.5">Delta Disruption</th>
                <th className="p-2.5">Active Intervention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
              {currentNodes.map((node) => {
                const bNode = baselineNodes?.find((bn) => bn.id === node.id);
                const baseDisruption = bNode ? bNode.disruption : node.disruption;
                const nodeDelta = node.disruption - baseDisruption;
                const hasInt = node.activeInterventions.length > 0;

                return (
                  <tr key={node.id} className="hover:bg-slate-900/40">
                    <td className="p-2.5 font-sans font-bold text-white">{node.name}</td>
                    <td className="p-2.5 text-slate-400">{node.sector}</td>
                    <td className="p-2.5 text-slate-400">{(baseDisruption * 100).toFixed(0)}%</td>
                    <td className="p-2.5 font-bold text-white">{(node.disruption * 100).toFixed(0)}%</td>
                    <td className="p-2.5">
                      <span
                        className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                          nodeDelta < 0
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                            : nodeDelta > 0
                            ? 'bg-red-950/60 text-red-400 border border-red-500/30'
                            : 'text-slate-400'
                        }`}
                      >
                        {nodeDelta > 0 ? `+${(nodeDelta * 100).toFixed(0)}%` : `${(nodeDelta * 100).toFixed(0)}%`}
                      </span>
                    </td>
                    <td className="p-2.5">
                      {hasInt ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-bold text-[10px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          PROTECTED
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Unprotected</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
