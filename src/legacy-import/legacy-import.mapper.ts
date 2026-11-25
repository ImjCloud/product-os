import { createHash } from 'crypto';
import { z } from 'zod';

export type LegacyState = { fb?: any[]; req?: any[]; rel?: any[]; met?: any[]; proj?: any[] };
const arr = (v: unknown): any[] => Array.isArray(v) ? v : [];
const clean = (v: unknown, fallback = ''): string => typeof v === 'string' ? v.trim() : fallback;
const date = (v: unknown): Date | null => { if (!v) return null; const d = new Date(String(v)); return Number.isNaN(d.getTime()) ? null : d; };
const enumMap = (v: unknown, map: Record<string,string>, fallback: string) => map[clean(v).toLowerCase()] || fallback;
export function normaliseLegacyState(input: unknown): LegacyState {
  const recordArray = z.array(z.record(z.unknown())).max(5000).optional();
  const schema = z.object({ fb: recordArray, req: recordArray, rel: recordArray, met: recordArray, proj: recordArray }).passthrough();
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new Error(`Invalid Product OS export: ${parsed.error.issues.map(issue => `${issue.path.join('.')}: ${(issue.message.toLowerCase().includes('array') ? 'must be an array' : issue.message)}`).join('; ')}`);
  const normalized = { fb: arr(parsed.data.fb), req: arr(parsed.data.req), rel: arr(parsed.data.rel), met: arr(parsed.data.met), proj: arr(parsed.data.proj) };
  const total = normalized.fb.length + normalized.req.length + normalized.rel.length + normalized.met.length + normalized.proj.length;
  if (total > 5000) throw new Error('The export contains more than 5,000 records. Split the export into smaller batches before importing.');
  return normalized;
}
export function legacyFingerprint(state: LegacyState): string { return createHash('sha256').update(JSON.stringify(state)).digest('hex'); }
export function previewLegacyState(state: LegacyState) {
  const projects = state.proj!.length ? state.proj! : [{ id: 'default', name: 'Main project' }];
  const projectIds = new Set(projects.map(p => clean(p.id)));
  const warnings: string[] = [];
  const total = state.fb!.length + state.req!.length + state.rel!.length + state.met!.length;
  if (!state.proj!.length) warnings.push('No projects were present; a Main project will be created for records using the legacy default project.');
  const invalidProjectRefs = [...state.fb!, ...state.req!, ...state.rel!, ...state.met!].filter(x => x.proj && !projectIds.has(clean(x.proj))).length;
  if (invalidProjectRefs) warnings.push(`${invalidProjectRefs} record(s) reference a missing project and will be assigned to the first available project.`);
  const reqIds = new Set(state.req!.map(x => clean(x.id)));
  const relIds = new Set(state.rel!.map(x => clean(x.id)));
  const brokenFeedbackLinks = state.fb!.filter(x => x.req && !reqIds.has(clean(x.req))).length;
  const brokenReleaseLinks = state.req!.filter(x => x.rel && !relIds.has(clean(x.rel))).length + state.met!.filter(x => x.rel && !relIds.has(clean(x.rel))).length;
  if (brokenFeedbackLinks) warnings.push(`${brokenFeedbackLinks} action point(s) reference missing requirements; those links will be left unassigned.`);
  const incompleteReady = state.rel!.filter(r => ['ready'].includes(clean(r.status).toLowerCase()) && !['uat','docs','training','rollback','comms'].every(k => Boolean(r.ck?.[k]))).length;
  if (incompleteReady) warnings.push(`${incompleteReady} release(s) marked Ready have incomplete legacy checklists and will be imported as Planning.`);
  if (brokenReleaseLinks) warnings.push(`${brokenReleaseLinks} requirement/metric record(s) reference missing releases; those links will be left unassigned.`);
  const invalidDates = [...state.fb!.map(x=>x.due), ...state.fb!.map(x=>x.date), ...state.rel!.map(x=>x.date), ...state.met!.map(x=>x.date)].filter(v => v && !date(v)).length;
  if (invalidDates) warnings.push(`${invalidDates} invalid date value(s) will be imported as empty dates.`);
  return { fingerprint: legacyFingerprint(state), counts: { projects: projects.length, feedback: state.fb!.length, requirements: state.req!.length, releases: state.rel!.length, metrics: state.met!.length, total }, warnings };
}
export const legacyMaps = {
  feedbackStatus: (v: unknown) => enumMap(v, { 'open':'OPEN', 'in-progress':'IN_PROGRESS', 'done':'DONE' }, 'OPEN'),
  sentiment: (v: unknown) => enumMap(v, { pos:'POSITIVE', neu:'NEUTRAL', neg:'NEGATIVE', positive:'POSITIVE', neutral:'NEUTRAL', negative:'NEGATIVE' }, 'NEUTRAL'),
  severity: (v: unknown) => enumMap(v, { low:'LOW', medium:'MEDIUM', high:'HIGH', critical:'CRITICAL' }, 'MEDIUM'),
  requirementStatus: (v: unknown) => enumMap(v, { discovery:'DISCOVERY', scoped:'SCOPED', 'in-build':'IN_BUILD', shipped:'SHIPPED' }, 'DISCOVERY'),
  releaseStatus: (v: unknown) => enumMap(v, { planning:'PLANNING', ready:'READY', released:'RELEASED' }, 'PLANNING'),
  date,
  clean,
};
