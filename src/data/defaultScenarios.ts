/**
 * LIFEGRID AI — Prototype 0.2
 * Default Infrastructure Scenarios, Typed Intervention Catalog, and GeoJSON Hazard Layers.
 */

import {
  ScenarioSession,
  InterventionType,
  GeoJsonHazardLayer,
  InfrastructureNode,
  DependencyEdge,
} from '../types/lifegrid';
import { computeDisruptionMetrics, generateStateHash } from '../engine/cascadeEngine';

// Typed intervention resources with capacity and operational specs
export const DEFAULT_INTERVENTION_CATALOG: InterventionType[] = [
  {
    id: 'int_mobile_microgrid',
    name: 'Mobile 5MW Diesel Microgrid',
    sector: 'POWER',
    resourceType: 'MOBILE_DIESEL_MICROGRID',
    description: 'Rapid-deploy containerized diesel generator with grid synchronization unit to restore critical nodes.',
    capacity: {
      amount: 5.0,
      unit: 'MW',
      description: 'Powers up to 2 high-voltage distribution switchyards or a major hospital complex',
    },
    unitCost: 125000,
    deploymentTimeHours: 4,
    pressureReduction: 0.85,
    disruptionMitigation: 0.90,
    availableInventory: 4,
    iconName: 'Zap',
  },
  {
    id: 'int_flood_barrier',
    name: 'Defensive Inundation Barrier (3.5km)',
    sector: 'WATER',
    resourceType: 'FLOOD_BARRIER_DEPLOYMENT',
    description: 'Rapid-fill modular geomembrane barrier wall preventing surge water ingress into substations and pumps.',
    capacity: {
      amount: 3.5,
      unit: 'km',
      description: 'Withstands up to 9.5 ft coastal surge elevation',
    },
    unitCost: 85000,
    deploymentTimeHours: 6,
    pressureReduction: 0.70,
    disruptionMitigation: 0.60,
    availableInventory: 5,
    iconName: 'ShieldAlert',
  },
  {
    id: 'int_sat_backhaul',
    name: 'Satellite Emergency Transceiver Mast',
    sector: 'TELECOM',
    resourceType: 'SATELLITE_COMMS_BACKHAUL',
    description: 'Trailer-mounted Starlink / O3b military-grade tactical ground station bypassing severed terrestrial fiber.',
    capacity: {
      amount: 15.0,
      unit: 'Gbps',
      description: 'Maintains 911 dispatch, hospital telemetry, and 8 cellular relay sectors',
    },
    unitCost: 45000,
    deploymentTimeHours: 2,
    pressureReduction: 0.90,
    disruptionMitigation: 0.85,
    availableInventory: 6,
    iconName: 'Radio',
  },
  {
    id: 'int_high_pump',
    name: 'High-Volume Dewatering Pump (15k gpm)',
    sector: 'WATER',
    resourceType: 'HIGH_CAPACITY_WATER_PUMP',
    description: 'Heavy submersible diesel dewatering skid to evacuate flooded basements, switchgear vaults, and pump wells.',
    capacity: {
      amount: 15000,
      unit: 'gpm',
      description: 'Clears 900,000 gallons per hour from electrical and water vaults',
    },
    unitCost: 65000,
    deploymentTimeHours: 3,
    pressureReduction: 0.75,
    disruptionMitigation: 0.80,
    availableInventory: 5,
    iconName: 'Droplet',
  },
  {
    id: 'int_field_hospital',
    name: 'Mobile Field Triage & Surge Unit',
    sector: 'HEALTHCARE',
    resourceType: 'EMERGENCY_FIELD_HOSPITAL',
    description: 'Inflatable negative-pressure medical compound with internal generators and critical patient life support.',
    capacity: {
      amount: 80,
      unit: 'Beds',
      description: 'Provides autonomous Level-2 trauma stabilization & ICU surge for 72 hrs',
    },
    unitCost: 190000,
    deploymentTimeHours: 8,
    pressureReduction: 0.65,
    disruptionMitigation: 0.75,
    availableInventory: 2,
    iconName: 'Activity',
  },
  {
    id: 'int_transit_clearance',
    name: 'Heavy Engineering Clearance Brigade',
    sector: 'TRANSPORT',
    resourceType: 'CORRIDOR_CLEARANCE_TEAM',
    description: 'Excavators, mobile cranes, and debris clearance convoy reopening critical evacuation causeways.',
    capacity: {
      amount: 4500,
      unit: 'veh/hr',
      description: 'Restores primary emergency transit arterial capacity through choke points',
    },
    unitCost: 55000,
    deploymentTimeHours: 3,
    pressureReduction: 0.80,
    disruptionMitigation: 0.70,
    availableInventory: 3,
    iconName: 'Truck',
  },
];

