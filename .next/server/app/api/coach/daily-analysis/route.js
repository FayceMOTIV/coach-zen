"use strict";(()=>{var e={};e.id=667,e.ids=[667],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},8698:(e,a,s)=>{s.r(a),s.d(a,{originalPathname:()=>m,patchFetch:()=>x,requestAsyncStorage:()=>c,routeModule:()=>l,serverHooks:()=>d,staticGenerationAsyncStorage:()=>p});var t={};s.r(t),s.d(t,{POST:()=>u});var n=s(9303),i=s(8716),r=s(670);let o=new(s(5152)).ZP;async function u(e){try{let{score:a,habits:s,sleep:t,nap:n,energy:i,water:r,ecarts:u,movement:l,customMeals:c}=await e.json(),p=s?Object.values(s).filter(Boolean).length:0,d=l?Object.values(l).filter(Boolean).length:0,m=u?(u.petit||0)+(u.moyen||0)+(u.gros||0):0,x=`Tu es un coach nutrition bienveillant. Analyse ces donn\xe9es de la journ\xe9e et donne une r\xe9ponse en 1-2 phrases maximum.

Donn\xe9es:
- Score du jour: ${a}/100
- Repas suivis: ${p}/6
- Sommeil: ${t}h (sieste: ${n}min)
- \xc9nergie: ${i}/5
- Eau: ${r} verres
- \xc9carts: ${m}
- Activit\xe9 physique: ${d} activit\xe9(s)
- Repas libres: ${c?.length||0}

Instructions:
1. Identifie LE point fort de la journ\xe9e
2. Identifie UN axe d'am\xe9lioration (si pertinent)
3. Termine par une phrase de motivation courte et bienveillante
4. Utilise des emojis
5. Maximum 2 phrases, sois concis

Exemple de format: "Super journ\xe9e avec ${p} repas suivis ! 💪 Pense \xe0 boire un peu plus d'eau demain. Tu g\xe8res !"`,h=await o.messages.create({model:"claude-sonnet-4-20250514",max_tokens:150,messages:[{role:"user",content:x}]}),v=h.content[0]?.text||"Continue comme \xe7a ! \uD83D\uDCAA";return Response.json({analysis:v})}catch(e){return console.error("Daily analysis error:",e),Response.json({analysis:"Continue tes efforts, tu es sur la bonne voie ! \uD83D\uDCAA"},{status:200})}}let l=new n.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/coach/daily-analysis/route",pathname:"/api/coach/daily-analysis",filename:"route",bundlePath:"app/api/coach/daily-analysis/route"},resolvedPagePath:"/Users/faicalkriouar/Desktop/coach-zen/app/api/coach/daily-analysis/route.js",nextConfigOutput:"",userland:t}),{requestAsyncStorage:c,staticGenerationAsyncStorage:p,serverHooks:d}=l,m="/api/coach/daily-analysis/route";function x(){return(0,r.patchFetch)({serverHooks:d,staticGenerationAsyncStorage:p})}}};var a=require("../../../../webpack-runtime.js");a.C(e);var s=e=>a(a.s=e),t=a.X(0,[948,160],()=>s(8698));module.exports=t})();