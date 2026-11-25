'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Props = { productId: string; organisationId: string; token: string };
type Traceability = {
  summary: Record<string, number>;
  unlinked: Record<string, number>;
  requirements: Array<{ id: string; title: string; status: string; feedback: Array<{id:string;text:string;status:string}>; actionItems: Array<{id:string;title:string;status:string}>; testCases: Array<{id:string;key:string;title:string;status:string;executions:Array<{status:string;executedAt:string;defectReference:string|null}>}>; release: {version:string;status:string}|null; initiative: {name:string;status:string}|null }>;
};
type Assurance = { counts: Record<string, number>; releases: Array<{id:string;version:string;status:string;completionPercent:number;overdue:boolean}>; testCases: Array<{id:string;key:string;title:string;latestExecution:{status:string;executedAt:string;defectReference:string|null}|null}> };
const label=(s:string)=>s.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
export default function TraceabilityPanel({productId,organisationId,token}:Props){
 const [trace,setTrace]=useState<Traceability|null>(null); const [assurance,setAssurance]=useState<Assurance|null>(null); const [loading,setLoading]=useState(false); const [error,setError]=useState(''); const [view,setView]=useState<'traceability'|'assurance'>('traceability');
 const load=async()=>{if(!productId||!organisationId||!token)return;setLoading(true);setError('');try{const [t,a]=await Promise.all([api<Traceability>(`/products/${productId}/delivery-analysis/traceability`,{},organisationId,token),api<Assurance>(`/products/${productId}/delivery-analysis/assurance`,{},organisationId,token)]);setTrace(t);setAssurance(a);}catch(e){setError(e instanceof Error?e.message:'Unable to load traceability.');}finally{setLoading(false);}};
 useEffect(()=>{load();},[productId,organisationId,token]);
 if(!productId)return <section className="panel"><p>Select a product to view traceability and delivery assurance.</p></section>;
 return <div className="stack">
  <div className="toolbar"><div><h2>Traceability & assurance</h2><p>See how discovery, requirements, delivery, testing and release evidence connect.</p></div><button className="secondary" onClick={load} disabled={loading}>{loading?'Refreshing…':'Refresh'}</button></div>
  <div className="tabs-inline"><button className={view==='traceability'?'active':''} onClick={()=>setView('traceability')}>Requirement traceability</button><button className={view==='assurance'?'active':''} onClick={()=>setView('assurance')}>Delivery assurance</button></div>
  {error&&<div className="alert error">{error}</div>}
  {view==='traceability'&&trace&&<>
   <div className="stats-grid">{Object.entries(trace.summary).filter(([k])=>k!=='recordsWithoutPrimaryLink').map(([k,v])=><div className="stat-card" key={k}><div className="stat-top"><span>{label(k)}</span><i>↗</i></div><strong>{v}</strong><small>Current product records</small></div>)}<div className="stat-card"><div className="stat-top"><span>Records needing links</span><i>◎</i></div><strong>{trace.summary.recordsWithoutPrimaryLink}</strong><small>Review these where a relationship is useful</small></div></div>
   <section className="panel"><div className="panel-head"><div><h3>Requirement journey</h3><p>Source feedback → requirement → delivery work → verification → release.</p></div></div>
    {!trace.requirements.length?<p className="muted">No requirements have been recorded for this product yet.</p>:<div className="compact-list">{trace.requirements.map(r=><article className="compact-item" key={r.id}><span className="priority-dot"/><div className="trace-item"><b>{r.title}</b><small>{label(r.status)} · {r.initiative?.name||'No initiative linked'} · {r.release?`Release ${r.release.version}`:'No release linked'}</small><div className="trace-links"><span>{r.feedback.length} source feedback</span><span>{r.actionItems.length} action items</span><span>{r.testCases.length} test cases</span></div>{r.testCases.map(t=><small className="trace-test" key={t.id}>{t.key} · {t.title} · {t.executions[0]?label(t.executions[0].status):'Not executed'}</small>)}</div></article>)}</div>}
   </section>
   <section className="panel"><div className="panel-head"><div><h3>Unlinked records</h3><p>These records are not necessarily wrong; link them when doing so improves traceability.</p></div></div><div className="compact-list">{Object.entries(trace.unlinked).map(([k,v])=><div className="compact-item" key={k}><span className="priority-dot"/><div><b>{label(k)}</b><small>{v} without a primary link</small></div></div>)}</div></section>
  </>}
  {view==='assurance'&&assurance&&<>
   <div className="stats-grid">{Object.entries(assurance.counts).map(([k,v])=><div className="stat-card" key={k}><div className="stat-top"><span>{label(k)}</span><i>◈</i></div><strong>{v}</strong><small>Current assurance snapshot</small></div>)}</div>
   <section className="panel"><div className="panel-head"><div><h3>Release readiness</h3><p>Checklist completion and target-date signals.</p></div></div><div className="compact-list">{assurance.releases.map(r=><div className="compact-item" key={r.id}><span className="priority-dot"/><div className="trace-item"><b>{r.version} · {label(r.status)}</b><small>{r.completionPercent}% checklist complete {r.overdue?'· Target date passed':''}</small><div className="progress"><i style={{width:`${r.completionPercent}%`}}/></div></div></div>)}{!assurance.releases.length&&<p className="muted">No releases planned yet.</p>}</div></section>
   <section className="panel"><div className="panel-head"><div><h3>Latest test outcomes</h3><p>Most recent recorded execution for each test case.</p></div></div><div className="compact-list">{assurance.testCases.map(t=><div className="compact-item" key={t.id}><span className="priority-dot"/><div><b>{t.key} · {t.title}</b><small>{t.latestExecution?label(t.latestExecution.status):'Not executed'}{t.latestExecution?.defectReference?` · Defect ${t.latestExecution.defectReference}`:''}</small></div></div>)}{!assurance.testCases.length&&<p className="muted">No test cases have been created.</p>}</div></section>
  </>}
  <p className="muted small-text">This view is a read-only snapshot. It does not create links or change BA records automatically.</p>
 </div>;
}
