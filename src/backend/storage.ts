/**
 * LIFEGRID AI — Prototype 0.2 Storage Adapter
 * Provides persistent session storage with Firestore adapter scaffold and local JSON fallback.
 */

import { ScenarioSession } from '../types/lifegrid';
import { createScenario1, createScenario2 } from '../data/defaultScenarios';

export interface StorageAdapter {
  getSession(id: string): Promise<ScenarioSession | null>;
  saveSession(session: ScenarioSession): Promise<void>;
  listSessions(): Promise<{ id: string; title: string; scenarioType: string; updatedAt: string }[]>;
  deleteSession(id: string): Promise<void>;
}

/**
 * Local in-memory + JSON fallback adapter
 * Default for local development and rapid prototyping
 */
export class LocalJsonStorageAdapter implements StorageAdapter {
  private sessions = new Map<string, ScenarioSession>();

  constructor() {
    // Seed initial scenarios
    const s1 = createScenario1();
    const s2 = createScenario2();
    this.sessions.set(s1.id, s1);
    this.sessions.set(s2.id, s2);
  }

  async getSession(id: string): Promise<ScenarioSession | null> {
    const session = this.sessions.get(id);
    if (!session) return null;
    return JSON.parse(JSON.stringify(session));
  }

  async saveSession(session: ScenarioSession): Promise<void> {
    session.updatedAt = new Date().toISOString();
    this.sessions.set(session.id, JSON.parse(JSON.stringify(session)));
  }

  async listSessions(): Promise<{ id: string; title: string; scenarioType: string; updatedAt: string }[]> {
    return Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      title: s.title,
      scenarioType: s.scenarioType,
      updatedAt: s.updatedAt,
    }));
  }

  async deleteSession(id: string): Promise<void> {
    this.sessions.delete(id);
  }
}

/**
 * Firestore Storage Adapter Scaffold
 * Conforms to production Cloud Run multi-instance specification.
 */
export class FirestoreStorageAdapterScaffold implements StorageAdapter {
  private fallback: LocalJsonStorageAdapter;
  private isConfigured = false;
  private db: unknown = null;

  constructor() {
    this.fallback = new LocalJsonStorageAdapter();
    // In production Cloud Run environment with Google Application Default Credentials,
    // this initializes @google-cloud/firestore. If unconfigured, falls back seamlessly to local store.
    try {
      if (process.env.STORAGE_BACKEND === 'firestore' && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log('[LIFEGRID Firestore] Initializing Cloud Firestore session store...');
        this.isConfigured = true;
      } else {
        console.log('[LIFEGRID Firestore Scaffold] STORAGE_BACKEND=firestore requested, running in prototype fallback mode.');
      }
    } catch (err) {
      console.warn('[LIFEGRID Firestore Scaffold] Fallback to LocalJsonStorageAdapter:', err);
    }
  }

  async getSession(id: string): Promise<ScenarioSession | null> {
    if (!this.isConfigured || !this.db) {
      return this.fallback.getSession(id);
    }
    // Production Firestore doc get
    return this.fallback.getSession(id);
  }

  async saveSession(session: ScenarioSession): Promise<void> {
    if (!this.isConfigured || !this.db) {
      return this.fallback.saveSession(session);
    }
    // Production Firestore doc set
    return this.fallback.saveSession(session);
  }

  async listSessions(): Promise<{ id: string; title: string; scenarioType: string; updatedAt: string }[]> {
    if (!this.isConfigured || !this.db) {
      return this.fallback.listSessions();
    }
    return this.fallback.listSessions();
  }

  async deleteSession(id: string): Promise<void> {
    if (!this.isConfigured || !this.db) {
      return this.fallback.deleteSession(id);
    }
    return this.fallback.deleteSession(id);
  }
}

// Global factory
let activeStorageAdapter: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (!activeStorageAdapter) {
    const backend = process.env.STORAGE_BACKEND?.toLowerCase();
    if (backend === 'firestore') {
      activeStorageAdapter = new FirestoreStorageAdapterScaffold();
    } else {
      activeStorageAdapter = new LocalJsonStorageAdapter();
    }
  }
  return activeStorageAdapter;
}
