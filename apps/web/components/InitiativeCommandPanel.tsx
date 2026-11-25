'use client';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

type Initiative = { id: string; name: string; objective?: string; status: string; ownerLabel?: string | null; targetDate?: string | null; milestones?: any[] };
type ReadinessData = { currentStageKey: string; generatedAt: string; stages: { key: string; name: string; isGate: boolean; ready: boolean; configuredChecks: number; checks: { key: string; label: string; count: number; satisfied: boolean }[]; blockers: string[]; note?: string | null }[] };
type CommandData = { generatedAt: string; initiative: Initiative; counts: Record<string, number>; testResults: Record<string, number>; requirements: any[]; actions: any[]; decisions: any[]; risks: any[]; dependencies: any[]; stakeholders: any[]; issues: any[]; changes: any[]; processes: any[]; testCases: any[]; benefits: any[]; evidence: any[] };
const title = (v: string) => (v || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const date = (v?: string | null) => v ? new Date(v).toLocaleDateString() : '—';

export default function InitiativeCommandPanel({ productId, organisationId, token, initiatives }: { productId: string; organisationId: string; token: string; initiatives: Initiative[] }) {
  const [selected, setSelected] = useState('');
  const [data, setData] = useState<CommandData | null>(null);
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (!initiatives.length) { setSelected(''); setData(null); setReadiness(null); return; } if (!initiatives.some(x => x.id === selected)) setSelected(initiatives[0].id); }, [initiatives, selected]);
  useEffect(() => {
    if (!selected || !productId || !token || !organisationId) return;
    let active = true; setLoading(true); setError(''); setData(null); setReadiness(null);
    Promise.all([
      api<CommandData>(`/products/${productId}/delivery-analysis/initiative-command/${selected}`, {}, organisationId, token),
      api<ReadinessData>(`/initiatives/${selected}/stage-readiness`, {}, organisationId, token),
    ])
      .then(([command, gates]) => { if (active) { setData(command); setReadiness(gates); } })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : 'Unable to load initiative command view.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [selected, productId, organisationId, token]);
  const current = useMemo(() => initiatives.find(x => x.id === selected), [initiatives, selected]);
  if (!initiatives.length) return <section className="panel"><div className="panel-head"><div><h3>Initiative command view</h3><p>One place to understand the full position of an initiative.</p></div></div><div className="empty-line">Create an initiative in Project Studio to start using this view.</div></section>;
  const sections: { label: string; key: keyof CommandData; rows: any[]; render: (x: any) => string }[] = data ? [
    { label: 'Requirements', key: 'requirements', rows: data.requirements, render: x => `${x.title} · ${title(x.status)}${x.owner ? ` · ${x.owner}` : ''}` },
    { label: 'Actions', key: 'actions', rows: data.actions, render: x => `${x.title} · ${title(x.status)} · ${title(x.priority)} · Due ${date(x.dueAt)}` },
    { label: 'Decisions', key: 'decisions', rows: data.decisions, render: x => `${x.title} · ${title(x.status)}` },
    { label: 'Risks', key: 'risks', rows: data.risks, render: x => `${x.title} · ${title(x.status)} · Exposure ${x.probability} × ${x.impact}` },
    { label: 'Dependencies', key: 'dependencies', rows: data.dependencies, render: x => `${x.title} · ${title(x.status)} · Needed by ${date(x.neededBy)}` },
    { label: 'Stakeholders', key: 'stakeholders', rows: data.stakeholders, render: x => `${x.name} · ${x.role || 'Stakeholder'} · ${title(x.engagement)}` },
    { label: 'Issues', key: 'issues', rows: data.issues, render: x => `${x.title} · ${title(x.severity)} · ${title(x.status)}` },
    { label: 'Change requests', key: 'changes', rows: data.changes, render: x => `${x.title} · ${title(x.status)}` },
    { label: 'Process analyses', key: 'processes', rows: data.processes, render: x => `${x.title} · ${title(x.status)}` },
    { label: 'Test cases', key: 'testCases', rows: data.testCases, render: x => `${x.key} · ${x.title} · ${title(x.executions?.[0]?.status || 'NOT_RUN')}` },
    { label: 'Benefits', key: 'benefits', rows: data.benefits, render: x => `${x.title} · ${x.actualValue ?? 'Not measured'} / ${x.targetValue ?? 'No target'} ${x.unit || ''}` },
    { label: 'Evidence', key: 'evidence', rows: data.evidence, render: x => `${title(x.evidenceType)} · ${x.targetType} · ${title(x.verificationStatus)}` },
  ] : [];
  return <div className="initiative-command">
    <section className="mission-hero"><div><div className="eyebrow">MISSION CONTROL / INITIATIVE COMMAND</div><h2>One initiative. One complete picture.</h2><p>Bring analysis, delivery, stakeholders, testing and outcomes together without merging their underlying records.</p></div><div className="mission-orbit"><span>INITIATIVES</span><b>{initiatives.length}</b><small>IN THIS PRODUCT</small></div></section>
    <section className="panel"><div className="toolbar"><div><h3>Choose an initiative</h3><p className="muted">The view only includes records explicitly linked to the selected initiative.</p></div><select value={selected} onChange={e => setSelected(e.target.value)} aria-label="Select initiative">{initiatives.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
      {current && <div className="initiative-command-heading"><div><span className="pill blue">{title(current.status)}</span><h2>{current.name}</h2><p>{current.objective || 'No objective has been recorded.'}</p></div><div className="command-meta"><span>Owner<strong>{current.ownerLabel || 'Unassigned'}</strong></span><span>Target date<strong>{date(current.targetDate)}</strong></span></div></div>}
      {loading && <div className="empty-line">Loading initiative records…</div>}{error && <div className="alert error">{error}</div>}
      {readiness && <section className="panel stage-readiness-panel"><div className="panel-head"><div><h3>Stage gate readiness</h3><p>See what is required before moving this initiative through its configured workflow.</p></div><span className="pill blue">Current: {title(readiness.currentStageKey)}</span></div><div className="stage-readiness-grid">{readiness.stages.map(stage=><article className={`stage-readiness-card ${stage.isGate?'is-gate':''}`} key={stage.key}><div className="stage-readiness-top"><div><b>{stage.name}</b><small>{stage.isGate?'Gate stage':'Workflow stage'}</small></div><span className={`pill ${stage.ready?'green':stage.isGate?'red':'blue'}`}>{stage.isGate?(stage.ready?'Ready':'Blocked'):'No gate'}</span></div>{stage.isGate && <>{stage.checks.length>0?<ul>{stage.checks.map(check=><li key={check.key} className={check.satisfied?'satisfied':'unsatisfied'}><span>{check.satisfied?'✓':'!'}</span>{check.label}: {check.count}</li>)}</ul>:<p className="muted small-text">{stage.note || 'No gate checks configured.'}</p>}{stage.blockers.length>0&&<small className="stage-blockers">{stage.blockers.join(' ')}</small>}</>}</article>)}</div><p className="muted small-text">Readiness is a live preview. The server rechecks the rules when a stage transition is submitted.</p></section>}
      {data && <><div className="stats-grid command-stats">{[['Requirements',data.counts.requirements],['Open actions',data.counts.actionsOpen],['Overdue actions',data.counts.actionsOverdue],['Pending decisions',data.counts.decisionsPending],['Open risks',data.counts.risksOpen],['Open issues',data.counts.issuesOpen],['Open dependencies',data.counts.dependenciesOpen],['Pending changes',data.counts.changesPending],['Evidence records',data.counts.evidence],['Unverified evidence',data.counts.evidenceUnverified]].map(([label,value])=><div className="stat-card" key={String(label)}><div className="stat-top"><span>{label}</span></div><strong>{value}</strong><small>Linked records</small></div>)}</div>
      <div className="content-grid"><section className="panel"><div className="panel-head"><div><h3>Delivery checkpoints</h3><p>Milestones recorded against this initiative.</p></div></div><div className="compact-list">{(data.initiative.milestones || []).map((m:any)=><div className="compact-item" key={m.id}><span className={`priority-dot ${m.status==='COMPLETED'?'':'urgent'}`}/><div><b>{m.title}</b><small>{title(m.status)} · Due {date(m.dueDate)}</small></div></div>)}{!data.initiative.milestones?.length&&<div className="empty-line">No milestones recorded.</div>}</div></section>
      <section className="panel"><div className="panel-head"><div><h3>Testing position</h3><p>Latest recorded result for each linked test case.</p></div></div><div className="snapshot-list">{['PASSED','FAILED','BLOCKED','NOT_RUN'].map(k=><div className="snapshot-row" key={k}><div><span>{title(k)}</span><b>{data.testResults[k] || 0}</b></div><div className="progress"><i style={{width:`${data.counts.testCases ? ((data.testResults[k] || 0)/data.counts.testCases)*100 : 0}%`}}/></div></div>)}</div></section></div>
      <section className="panel"><div className="panel-head"><div><h3>Connected work and analysis</h3><p>Each category remains its own record type. Select a section to inspect the initiative's linked records.</p></div><span className="pill blue">{sections.reduce((n,s)=>n+s.rows.length,0)} records</span></div><div className="command-record-grid">{sections.map(section=><details className="command-record" key={section.key}><summary><span>{section.label}</span><b>{section.rows.length}</b></summary><div className="compact-list">{section.rows.map(row=><div className="compact-item" key={row.id}><span className="priority-dot"/><div><b>{row.title || row.name || row.key}</b><small>{section.render(row)}</small>{section.label==='Stakeholders' && row.engagementLogs?.[0]?.nextAction && <small>Follow-up: {row.engagementLogs[0].nextAction} · {date(row.engagementLogs[0].followUpAt)}</small>}{section.label==='Benefits' && row.measurements?.length>0 && <small>Recent measurements: {row.measurements.slice(0,3).map((m:any)=>`${m.value} ${row.unit||''} (${date(m.measuredAt)})`).join(' · ')}</small>}{section.label==='Evidence' && row.sourceUrl && <small><a href={row.sourceUrl} target="_blank" rel="noreferrer">Open source ↗</a></small>}</div></div>)}{!section.rows.length&&<div className="empty-line">No {section.label.toLowerCase()} linked to this initiative yet.</div>}</div></details>)}</div></section>
      <p className="muted small-text">Last refreshed {new Date(data.generatedAt).toLocaleString()}. Counts are based on explicit initiative links; unlinked records are intentionally excluded.</p></>}
    </section>
  </div>;
}
