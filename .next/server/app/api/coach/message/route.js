"use strict";(()=>{var e={};e.id=818,e.ids=[818],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},906:(e,s,t)=>{t.r(s),t.d(s,{originalPathname:()=>d,patchFetch:()=>g,requestAsyncStorage:()=>p,routeModule:()=>c,serverHooks:()=>m,staticGenerationAsyncStorage:()=>l});var n={};t.r(n),t.d(n,{GET:()=>u,POST:()=>i});var a=t(9303),o=t(8716),r=t(670);async function i(e){try{let s=process.env.OPENAI_API_KEY;if(!s)return Response.json({message:null,type:"silence"});let t=await e.json(),n=new Date().getHours(),a=`Tu es Zen, un coach personnel silencieux et bienveillant.

R\xc8GLES STRICTES:
- Maximum 1 phrase courte (10-15 mots max)
- Pas d'emojis, pas de ponctuation excessive
- Ton calme, direct, jamais moralisateur
- Tu es un ami loyal quand l'\xe9nergie est basse
- Tu es un coach exigeant quand l'\xe9nergie est bonne
- JAMAIS de mots comme: calories, r\xe9gime, poids, maigrir

EXEMPLES DE BONS MESSAGES:
- "Les oeufs posent les bases."
- "Zone sensible. Tiens le cap."
- "Craquage pr\xe9vu. Z\xe9ro culpabilit\xe9."
- "Journ\xe9e difficile. Fais le minimum."

Si tu n'as rien de pertinent \xe0 dire, r\xe9ponds exactement: SILENCE`,o=`Heure: ${n}h. \xc9nergie: ${t.energy}/5. Score actuel: ${t.score}/100. Cr\xe9neau: ${t.slot}.`,r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${s}`},body:JSON.stringify({model:"gpt-3.5-turbo",messages:[{role:"system",content:a},{role:"user",content:o}],temperature:.4,max_tokens:60})});if(!r.ok)return Response.json({message:null,type:"silence"});let i=await r.json(),u=i.choices?.[0]?.message?.content?.trim();if(!u||"SILENCE"===u||u.includes("SILENCE"))return Response.json({message:null,type:"silence"});return u=u.replace(/["']/g,"").substring(0,100),Response.json({message:u,type:"ai"})}catch(e){return Response.json({message:null,type:"silence"})}}async function u(){return Response.json({status:"ok",ai:!!process.env.OPENAI_API_KEY})}let c=new a.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/coach/message/route",pathname:"/api/coach/message",filename:"route",bundlePath:"app/api/coach/message/route"},resolvedPagePath:"/Users/faicalkriouar/Desktop/coach-zen/app/api/coach/message/route.js",nextConfigOutput:"",userland:n}),{requestAsyncStorage:p,staticGenerationAsyncStorage:l,serverHooks:m}=c,d="/api/coach/message/route";function g(){return(0,r.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:l})}},9303:(e,s,t)=>{e.exports=t(517)}};var s=require("../../../../webpack-runtime.js");s.C(e);var t=e=>s(s.s=e),n=s.X(0,[948],()=>t(906));module.exports=n})();