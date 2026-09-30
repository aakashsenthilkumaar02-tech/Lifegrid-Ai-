/**
 * LIFEGRID AI — Prototype 0.2 Express Backend & Vite Dev Server
 * Full-stack server handling cascade simulation, state_hash concurrency,
 * typed interventions, GeoJSON hazards, and Gemini function-calling scaffold.
 */

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';

import { getStorageAdapter } from './src/backend/storage';
import {
  DEFAULT_INTERVENTION_CATALOG,
  createScenario1,
  createScenario2,
} from './src/data/defaultScenarios';
import {
  simulateCascadeStep,
  dryRunTestIntervention,
  generateStateHash,
  computeDisruptionMetrics,
} from './src/engine/cascadeEngine';
import { ActiveIntervention, ScenarioSession } from './src/types/lifegrid';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  const storage = getStorageAdapter();

  // Initialize Gemini client on server if key is present
  const geminiApiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;
  if (geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY') {
    ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    console.log('[LIFEGRID AI] Gemini client initialized for /api/chat with model gemini-3.8-flash');
  } else {
    console.log('[LIFEGRID AI] GEMINI_API_KEY not configured. /api/chat will operate in deterministic demo mode.');
  }

  // --- API ROUTES ---

  // 1. Get intervention catalog
  app.get('/api/catalog', (req: Request, res: Response) => {
    res.json({ catalog: DEFAULT_INTERVENTION_CATALOG });
  });

  // 2. List sessions
  app.get('/api/sessions', async (req: Request, res: Response) => {
    try {
      const list = await storage.listSessions();
      res.json({ sessions: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Create or Reset Session from Preset
  app.post('/api/sessions', async (req: Request, res: Response) => {
    try {
      const { preset = 'scenario_hurricane_katrina_01' } = req.body;
      let session: ScenarioSession;
      if (preset === 'scenario_seismic_cascadia_02') {
        session = createScenario2();
      } else {
        session = createScenario1();
      }
      await storage.saveSession(session);
      res.json({ session });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Get active scenario session
  app.get('/api/sessions/:id', async (req: Request, res: Response) => {
    try {
      let session = await storage.getSession(req.params.id);
      if (!session) {
        // Fallback to default scenario 1 if id not found
        session = createScenario1();
        await storage.saveSession(session);
      }
      res.json({ session });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Advance simulation step with state_hash optimistic concurrency guard
  app.post('/api/sessions/:id/step', async (req: Request, res: Response) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const { expected_state_hash, force = false } = req.body;

      // Optimistic concurrency verification
      if (!force && expected_state_hash && expected_state_hash !== session.state_hash) {
        return res.status(409).json({
          error: 'OPTIMISTIC_CONCURRENCY_CONFLICT',
          message: 'State hash mismatch. The scenario session was modified by another operator.',
          current_state_hash: session.state_hash,
          expected_state_hash,
        });
      }

      // Execute cascade simulation step
      const stepResult = simulateCascadeStep(session, DEFAULT_INTERVENTION_CATALOG);

      session.nodes = stepResult.nextNodes;
      session.step = stepResult.nextStep;
      session.metrics = stepResult.nextMetrics;
      session.state_hash = stepResult.nextHash;

      // Append step history
      session.history.push({
        step: session.step,
        timestamp: new Date().toISOString(),
        metrics: session.metrics,
        failedNodeCount: session.nodes.filter((n) => n.status === 'CRITICAL' || n.status === 'FAILED').length,
        maxHop: Math.max(0, ...session.nodes.map((n) => n.hopReached || 0)),
      });

      await storage.saveSession(session);
      res.json({ session, stepResult });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Reset session to step 0
  app.post('/api/sessions/:id/reset', async (req: Request, res: Response) => {
    try {
      const current = await storage.getSession(req.params.id);
      const isSeismic = current?.scenarioType === 'SEISMIC_SHAKING';
      const freshSession = isSeismic ? createScenario2() : createScenario1();
      freshSession.id = req.params.id;
      await storage.saveSession(freshSession);
      res.json({ session: freshSession });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Deploy intervention with state_hash concurrency guard
  app.post('/api/sessions/:id/interventions', async (req: Request, res: Response) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const { interventionTypeId, targetNodeId, expected_state_hash, force = false } = req.body;

      if (!force && expected_state_hash && expected_state_hash !== session.state_hash) {
        return res.status(409).json({
          error: 'OPTIMISTIC_CONCURRENCY_CONFLICT',
          message: 'State hash conflict when applying intervention.',
          current_state_hash: session.state_hash,
          expected_state_hash,
        });
      }

      const item = DEFAULT_INTERVENTION_CATALOG.find((i) => i.id === interventionTypeId);
      if (!item) {
        return res.status(400).json({ error: 'Invalid intervention type ID' });
      }

      const targetNode = session.nodes.find((n) => n.id === targetNodeId);
      if (!targetNode) {
        return res.status(400).json({ error: 'Target node not found' });
      }

      if (session.budgetRemaining < item.unitCost) {
        return res.status(400).json({
          error: 'INSUFFICIENT_BUDGET',
          message: `Required $${item.unitCost.toLocaleString()} exceeds remaining budget $${session.budgetRemaining.toLocaleString()}`,
        });
      }

      // Deduct budget
      session.budgetRemaining -= item.unitCost;

      // Add active intervention
      const activeInt: ActiveIntervention = {
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        interventionTypeId,
        targetNodeId,
        deployedAtStep: session.step,
        status: 'ACTIVE',
      };
      session.interventions.push(activeInt);

      // Recalculate state hash
      session.state_hash = generateStateHash(
        session.step,
        session.nodes,
        session.interventions,
        session.hazards
      );

      await storage.saveSession(session);
      res.json({ session, deployed: activeInt });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Delete / recall active intervention
  app.delete('/api/sessions/:id/interventions/:intId', async (req: Request, res: Response) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const index = session.interventions.findIndex((i) => i.id === req.params.intId);
      if (index === -1) {
        return res.status(404).json({ error: 'Intervention not found' });
      }

      const removed = session.interventions[index];
      const item = DEFAULT_INTERVENTION_CATALOG.find((i) => i.id === removed.interventionTypeId);
      if (item) {
        // Refund 80% deployment salvage budget
        session.budgetRemaining = Math.min(session.totalBudget, session.budgetRemaining + item.unitCost * 0.8);
      }

      session.interventions.splice(index, 1);
      session.state_hash = generateStateHash(
        session.step,
        session.nodes,
        session.interventions,
        session.hazards
      );

      await storage.saveSession(session);
      res.json({ session });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9. Intervention Testing (Dry Run / What-If)
  app.post('/api/sessions/:id/test-intervention', async (req: Request, res: Response) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const { interventionTypeId, targetNodeId, projectionSteps = 2 } = req.body;
      const dryRun = dryRunTestIntervention(
        session,
        DEFAULT_INTERVENTION_CATALOG,
        targetNodeId,
        interventionTypeId,
        projectionSteps
      );

      res.json({ dryRun });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 10. Update GeoJSON Hazard Layer
  app.post('/api/sessions/:id/hazards', async (req: Request, res: Response) => {
    try {
      const session = await storage.getSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const { hazardId, enabled, severity } = req.body;
      const targetHazard = session.hazards.find((h) => h.id === hazardId);
      if (!targetHazard) {
        return res.status(404).json({ error: 'Hazard layer not found' });
      }

      if (typeof enabled === 'boolean') targetHazard.enabled = enabled;
      if (typeof severity === 'number') targetHazard.severity = Math.max(0, Math.min(1.0, severity));

      session.state_hash = generateStateHash(
        session.step,
        session.nodes,
        session.interventions,
        session.hazards
      );

      await storage.saveSession(session);
      res.json({ session });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 11. Gemini Function-Calling Integration Scaffold (/api/chat)
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { message, sessionId } = req.body;
      const session = (sessionId ? await storage.getSession(sessionId) : null) || createScenario1();

      // Tool declarations for Gemini
      const applyInterventionDecl: FunctionDeclaration = {
        name: 'apply_intervention',
        description: 'Deploy an emergency typed mitigation resource (e.g. Mobile Microgrid, Flood Barrier, Satellite Backhaul, Dewatering Pump) to a vulnerable infrastructure node.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            interventionTypeId: {
              type: Type.STRING,
              description: 'ID of the intervention: int_mobile_microgrid, int_flood_barrier, int_sat_backhaul, int_high_pump, int_field_hospital, int_transit_clearance',
            },
            targetNodeId: {
              type: Type.STRING,
              description: 'Node identifier to protect, e.g. node_pwr_coastal_sub, node_wat_treatment_east, node_tel_metro_switch',
            },
          },
          required: ['interventionTypeId', 'targetNodeId'],
        },
      };

      const simulateHazardDecl: FunctionDeclaration = {
        name: 'simulate_hazard',
        description: 'Adjust the severity or toggle of a GeoJSON hazard layer (e.g. storm surge, flash flood, seismic fault).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            hazardId: {
              type: Type.STRING,
              description: 'Hazard layer ID, e.g. hazard_surge_cat4, hazard_flash_flood, hazard_seismic_shear',
            },
            severity: {
              type: Type.NUMBER,
              description: 'Severity from 0.0 to 1.0',
            },
          },
          required: ['hazardId', 'severity'],
        },
      };

      const runStepDecl: FunctionDeclaration = {
        name: 'run_simulation_steps',
        description: 'Advance the cascade simulation forward by 1 or more steps to calculate multi-hop propagation.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            stepCount: {
              type: Type.INTEGER,
              description: 'Number of simulation steps to advance (1 to 3)',
            },
          },
          required: ['stepCount'],
        },
      };

      const queryNodeDecl: FunctionDeclaration = {
        name: 'query_infrastructure_status',
        description: 'Query critical metrics, incoming continuous pressure, and failure thresholds for a specific node.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            nodeId: {
              type: Type.STRING,
              description: 'Node ID to query',
            },
          },
          required: ['nodeId'],
        },
      };

      // Fallback deterministic response if AI is not available
      if (!ai) {
        const lower = (message || '').toLowerCase();
        let reply = '';
        let executedAction: any = null;

        if (lower.includes('microgrid') || lower.includes('power') || lower.includes('coastal')) {
          reply = `[Deterministic Tactical Mode] Identified primary single point of failure at Coastal Substation (node_pwr_coastal_sub). Recommending deployment of Mobile 5MW Diesel Microgrid to arrest downstream cascades into water treatment and telecom gateways.`;
        } else if (lower.includes('step') || lower.includes('simulate') || lower.includes('advance')) {
          reply = `[Deterministic Tactical Mode] Simulation step advanced. Multi-hop cascade propagation evaluated across 5 sectors. Current Community Resilience Index: ${(session.metrics.resilienceIndex * 100).toFixed(1)}%.`;
        } else if (lower.includes('hazard') || lower.includes('surge') || lower.includes('flood')) {
          reply = `[Deterministic Tactical Mode] Hazard layer Cat 4 Storm Surge active with 8.5ft elevation pressure. Critical nodes within the polygon boundary are experiencing direct 0.92 hazard pressure.`;
        } else {
          reply = `[Deterministic Tactical Mode] LIFEGRID AI Cascade Engine 0.2 active. Community Disruption is ${(session.metrics.overallCommunityDisruption * 100).toFixed(1)}%. ${session.metrics.totalPopulationImpacted.toLocaleString()} citizens at risk. Available interventions: Mobile Microgrids, Defensive Barriers, Satellite Comms, Dewatering Pumps.`;
        }

        return res.json({
          response: reply,
          toolCalls: executedAction ? [executedAction] : [],
          isDeterministicFallback: true,
        });
      }

      // Call Gemini 3.8 Flash with tool declarations
      const systemInstruction = `You are LIFEGRID AI Command Copilot, an expert disaster systems engineer and infrastructure cascade specialist.
You analyze critical infrastructure networks (power transmission, potable water, telecom/911, trauma hospitals, evacuation corridors) subject to continuous multi-hop cascade pressures.
The current scenario session has:
- Step: ${session.step} / ${session.maxSteps}
- State Hash: ${session.state_hash}
- Community Disruption: ${(session.metrics.overallCommunityDisruption * 100).toFixed(1)}%
- Resilience: ${(session.metrics.resilienceIndex * 100).toFixed(1)}%
- Population without Power: ${session.metrics.populationWithoutPower.toLocaleString()}
- Critical Facilities Failed: ${session.metrics.criticalFacilitiesFailed}
- Nodes: ${session.nodes.map((n) => `${n.name} (${n.id}): disruption=${n.disruption}, pressure=${n.cascadePressure}, status=${n.status}`).join('; ')}
You can trigger functions to deploy interventions, adjust hazards, run simulation steps, or query nodes.
Provide crisp, authoritative, tactical advice with precise metric impacts.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: message,
        config: {
          systemInstruction,
          tools: [
            {
              functionDeclarations: [
                applyInterventionDecl,
                simulateHazardDecl,
                runStepDecl,
                queryNodeDecl,
              ],
            },
          ],
        },
      });

      const functionCalls = response.functionCalls || [];
      const toolResults: any[] = [];

      // Execute tool calls on the session
      for (const call of functionCalls) {
        if (call.name === 'apply_intervention') {
          const { interventionTypeId, targetNodeId } = call.args as any;
          const item = DEFAULT_INTERVENTION_CATALOG.find((i) => i.id === interventionTypeId);
          if (item && session.budgetRemaining >= item.unitCost) {
            session.budgetRemaining -= item.unitCost;
            session.interventions.push({
              id: `act_${Date.now()}`,
              interventionTypeId,
              targetNodeId,
              deployedAtStep: session.step,
              status: 'ACTIVE',
            });
            session.state_hash = generateStateHash(session.step, session.nodes, session.interventions, session.hazards);
            await storage.saveSession(session);
            toolResults.push({
              toolName: 'apply_intervention',
              args: call.args,
              result: { success: true, deployed: item.name, targetNodeId },
            });
          }
        } else if (call.name === 'run_simulation_steps') {
          const { stepCount = 1 } = call.args as any;
          for (let i = 0; i < Math.min(3, stepCount); i++) {
            const stepResult = simulateCascadeStep(session, DEFAULT_INTERVENTION_CATALOG);
            session.nodes = stepResult.nextNodes;
            session.step = stepResult.nextStep;
            session.metrics = stepResult.nextMetrics;
            session.state_hash = stepResult.nextHash;
          }
          await storage.saveSession(session);
          toolResults.push({
            toolName: 'run_simulation_steps',
            args: call.args,
            result: { newStep: session.step, metrics: session.metrics },
          });
        } else if (call.name === 'query_infrastructure_status') {
          const { nodeId } = call.args as any;
          const node = session.nodes.find((n) => n.id === nodeId);
          toolResults.push({
            toolName: 'query_infrastructure_status',
            args: call.args,
            result: node || { error: 'Node not found' },
          });
        }
      }

      res.json({
        response: response.text || 'Action executed successfully.',
        toolCalls: toolResults,
        isDeterministicFallback: false,
        session,
      });
    } catch (err: any) {
      console.error('[LIFEGRID AI /api/chat error]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- VITE & STATIC HANDLING ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[LIFEGRID AI] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[LIFEGRID AI] Failed to start server:', err);
  process.exit(1);
});
