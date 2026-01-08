"use strict";(()=>{var e={};e.id=400,e.ids=[400],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},2280:(e,t,a)=>{a.r(t),a.d(t,{originalPathname:()=>m,patchFetch:()=>x,requestAsyncStorage:()=>u,routeModule:()=>c,serverHooks:()=>d,staticGenerationAsyncStorage:()=>p});var s={};a.r(s),a.d(s,{POST:()=>l});var o=a(9303),r=a(8716),n=a(670);let i=new(a(1088)).ZP;async function l(e){try{let{allData:t,profile:a,period:s,weightHistory:o,stats:r}=await e.json(),n="week"===s?7:30,l=[];for(let e=0;e<n;e++){let t=new Date;t.setDate(t.getDate()-e),l.push(t.toISOString().split("T")[0])}let c={};l.forEach(e=>{t&&t[e]&&(c[e]=t[e])});let u=0,p=0,d=0,m=0;Object.values(c).forEach(e=>{(e.supplements?Object.values(e.supplements).filter(Boolean).length:0)>=3&&u++,(e.gratitudes||[]).filter(e=>e&&e.trim()).length>=3&&p++,e.water&&(d+=e.water,m++)});let x=m>0?(d/m).toFixed(1):0,h=`Tu es Coach Zen, un coach nutrition bienveillant. Analyse les ${n} derniers jours.

PROFIL:
- Poids: ${a?.poids||75}kg → Objectif: ${a?.objectifPoids||70}kg
- Taille: ${a?.taille||175}cm, \xc2ge: ${a?.age||30}ans
- Activit\xe9: ${a?.activite||"mod\xe9r\xe9"}

STATS GLOBALES:
- Jours suivis total: ${r?.totalDays||0}
- Streak actuel: ${r?.streak||0} jours
- Perte de poids totale: ${r?.weightLoss?.toFixed(1)||0}kg

DONN\xc9ES ${n}J:
${JSON.stringify(c,null,2)}

NOUVELLES HABITUDES:
- Jours avec 3+ compl\xe9ments: ${u}/${Object.keys(c).length}
- Jours avec gratitudes compl\xe8tes: ${p}/${Object.keys(c).length}
- Moyenne hydratation: ${x} verres/jour

HISTORIQUE POIDS (derni\xe8res pes\xe9es):
${JSON.stringify(o?.slice(-10)||[])}

Fais une analyse compl\xe8te et personnalis\xe9e en fran\xe7ais:
1. 📊 R\xe9sum\xe9 global (score moyen, tendance)
2. 💪 Points forts (ce qui va bien)
3. ⚠️ Axes d'am\xe9lioration
4. 💊 Analyse des compl\xe9ments et gratitudes
5. 💧 Analyse hydratation
6. 📈 \xc9volution du poids
7. 🎯 3 conseils personnalis\xe9s pour la semaine

Sois encourageant mais honn\xeate. Max 400 mots.`,g=await i.chat.completions.create({model:"gpt-4o-mini",messages:[{role:"user",content:h}],max_tokens:800});return Response.json({analysis:g.choices[0].message.content})}catch(e){return console.error("Analysis error:",e),Response.json({analysis:"Erreur lors de l'analyse. R\xe9essaie plus tard."})}}let c=new o.AppRouteRouteModule({definition:{kind:r.x.APP_ROUTE,page:"/api/coach/analyze/route",pathname:"/api/coach/analyze",filename:"route",bundlePath:"app/api/coach/analyze/route"},resolvedPagePath:"/Users/faicalkriouar/Desktop/coach-zen/app/api/coach/analyze/route.js",nextConfigOutput:"",userland:s}),{requestAsyncStorage:u,staticGenerationAsyncStorage:p,serverHooks:d}=c,m="/api/coach/analyze/route";function x(){return(0,n.patchFetch)({serverHooks:d,staticGenerationAsyncStorage:p})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var a=e=>t(t.s=e),s=t.X(0,[948,138],()=>a(2280));module.exports=s})();