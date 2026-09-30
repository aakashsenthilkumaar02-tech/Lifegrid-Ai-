/**
 * LIFEGRID AI — Prototype 0.2 Domain Types
 * Infrastructure cascade simulation, normalized metrics, typed interventions, and GeoJSON hazards.
 */

export type InfrastructureSector = 'POWER' | 'WATER' | 'TELECOM' | 'HEALTHCARE' | 'TRANSPORT';

export type NodeStatus = 'NOMINAL' | 'DEGRADED' | 'CRITICAL' | 'FAILED';

export interface InfrastructureNode {
  id: string;
  name: string;
  sector: InfrastructureSector;
  subType: string;
  coordinates: [number, number]; // [lat, lng]
  nominalCapacity: number;
  capacityUnit: string;
  backupPowerHours: number;
  disruption: number; // 0.0 (nominal) to 1.0 (total failure)
  cascadePressure: number; // Accumulated continuous cascade pressure from inbound nodes + hazards
  failureThreshold: number; // Threshold at which node starts cascading (0.0 to 1.0)
  status: NodeStatus;
  hopReached: number | null; // At which cascade propagation hop the node disrupted
  populationServed: number;
  activeInterventions: string[]; // Active intervention type IDs deployed
  description?: string;
}

export interface DependencyEdge {
  id: string;
  source: string; // Upstream node ID
  target: string; // Downstream dependent node ID
  weight: number; // Continuous coupling multiplier (0.0 to 1.0)
  transferLagHours: number;
  description: string;
  isActive: boolean;
}

export interface GeoJsonHazardLayer {
  id: string;
  name: string;
  hazardType: 'HURRICANE_STORM_SURGE' | 'FLASH_FLOOD' | 'SEISMIC_SHAKING' | 'WILDFIRE' | 'GRID_OVERVOLTAGE';
  severity: number; // 0.0 to 1.0
  color: string;
  description: string;
  enabled: boolean;
  // GeoJSON Polygon / MultiPolygon Feature
  geoJson: {
    type: 'Feature';
    properties: {
      name: string;
      hazardType: string;
      peakDisruption: number;
      radiusKm?: number;
    };
    geometry: {
      type: 'Polygon' | 'MultiPolygon';
      coordinates: number[][][] | number[][][][]; // [[[lng, lat], ...]]
    };
  };
}

export type InterventionResourceType = 
  | 'MOBILE_DIESEL_MICROGRID'
  | 'FLOOD_BARRIER_DEPLOYMENT'
  | 'SATELLITE_COMMS_BACKHAUL'
  | 'HIGH_CAPACITY_WATER_PUMP'
  | 'EMERGENCY_FIELD_HOSPITAL'
  | 'CORRIDOR_CLEARANCE_TEAM';

export interface InterventionType {
  id: string;
  name: string;
  sector: InfrastructureSector | 'ALL';
  resourceType: InterventionResourceType;
  description: string;
  capacity: {
    amount: number;
    unit: string;
    description: string;
  };
  unitCost: number; // in USD
  deploymentTimeHours: number;
  pressureReduction: number; // Pressure relief provided to node (0.0 to 1.0)
  disruptionMitigation: number; // Maximum direct disruption reduction (0.0 to 1.0)
  availableInventory: number;
  iconName: string;
}

export interface ActiveIntervention {
  id: string;
  interventionTypeId: string;
  targetNodeId: string;
  deployedAtStep: number;
  status: 'DEPLOYED' | 'TRANSIT' | 'ACTIVE';
}

export interface DisruptionMetrics {
  overallCommunityDisruption: number; // 0.0 to 1.0
  resilienceIndex: number; // 0.0 to 1.0 (1.0 - disruption)
  powerDisruption: number; // 0.0 to 1.0
  waterDisruption: number; // 0.0 to 1.0
  telecomDisruption: number; // 0.0 to 1.0
  healthcareDisruption: number; // 0.0 to 1.0
  transportDisruption: number; // 0.0 to 1.0
  populationWithoutPower: number;
  populationWithoutWater: number;
  populationWithoutTelecom: number;
  criticalFacilitiesFailed: number;
  totalPopulationImpacted: number;
}

export interface StepHistoryPoint {
  step: number;
  timestamp: string;
  metrics: DisruptionMetrics;
  failedNodeCount: number;
  maxHop: number;
}

export interface ScenarioSession {
  id: string;
  title: string;
  scenarioType: string;
  description: string;
  center: [number, number]; // [lat, lng]
  zoom: number;
  step: number;
  maxSteps: number;
  nodes: InfrastructureNode[];
  edges: DependencyEdge[];
  hazards: GeoJsonHazardLayer[];
  interventions: ActiveIntervention[];
  budgetRemaining: number;
  totalBudget: number;
  state_hash: string; // Optimistic concurrency guard
  updatedAt: string;
  metrics: DisruptionMetrics;
  history: StepHistoryPoint[];
  // Baseline metrics prior to interventions for before/after comparison
  baselineMetrics?: DisruptionMetrics;
  baselineNodes?: InfrastructureNode[];
}

export interface InterventionDryRunResult {
  interventionTypeId: string;
  targetNodeId: string;
  projectedMetrics: DisruptionMetrics;
  deltaDisruption: number; // Negative means reduction in disruption
  deltaPopulationProtected: number;
  severedCascadeChains: number;
  hopsAverted: number;
  targetNodeProjectedDisruption: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolInvocations?: {
    toolName: string;
    args: Record<string, unknown>;
    result?: Record<string, unknown>;
  }[];
}
