/**
 * LIFEGRID AI — Prototype 0.2 Cascade Engine
 * Implements continuous cascade pressure, multi-hop propagation,
 * GeoJSON polygon spatial hazard pressure, typed intervention mitigations,
 * and state_hash optimistic concurrency guard.
 */

import {
  InfrastructureNode,
  DependencyEdge,
  GeoJsonHazardLayer,
  ActiveIntervention,
  InterventionType,
  DisruptionMetrics,
  ScenarioSession,
  InterventionDryRunResult,
} from '../types/lifegrid';

// Helper for Ray-casting point-in-polygon algorithm
export function isPointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [lat, lng] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1]; // lng
    const yi = polygon[i][0]; // lat
    const xj = polygon[j][1]; // lng
    const yj = polygon[j][0]; // lat

    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Distance between two lat/lng coordinates in km (Haversine formula)
export function calculateDistanceKm(coord1: [number, number], coord2: [number, number]): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((coord2[0] - coord1[0]) * Math.PI) / 180;
  const dLon = ((coord2[1] - coord1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1[0] * Math.PI) / 180) *
      Math.cos((coord2[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate direct hazard exposure pressure for a node from all active GeoJSON hazard layers
export function calculateNodeHazardPressure(
  node: InfrastructureNode,
  hazards: GeoJsonHazardLayer[]
): number {
  let maxHazardPressure = 0;

  for (const hazard of hazards) {
    if (!hazard.enabled) continue;

    const geom = hazard.geoJson.geometry;
    let inside = false;

    if (geom.type === 'Polygon') {
      const coords = geom.coordinates as number[][][];
      const ring = coords[0]; // exterior ring: [[lng, lat], ...]
      const polyCoords: number[][] = ring.map(([lng, lat]) => [lat, lng]);
      inside = isPointInPolygon(node.coordinates, polyCoords);
    } else if (geom.type === 'MultiPolygon') {
      const coords = geom.coordinates as number[][][][];
      for (const polygon of coords) {
        const ring = polygon[0];
        const polyCoords: number[][] = ring.map(([lng, lat]) => [lat, lng]);
        if (isPointInPolygon(node.coordinates, polyCoords)) {
          inside = true;
          break;
        }
      }
    }

    if (inside) {
      // Direct hit inside hazard zone
      const directPressure = hazard.severity * (hazard.geoJson.properties.peakDisruption || 1.0);
      maxHazardPressure = Math.max(maxHazardPressure, directPressure);
    } else {
      // Buffer / proximity exposure within 3 km of polygon centroid
      const ring: number[][] = geom.type === 'Polygon'
        ? (geom.coordinates as number[][][])[0]
        : (geom.coordinates as number[][][][])[0][0];
      const avgLat = ring.reduce((sum, p) => sum + p[1], 0) / ring.length;
      const avgLng = ring.reduce((sum, p) => sum + p[0], 0) / ring.length;
      const dist = calculateDistanceKm(node.coordinates, [avgLat, avgLng]);
      if (dist < 4.0) {
        // Linear proximity attenuation
        const attenuated = hazard.severity * Math.max(0, 1 - dist / 4.0) * 0.4;
        maxHazardPressure = Math.max(maxHazardPressure, attenuated);
      }
    }
  }

  return Math.min(1.0, maxHazardPressure);
}

// Deterministic state_hash for optimistic concurrency guard
export function generateStateHash(
  step: number,
  nodes: InfrastructureNode[],
  interventions: ActiveIntervention[],
  hazards: GeoJsonHazardLayer[]
): string {
  const nodeSignature = nodes
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((n) => `${n.id}:${n.disruption.toFixed(3)}:${n.cascadePressure.toFixed(3)}:${n.status}:${n.hopReached ?? 'x'}`)
    .join('|');

  const intSignature = interventions
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((i) => `${i.interventionTypeId}->${i.targetNodeId}:${i.status}`)
    .join(',');

  const hazardSignature = hazards
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((h) => `${h.id}:${h.enabled ? '1' : '0'}:${h.severity.toFixed(2)}`)
    .join(';');

  const raw = `step=${step};nodes=[${nodeSignature}];ints=[${intSignature}];hazards=[${hazardSignature}]`;

  // DJB2 + FNV-1a hybrid 64-bit hex hash
  let h1 = 0x811c9dc5;
  let h2 = 5381;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw.charCodeAt(i);
    h1 ^= ch;
    h1 = (h1 * 0x01000193) >>> 0;
    h2 = ((h2 << 5) + h2 + ch) >>> 0;
  }
  const hex1 = h1.toString(16).padStart(8, '0');
  const hex2 = h2.toString(16).padStart(8, '0');
  return `0x${hex1}${hex2}`;
}

// Compute normalized 0..1 service disruption metrics
export function computeDisruptionMetrics(
  nodes: InfrastructureNode[]
): DisruptionMetrics {
  let totalPop = 0;
  let popNoPower = 0;
  let popNoWater = 0;
  let popNoTelecom = 0;
  let criticalFailedCount = 0;

  let powerWeightedSum = 0;
  let powerTotalCapacity = 0;

  let waterWeightedSum = 0;
  let waterTotalCapacity = 0;

  let telecomWeightedSum = 0;
  let telecomTotalCapacity = 0;

  let healthWeightedSum = 0;
  let healthTotalCapacity = 0;

  let transportWeightedSum = 0;
  let transportTotalCapacity = 0;

  for (const node of nodes) {
    totalPop += node.populationServed;
    const capacityWeight = Math.max(1, node.nominalCapacity);

    if (node.status === 'CRITICAL' || node.status === 'FAILED') {
      criticalFailedCount++;
    }

    switch (node.sector) {
      case 'POWER':
        powerWeightedSum += node.disruption * capacityWeight;
        powerTotalCapacity += capacityWeight;
        popNoPower += Math.round(node.populationServed * node.disruption);
        break;
      case 'WATER':
        waterWeightedSum += node.disruption * capacityWeight;
        waterTotalCapacity += capacityWeight;
        popNoWater += Math.round(node.populationServed * node.disruption);
        break;
      case 'TELECOM':
        telecomWeightedSum += node.disruption * capacityWeight;
        telecomTotalCapacity += capacityWeight;
        popNoTelecom += Math.round(node.populationServed * node.disruption);
        break;
      case 'HEALTHCARE':
        healthWeightedSum += node.disruption * capacityWeight;
        healthTotalCapacity += capacityWeight;
        break;
      case 'TRANSPORT':
        transportWeightedSum += node.disruption * capacityWeight;
        transportTotalCapacity += capacityWeight;
        break;
    }
  }

  const powerDisruption = powerTotalCapacity > 0 ? powerWeightedSum / powerTotalCapacity : 0;
  const waterDisruption = waterTotalCapacity > 0 ? waterWeightedSum / waterTotalCapacity : 0;
  const telecomDisruption = telecomTotalCapacity > 0 ? telecomWeightedSum / telecomTotalCapacity : 0;
  const healthcareDisruption = healthTotalCapacity > 0 ? healthWeightedSum / healthTotalCapacity : 0;
  const transportDisruption = transportTotalCapacity > 0 ? transportWeightedSum / transportTotalCapacity : 0;

  // Weighted overall disruption
  const overallCommunityDisruption =
    powerDisruption * 0.30 +
    waterDisruption * 0.25 +
    telecomDisruption * 0.15 +
    healthcareDisruption * 0.20 +
    transportDisruption * 0.10;

  const totalPopulationImpacted = Math.max(
    popNoPower,
    popNoWater,
    Math.round((popNoPower + popNoWater + popNoTelecom) / 2.2)
  );

  return {
    overallCommunityDisruption: Number(overallCommunityDisruption.toFixed(3)),
    resilienceIndex: Number(Math.max(0, 1 - overallCommunityDisruption).toFixed(3)),
    powerDisruption: Number(powerDisruption.toFixed(3)),
    waterDisruption: Number(waterDisruption.toFixed(3)),
    telecomDisruption: Number(telecomDisruption.toFixed(3)),
    healthcareDisruption: Number(healthcareDisruption.toFixed(3)),
    transportDisruption: Number(transportDisruption.toFixed(3)),
    populationWithoutPower: popNoPower,
    populationWithoutWater: popNoWater,
    populationWithoutTelecom: popNoTelecom,
    criticalFacilitiesFailed: criticalFailedCount,
    totalPopulationImpacted,
  };
}

// Run single simulation step with continuous cascade pressure and multi-hop propagation
export function simulateCascadeStep(
  session: ScenarioSession,
  catalog: InterventionType[]
): {
  nextNodes: InfrastructureNode[];
  nextEdges: DependencyEdge[];
  nextStep: number;
  nextMetrics: DisruptionMetrics;
  nextHash: string;
} {
  const currentStep = session.step;
  const nextStep = currentStep + 1;
  const catalogMap = new Map<string, InterventionType>(catalog.map((i) => [i.id, i]));

  // 1. Group active interventions by target node
  const nodeInterventions = new Map<string, InterventionType[]>();
  for (const active of session.interventions) {
    const item = catalogMap.get(active.interventionTypeId);
    if (item && active.status === 'ACTIVE') {
      const list = nodeInterventions.get(active.targetNodeId) || [];
      list.push(item);
      nodeInterventions.set(active.targetNodeId, list);
    }
  }

  // 2. Build upstream adjacency map for fast incoming edge traversal
  const incomingEdgesMap = new Map<string, DependencyEdge[]>();
  for (const edge of session.edges) {
    if (!edge.isActive) continue;
    const list = incomingEdgesMap.get(edge.target) || [];
    list.push(edge);
    incomingEdgesMap.set(edge.target, list);
  }

  const nodeMap = new Map<string, InfrastructureNode>(
    session.nodes.map((n) => [n.id, n])
  );

  // 3. Compute continuous cascade pressure for each node
  const nextNodes: InfrastructureNode[] = session.nodes.map((node) => {
    // A. Direct hazard pressure from GeoJSON polygons
    const hazardPressure = calculateNodeHazardPressure(node, session.hazards);

    // B. Upstream cascade coupling pressure
    const incomingEdges = incomingEdgesMap.get(node.id) || [];
    let inboundCascadePressure = 0;

    for (const edge of incomingEdges) {
      const upstreamNode = nodeMap.get(edge.source);
      if (upstreamNode) {
        // Continuous pressure transfer = edge weight * upstream disruption
        inboundCascadePressure += edge.weight * upstreamNode.disruption;
      }
    }

    // C. Calculate intervention relief
    const appliedInterventions = nodeInterventions.get(node.id) || [];
    let pressureRelief = 0;
    let disruptionMitigation = 0;

    for (const int of appliedInterventions) {
      pressureRelief += int.pressureReduction;
      disruptionMitigation += int.disruptionMitigation;
    }

    // D. Backup power buffer (dampens initial grid pressure for the duration of backup hours)
    let backupDamping = 0;
    if (node.backupPowerHours > 0 && currentStep * 2 < node.backupPowerHours) {
      // Absorbs power-dependent cascade pressure while fuel lasts
      backupDamping = 0.45 * (1 - (currentStep * 2) / node.backupPowerHours);
    }

    // Net continuous cascade pressure
    const rawTotalPressure = hazardPressure * 0.95 + inboundCascadePressure;
    const netPressure = Math.max(0, rawTotalPressure - pressureRelief - backupDamping);

    // E. Dynamic disruption propagation update
    let nextDisruption = node.disruption;
    let nextHopReached = node.hopReached;

    if (netPressure > node.failureThreshold) {
      // Exceeds failure threshold: disruption ramps up continuously
      const pressureExcess = netPressure - node.failureThreshold;
      const propagationRate = 0.28 + pressureExcess * 0.35;
      nextDisruption = Math.min(1.0, nextDisruption + propagationRate);

      // Multi-hop assignment
      if (nextHopReached === null) {
        if (hazardPressure > node.failureThreshold) {
          nextHopReached = 0; // Ground zero / direct hazard
        } else {
          // Find max hop of upstream failed node
          let maxUpstreamHop = -1;
          for (const edge of incomingEdges) {
            const up = nodeMap.get(edge.source);
            if (up && up.disruption > 0.3 && up.hopReached !== null) {
              maxUpstreamHop = Math.max(maxUpstreamHop, up.hopReached);
            }
          }
          nextHopReached = maxUpstreamHop >= 0 ? maxUpstreamHop + 1 : 1;
        }
      }
    } else {
      // Pressure is below failure threshold
      if (appliedInterventions.length > 0 && nextDisruption > 0) {
        // Active interventions facilitate repair and recovery
        const recoveryRate = 0.22 * Math.min(1.0, disruptionMitigation);
        nextDisruption = Math.max(0, nextDisruption - recoveryRate);
      } else if (netPressure < 0.1 && nextDisruption > 0.05) {
        // Natural stabilization if pressure completely cleared
        nextDisruption = Math.max(0, nextDisruption - 0.05);
      }
    }

    // F. Status classification
    let status: InfrastructureNode['status'] = 'NOMINAL';
    if (nextDisruption >= 0.85) {
      status = 'FAILED';
    } else if (nextDisruption >= 0.50) {
      status = 'CRITICAL';
    } else if (nextDisruption >= 0.20) {
      status = 'DEGRADED';
    }

    // G. Reset hop if completely restored
    if (nextDisruption < 0.1) {
      nextHopReached = null;
    }

    return {
      ...node,
      cascadePressure: Number(netPressure.toFixed(3)),
      disruption: Number(nextDisruption.toFixed(3)),
      status,
      hopReached: nextHopReached,
      activeInterventions: appliedInterventions.map((i) => i.id),
    };
  });

  const nextMetrics = computeDisruptionMetrics(nextNodes);
  const nextHash = generateStateHash(nextStep, nextNodes, session.interventions, session.hazards);

  return {
    nextNodes,
    nextEdges: session.edges,
    nextStep,
    nextMetrics,
    nextHash,
  };
}

// Perform an isolated "What-If" Dry Run for testing interventions without committing
export function dryRunTestIntervention(
  session: ScenarioSession,
  catalog: InterventionType[],
  targetNodeId: string,
  interventionTypeId: string,
  projectionSteps = 2
): InterventionDryRunResult {
  const catalogMap = new Map<string, InterventionType>(catalog.map((i) => [i.id, i]));
  const item = catalogMap.get(interventionTypeId);

  if (!item) {
    throw new Error(`Intervention type ${interventionTypeId} not found in catalog.`);
  }

  // Clone session state
  let clonedSession: ScenarioSession = JSON.parse(JSON.stringify(session));

  // Add virtual active intervention
  clonedSession.interventions.push({
    id: `dryrun_${Date.now()}`,
    interventionTypeId,
    targetNodeId,
    deployedAtStep: clonedSession.step,
    status: 'ACTIVE',
  });

  // Run simulation forward projectionSteps
  for (let s = 0; s < projectionSteps; s++) {
    const stepResult = simulateCascadeStep(clonedSession, catalog);
    clonedSession = {
      ...clonedSession,
      nodes: stepResult.nextNodes,
      step: stepResult.nextStep,
      metrics: stepResult.nextMetrics,
      state_hash: stepResult.nextHash,
    };
  }

  // Compare against baseline without this intervention
  let unmitigatedSession: ScenarioSession = JSON.parse(JSON.stringify(session));
  for (let s = 0; s < projectionSteps; s++) {
    const baselineStep = simulateCascadeStep(unmitigatedSession, catalog);
    unmitigatedSession = {
      ...unmitigatedSession,
      nodes: baselineStep.nextNodes,
      step: baselineStep.nextStep,
      metrics: baselineStep.nextMetrics,
      state_hash: baselineStep.nextHash,
    };
  }

  const deltaDisruption = Number(
    (clonedSession.metrics.overallCommunityDisruption - unmitigatedSession.metrics.overallCommunityDisruption).toFixed(3)
  );

  const deltaPopulationProtected = Math.max(
    0,
    unmitigatedSession.metrics.totalPopulationImpacted - clonedSession.metrics.totalPopulationImpacted
  );

  // Count severed cascade chains
  let severedCascadeChains = 0;
  for (const edge of clonedSession.edges) {
    if (edge.source === targetNodeId) {
      const baselineTargetNode = unmitigatedSession.nodes.find((n) => n.id === edge.target);
      const mitigatedTargetNode = clonedSession.nodes.find((n) => n.id === edge.target);
      if (baselineTargetNode && mitigatedTargetNode) {
        if (baselineTargetNode.disruption > 0.4 && mitigatedTargetNode.disruption <= 0.4) {
          severedCascadeChains++;
        }
      }
    }
  }

  const targetNode = clonedSession.nodes.find((n) => n.id === targetNodeId);

  return {
    interventionTypeId,
    targetNodeId,
    projectedMetrics: clonedSession.metrics,
    deltaDisruption,
    deltaPopulationProtected,
    severedCascadeChains,
    hopsAverted: severedCascadeChains > 0 ? 1 : 0,
    targetNodeProjectedDisruption: targetNode ? targetNode.disruption : 0,
  };
}
