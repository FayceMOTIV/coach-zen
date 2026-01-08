"use strict";(()=>{var e={};e.id=667,e.ids=[667],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},8698:(e,a,s)=>{s.r(a),s.d(a,{originalPathname:()=>d,patchFetch:()=>x,requestAsyncStorage:()=>u,routeModule:()=>c,serverHooks:()=>m,staticGenerationAsyncStorage:()=>p});var n={};s.r(n),s.d(n,{POST:()=>l});var t=s(9303),r=s(8716),i=s(670);let o=new(s(5152)).ZP;async function l(e){try{let{score:a,habits:s,sleep:n,nap:t,energy:r,water:i,ecarts:l,movement:c,customMeals:u}=await e.json(),p={breakfast:"Petit-d\xe9j",fasting:"Je\xfbne",lunch:"D\xe9jeuner",snack:"Collation",dinner:"D\xeener",plannedTreat:"Craquage planifi\xe9"},m=Object.entries(s||{}).map(([e,a])=>({name:p[e]||e,done:a})),d=m.filter(e=>e.done).map(e=>e.name),x=m.filter(e=>!e.done).map(e=>e.name),h={workout:"Musculation",run:"Course",walk:"Marche"},j=Object.entries(c||{}).filter(([e,a])=>a).map(([e])=>h[e]||e),y=(u||[]).slice(0,4),f=y.length>0?`${y.length} repas ajout\xe9(s): ${y.map(e=>e.name).join(", ")}`:"",$=l?.petit||0,g=l?.moyen||0,v=l?.gros||0,S=$+g+v,P=`Coach bienveillant et direct. Analyse cette journ\xe9e en 2 phrases MAX.

DONN\xc9ES :
- Score : ${a} pts${a>=100?" (journ\xe9e parfaite!)":""}
- Repas OK : ${d.join(", ")||"aucun"}
- Repas manqu\xe9s : ${x.join(", ")||"aucun"}
${f?`- Repas custom : ${f}`:""}- Sommeil : ${n}h
- Sieste : ${t} min
- \xc9nergie : ${r}/5
- Eau : ${i}/8 verres
- \xc9carts : ${S} (${$}p/${g}m/${v}g)
- Sport : ${j.join(", ")||"aucun"}

R\xc8GLES :
1. Phrase 1 : Constat SP\xc9CIFIQUE (cite les vrais chiffres)
2. Phrase 2 : Conseil actionnable OU f\xe9licitation sinc\xe8re
3. Score >= 80 → F\xe9licite
4. Score < 50 → Encourage, propose UN truc simple
5. Jamais culpabilisant, toujours bienveillant

Exemples :
- "5h de sommeil, \xe7a explique ton \xe9nergie \xe0 2. Ce soir, priorit\xe9 au lit avant 23h."
- "4 repas valid\xe9s et une marche, super journ\xe9e ! Continue demain."
- "2 gros \xe9carts, journ\xe9e difficile. Demain, pr\xe9pare ta collation \xe0 l'avance."

R\xe9ponds UNIQUEMENT avec le JSON : { "analysis": "Phrase 1. Phrase 2." }`,b=await o.messages.create({model:"claude-sonnet-4-20250514",max_tokens:200,messages:[{role:"user",content:P}]}),C=b.content[0]?.text||"";try{let e=C.match(/\{[\s\S]*\}/);if(e){let a=JSON.parse(e[0]);if(a.analysis)return Response.json({analysis:a.analysis})}}catch(e){if(C.length<300&&!C.includes("{"))return Response.json({analysis:C.trim()})}let R="";return R=a>=100?`${a} pts, journ\xe9e parfaite ! ${d.length} repas valid\xe9s${j.length>0?" + "+j.join(", "):""}, bravo !`:a>=80?`Score de ${a} pts, belle performance ! ${d.length} repas valid\xe9s, continue sur cette lanc\xe9e.`:a>=50?`${d.length} repas suivis aujourd'hui, c'est un bon d\xe9but. ${n<7?"Vise 7h de sommeil ce soir.":"Garde ce rythme demain !"}`:`Journ\xe9e \xe0 ${a} pts, on a tous des jours comme \xe7a. ${S>0?`Demain, pr\xe9pare tes repas \xe0 l'avance.`:`Un pas \xe0 la fois, tu vas y arriver.`}`,Response.json({analysis:R})}catch(e){return console.error("Daily analysis error:",e),Response.json({analysis:"Continue tes efforts, chaque jour compte ! \uD83D\uDCAA"},{status:200})}}let c=new t.AppRouteRouteModule({definition:{kind:r.x.APP_ROUTE,page:"/api/coach/daily-analysis/route",pathname:"/api/coach/daily-analysis",filename:"route",bundlePath:"app/api/coach/daily-analysis/route"},resolvedPagePath:"/Users/faicalkriouar/Desktop/coach-zen/app/api/coach/daily-analysis/route.js",nextConfigOutput:"",userland:n}),{requestAsyncStorage:u,staticGenerationAsyncStorage:p,serverHooks:m}=c,d="/api/coach/daily-analysis/route";function x(){return(0,i.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:p})}}};var a=require("../../../../webpack-runtime.js");a.C(e);var s=e=>a(a.s=e),n=a.X(0,[948,160],()=>s(8698));module.exports=n})();