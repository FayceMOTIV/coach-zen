"use strict";(()=>{var e={};e.id=158,e.ids=[158],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},9541:(e,r,s)=>{s.r(r),s.d(r,{originalPathname:()=>g,patchFetch:()=>d,requestAsyncStorage:()=>c,routeModule:()=>p,serverHooks:()=>m,staticGenerationAsyncStorage:()=>l});var t={};s.r(t),s.d(t,{POST:()=>u});var i=s(9303),n=s(8716),o=s(670);let a=new(s(5152)).ZP;async function u(e){try{let{mealType:r,constraints:s}=await e.json(),t=`Tu es un chef nutrition expert. Sugg\xe8re 3 recettes rapides et saines pour un ${{breakfast:"petit-d\xe9jeuner prot\xe9in\xe9 (6 oeufs, caf\xe9)",lunch:"d\xe9jeuner \xe9quilibr\xe9 (250g riz, 300g prot\xe9ine, l\xe9gumes)",snack:"collation saine (yaourt grec ou oeuf + amandes)",dinner:"d\xeener \xe9quilibr\xe9 (250g riz, 300g prot\xe9ine, l\xe9gumes)",plannedTreat:"encas plaisir contr\xf4l\xe9 (dessert raisonnable)"}[r]||"repas \xe9quilibr\xe9"}.

${s?`Contraintes: ${s}`:""}

Pour chaque recette, donne:
1. Nom court et app\xe9tissant
2. Ingr\xe9dients principaux (liste courte)
3. Temps de pr\xe9paration
4. Calories approximatives

Format JSON strict:
{
  "recipes": [
    {
      "name": "Nom",
      "ingredients": ["ing1", "ing2", "ing3"],
      "prepTime": "10 min",
      "calories": 450,
      "emoji": "🍳"
    }
  ]
}

R\xe9ponds UNIQUEMENT avec le JSON, sans texte avant ou apr\xe8s.`,i=await a.messages.create({model:"claude-sonnet-4-20250514",max_tokens:500,messages:[{role:"user",content:t}]}),n=i.content[0]?.text||"";try{let e=n.match(/\{[\s\S]*\}/);if(e){let r=JSON.parse(e[0]);return Response.json({success:!0,recipes:r.recipes||[]})}}catch(e){console.error("JSON parse error:",e)}return Response.json({success:!0,recipes:[{name:"Oeufs brouill\xe9s aux herbes",ingredients:["6 oeufs","ciboulette","beurre"],prepTime:"5 min",calories:400,emoji:"\uD83C\uDF73"},{name:"Bowl prot\xe9in\xe9",ingredients:["riz","poulet grill\xe9","l\xe9gumes"],prepTime:"15 min",calories:550,emoji:"\uD83E\uDD57"},{name:"Yaourt grec fruits",ingredients:["yaourt grec","fruits rouges","amandes"],prepTime:"2 min",calories:200,emoji:"\uD83E\uDD5C"}]})}catch(e){return console.error("Recipe suggestion error:",e),Response.json({success:!1,recipes:[{name:"Oeufs brouill\xe9s",ingredients:["6 oeufs","sel","poivre"],prepTime:"5 min",calories:400,emoji:"\uD83C\uDF73"}]},{status:200})}}let p=new i.AppRouteRouteModule({definition:{kind:n.x.APP_ROUTE,page:"/api/recipes/suggest/route",pathname:"/api/recipes/suggest",filename:"route",bundlePath:"app/api/recipes/suggest/route"},resolvedPagePath:"/Users/faicalkriouar/Desktop/coach-zen/app/api/recipes/suggest/route.js",nextConfigOutput:"",userland:t}),{requestAsyncStorage:c,staticGenerationAsyncStorage:l,serverHooks:m}=p,g="/api/recipes/suggest/route";function d(){return(0,o.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:l})}}};var r=require("../../../../webpack-runtime.js");r.C(e);var s=e=>r(r.s=e),t=r.X(0,[948,160],()=>s(9541));module.exports=t})();