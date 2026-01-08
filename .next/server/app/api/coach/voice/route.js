"use strict";(()=>{var e={};e.id=559,e.ids=[559],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},4719:(e,t,a)=>{a.r(t),a.d(t,{originalPathname:()=>m,patchFetch:()=>h,requestAsyncStorage:()=>p,routeModule:()=>u,serverHooks:()=>d,staticGenerationAsyncStorage:()=>l});var r={};a.r(r),a.d(r,{POST:()=>c});var s=a(9303),o=a(8716),i=a(670);let n=new(a(1088)).ZP;async function c(e){try{let{message:t,allData:a,profile:r,weightHistory:s,stats:o,todayData:i,history:c}=await e.json(),u=[...s||[]].sort((e,t)=>new Date(e.date)-new Date(t.date)),p=u[0]?.weight||r?.poids,l=u[u.length-1]?.weight||r?.poids,d=r?.objectifPoids||70,m=i?.supplements?Object.entries(i.supplements).filter(([e,t])=>t).map(([e])=>e).join(", "):"aucun",h=(i?.gratitudes||[]).filter(e=>e?.trim()),x=i?.water||0,g=i?.habits?Object.entries(i.habits).filter(([e,t])=>t).map(([e])=>e).join(", "):"aucun",v=`Tu es Coach Zen, un coach nutrition et bien-\xeatre bienveillant et motivant. Tu parles en fran\xe7ais de mani\xe8re naturelle.

PROFIL:
- Poids actuel: ${l}kg → Objectif: ${d}kg (reste ${(l-d).toFixed(1)}kg)
- Perte depuis le d\xe9but: ${(p-l).toFixed(1)}kg
- Taille: ${r?.taille||175}cm, \xc2ge: ${r?.age||30}ans
- Activit\xe9: ${r?.activite||"mod\xe9r\xe9"}

STATISTIQUES GLOBALES:
- Jours suivis: ${o?.totalDays||0}
- Streak: ${o?.streak||0} jours
- Streak hydratation: ${o?.hydrationStreak||0} jours
- Streak compl\xe9ments: ${o?.supplementStreak||0} jours
- Streak gratitudes: ${o?.gratitudeStreak||0} jours

AUJOURD'HUI:
- Repas valid\xe9s: ${g||"aucun"}
- Eau: ${x}/8 verres
- Compl\xe9ments pris: ${m}
- Gratitudes: ${h.length>0?h.join(" | "):"non remplies"}
- \xc9nergie: ${i?.energy||3}/5

R\xc8GLES:
- Sois concis (2-4 phrases)
- Utilise des emojis avec mod\xe9ration
- Sois encourageant mais honn\xeate
- Donne des conseils pratiques et personnalis\xe9s
- Tu as acc\xe8s \xe0 TOUT l'historique de l'utilisateur
- Int\xe8gre les gratitudes, compl\xe9ments, hydratation dans tes analyses`,j=[{role:"system",content:v},...(c||[]).map(e=>({role:e.role,content:e.content})),{role:"user",content:t}],k=await n.chat.completions.create({model:"gpt-4o-mini",messages:j,max_tokens:400});return Response.json({response:k.choices[0].message.content})}catch(e){return console.error("Voice coach error:",e),Response.json({response:"D\xe9sol\xe9, j'ai eu un souci. R\xe9essaie ! \uD83D\uDE4F"})}}let u=new s.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/coach/voice/route",pathname:"/api/coach/voice",filename:"route",bundlePath:"app/api/coach/voice/route"},resolvedPagePath:"/Users/faicalkriouar/Desktop/coach-zen/app/api/coach/voice/route.js",nextConfigOutput:"",userland:r}),{requestAsyncStorage:p,staticGenerationAsyncStorage:l,serverHooks:d}=u,m="/api/coach/voice/route";function h(){return(0,i.patchFetch)({serverHooks:d,staticGenerationAsyncStorage:l})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),r=t.X(0,[948,138],()=>a(4719));module.exports=r})();