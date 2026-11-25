'use client';
import { useState } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';

const clientId=process.env.NEXT_PUBLIC_ENTRA_CLIENT_ID||'';
const tenantId=process.env.NEXT_PUBLIC_ENTRA_TENANT_ID||'common';
const scope=process.env.NEXT_PUBLIC_ENTRA_API_SCOPE||(clientId?`api://${clientId}/access_as_user`:'');
export default function MicrosoftButton({onToken, label='Continue with Microsoft'}:{onToken:(token:string)=>Promise<void>;label?:string}){
 const [busy,setBusy]=useState(false); const [error,setError]=useState('');
 if(!clientId)return null;
 const signIn=async()=>{setBusy(true);setError('');try{const msal=new PublicClientApplication({auth:{clientId,authority:`https://login.microsoftonline.com/${tenantId}`,redirectUri:process.env.NEXT_PUBLIC_ENTRA_REDIRECT_URI||window.location.origin},cache:{cacheLocation:'sessionStorage'}});await msal.initialize();const result=await msal.loginPopup({scopes:[scope]});if(!result.accessToken)throw new Error('Microsoft did not return an API access token. Check the API scope and consent configuration.');await onToken(result.accessToken);}catch(e){setError(e instanceof Error?e.message:'Microsoft sign-in failed.');}finally{setBusy(false);}};
 return <div className="microsoft-auth"><button type="button" className="secondary microsoft-button" onClick={signIn} disabled={busy}>{busy?'Connecting…':label}</button>{error&&<small className="text-danger">{error}</small>}</div>;
}
