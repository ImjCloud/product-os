export type User = { id:string; email:string; name?:string|null };
export type OrganisationMembership = { id:string; role:string; organisation:{id:string;name:string;slug:string} };
export type Product = { id:string; name:string; description?:string|null; archivedAt?:string|null };
export type Feedback = { id:string; text:string; source:string; sentiment:string; severity:string; status:string; theme?:string|null; occurredAt:string };
export type Requirement = { id:string; title:string; problem:string; userStory:string; acceptance:string; status:string; reach:number; impact:number; confidence:number; effort:number; riceScore:number; initiativeId?:string|null; initiative?:{id:string;name:string}|null };
export type ActionItem = { id:string; title:string; description:string; status:string; priority:string; dueAt?:string|null; initiativeId?:string|null; initiative?:{id:string;name:string}|null; assignee?:{name?:string|null;email:string}|null };
export type Release = { id:string; version:string; status:string; targetDate?:string|null; decisionLog?:any; checks?:{id:string;label:string;completed:boolean}[] };
export type Metric = { id:string; name:string; unit?:string|null; baseline:number; target:number; actual:number; direction:string; progressPercent:number; releaseId?:string|null; reviewDate?:string|null };
