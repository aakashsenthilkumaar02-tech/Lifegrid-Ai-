/**
 * LIFEGRID AI — Prototype 0.2
 * Community infrastructure cascade simulator.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ScenarioSession,
  InterventionType,
  InterventionDryRunResult,
} from './types/lifegrid';
import { HeaderBar } from './components/HeaderBar';
import { MapViewer } from './components/MapViewer';
import { DisruptionMetricsPanel } from './components/DisruptionMetricsPanel';
import { InterventionHub } from './components/InterventionHub';
import { BeforeAfterComparison } from './components/BeforeAfterComparison';
import { HazardLayersDrawer } from './components/HazardLayersDrawer';
import { GeminiCopilot } from './components/GeminiCopilot';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<ScenarioSession | null>(null);
  const [catalog, setCatalog] = useState<InterventionType[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'interventions' | 'comparison' | 'hazards' | 'copilot'>('map');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [concurrencyConflict, setConcurrencyConflict] = useState(false);
  const [concurrencyMessage, setConcurrencyMessage] = useState<string | null>(null);

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Load catalog and initial session
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [catRes, sessRes] = await Promise.all([
        fetch('/api/catalog'),
        fetch('/api/sessions/scenario_hurricane_katrina_01'),
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        setCatalog(catData.catalog || []);
      }

      if (sessRes.ok) {
        const sessData = await sessRes.json();
        setSession(sessData.session);
      }
    } catch (err) {
      console.error('[LIFEGRID AI] Initial load failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Refresh current session from server
  const refreshSession = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(`/api/sessions/${session.id}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        setConcurrencyConflict(false);
        setConcurrencyMessage(null);
      }
    } catch (err) {
      console.error('[LIFEGRID AI] Session refresh failed:', err);
    }
  }, [session]);

  // Advance simulation single step with optimistic concurrency verification
  const handleStepForward = async (force = false) => {
    if (!session || session.step >= session.maxSteps) return;

    try {
      const res = await fetch(`/api/sessions/${session.id}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expected_state_hash: session.state_hash,
          force,
        }),
      });

      if (res.status === 409) {
        // Optimistic concurrency conflict detected
        const conflictData = await res.json();
        setConcurrencyConflict(true);
        setConcurrencyMessage(conflictData.message || 'Optimistic concurrency collision detected.');
        setIsPlaying(false);
        return;
      }

      if (!res.ok) {
        throw new Error(`Step failed: ${res.statusText}`);
      }

      const data = await res.json();
      setSession(data.session);
      setConcurrencyConflict(false);
      setConcurrencyMessage(null);

      // Stop play if reached maxSteps
      if (data.session.step >= data.session.maxSteps) {
        setIsPlaying(false);
      }
    } catch (err) {
      console.error('[LIFEGRID AI] Simulation step error:', err);
      setIsPlaying(false);
    }
  };

  // Auto-play simulation interval loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      if (isPlayingRef.current) {
        handleStepForward();
      }
    }, 2400);

    return () => clearInterval(interval);
  }, [isPlaying, session?.id, session?.step, session?.maxSteps, session?.state_hash]);

  // Reset scenario session
  const handleReset = async () => {
    if (!session) return;
    setIsPlaying(false);
    try {
      const res = await fetch(`/api/sessions/${session.id}/reset`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        setSelectedNodeId(null);
        setConcurrencyConflict(false);
        setConcurrencyMessage(null);
      }
    } catch (err) {
      console.error('[LIFEGRID AI] Reset failed:', err);
    }
  };

  // Switch scenario preset
  const handleSelectScenario = async (presetId: string) => {
    setIsPlaying(false);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset: presetId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        setSelectedNodeId(null);
        setConcurrencyConflict(false);
        setConcurrencyMessage(null);
      }
    } catch (err) {
      console.error('[LIFEGRID AI] Scenario switch failed:', err);
    }
  };

  // Deploy typed intervention
  const handleDeployIntervention = async (interventionTypeId: string, targetNodeId: string) => {
    if (!session) return;
    const res = await fetch(`/api/sessions/${session.id}/interventions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interventionTypeId,
        targetNodeId,
        expected_state_hash: session.state_hash,
      }),
    });

    if (res.status === 409) {
      setConcurrencyConflict(true);
      setConcurrencyMessage('State hash conflict when deploying intervention.');
      throw new Error('Optimistic concurrency collision: session was updated by another process.');
    }

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || 'Deployment failed');
    }

    const data = await res.json();
    setSession(data.session);
  };

  // Recall / delete intervention
  const handleRecallIntervention = async (activeId: string) => {
    if (!session) return;
    const res = await fetch(`/api/sessions/${session.id}/interventions/${activeId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const data = await res.json();
      setSession(data.session);
    }
  };

  // Dry-run what-if test
  const handleTestIntervention = async (
    interventionTypeId: string,
    targetNodeId: string
  ): Promise<InterventionDryRunResult> => {
    if (!session) throw new Error('No active scenario session');
    const res = await fetch(`/api/sessions/${session.id}/test-intervention`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interventionTypeId,
        targetNodeId,
        projectionSteps: 2,
      }),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || 'Dry run failed');
    }

    const data = await res.json();
    return data.dryRun;
  };

  // Toggle GeoJSON hazard layer
  const handleToggleHazard = async (hazardId: string, enabled: boolean) => {
    if (!session) return;
    const res = await fetch(`/api/sessions/${session.id}/hazards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hazardId, enabled }),
    });
    if (res.ok) {
      const data = await res.json();
      setSession(data.session);
    }
  };

  // Update GeoJSON hazard severity
  const handleUpdateHazardSeverity = async (hazardId: string, severity: number) => {
    if (!session) return;
    const res = await fetch(`/api/sessions/${session.id}/hazards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hazardId, severity }),
    });
    if (res.ok) {
      const data = await res.json();
      setSession(data.session);
    }
  };

  if (isLoading || !session) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 font-mono text-xs gap-3">
        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <div>INITIALIZING LIFEGRID AI CASCADE ENGINE 0.2...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header Command Bar */}
      <HeaderBar
        scenarioTitle={session.title}
        step={session.step}
        maxSteps={session.maxSteps}
        stateHash={session.state_hash}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        onStepForward={() => handleStepForward(false)}
        onReset={handleReset}
        onSelectScenario={handleSelectScenario}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        concurrencyConflict={concurrencyConflict}
      />

      {/* Optimistic Concurrency Conflict Alert Banner */}
      {concurrencyConflict && (
        <div className="bg-red-950/90 border-b border-red-500/50 px-4 py-2.5 flex items-center justify-between text-xs font-mono text-red-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>
              <b>CONCURRENCY GUARD ALERT:</b> {concurrencyMessage || 'state_hash mismatch detected across sessions.'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStepForward(true)}
              className="px-2.5 py-1 bg-red-700 hover:bg-red-600 text-white rounded font-bold"
            >
              Force Override
            </button>
            <button
              onClick={refreshSession}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded"
            >
              Sync Latest State
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Body */}
      <main className="flex-1 p-3 lg:p-4 max-w-[1720px] w-full mx-auto flex flex-col gap-4">
        {/* Dynamic View Panels */}
        {activeTab === 'map' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
            {/* Left 8 Columns: Tactical GIS Map with GeoJSON hazard polygons & markers */}
            <div className="lg:col-span-8 h-[540px] lg:h-[660px] flex flex-col">
              <MapViewer
                nodes={session.nodes}
                edges={session.edges}
                hazards={session.hazards}
                interventions={session.interventions}
                catalog={catalog}
                selectedNodeId={selectedNodeId}
                onSelectNode={(id) => setSelectedNodeId(id)}
                center={session.center}
                zoom={session.zoom}
                step={session.step}
              />
            </div>

            {/* Right 4 Columns: 0..1 Disruption Metrics Panel & Quick Intervention Actions */}
            <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto max-h-[660px] pr-1">
              <DisruptionMetricsPanel
                metrics={session.metrics}
                history={session.history}
                step={session.step}
                maxSteps={session.maxSteps}
              />

              {/* Quick Jump to Intervention Hub */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between text-xs font-mono">
                <div>
                  <div className="text-slate-400 text-[10px]">BUDGET REMAINING:</div>
                  <div className="text-emerald-400 font-bold text-sm">
                    ${session.budgetRemaining.toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('interventions')}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg transition"
                >
                  Configure Interventions →
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'interventions' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8">
              <InterventionHub
                catalog={catalog}
                nodes={session.nodes}
                activeInterventions={session.interventions}
                budgetRemaining={session.budgetRemaining}
                totalBudget={session.totalBudget}
                selectedNodeId={selectedNodeId}
                onDeployIntervention={handleDeployIntervention}
                onRecallIntervention={handleRecallIntervention}
                onTestIntervention={handleTestIntervention}
              />
            </div>
            <div className="lg:col-span-4 h-[550px]">
              <MapViewer
                nodes={session.nodes}
                edges={session.edges}
                hazards={session.hazards}
                interventions={session.interventions}
                catalog={catalog}
                selectedNodeId={selectedNodeId}
                onSelectNode={(id) => setSelectedNodeId(id)}
                center={session.center}
                zoom={session.zoom}
                step={session.step}
              />
            </div>
          </div>
        )}

        {activeTab === 'comparison' && (
          <BeforeAfterComparison
            currentMetrics={session.metrics}
            baselineMetrics={session.baselineMetrics}
            currentNodes={session.nodes}
            baselineNodes={session.baselineNodes}
            activeInterventions={session.interventions}
            catalog={catalog}
          />
        )}

        {activeTab === 'hazards' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-6">
              <HazardLayersDrawer
                hazards={session.hazards}
                onToggleHazard={handleToggleHazard}
                onUpdateSeverity={handleUpdateHazardSeverity}
              />
            </div>
            <div className="lg:col-span-6 h-[550px]">
              <MapViewer
                nodes={session.nodes}
                edges={session.edges}
                hazards={session.hazards}
                interventions={session.interventions}
                catalog={catalog}
                selectedNodeId={selectedNodeId}
                onSelectNode={(id) => setSelectedNodeId(id)}
                center={session.center}
                zoom={session.zoom}
                step={session.step}
              />
            </div>
          </div>
        )}

        {activeTab === 'copilot' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7">
              <GeminiCopilot
                session={session}
                onRefreshSession={refreshSession}
              />
            </div>
            <div className="lg:col-span-5 flex flex-col gap-4">
              <DisruptionMetricsPanel
                metrics={session.metrics}
                history={session.history}
                step={session.step}
                maxSteps={session.maxSteps}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
