"use strict";(()=>{var e={};e.id=137,e.ids=[137],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},4322:(e,r,t)=>{t.r(r),t.d(r,{originalPathname:()=>m,patchFetch:()=>h,requestAsyncStorage:()=>p,routeModule:()=>u,serverHooks:()=>d,staticGenerationAsyncStorage:()=>l});var s={};t.r(s),t.d(s,{POST:()=>i});var o=t(9303),a=t(8716),n=t(670);let c=new(t(1088)).ZP;async function i(e){try{let{description:r,image:t}=await e.json(),s=[];s=t?[{role:"user",content:[{type:"text",text:`Analyse ce repas${r?` (description: ${r})`:""}. R\xe9ponds en JSON strict:
{
  "success": true,
  "name": "Nom court du plat",
  "kcal": nombre (estimation calories),
  "isHealthy": true/false,
  "points": nombre 0-20 (20=tr\xe8s sain, 0=tr\xe8s gras/sucr\xe9),
  "details": "Description courte des macros"
}`},{type:"image_url",image_url:{url:t}}]}]:[{role:"user",content:`Analyse ce repas: "${r}". R\xe9ponds en JSON strict:
{
  "success": true,
  "name": "Nom court du plat",
  "kcal": nombre (estimation calories),
  "isHealthy": true/false,
  "points": nombre 0-20 (20=tr\xe8s sain, 0=tr\xe8s gras/sucr\xe9),
  "details": "Description courte des macros"
}`}];let o=(await c.chat.completions.create({model:"gpt-4o-mini",messages:s,max_tokens:300})).choices[0].message.content;try{let e=o.match(/\{[\s\S]*\}/);if(e){let r=JSON.parse(e[0]);return Response.json(r)}}catch(e){console.error("JSON parse error:",e)}return Response.json({success:!0,name:"Repas",kcal:400,isHealthy:!0,points:10,details:"Estimation par d\xe9faut"})}catch(e){return console.error("Food analysis error:",e),Response.json({success:!1,error:"Erreur d'analyse"})}}let u=new o.AppRouteRouteModule({definition:{kind:a.x.APP_ROUTE,page:"/api/coach/food/route",pathname:"/api/coach/food",filename:"route",bundlePath:"app/api/coach/food/route"},resolvedPagePath:"/Users/faicalkriouar/Desktop/coach-zen/app/api/coach/food/route.js",nextConfigOutput:"",userland:s}),{requestAsyncStorage:p,staticGenerationAsyncStorage:l,serverHooks:d}=u,m="/api/coach/food/route";function h(){return(0,n.patchFetch)({serverHooks:d,staticGenerationAsyncStorage:l})}}};var r=require("../../../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),s=r.X(0,[948,138],()=>t(4322));module.exports=s})();