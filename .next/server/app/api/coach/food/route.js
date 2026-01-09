"use strict";(()=>{var e={};e.id=137,e.ids=[137],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},4322:(e,t,s)=>{s.r(t),s.d(t,{originalPathname:()=>m,patchFetch:()=>x,requestAsyncStorage:()=>l,routeModule:()=>c,serverHooks:()=>d,staticGenerationAsyncStorage:()=>p});var r={};s.r(r),s.d(r,{POST:()=>u});var a=s(9303),o=s(8716),n=s(670);let i=new(s(1088)).ZP;async function u(e){try{let{description:t,image:s}=await e.json(),r=[];r=s?[{role:"user",content:[{type:"text",text:`Analyse ce repas${t?` (description: ${t})`:""}.

IMPORTANT pour isHealthy: Juge la QUALIT\xc9 des aliments, PAS la quantit\xe9.
- Viande, poisson, oeufs, l\xe9gumes, riz, p\xe2tes, fruits = HEALTHY (m\xeame si grosse portion)
- Fast-food, fritures, sodas, sucreries, ultra-transform\xe9 = NOT HEALTHY

R\xe9ponds en JSON strict:
{
  "success": true,
  "name": "Nom court du plat",
  "kcal": nombre (estimation calories),
  "isHealthy": true/false (qualit\xe9 pas quantit\xe9!),
  "points": nombre 0-20 (20=aliments naturels, 0=ultra-transform\xe9),
  "details": "Description courte des macros"
}`},{type:"image_url",image_url:{url:s}}]}]:[{role:"user",content:`Analyse ce repas: "${t}".

IMPORTANT pour isHealthy: Juge la QUALIT\xc9 des aliments, PAS la quantit\xe9.
- Viande, poisson, oeufs, l\xe9gumes, riz, p\xe2tes, fruits = HEALTHY (m\xeame si grosse portion)
- Fast-food, fritures, sodas, sucreries, ultra-transform\xe9 = NOT HEALTHY

R\xe9ponds en JSON strict:
{
  "success": true,
  "name": "Nom court du plat",
  "kcal": nombre (estimation calories),
  "isHealthy": true/false (qualit\xe9 pas quantit\xe9!),
  "points": nombre 0-20 (20=aliments naturels, 0=ultra-transform\xe9),
  "details": "Description courte des macros"
}`}];let a=(await i.chat.completions.create({model:"gpt-4o-mini",messages:r,max_tokens:300})).choices[0].message.content;try{let e=a.match(/\{[\s\S]*\}/);if(e){let t=JSON.parse(e[0]);return Response.json(t)}}catch(e){console.error("JSON parse error:",e)}return Response.json({success:!0,name:"Repas",kcal:400,isHealthy:!0,points:10,details:"Estimation par d\xe9faut"})}catch(e){return console.error("Food analysis error:",e),Response.json({success:!1,error:"Erreur d'analyse"})}}let c=new a.AppRouteRouteModule({definition:{kind:o.x.APP_ROUTE,page:"/api/coach/food/route",pathname:"/api/coach/food",filename:"route",bundlePath:"app/api/coach/food/route"},resolvedPagePath:"/Users/faicalkriouar/Desktop/coach-zen/app/api/coach/food/route.js",nextConfigOutput:"",userland:r}),{requestAsyncStorage:l,staticGenerationAsyncStorage:p,serverHooks:d}=c,m="/api/coach/food/route";function x(){return(0,n.patchFetch)({serverHooks:d,staticGenerationAsyncStorage:p})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var s=e=>t(t.s=e),r=t.X(0,[948,138],()=>s(4322));module.exports=r})();