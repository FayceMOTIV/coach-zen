"use strict";(()=>{var e={};e.id=667,e.ids=[667],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},8698:(e,a,s)=>{s.r(a),s.d(a,{originalPathname:()=>d,patchFetch:()=>x,requestAsyncStorage:()=>u,routeModule:()=>l,serverHooks:()=>m,staticGenerationAsyncStorage:()=>p});var n={};s.r(n),s.d(n,{POST:()=>c});var r=s(9303),t=s(8716),i=s(670);let o=new(s(5152)).ZP;async function c(e){try{let{score:a,habits:s,sleep:n,nap:r,energy:t,water:i,ecarts:c,movement:l}=await e.json(),u={breakfast:"Petit-d\xe9j",fasting:"Je\xfbne",lunch:"D\xe9jeuner",snack:"Collation",dinner:"D\xeener",plannedTreat:"Craquage planifi\xe9"},p=Object.entries(s||{}).map(([e,a])=>({name:u[e]||e,done:a})),m=p.filter(e=>e.done).map(e=>e.name),d=p.filter(e=>!e.done).map(e=>e.name),x={walk:"Marche",sport:"Sport",stretch:"\xc9tirements"},h=Object.entries(l||{}).filter(([e,a])=>a).map(([e])=>x[e]||e),y=c?.petit||0,f=c?.moyen||0,j=c?.gros||0,v=y+f+j,g=`Coach bienveillant et direct. Analyse cette journ\xe9e en 2 phrases MAX.

DONN\xc9ES :
- Score : ${a}/100
- Repas OK : ${m.join(", ")||"aucun"}
- Repas manqu\xe9s : ${d.join(", ")||"aucun"}
- Sommeil : ${n}h
- Sieste : ${r} min
- \xc9nergie : ${t}/5
- Eau : ${i}/8 verres
- \xc9carts : ${v} (${y}p/${f}m/${j}g)
- Sport : ${h.join(", ")||"aucun"}

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

R\xe9ponds UNIQUEMENT avec le JSON : { "analysis": "Phrase 1. Phrase 2." }`,$=await o.messages.create({model:"claude-sonnet-4-20250514",max_tokens:200,messages:[{role:"user",content:g}]}),S=$.content[0]?.text||"";try{let e=S.match(/\{[\s\S]*\}/);if(e){let a=JSON.parse(e[0]);if(a.analysis)return Response.json({analysis:a.analysis})}}catch(e){if(S.length<300&&!S.includes("{"))return Response.json({analysis:S.trim()})}let P="";return P=a>=80?`Score de ${a}/100, belle performance ! ${m.length} repas valid\xe9s, continue sur cette lanc\xe9e.`:a>=50?`${m.length} repas suivis aujourd'hui, c'est un bon d\xe9but. ${n<7?"Vise 7h de sommeil ce soir.":"Garde ce rythme demain !"}`:`Journ\xe9e \xe0 ${a}/100, on a tous des jours comme \xe7a. ${v>0?`Demain, pr\xe9pare tes repas \xe0 l'avance.`:`Un pas \xe0 la fois, tu vas y arriver.`}`,Response.json({analysis:P})}catch(e){return console.error("Daily analysis error:",e),Response.json({analysis:"Continue tes efforts, chaque jour compte ! \uD83D\uDCAA"},{status:200})}}let l=new r.AppRouteRouteModule({definition:{kind:t.x.APP_ROUTE,page:"/api/coach/daily-analysis/route",pathname:"/api/coach/daily-analysis",filename:"route",bundlePath:"app/api/coach/daily-analysis/route"},resolvedPagePath:"/Users/faicalkriouar/Desktop/coach-zen/app/api/coach/daily-analysis/route.js",nextConfigOutput:"",userland:n}),{requestAsyncStorage:u,staticGenerationAsyncStorage:p,serverHooks:m}=l,d="/api/coach/daily-analysis/route";function x(){return(0,i.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:p})}}};var a=require("../../../../webpack-runtime.js");a.C(e);var s=e=>a(a.s=e),n=a.X(0,[948,160],()=>s(8698));module.exports=n})();