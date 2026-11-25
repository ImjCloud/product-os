const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
export class ApiError extends Error { status:number; constructor(message:string,status:number){super(message);this.status=status;} }
export async function api<T>(path:string, options:RequestInit = {}, organisationId?:string, token?:string):Promise<T>{
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type','application/json');
  if(token) headers.set('Authorization',`Bearer ${token}`);
  if(organisationId) headers.set('X-Organisation-Id',organisationId);
  const response = await fetch(`${API}${path}`,{...options,headers,cache:'no-store'});
  const body = await response.json().catch(()=>null);
  if(!response.ok){const message = typeof body?.message === 'string' ? body.message : `Request failed (${response.status})`;throw new ApiError(message,response.status);}
  return body as T;
}
export const json = (method:string, body:unknown):RequestInit => ({method,body:JSON.stringify(body)});

export async function apiUpload<T>(path:string, formData:FormData, organisationId?:string, token?:string):Promise<T>{
  const headers = new Headers();
  if(token) headers.set('Authorization',`Bearer ${token}`);
  if(organisationId) headers.set('X-Organisation-Id',organisationId);
  const response = await fetch(`${API}${path}`,{method:'POST',body:formData,headers,cache:'no-store'});
  const body = await response.json().catch(()=>null);
  if(!response.ok){const message = typeof body?.message === 'string' ? body.message : `Request failed (${response.status})`;throw new ApiError(message,response.status);}
  return body as T;
}

export async function apiDownload(path:string, organisationId?:string, token?:string, fileName='download'):
Promise<void>{
  const headers = new Headers();
  if(token) headers.set('Authorization',`Bearer ${token}`);
  if(organisationId) headers.set('X-Organisation-Id',organisationId);
  const response = await fetch(`${API}${path}`,{headers,cache:'no-store'});
  if(!response.ok){const body=await response.json().catch(()=>null);throw new ApiError(typeof body?.message==='string'?body.message:`Request failed (${response.status})`,response.status);}
  const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=fileName;a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
