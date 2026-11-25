import { normaliseLegacyState, previewLegacyState, legacyMaps } from './legacy-import.mapper';

describe('legacy import mapping', () => {
  it('accepts the legacy localStorage collections and supplies a default project', () => {
    const state = normaliseLegacyState({ fb: [{ id:'f1', text:'Issue' }], req: [], rel: [], met: [] });
    const preview = previewLegacyState(state);
    expect(preview.counts).toEqual({ projects:1, feedback:1, requirements:0, releases:0, metrics:0, total:1 });
    expect(preview.warnings[0]).toContain('Main project');
  });
  it('rejects malformed collection fields', () => {
    expect(() => normaliseLegacyState({ fb: {} })).toThrow('must be an array');
  });
  it('maps legacy status and sentiment values', () => {
    expect(legacyMaps.feedbackStatus('In-progress')).toBe('IN_PROGRESS');
    expect(legacyMaps.sentiment('neg')).toBe('NEGATIVE');
    expect(legacyMaps.requirementStatus('In-build')).toBe('IN_BUILD');
    expect(legacyMaps.releaseStatus('Released')).toBe('RELEASED');
  });
  it('flags broken legacy relationships without failing the import preview', () => {
    const state = normaliseLegacyState({ proj:[{id:'p',name:'Project'}], fb:[{id:'f',text:'x',proj:'p',req:'missing'}], req:[], rel:[], met:[] });
    expect(previewLegacyState(state).warnings.join(' ')).toContain('missing requirements');
  });
});
