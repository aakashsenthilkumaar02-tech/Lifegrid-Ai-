/**
 * LIFEGRID AI — Prototype 0.2 Hazard Layers Drawer
 * Controls GeoJSON hazard polygon layers, severity sliders, and spatial coverage.
 */

import React, { useState } from 'react';
import { GeoJsonHazardLayer } from '../types/lifegrid';
import {
  AlertTriangle,
  Layers,
  Sliders,
  Check,
  Eye,
  EyeOff,
  Flame,
  Droplets,
  Activity,
  Plus,
} from 'lucide-react';

interface HazardLayersDrawerProps {
  hazards: GeoJsonHazardLayer[];
  onToggleHazard: (hazardId: string, enabled: boolean) => void;
  onUpdateSeverity: (hazardId: string, severity: number) => void;
  onAddCustomHazard?: (newHazard: GeoJsonHazardLayer) => void;
}

export const HazardLayersDrawer: React.FC<HazardLayersDrawerProps> = ({
  hazards,
  onToggleHazard,
  onUpdateSeverity,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getHazardIcon = (type: string) => {
    switch (type) {
      case 'HURRICANE_STORM_SURGE':
        return <Droplets className="w-4 h-4 text-cyan-400" />;
      case 'FLASH_FLOOD':
        return <Droplets className="w-4 h-4 text-blue-400" />;
      case 'SEISMIC_SHAKING':
        return <Activity className="w-4 h-4 text-orange-400" />;
      case 'WILDFIRE':
        return <Flame className="w-4 h-4 text-red-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md rounded-xl border border-slate-800 p-4 shadow-xl text-slate-200 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
            SPATIAL HAZARD VECTOR LAYERS // GEOJSON
          </div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            GeoJSON Hazard Envelopes
          </h3>
        </div>
        <span className="text-xs font-mono bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-slate-400">
          {hazards.filter((h) => h.enabled).length} / {hazards.length} Active
        </span>
      </div>

      <div className="space-y-3">
        {hazards.map((hazard) => {
          const isExpanded = expandedId === hazard.id;
          const geom = hazard.geoJson.geometry;
          const polygonCount =
            geom.type === 'Polygon' ? 1 : geom.coordinates.length;

          return (
            <div
              key={hazard.id}
              className={`p-3 rounded-lg border transition-all ${
                hazard.enabled
                  ? 'bg-slate-950/80 border-slate-700/80'
                  : 'bg-slate-950/40 border-slate-900 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: hazard.color }}
                  />
                  <div>
                    <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                      {getHazardIcon(hazard.hazardType)}
                      {hazard.name}
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">
                      Type: {hazard.hazardType} • Geometry: {geom.type} ({polygonCount} Ring)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleHazard(hazard.id, !hazard.enabled)}
                    className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 transition ${
                      hazard.enabled
                        ? 'bg-cyan-950/60 border border-cyan-500/40 text-cyan-300'
                        : 'bg-slate-900 border border-slate-800 text-slate-400'
                    }`}
                  >
                    {hazard.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {hazard.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                {hazard.description}
              </p>

              {/* Severity Slider */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center gap-3">
                <span className="text-[10px] font-mono text-slate-400 w-24">
                  Severity: <b className="text-white">{(hazard.severity * 100).toFixed(0)}%</b>
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(hazard.severity * 100)}
                  onChange={(e) => onUpdateSeverity(hazard.id, Number(e.target.value) / 100)}
                  disabled={!hazard.enabled}
                  className="flex-1 accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              {/* Inspect GeoJSON toggle */}
              <div className="mt-2 text-right">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : hazard.id)}
                  className="text-[10px] font-mono text-cyan-400 hover:underline"
                >
                  {isExpanded ? 'Hide GeoJSON Coordinates' : 'Inspect GeoJSON Coordinates'}
                </button>
              </div>

              {isExpanded && (
                <div className="mt-2 p-2 bg-slate-900 rounded font-mono text-[9px] text-slate-400 max-h-32 overflow-y-auto border border-slate-800">
                  <pre>{JSON.stringify(hazard.geoJson, null, 2)}</pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