// Hurricane Surge GeoJSON Layer (Around Coastal Gulf / New Orleans-style Metro)
const HURRICANE_SURGE_GEOJSON: GeoJsonHazardLayer = {
  id: 'hazard_surge_cat4',
  name: 'Category 4 Inundation Surge (8.5ft)',
  hazardType: 'HURRICANE_STORM_SURGE',
  severity: 0.92,
  color: '#06b6d4', // Cyan
  description: 'Ocean surge penetration encroaching coastal wetlands, inundating low-elevation substations and coastal pump arrays.',
  enabled: true,
  geoJson: {
    type: 'Feature',
    properties: {
      name: 'Cat 4 Storm Surge Envelope',
      hazardType: 'HURRICANE_STORM_SURGE',
      peakDisruption: 0.95,
      radiusKm: 12.0,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-90.18, 29.98],
          [-90.11, 30.04],
          [-89.96, 30.07],
          [-89.88, 30.01],
          [-89.92, 29.92],
          [-90.04, 29.90],
          [-90.15, 29.93],
          [-90.18, 29.98],
        ],
      ],
    },
  },
};

const FLASH_FLOOD_GEOJSON: GeoJsonHazardLayer = {
  id: 'hazard_flash_flood',
  name: 'River Basin Flash Overflow Corridor',
  hazardType: 'FLASH_FLOOD',
  severity: 0.75,
  color: '#3b82f6', // Blue
  description: '100-year tributary surge exceeding retention capacity, threatening adjacent wastewater filtration and transit culverts.',
  enabled: true,
  geoJson: {
    type: 'Feature',
    properties: {
      name: 'River Basin Overflow Zone',
      hazardType: 'FLASH_FLOOD',
      peakDisruption: 0.80,
      radiusKm: 6.5,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-90.10, 29.96],
          [-90.05, 30.02],
          [-89.98, 29.99],
          [-90.02, 29.93],
          [-90.10, 29.96],
        ],
      ],
    },
  },
};

const SEISMIC_FAULT_GEOJSON: GeoJsonHazardLayer = {
  id: 'hazard_seismic_shear',
  name: 'Seismic Intensity VIII Rupture Belt',
  hazardType: 'SEISMIC_SHAKING',
  severity: 0.88,
  color: '#f97316', // Orange
  description: 'Tectonic lateral displacement causing transformer busbar shearing and underground aqueduct fracture.',
  enabled: true,
  geoJson: {
    type: 'Feature',
    properties: {
      name: 'Fault Liquefaction Zone',
      hazardType: 'SEISMIC_SHAKING',
      peakDisruption: 0.90,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-90.15, 30.02],
          [-90.02, 30.05],
          [-89.92, 29.97],
          [-90.01, 29.92],
          [-90.15, 30.02],
        ],
      ],
    },
  },
};

