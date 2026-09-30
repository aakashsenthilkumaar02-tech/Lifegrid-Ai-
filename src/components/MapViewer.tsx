/**
 * LIFEGRID AI — Prototype 0.2 MapViewer
 * Google Maps-ready with AdvancedMarkerElement & GeoJSON data layers,
 * plus High-Fidelity Tactical GIS SVG vector engine fallback with cascade pulse lines.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  InfrastructureNode,
  DependencyEdge,
  GeoJsonHazardLayer,
  ActiveIntervention,
  InterventionType,
} from '../types/lifegrid';
import {
  Zap,
  Droplet,
  Radio,
  Activity,
  Truck,
  AlertTriangle,
  Layers,
  MapPin,
  Crosshair,
  Shield,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface MapViewerProps {
  nodes: InfrastructureNode[];
  edges: DependencyEdge[];
  hazards: GeoJsonHazardLayer[];
  interventions: ActiveIntervention[];
  catalog: InterventionType[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  center: [number, number];
  zoom: number;
  step: number;
}

export const MapViewer: React.FC<MapViewerProps> = ({
  nodes,
  edges,
  hazards,
  interventions,
  catalog,
  selectedNodeId,
  onSelectNode,
  center,
  step,
}) => {
  const [mapEngine, setMapEngine] = useState<'tactical' | 'google'>(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'google' : 'tactical'
  );
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [googleMapsError, setGoogleMapsError] = useState<string | null>(null);

  const googleMapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Tactical SVG Pan/Zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [activeLayerFilter, setActiveLayerFilter] = useState<{
    power: boolean;
    water: boolean;
    telecom: boolean;
    healthcare: boolean;
    transport: boolean;
    hazards: boolean;
    cascadeFlows: boolean;
  }>({
    power: true,
    water: true,
    telecom: true,
    healthcare: true,
    transport: true,
    hazards: true,
    cascadeFlows: true,
  });

  // Calculate SVG projection coordinates from lat/lng bounding box
  const bounds = React.useMemo(() => {
    let minLat = center[0] - 0.12;
    let maxLat = center[0] + 0.12;
    let minLng = center[1] - 0.18;
    let maxLng = center[1] + 0.18;

    for (const node of nodes) {
      minLat = Math.min(minLat, node.coordinates[0]);
      maxLat = Math.max(maxLat, node.coordinates[0]);
      minLng = Math.min(minLng, node.coordinates[1]);
      maxLng = Math.max(maxLng, node.coordinates[1]);
    }
    // Add margin
    const latSpan = maxLat - minLat || 0.1;
    const lngSpan = maxLng - minLng || 0.1;
    return {
      minLat: minLat - latSpan * 0.15,
      maxLat: maxLat + latSpan * 0.15,
      minLng: minLng - lngSpan * 0.15,
      maxLng: maxLng + lngSpan * 0.15,
    };
  }, [nodes, center]);

  const projectCoord = (lat: number, lng: number, width = 1000, height = 650) => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * width;
    const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * height;
    return { x, y };
  };

  // Google Maps Dynamic Loader
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    if ((window as any).google?.maps) {
      setGoogleMapsLoaded(true);
      return;
    }

    const scriptId = 'google-maps-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=marker,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = () => setGoogleMapsLoaded(true);
      script.onerror = () => {
        setGoogleMapsError('Failed to load Google Maps script. Falling back to Tactical GIS Engine.');
        setMapEngine('tactical');
      };
      document.head.appendChild(script);
    }
  }, []);

  // Initialize and update Google Maps instance when active
  useEffect(() => {
    if (mapEngine !== 'google' || !googleMapsLoaded || !googleMapRef.current) return;
    const google = (window as any).google;
    if (!google?.maps) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new google.maps.Map(googleMapRef.current, {
        center: { lat: center[0], lng: center[1] },
        zoom: 12,
        mapId: 'DEMO_MAP_ID', // Enables AdvancedMarkerElement
        disableDefaultUI: false,
        backgroundColor: '#020617',
      });
    }

    const map = mapInstanceRef.current;

    // Clear previous markers
    markersRef.current.forEach((m) => m.map = null);
    markersRef.current = [];

    // Add AdvancedMarkerElement for each visible node
    nodes.forEach((node) => {
      const isVisible =
        (node.sector === 'POWER' && activeLayerFilter.power) ||
        (node.sector === 'WATER' && activeLayerFilter.water) ||
        (node.sector === 'TELECOM' && activeLayerFilter.telecom) ||
        (node.sector === 'HEALTHCARE' && activeLayerFilter.healthcare) ||
        (node.sector === 'TRANSPORT' && activeLayerFilter.transport);

      if (!isVisible) return;

      const markerContent = document.createElement('div');
      markerContent.className = 'cursor-pointer transform hover:scale-125 transition-transform duration-200';
      
      const disruptionColor =
        node.status === 'FAILED'
          ? '#ef4444'
          : node.status === 'CRITICAL'
          ? '#f97316'
          : node.status === 'DEGRADED'
          ? '#eab308'
          : '#10b981';

      markerContent.innerHTML = `
        <div style="background: rgba(15, 23, 42, 0.9); border: 2px solid ${disruptionColor}; box-shadow: 0 0 12px ${disruptionColor}88;"
             class="px-2 py-1 rounded text-xs font-mono text-white flex items-center gap-1.5 backdrop-blur-md">
          <span style="background: ${disruptionColor};" class="w-2 h-2 rounded-full ${node.disruption > 0.5 ? 'animate-ping' : ''}"></span>
          <span class="font-bold">${node.name.split(' ')[0]}</span>
          <span style="color: ${disruptionColor}" class="font-semibold">${(node.disruption * 100).toFixed(0)}%</span>
        </div>
      `;

      markerContent.onclick = () => onSelectNode(node.id);

      if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat: node.coordinates[0], lng: node.coordinates[1] },
          content: markerContent,
          title: node.name,
        });
        markersRef.current.push(marker);
      }
    });

    // Render GeoJSON hazard layers on Google Maps
    if (activeLayerFilter.hazards) {
      hazards.forEach((hazard) => {
        if (!hazard.enabled) return;
        try {
          map.data.addGeoJson(hazard.geoJson);
        } catch {
          // ignore duplicate layer additions
        }
      });
      map.data.setStyle({
        fillColor: '#06b6d4',
        fillOpacity: 0.25,
        strokeColor: '#22d3ee',
        strokeWeight: 2,
      });
    }
  }, [mapEngine, googleMapsLoaded, nodes, hazards, activeLayerFilter, center, onSelectNode]);

  // Tactical SVG Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click drag
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const getSectorColor = (sector: string) => {
    switch (sector) {
      case 'POWER':
        return '#eab308'; // Amber
      case 'WATER':
        return '#06b6d4'; // Cyan
      case 'TELECOM':
        return '#a855f7'; // Purple
      case 'HEALTHCARE':
        return '#ef4444'; // Red
      case 'TRANSPORT':
        return '#3b82f6'; // Blue
      default:
        return '#94a3b8';
    }
  };

  const getDisruptionStatusColor = (disruption: number) => {
    if (disruption >= 0.85) return '#ef4444'; // Crimson
    if (disruption >= 0.50) return '#f97316'; // Orange
    if (disruption >= 0.20) return '#eab308'; // Yellow
    return '#10b981'; // Emerald
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none border border-slate-800 rounded-xl shadow-2xl">
      {/* Top Map Control Bar */}
      <div className="absolute top-3 left-3 z-30 flex flex-wrap items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-750 shadow-lg text-xs">
        <div className="flex items-center gap-1.5 pr-2 border-r border-slate-700 font-mono text-cyan-400 font-semibold tracking-wider">
          <Crosshair className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '8s' }} />
          TACTICAL GRID GIS
        </div>

        {/* Engine switcher */}
        <div className="flex items-center bg-slate-950 rounded p-0.5 border border-slate-800">
          <button
            onClick={() => setMapEngine('tactical')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
              mapEngine === 'tactical'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tactical Vector
          </button>
          <button
            onClick={() => setMapEngine('google')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
              mapEngine === 'google'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Google Maps
            {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded border border-amber-500/30">
                Setup Key
              </span>
            )}
          </button>
        </div>

        {/* Sector Layer Filters */}
        <div className="flex items-center gap-1 pl-1">
          <button
            onClick={() => setActiveLayerFilter((p) => ({ ...p, power: !p.power }))}
            className={`px-2 py-1 rounded font-mono flex items-center gap-1 transition-all ${
              activeLayerFilter.power ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'opacity-40 text-slate-400'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-400" /> Power
          </button>
          <button
            onClick={() => setActiveLayerFilter((p) => ({ ...p, water: !p.water }))}
            className={`px-2 py-1 rounded font-mono flex items-center gap-1 transition-all ${
              activeLayerFilter.water ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'opacity-40 text-slate-400'
            }`}
          >
            <Droplet className="w-3 h-3 text-cyan-400" /> Water
          </button>
          <button
            onClick={() => setActiveLayerFilter((p) => ({ ...p, telecom: !p.telecom }))}
            className={`px-2 py-1 rounded font-mono flex items-center gap-1 transition-all ${
              activeLayerFilter.telecom ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'opacity-40 text-slate-400'
            }`}
          >
            <Radio className="w-3 h-3 text-purple-400" /> Telecom
          </button>
          <button
            onClick={() => setActiveLayerFilter((p) => ({ ...p, healthcare: !p.healthcare }))}
            className={`px-2 py-1 rounded font-mono flex items-center gap-1 transition-all ${
              activeLayerFilter.healthcare ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'opacity-40 text-slate-400'
            }`}
          >
            <Activity className="w-3 h-3 text-red-400" /> Hospital
          </button>
          <button
            onClick={() => setActiveLayerFilter((p) => ({ ...p, transport: !p.transport }))}
            className={`px-2 py-1 rounded font-mono flex items-center gap-1 transition-all ${
              activeLayerFilter.transport ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'opacity-40 text-slate-400'
            }`}
          >
            <Truck className="w-3 h-3 text-blue-400" /> Transit
          </button>
          <button
            onClick={() => setActiveLayerFilter((p) => ({ ...p, hazards: !p.hazards }))}
            className={`px-2 py-1 rounded font-mono flex items-center gap-1 transition-all ${
              activeLayerFilter.hazards ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-500/50' : 'opacity-40 text-slate-400'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-cyan-400" /> GeoJSON Hazards
          </button>
        </div>
      </div>

      {/* Map Zoom / Reset controls */}
      <div className="absolute bottom-4 right-4 z-30 flex flex-col gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-lg border border-slate-750 shadow-xl">
        <button
          onClick={() => setZoomLevel((z) => Math.min(3.0, z + 0.25))}
          className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.25))}
          className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            setZoomLevel(1);
            setPan({ x: 0, y: 0 });
          }}
          className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Viewport Map Content */}
      <div className="w-full h-full relative">
        {mapEngine === 'google' ? (
          <div className="w-full h-full relative bg-slate-950">
            {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-slate-950/85 backdrop-blur-sm text-center">
                <MapPin className="w-12 h-12 text-cyan-400 mb-3 animate-bounce" />
                <h3 className="text-lg font-bold text-white mb-2">Google Maps Ready</h3>
                <p className="text-sm text-slate-400 max-w-md mb-4">
                  Set <code className="text-cyan-300 bg-slate-800 px-1.5 py-0.5 rounded font-mono">VITE_GOOGLE_MAPS_API_KEY</code> in your environment to render live Google satellite imagery and street vector tiles with AdvancedMarkerElement.
                </p>
                <button
                  onClick={() => setMapEngine('tactical')}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg transition-all shadow-lg shadow-cyan-500/20"
                >
                  Use Interactive Tactical GIS Engine
                </button>
              </div>
            )}
            <div ref={googleMapRef} className="w-full h-full" />
          </div>
        ) : (
          /* Tactical SVG Vector GIS Engine */
          <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`w-full h-full cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
          >
            <svg
              className="w-full h-full"
              viewBox="0 0 1000 650"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Tactical grid background pattern */}
                <pattern id="tactical-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.8" />
                  <circle cx="0" cy="0" r="1.5" fill="#334155" />
                </pattern>

                {/* Pulsing gradient for active cascade pressure */}
                <linearGradient id="cascadePulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#f97316" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#eab308" stopOpacity="0.4" />
                </linearGradient>

                {/* Marker arrow for directed dependency edges */}
                <marker
                  id="edge-arrow"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
                </marker>
                <marker
                  id="edge-arrow-active"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
                </marker>
              </defs>

              {/* Background grid */}
              <rect width="100%" height="100%" fill="#020617" />
              <rect width="100%" height="100%" fill="url(#tactical-grid)" />

              {/* Pan & Zoom Transform Container */}
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoomLevel})`}>
                {/* 1. GeoJSON Hazard Polygons */}
                {activeLayerFilter.hazards &&
                  hazards.map((hazard) => {
                    if (!hazard.enabled) return null;
                    const geom = hazard.geoJson.geometry;
                    let polygons: number[][][] = [];

                    if (geom.type === 'Polygon') {
                      polygons = [geom.coordinates[0] as unknown as number[][]];
                    } else if (geom.type === 'MultiPolygon') {
                      polygons = (geom.coordinates as unknown as number[][][][]).map((p) => p[0]);
                    }

                    return (
                      <g key={hazard.id} className="hazard-zone-group">
                        {polygons.map((ring, idx) => {
                          const svgPoints = ring
                            .map(([lng, lat]) => {
                              const pt = projectCoord(lat, lng);
                              return `${pt.x},${pt.y}`;
                            })
                            .join(' ');

                          return (
                            <polygon
                              key={idx}
                              points={svgPoints}
                              fill={hazard.color}
                              fillOpacity={0.18 + hazard.severity * 0.15}
                              stroke={hazard.color}
                              strokeWidth={2}
                              strokeDasharray="6,4"
                              className="transition-all duration-300"
                            >
                              <animate
                                attributeName="stroke-opacity"
                                values="0.4;1.0;0.4"
                                dur="3s"
                                repeatCount="indefinite"
                              />
                            </polygon>
                          );
                        })}
                      </g>
                    );
                  })}

                {/* 2. Dependency Edges with continuous cascade pressure animation */}
                {edges.map((edge) => {
                  const sourceNode = nodes.find((n) => n.id === edge.source);
                  const targetNode = nodes.find((n) => n.id === edge.target);
                  if (!sourceNode || !targetNode) return null;

                  // Check if either node is filtered out
                  const sourceVisible =
                    (sourceNode.sector === 'POWER' && activeLayerFilter.power) ||
                    (sourceNode.sector === 'WATER' && activeLayerFilter.water) ||
                    (sourceNode.sector === 'TELECOM' && activeLayerFilter.telecom) ||
                    (sourceNode.sector === 'HEALTHCARE' && activeLayerFilter.healthcare) ||
                    (sourceNode.sector === 'TRANSPORT' && activeLayerFilter.transport);

                  const targetVisible =
                    (targetNode.sector === 'POWER' && activeLayerFilter.power) ||
                    (targetNode.sector === 'WATER' && activeLayerFilter.water) ||
                    (targetNode.sector === 'TELECOM' && activeLayerFilter.telecom) ||
                    (targetNode.sector === 'HEALTHCARE' && activeLayerFilter.healthcare) ||
                    (targetNode.sector === 'TRANSPORT' && activeLayerFilter.transport);

                  if (!sourceVisible || !targetVisible) return null;

                  const p1 = projectCoord(sourceNode.coordinates[0], sourceNode.coordinates[1]);
                  const p2 = projectCoord(targetNode.coordinates[0], targetNode.coordinates[1]);

                  const isTransmittingCascade = sourceNode.disruption > 0.35 && edge.isActive;
                  const edgeStrokeColor = isTransmittingCascade ? '#ef4444' : '#334155';
                  const strokeWidth = 1.2 + edge.weight * 2.2;

                  return (
                    <g key={edge.id} className="transition-all">
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke={edgeStrokeColor}
                        strokeWidth={strokeWidth}
                        strokeDasharray={isTransmittingCascade ? '6,3' : 'none'}
                        markerEnd={isTransmittingCascade ? 'url(#edge-arrow-active)' : 'url(#edge-arrow)'}
                        opacity={isTransmittingCascade ? 0.9 : 0.45}
                      >
                        {isTransmittingCascade && (
                          <animate
                            attributeName="stroke-dashoffset"
                            from="18"
                            to="0"
                            dur="1.2s"
                            repeatCount="indefinite"
                          />
                        )}
                      </line>

                      {/* Weight badge mid-line */}
                      <circle
                        cx={(p1.x + p2.x) / 2}
                        cy={(p1.y + p2.y) / 2}
                        r="3.5"
                        fill="#0f172a"
                        stroke={edgeStrokeColor}
                        strokeWidth="1"
                      />
                    </g>
                  );
                })}

                {/* 3. Infrastructure Nodes */}
                {nodes.map((node) => {
                  const isVisible =
                    (node.sector === 'POWER' && activeLayerFilter.power) ||
                    (node.sector === 'WATER' && activeLayerFilter.water) ||
                    (node.sector === 'TELECOM' && activeLayerFilter.telecom) ||
                    (node.sector === 'HEALTHCARE' && activeLayerFilter.healthcare) ||
                    (node.sector === 'TRANSPORT' && activeLayerFilter.transport);

                  if (!isVisible) return null;

                  const { x, y } = projectCoord(node.coordinates[0], node.coordinates[1]);
                  const isSelected = selectedNodeId === node.id;
                  const disruptionColor = getDisruptionStatusColor(node.disruption);
                  const sectorColor = getSectorColor(node.sector);
                  const hasIntervention = node.activeInterventions.length > 0;

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${x}, ${y})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNode(node.id);
                      }}
                      className="cursor-pointer group"
                    >
                      {/* Cascade pressure shockwave wave if critical/failed */}
                      {node.disruption > 0.4 && (
                        <circle
                          r="24"
                          fill="none"
                          stroke={disruptionColor}
                          strokeWidth="1.5"
                          opacity="0.6"
                        >
                          <animate
                            attributeName="r"
                            values="16;32;16"
                            dur="2s"
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="opacity"
                            values="0.8;0.0;0.8"
                            dur="2s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      )}

                      {/* Selection Aura */}
                      {isSelected && (
                        <circle
                          r="26"
                          fill="none"
                          stroke="#22d3ee"
                          strokeWidth="2.5"
                          strokeDasharray="4,3"
                        >
                          <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from="0"
                            to="360"
                            dur="8s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      )}

                      {/* Active Intervention Shield Icon */}
                      {hasIntervention && (
                        <circle
                          r="19"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2"
                        />
                      )}

                      {/* Node Center Base */}
                      <circle
                        r="14"
                        fill="#090d16"
                        stroke={disruptionColor}
                        strokeWidth={isSelected ? '3' : '2'}
                        className="transition-all duration-200 group-hover:scale-110"
                      />

                      {/* Sector Core Dot */}
                      <circle
                        r="6"
                        fill={sectorColor}
                      />

                      {/* Multi-Hop indicator badge */}
                      {node.hopReached !== null && (
                        <g transform="translate(10, -12)">
                          <rect
                            width="18"
                            height="13"
                            rx="3"
                            fill="#0f172a"
                            stroke={disruptionColor}
                            strokeWidth="1"
                          />
                          <text
                            x="9"
                            y="9.5"
                            textAnchor="middle"
                            fill="#f8fafc"
                            fontSize="8"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            H{node.hopReached}
                          </text>
                        </g>
                      )}

                      {/* Node Label Card */}
                      <g transform="translate(0, 22)">
                        <rect
                          x="-50"
                          y="0"
                          width="100"
                          height="18"
                          rx="4"
                          fill="#0b1120"
                          fillOpacity="0.9"
                          stroke={isSelected ? '#22d3ee' : '#1e293b'}
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="12"
                          textAnchor="middle"
                          fill="#e2e8f0"
                          fontSize="9"
                          fontFamily="sans-serif"
                          fontWeight="600"
                          className="pointer-events-none"
                        >
                          {node.name.length > 15 ? node.name.substring(0, 13) + '…' : node.name}
                        </text>
                      </g>

                      {/* Disruption % Tag */}
                      <g transform="translate(0, 39)">
                        <rect
                          x="-24"
                          y="0"
                          width="48"
                          height="13"
                          rx="3"
                          fill="#020617"
                          stroke={disruptionColor}
                          strokeWidth="0.8"
                        />
                        <text
                          x="0"
                          y="9.5"
                          textAnchor="middle"
                          fill={disruptionColor}
                          fontSize="8.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {(node.disruption * 100).toFixed(0)}% fail
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>
        )}
      </div>

      {/* Selected Node Real-Time Inspection HUD */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 z-30 w-80 bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700 shadow-2xl p-4 text-xs font-sans text-slate-200">
          <div className="flex items-start justify-between border-b border-slate-800 pb-2 mb-2">
            <div>
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-cyan-400 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                {selectedNode.sector} // {selectedNode.subType}
              </div>
              <h4 className="font-bold text-sm text-white">{selectedNode.name}</h4>
            </div>
            <button
              onClick={() => onSelectNode(null)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2.5">
            {/* Disruption Meter */}
            <div>
              <div className="flex justify-between items-center text-[11px] mb-1">
                <span className="text-slate-400 font-mono">Normalized Disruption:</span>
                <span
                  style={{ color: getDisruptionStatusColor(selectedNode.disruption) }}
                  className="font-mono font-bold"
                >
                  {(selectedNode.disruption * 100).toFixed(1)}% ({selectedNode.status})
                </span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${selectedNode.disruption * 100}%`,
                    backgroundColor: getDisruptionStatusColor(selectedNode.disruption),
                  }}
                />
              </div>
            </div>

            {/* Cascade Pressure & Threshold */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-2 rounded-lg border border-slate-800/80 font-mono text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">Inbound Pressure:</span>
                <span
                  className={`font-bold ${
                    selectedNode.cascadePressure > selectedNode.failureThreshold
                      ? 'text-red-400'
                      : 'text-amber-300'
                  }`}
                >
                  {selectedNode.cascadePressure.toFixed(3)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Failure Threshold:</span>
                <span className="font-bold text-slate-300">
                  {selectedNode.failureThreshold.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Cascade Hop:</span>
                <span className="font-bold text-cyan-400">
                  {selectedNode.hopReached !== null ? `Hop ${selectedNode.hopReached}` : 'Safe'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Pop. Served:</span>
                <span className="font-bold text-slate-200">
                  {selectedNode.populationServed.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Backup generator */}
            {selectedNode.backupPowerHours > 0 && (
              <div className="flex items-center justify-between text-[11px] text-slate-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded">
                <span className="flex items-center gap-1 text-amber-300">
                  <Zap className="w-3 h-3" /> Backup Reserves:
                </span>
                <span className="font-mono font-bold">{selectedNode.backupPowerHours} hrs rated</span>
              </div>
            )}

            {/* Active Interventions on Node */}
            <div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wide block mb-1">
                Active Mitigations:
              </span>
              {selectedNode.activeInterventions.length === 0 ? (
                <div className="text-[11px] text-slate-500 italic bg-slate-950/50 p-1.5 rounded text-center">
                  No typed interventions deployed yet
                </div>
              ) : (
                <div className="space-y-1">
                  {selectedNode.activeInterventions.map((intId) => {
                    const item = catalog.find((i) => i.id === intId);
                    return (
                      <div
                        key={intId}
                        className="flex items-center justify-between bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 px-2 py-1 rounded text-[11px]"
                      >
                        <span className="flex items-center gap-1 font-medium">
                          <Shield className="w-3 h-3" />
                          {item ? item.name : intId}
                        </span>
                        <span className="font-mono text-[10px] bg-emerald-500/20 px-1 rounded">
                          ACTIVE
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
