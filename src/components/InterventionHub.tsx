/**
 * LIFEGRID AI — Prototype 0.2 Intervention Hub
 * Typed intervention resources with capacity, dry-run what-if testing,
 * and optimistic concurrency deployment.
 */

import React, { useState } from 'react';
import {
  InterventionType,
  InfrastructureNode,
  ActiveIntervention,
  InterventionDryRunResult,
} from '../types/lifegrid';
import {
  Zap,
  ShieldAlert,
  Radio,
  Droplet,
  Activity,
  Truck,
  DollarSign,
  Play,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  FlaskConical,
  Clock,
  Gauge,
  Sparkles,
  Trash2,
} from 'lucide-react';

interface InterventionHubProps {
  catalog: InterventionType[];
  nodes: InfrastructureNode[];
  activeInterventions: ActiveIntervention[];
  budgetRemaining: number;
  totalBudget: number;
  selectedNodeId: string | null;
  onDeployIntervention: (interventionTypeId: string, targetNodeId: string) => Promise<void>;
  onRecallIntervention: (activeId: string) => Promise<void>;
  onTestIntervention: (interventionTypeId: string, targetNodeId: string) => Promise<InterventionDryRunResult>;
}

export const InterventionHub: React.FC<InterventionHubProps> = ({
  catalog,
  nodes,
  activeInterventions,
  budgetRemaining,
  totalBudget,
  selectedNodeId,
  onDeployIntervention,
  onRecallIntervention,
  onTestIntervention,
}) => {
  const [selectedInterventionId, setSelectedInterventionId] = useState<string>(catalog[0]?.id || '');
  const [targetNodeId, setTargetNodeId] = useState<string>(selectedNodeId || nodes[0]?.id || '');
  const [isTesting, setIsTesting] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<InterventionDryRunResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync targetNodeId when selectedNodeId changes from map
  React.useEffect(() => {
    if (selectedNodeId) {
      setTargetNodeId(selectedNodeId);
    }
  }, [selectedNodeId]);

  const selectedItem = catalog.find((i) => i.id === selectedInterventionId);
  const targetNode = nodes.find((n) => n.id === targetNodeId);

  const getInterventionIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'MOBILE_DIESEL_MICROGRID':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'FLOOD_BARRIER_DEPLOYMENT':
        return <ShieldAlert className="w-4 h-4 text-cyan-400" />;
      case 'SATELLITE_COMMS_BACKHAUL':
        return <Radio className="w-4 h-4 text-purple-400" />;
      case 'HIGH_CAPACITY_WATER_PUMP':
        return <Droplet className="w-4 h-4 text-blue-400" />;
      case 'EMERGENCY_FIELD_HOSPITAL':
        return <Activity className="w-4 h-4 text-red-400" />;
      case 'CORRIDOR_CLEARANCE_TEAM':
        return <Truck className="w-4 h-4 text-emerald-400" />;
      default:
        return <Zap className="w-4 h-4 text-slate-400" />;
    }
  };

  const handleTest = async () => {
    if (!selectedInterventionId || !targetNodeId) return;
    setIsTesting(true);
    setErrorMessage(null);
    try {
      const result = await onTestIntervention(selectedInterventionId, targetNodeId);
      setDryRunResult(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Intervention dry run failed.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleDeploy = async () => {
    if (!selectedInterventionId || !targetNodeId) return;
    setIsDeploying(true);
    setErrorMessage(null);
    try {
      await onDeployIntervention(selectedInterventionId, targetNodeId);
      setDryRunResult(null); // Clear preview after deploy
    } catch (err: any) {
      setErrorMessage(err.message || 'Intervention deployment failed.');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 p-4 shadow-xl flex flex-col gap-4 text-slate-200">
      {/* Header and Emergency Budget Gauge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
            RAPID MITIGATION // TYPED EMERGENCY RESOURCES
          </div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            Intervention Testing & Deployment Hub
          </h3>
        </div>

        {/* Budget status */}
        <div className="flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 font-mono text-xs">
          <div>
            <div className="text-[9px] text-slate-400 uppercase">Mitigation Budget:</div>
            <div className="font-bold text-emerald-400">
              ${budgetRemaining.toLocaleString()} <span className="text-slate-500 font-normal">/ ${totalBudget.toLocaleString()}</span>
            </div>
          </div>
          <div className="w-16 bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full"
              style={{ width: `${(budgetRemaining / totalBudget) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Resource Catalog Grid */}
      <div>
        <label className="text-xs font-mono font-semibold text-slate-300 block mb-2">
          SELECT TYPED MITIGATION ASSET:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {catalog.map((item) => {
            const isSelected = selectedInterventionId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedInterventionId(item.id);
                  setDryRunResult(null);
                }}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-1.5 font-bold text-xs text-white">
                      {getInterventionIcon(item.resourceType)}
                      {item.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      {item.sector}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                    {item.description}
                  </p>
                </div>

                <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-amber-400 font-semibold">
                    Cap: {item.capacity.amount} {item.capacity.unit}
                  </span>
                  <span className="text-emerald-400 font-bold">
                    ${item.unitCost.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Target Node Selection & Deployment Controls */}
      <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
          <div>
            <label className="text-xs font-mono font-semibold text-slate-300 block mb-1">
              DEPLOYMENT TARGET NODE:
            </label>
            <select
              value={targetNodeId}
              onChange={(e) => {
                setTargetNodeId(e.target.value);
                setDryRunResult(null);
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
            >
              {nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  [{node.sector}] {node.name} — {(node.disruption * 100).toFixed(0)}% disruption
                </option>
              ))}
            </select>
          </div>

          {selectedItem && (
            <div className="text-xs font-mono text-slate-400 space-y-1 bg-slate-900/60 p-2 rounded border border-slate-800">
              <div className="flex justify-between">
                <span>Relief Capacity:</span>
                <span className="text-cyan-300 font-bold">{selectedItem.capacity.description}</span>
              </div>
              <div className="flex justify-between">
                <span>Pressure Relief / Mitigation:</span>
                <span className="text-emerald-300 font-bold">
                  -{(selectedItem.pressureReduction * 100).toFixed(0)}% pressure / -{(selectedItem.disruptionMitigation * 100).toFixed(0)}% direct
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons: Dry-Run Test vs Deploy */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={handleTest}
            disabled={isTesting || !targetNodeId}
            className="flex-1 sm:flex-initial px-4 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-200 font-semibold rounded-lg text-xs font-mono flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <FlaskConical className="w-3.5 h-3.5 text-indigo-400" />
            {isTesting ? 'Simulating Dry Run...' : 'Test Intervention (What-If)'}
          </button>

          <button
            onClick={handleDeploy}
            disabled={
              isDeploying ||
              !selectedItem ||
              budgetRemaining < (selectedItem?.unitCost || 0)
            }
            className="flex-1 sm:flex-initial px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs font-mono flex items-center justify-center gap-2 transition shadow-lg shadow-cyan-500/20 disabled:opacity-40"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isDeploying ? 'Deploying Resource...' : 'Deploy Intervention'}
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="flex items-center gap-2 bg-red-950/60 border border-red-500/50 text-red-300 text-xs p-2.5 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Dry Run / What-If Result Card */}
      {dryRunResult && (
        <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-xl p-3.5 text-xs font-mono space-y-2.5">
          <div className="flex items-center justify-between text-indigo-300 font-bold border-b border-indigo-500/30 pb-1.5">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              DRY RUN PROJECTION (2 STEPS AHEAD)
            </span>
            <span className="text-[10px] bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-400/40">
              NON-COMMITTED PREVIEW
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="bg-slate-950/80 p-2 rounded border border-indigo-900">
              <span className="text-[10px] text-slate-400 block">Δ Disruption</span>
              <span className="text-emerald-400 font-bold text-sm">
                {(dryRunResult.deltaDisruption * 100).toFixed(1)}%
              </span>
            </div>
            <div className="bg-slate-950/80 p-2 rounded border border-indigo-900">
              <span className="text-[10px] text-slate-400 block">Protected Citizens</span>
              <span className="text-cyan-400 font-bold text-sm">
                +{dryRunResult.deltaPopulationProtected.toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-950/80 p-2 rounded border border-indigo-900">
              <span className="text-[10px] text-slate-400 block">Severed Cascades</span>
              <span className="text-amber-400 font-bold text-sm">
                {dryRunResult.severedCascadeChains} chains
              </span>
            </div>
            <div className="bg-slate-950/80 p-2 rounded border border-indigo-900">
              <span className="text-[10px] text-slate-400 block">Target Disruption</span>
              <span className="text-white font-bold text-sm">
                {(dryRunResult.targetNodeProjectedDisruption * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Active Interventions List */}
      <div>
        <div className="flex items-center justify-between text-xs font-mono font-semibold text-slate-300 mb-2">
          <span>DEPLOYED OPERATIONAL ASSETS ({activeInterventions.length})</span>
        </div>

        {activeInterventions.length === 0 ? (
          <div className="text-xs text-slate-500 italic bg-slate-950/50 p-3 rounded-lg border border-slate-800 text-center">
            No typed resources currently active in scenario session.
          </div>
        ) : (
          <div className="space-y-1.5">
            {activeInterventions.map((active) => {
              const item = catalog.find((i) => i.id === active.interventionTypeId);
              const target = nodes.find((n) => n.id === active.targetNodeId);
              return (
                <div
                  key={active.id}
                  className="flex items-center justify-between bg-slate-950/70 border border-slate-800 hover:border-slate-700 p-2.5 rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2">
                    {item && getInterventionIcon(item.resourceType)}
                    <div>
                      <span className="font-bold text-white block">
                        {item ? item.name : active.interventionTypeId}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Target: {target ? target.name : active.targetNodeId} • Deployed Step: {active.deployedAtStep}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-bold">
                      ACTIVE
                    </span>
                    <button
                      onClick={() => onRecallIntervention(active.id)}
                      className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-900 transition"
                      title="Recall resource and reclaim salvage budget"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