// Scenario 1: Coastal Metropolis Hurricane Surge
export function createScenario1(): ScenarioSession {
  const nodes: InfrastructureNode[] = [
    // Power Grid
    {
      id: 'node_pwr_coastal_sub',
      name: 'Coastal Inundation Substation 230kV',
      sector: 'POWER',
      subType: 'High-Voltage Transmission Substation',
      coordinates: [30.025, -90.082],
      nominalCapacity: 350,
      capacityUnit: 'MVA',
      backupPowerHours: 0,
      disruption: 0.88, // Initial hit by storm surge
      cascadePressure: 0.92,
      failureThreshold: 0.40,
      status: 'CRITICAL',
      hopReached: 0,
      populationServed: 120000,
      activeInterventions: [],
      description: 'Major bulk power intake step-down switchyard located near the coastal levee perimeter.',
    },
    {
      id: 'node_pwr_midtown_dist',
      name: 'Midtown Distribution Substation 115kV',
      sector: 'POWER',
      subType: 'Urban Distribution Substation',
      coordinates: [29.980, -90.040],
      nominalCapacity: 180,
      capacityUnit: 'MVA',
      backupPowerHours: 4,
      disruption: 0.45,
      cascadePressure: 0.65,
      failureThreshold: 0.45,
      status: 'DEGRADED',
      hopReached: 1,
      populationServed: 95000,
      activeInterventions: [],
      description: 'Distributes feed to Midtown commercial center, water pumps, and emergency communications backbone.',
    },
    {
      id: 'node_pwr_upland_gen',
      name: 'Upland Combined-Cycle Power Station',
      sector: 'POWER',
      subType: 'Thermal Power Generation Station',
      coordinates: [29.945, -90.140],
      nominalCapacity: 600,
      capacityUnit: 'MW',
      backupPowerHours: 48,
      disruption: 0.05,
      cascadePressure: 0.10,
      failureThreshold: 0.60,
      status: 'NOMINAL',
      hopReached: null,
      populationServed: 280000,
      activeInterventions: [],
      description: 'Elevated inland base-load generating station isolated from coastal storm surge.',
    },

    // Water & Sanitation
    {
      id: 'node_wat_treatment_east',
      name: 'East Estuary Water Treatment Works',
      sector: 'WATER',
      subType: 'Potable Water Filtration Plant',
      coordinates: [30.010, -90.020],
      nominalCapacity: 85,
      capacityUnit: 'MGD',
      backupPowerHours: 8,
      disruption: 0.55,
      cascadePressure: 0.72,
      failureThreshold: 0.35,
      status: 'CRITICAL',
      hopReached: 1,
      populationServed: 160000,
      activeInterventions: [],
      description: 'Primary municipal drinking water facility; dependent on Substation 230kV for high-service pump power.',
    },
    {
      id: 'node_wat_booster_south',
      name: 'Southern Pressure Booster Station',
      sector: 'WATER',
      subType: 'Aqueduct Booster Pump Station',
      coordinates: [29.965, -90.065],
      nominalCapacity: 45,
      capacityUnit: 'MGD',
      backupPowerHours: 6,
      disruption: 0.25,
      cascadePressure: 0.42,
      failureThreshold: 0.40,
      status: 'DEGRADED',
      hopReached: 2,
      populationServed: 80000,
      activeInterventions: [],
      description: 'Maintains hydraulic pressure to hospital district and fire hydrant network.',
    },

    // Telecom & 911
    {
      id: 'node_tel_metro_switch',
      name: 'Downtown Central Telecom Switching Gateway',
      sector: 'TELECOM',
      subType: 'Tier-4 Fiber Central Office & 911 PSAP',
      coordinates: [29.972, -90.025],
      nominalCapacity: 120,
      capacityUnit: 'Tbps',
      backupPowerHours: 12,
      disruption: 0.30,
      cascadePressure: 0.50,
      failureThreshold: 0.50,
      status: 'DEGRADED',
      hopReached: 2,
      populationServed: 250000,
      activeInterventions: [],
      description: 'Public safety 911 dispatch primary center and municipal emergency fiber cross-connect.',
    },
    {
      id: 'node_tel_tower_marsh',
      name: 'Coastal Ridge Cellular & Microwave Tower',
      sector: 'TELECOM',
      subType: 'Cellular Base Station & Microwave Relay',
      coordinates: [30.040, -90.060],
      nominalCapacity: 25000,
      capacityUnit: 'Conns',
      backupPowerHours: 4,
      disruption: 0.82,
      cascadePressure: 0.90,
      failureThreshold: 0.30,
      status: 'CRITICAL',
      hopReached: 1,
      populationServed: 35000,
      activeInterventions: [],
      description: 'Directly in the storm surge path; lost utility grid connection and generator fuel access compromised.',
    },

    // Healthcare & Medical
    {
      id: 'node_med_memorial_hospital',
      name: 'St. Jude Regional Trauma Center',
      sector: 'HEALTHCARE',
      subType: 'Level 1 Trauma Hospital & ICU',
      coordinates: [29.982, -90.015],
      nominalCapacity: 650,
      capacityUnit: 'Beds',
      backupPowerHours: 16,
      disruption: 0.38,
      cascadePressure: 0.58,
      failureThreshold: 0.45,
      status: 'DEGRADED',
      hopReached: 2,
      populationServed: 180000,
      activeInterventions: [],
      description: 'Critical regional trauma center; currently operating on diesel generators, potable water pressure dropping.',
    },
    {
      id: 'node_med_suburban_clinic',
      name: 'Harbor Community Emergency Clinic',
      sector: 'HEALTHCARE',
      subType: 'Urgent Care & Triage Center',
      coordinates: [30.018, -90.050],
      nominalCapacity: 90,
      capacityUnit: 'Beds',
      backupPowerHours: 6,
      disruption: 0.78,
      cascadePressure: 0.85,
      failureThreshold: 0.35,
      status: 'CRITICAL',
      hopReached: 1,
      populationServed: 45000,
      activeInterventions: [],
      description: 'Severe water and power loss; unable to sterilize surgical instruments or operate ventilator arrays.',
    },

    // Transportation & Evacuation Corridors
    {
      id: 'node_trn_causeway_bridge',
      name: 'Estuary Causeway & Evacuation Expressway',
      sector: 'TRANSPORT',
      subType: 'Interstate Elevated Transit Corridor',
      coordinates: [30.005, -90.095],
      nominalCapacity: 12000,
      capacityUnit: 'Veh/hr',
      backupPowerHours: 0,
      disruption: 0.70,
      cascadePressure: 0.78,
      failureThreshold: 0.30,
      status: 'CRITICAL',
      hopReached: 1,
      populationServed: 140000,
      activeInterventions: [],
      description: 'Low-lying approach road inundated with 3.2 ft storm surge; electronic signs and traffic signals unpowered.',
    },
    {
      id: 'node_trn_upland_bypass',
      name: 'North-South Arterial Highway Interchange',
      sector: 'TRANSPORT',
      subType: 'Emergency Logistic Evacuation Route',
      coordinates: [29.955, -90.110],
      nominalCapacity: 8500,
      capacityUnit: 'Veh/hr',
      backupPowerHours: 0,
      disruption: 0.15,
      cascadePressure: 0.20,
      failureThreshold: 0.50,
      status: 'NOMINAL',
      hopReached: null,
      populationServed: 110000,
      activeInterventions: [],
      description: 'Functioning evacuation artery, though congestion is mounting as coastal causeway shuts down.',
    },
  ];

  const edges: DependencyEdge[] = [
    // Power cascade dependencies
    {
      id: 'edge_pwr1_to_midtown',
      source: 'node_pwr_coastal_sub',
      target: 'node_pwr_midtown_dist',
      weight: 0.85,
      transferLagHours: 1,
      description: 'Primary 230kV-to-115kV transmission tie line',
      isActive: true,
    },
    {
      id: 'edge_upland_to_midtown',
      source: 'node_pwr_upland_gen',
      target: 'node_pwr_midtown_dist',
      weight: 0.35,
      transferLagHours: 2,
      description: 'Secondary relief transmission line (operating near thermal limit)',
      isActive: true,
    },
    {
      id: 'edge_coastal_to_wat_treat',
      source: 'node_pwr_coastal_sub',
      target: 'node_wat_treatment_east',
      weight: 0.90,
      transferLagHours: 0.5,
      description: 'Dedicated high-voltage feeder powering 3,000HP intake raw water pumps',
      isActive: true,
    },
    {
      id: 'edge_midtown_to_wat_boost',
      source: 'node_pwr_midtown_dist',
      target: 'node_wat_booster_south',
      weight: 0.75,
      transferLagHours: 1,
      description: 'Urban 13.8kV electrical circuit powering booster station',
      isActive: true,
    },
    {
      id: 'edge_coastal_to_tel_tower',
      source: 'node_pwr_coastal_sub',
      target: 'node_tel_tower_marsh',
      weight: 0.80,
      transferLagHours: 0.5,
      description: 'Primary grid drop to ridge cellular tower',
      isActive: true,
    },
    {
      id: 'edge_midtown_to_tel_switch',
      source: 'node_pwr_midtown_dist',
      target: 'node_tel_metro_switch',
      weight: 0.70,
      transferLagHours: 2,
      description: 'Central grid power to downtown telecom switching hub',
      isActive: true,
    },
    {
      id: 'edge_midtown_to_hospital',
      source: 'node_pwr_midtown_dist',
      target: 'node_med_memorial_hospital',
      weight: 0.65,
      transferLagHours: 1,
      description: 'Primary dual-bus medical feeder line',
      isActive: true,
    },
    {
      id: 'edge_coastal_to_clinic',
      source: 'node_pwr_coastal_sub',
      target: 'node_med_suburban_clinic',
      weight: 0.85,
      transferLagHours: 0.5,
      description: 'Single-circuit distribution feed to harbor clinic',
      isActive: true,
    },

    // Water cascade dependencies into Healthcare & Fire
    {
      id: 'edge_wat_treat_to_boost',
      source: 'node_wat_treatment_east',
      target: 'node_wat_booster_south',
      weight: 0.85,
      transferLagHours: 1,
      description: 'Main 48-inch pressurized potable transmission aqueduct',
      isActive: true,
    },
    {
      id: 'edge_wat_treat_to_hospital',
      source: 'node_wat_treatment_east',
      target: 'node_med_memorial_hospital',
      weight: 0.70,
      transferLagHours: 2,
      description: 'Municipal water supply necessary for hospital boilers, chillers, and dialysis',
      isActive: true,
    },
    {
      id: 'edge_wat_boost_to_clinic',
      source: 'node_wat_booster_south',
      target: 'node_med_suburban_clinic',
      weight: 0.60,
      transferLagHours: 1,
      description: 'Hydraulic pressure feed to clinic sanitization and fire suppression',
      isActive: true,
    },

    // Telecom dependencies into 911 and Hospital Coordination
    {
      id: 'edge_tel_tower_to_switch',
      source: 'node_tel_tower_marsh',
      target: 'node_tel_metro_switch',
      weight: 0.40,
      transferLagHours: 0.5,
      description: 'Microwave uplink relay from coastal sector to central gateway',
      isActive: true,
    },
    {
      id: 'edge_tel_switch_to_hospital',
      source: 'node_tel_metro_switch',
      target: 'node_med_memorial_hospital',
      weight: 0.55,
      transferLagHours: 1,
      description: 'Critical patient telemetry, ambulance routing, and regional emergency radio CAD',
      isActive: true,
    },

    // Transportation cascade dependencies
    {
      id: 'edge_pwr_to_causeway',
      source: 'node_pwr_coastal_sub',
      target: 'node_trn_causeway_bridge',
      weight: 0.50,
      transferLagHours: 0.5,
      description: 'Power to causeway drawbridge hydraulics, storm drainage pumps, and traffic signals',
      isActive: true,
    },
    {
      id: 'edge_causeway_to_upland_bypass',
      source: 'node_trn_causeway_bridge',
      target: 'node_trn_upland_bypass',
      weight: 0.65,
      transferLagHours: 2,
      description: 'Severe traffic diversion congestion spillover from severed causeway onto bypass',
      isActive: true,
    },
  ];

  const hazards: GeoJsonHazardLayer[] = [HURRICANE_SURGE_GEOJSON, FLASH_FLOOD_GEOJSON];
  const initialMetrics = computeDisruptionMetrics(nodes);
  const hash = generateStateHash(0, nodes, [], hazards);

  return {
    id: 'scenario_hurricane_katrina_01',
    title: 'Coastal Metropolis — Category 4 Hurricane Storm Surge',
    scenarioType: 'HURRICANE_SURGE',
    description: 'A 140mph Category 4 Hurricane drives an 8.5ft storm surge into coastal transmission substations, threatening municipal water filtration and triggering cross-sector multi-hop cascades.',
    center: [29.99, -90.07],
    zoom: 12,
    step: 0,
    maxSteps: 8,
    nodes,
    edges,
    hazards,
    interventions: [],
    budgetRemaining: 750000,
    totalBudget: 750000,
    state_hash: hash,
    updatedAt: new Date().toISOString(),
    metrics: initialMetrics,
    history: [
      {
        step: 0,
        timestamp: new Date().toISOString(),
        metrics: initialMetrics,
        failedNodeCount: nodes.filter((n) => n.status === 'CRITICAL' || n.status === 'FAILED').length,
        maxHop: 1,
      },
    ],
    baselineMetrics: initialMetrics,
    baselineNodes: JSON.parse(JSON.stringify(nodes)),
  };
}

