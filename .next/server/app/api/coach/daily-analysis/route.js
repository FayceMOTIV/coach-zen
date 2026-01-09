"use strict";(()=>{var e={};e.id=667,e.ids=[667],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},8698:(e,a,t)=>{t.r(a),t.d(a,{originalPathname:()=>d,patchFetch:()=>h,requestAsyncStorage:()=>u,routeModule:()=>c,serverHooks:()=>m,staticGenerationAsyncStorage:()=>p});var s={};t.r(s),t.d(s,{POST:()=>l});var n=t(9303),r=t(8716),i=t(670);let o=new(t(1088)).ZP;async function l(e){try{let{score:a,habits:t,sleep:s,nap:n,energy:r,water:i,ecarts:l,movement:c,customMeals:u,fasting:p,fastingMorning:m}=await e.json(),d={breakfast:"Petit-d\xe9j",lunch:"D\xe9jeuner",snack:"Collation",dinner:"D\xeener",plannedTreat:"Craquage planifi\xe9"},h=Object.entries(t||{}).map(([e,a])=>({name:d[e]||e,done:a})),x=h.filter(e=>e.done).map(e=>e.name),j=h.filter(e=>!e.done).map(e=>e.name);m&&((x=x.filter(e=>"Petit-d\xe9j"!==e)).unshift("Je\xfbne matin"),j=j.filter(e=>"Petit-d\xe9j"!==e));let f={workout:"Musculation",run:"Course",walk:"Marche"},$=Object.entries(c||{}).filter(([e,a])=>a).map(([e])=>f[e]||e),y=(u||[]).slice(0,4),g=y.length>0?`${y.length} repas ajout\xe9(s): ${y.map(e=>e.name).join(", ")}`:"",v=p?.hours?`${p.hours}h de je\xfbne${p.completed?" (objectif atteint!)":""} = ${p.points||0} pts`:"",b=l?.petit||0,P=l?.moyen||0,S=l?.gros||0,C=b+P+S,R=`Coach bienveillant et direct. Analyse cette journ\xe9e en 2 phrases MAX.

DONN\xc9ES :
- Score : ${a} pts${a>=100?" (journ\xe9e parfaite!)":""}
- Repas OK : ${x.join(", ")||"aucun"}
- Repas manqu\xe9s : ${j.join(", ")||"aucun"}
${g?`- Repas custom : ${g}
`:""}${v?`- Je\xfbne : ${v}
`:""}- Sommeil : ${s}h
- Sieste : ${n} min
- \xc9nergie : ${r}/5
- Eau : ${i}/8 verres
- \xc9carts : ${C} (${b}p/${P}m/${S}g)
- Sport : ${$.join(", ")||"aucun"}

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

R\xe9ponds UNIQUEMENT avec le JSON : { "analysis": "Phrase 1. Phrase 2." }`,k=await o.chat.completions.create({model:"gpt-4o-mini",max_tokens:200,messages:[{role:"user",content:R}]}),D=k.choices[0]?.message?.content||"";try{let e=D.match(/\{[\s\S]*\}/);if(e){let a=JSON.parse(e[0]);if(a.analysis)return Response.json({analysis:a.analysis})}}catch(e){if(D.length<300&&!D.includes("{"))return Response.json({analysis:D.trim()})}let O="";return O=a>=100?`${a} pts, journ\xe9e parfaite ! ${x.length} repas valid\xe9s${$.length>0?" + "+$.join(", "):""}, bravo !`:a>=80?`Score de ${a} pts, belle performance ! ${x.length} repas valid\xe9s, continue sur cette lanc\xe9e.`:a>=50?`${x.length} repas suivis aujourd'hui, c'est un bon d\xe9but. ${s<7?"Vise 7h de sommeil ce soir.":"Garde ce rythme demain !"}`:`Journ\xe9e \xe0 ${a} pts, on a tous des jours comme \xe7a. ${C>0?`Demain, pr\xe9pare tes repas \xe0 l'avance.`:`Un pas \xe0 la fois, tu vas y arriver.`}`,Response.json({analysis:O})}catch(e){return console.error("Daily analysis error:",e),Response.json({analysis:"Continue tes efforts, chaque jour compte ! \uD83D\uDCAA"},{status:200})}}let c=new n.AppRouteRouteModule({definition:{kind:r.x.APP_ROUTE,page:"/api/coach/daily-analysis/route",pathname:"/api/coach/daily-analysis",filename:"route",bundlePath:"app/api/coach/daily-analysis/route"},resolvedPagePath:"/Users/faicalkriouar/Desktop/coach-zen/app/api/coach/daily-analysis/route.js",nextConfigOutput:"",userland:s}),{requestAsyncStorage:u,staticGenerationAsyncStorage:p,serverHooks:m}=c,d="/api/coach/daily-analysis/route";function h(){return(0,i.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:p})}}};var a=require("../../../../webpack-runtime.js");a.C(e);var t=e=>a(a.s=e),s=a.X(0,[948,138],()=>t(8698));module.exports=s})();