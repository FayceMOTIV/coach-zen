"use strict";(()=>{var e={};e.id=428,e.ids=[428],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},9538:(e,t,a)=>{a.r(t),a.d(t,{originalPathname:()=>d,patchFetch:()=>h,requestAsyncStorage:()=>u,routeModule:()=>c,serverHooks:()=>m,staticGenerationAsyncStorage:()=>p});var r={};a.r(r),a.d(r,{POST:()=>l});var n=a(9303),o=a(8716),s=a(670);let i=new(a(5152)).ZP;async function l(e){try{let{weekData:t,profile:a,weightHistory:r}=await e.json(),n=Object.keys(t||{}).length,o=Object.values(t||{}).map(e=>{let t=0;e.habits&&(e.habits.breakfast&&(t+=20),e.habits.fasting&&(t+=20),e.habits.lunch&&(t+=20),e.habits.snack&&(t+=20),e.habits.dinner&&(t+=20),e.habits.plannedTreat&&(t+=20)),(e.customMeals||[]).slice(0,4).forEach(e=>{t+=e.points||0}),e.sleep>=6.5&&(t+=10),(e.water||0)>=8&&(t+=10),e.movement&&(e.movement.workout&&(t+=5),e.movement.walk&&(t+=5),e.movement.run&&(t+=5)),(e.supplements?Object.values(e.supplements).filter(Boolean).length:0)>=3&&(t+=5),(e.gratitudes||[]).filter(e=>e&&e.trim()).length>=3&&(t+=5);let a=e.ecarts?(e.ecarts.petit||0)+(e.ecarts.moyen||0)+(e.ecarts.gros||0):0;return t-=10*a,Math.max(0,t)}),s=o.length?Math.round(o.reduce((e,t)=>e+t,0)/o.length):0,l=o.length?Math.max(...o):0,c=o.length?Math.min(...o):0,u=Object.values(t||{}).map(e=>e.sleep||0).filter(e=>e>0),p=u.length?(u.reduce((e,t)=>e+t,0)/u.length).toFixed(1):0,m=Object.values(t||{}).map(e=>e.water||0),d=m.length?(m.reduce((e,t)=>e+t,0)/m.length).toFixed(1):0,h=Object.values(t||{}).filter(e=>e.movement?.workout||e.movement?.walk||e.movement?.run).length,g=[...r||[]].sort((e,t)=>new Date(e.date)-new Date(t.date)),v=new Date;v.setDate(v.getDate()-7);let x=g.filter(e=>new Date(e.date)>=v),b=x.length>=2?(x[x.length-1].weight-x[0].weight).toFixed(1):null,w=`Tu es un coach nutrition bienveillant. G\xe9n\xe8re un rapport hebdomadaire encourageant bas\xe9 sur ces donn\xe9es:

STATISTIQUES DE LA SEMAINE:
- Jours suivis: ${n}/7
- Score moyen: ${s} pts (min: ${c}, max: ${l})
- Sommeil moyen: ${p}h
- Hydratation moyenne: ${d} verres/jour
- Jours d'activit\xe9 physique: ${h}/7
${b?`- \xc9volution poids: ${b>0?"+":""}${b} kg`:""}

PROFIL:
- Objectif: ${a?.objectifPoids?`Atteindre ${a.objectifPoids}kg`:"Maintenir la forme"}

Instructions:
1. Commence par un titre accrocheur avec emoji
2. R\xe9sume les VICTOIRES de la semaine (2-3 points)
3. Identifie UN axe d'am\xe9lioration principal
4. Donne UN conseil actionnable pour la semaine prochaine
5. Termine par une phrase de motivation

Format: Utilise des emojis, des sections claires, reste concis (max 200 mots)`,k=await i.messages.create({model:"claude-sonnet-4-20250514",max_tokens:400,messages:[{role:"user",content:w}]}),f=k.content[0]?.text||"Rapport non disponible";return Response.json({success:!0,report:f,stats:{days:n,avgScore:s,maxScore:l,minScore:c,avgSleep:p,avgWater:d,workoutDays:h,weightChange:b}})}catch(e){return console.error("Weekly report error:",e),Response.json({success:!1,report:"Impossible de g\xe9n\xe9rer le rapport. R\xe9essaie plus tard !",stats:{}},{status:200})}}let c=new n.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/coach/weekly-report/route",pathname:"/api/coach/weekly-report",filename:"route",bundlePath:"app/api/coach/weekly-report/route"},resolvedPagePath:"/Users/faicalkriouar/Desktop/coach-zen/app/api/coach/weekly-report/route.js",nextConfigOutput:"",userland:r}),{requestAsyncStorage:u,staticGenerationAsyncStorage:p,serverHooks:m}=c,d="/api/coach/weekly-report/route";function h(){return(0,s.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:p})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),r=t.X(0,[948,160],()=>a(9538));module.exports=r})();