// Scenario 2: Cascadia Subduction Seismic Rupture
export function createScenario2(): ScenarioSession {
  const base = createScenario1();
  const seismicNodes: InfrastructureNode[] = base.nodes.map((n) => {
    let disruption = 0.1;
    let status: InfrastructureNode['status'] = 'NOMINAL';
    let cascadePressure = 0.1;
    let hopReached: number | null = null;

    if (n.id.includes('midtown') || n.id.includes('upland')) {
      disruption = 0.85;
      status = 'FAILED';
      cascadePressure = 0.95;
      hopReached = 0;
    } else if (n.id.includes('bridge') || n.id.includes('bypass')) {
      disruption = 0.75;
      status = 'CRITICAL';
      cascadePressure = 0.80;
      hopReached = 0;
    }

    return {
      ...n,
      disruption,
      cascadePressure,
      status,
      hopReached,
      activeInterventions: [],
    };
  });

  const hazards: GeoJsonHazardLayer[] = [SEISMIC_FAULT_GEOJSON];
  const initialMetrics = computeDisruptionMetrics(seismicNodes);
  const hash = generateStateHash(0, seismicNodes, [], hazards);

  return {
    id: 'scenario_seismic_cascadia_02',
    title: 'Cascadia Metro — Magnitude 8.2 Subduction & Grid Shear',
    scenarioType: 'SEISMIC_SHAKING',
    description: 'Violent tectonic ground motion ruptures high-voltage transformer bushings, shears aqueducts, and collapses key highway overpasses.',
    center: [29.98, -90.05],
    zoom: 12,
    step: 0,
    maxSteps: 8,
    nodes: seismicNodes,
    edges: base.edges,
    hazards,
    interventions: [],
    budgetRemaining: 900000,
    totalBudget: 900000,
    state_hash: hash,
    updatedAt: new Date().toISOString(),
    metrics: initialMetrics,
    history: [
      {
        step: 0,
        timestamp: new Date().toISOString(),
        metrics: initialMetrics,
        failedNodeCount: seismicNodes.filter((n) => n.status === 'CRITICAL' || n.status === 'FAILED').length,
        maxHop: 0,
      },
    ],
    baselineMetrics: initialMetrics,
    baselineNodes: JSON.parse(JSON.stringify(seismicNodes)),
  };
}

export const PRESET_SCENARIOS = {
  scenario_hurricane_katrina_01: createScenario1,
  scenario_seismic_cascadia_02: createScenario2,
};
