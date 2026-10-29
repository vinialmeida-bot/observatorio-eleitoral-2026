/* Observatório Eleitoral 2026 — leitura simples da eleição em cada município.
   O filtro por cidade afeta apenas as perguntas e o resumo local. */
(function(global){
"use strict";
var data=null,part=null,cityMap={},items=[],selected=null,onChange=null,ready=false;
var $=function(id){return document.getElementById(id);};
var normal=function(s){return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();};
var fmt=function(x){return Number(x||0).toLocaleString("pt-BR");};
var pct=function(x){return(100*(Number.isFinite(x)?x:0)).toLocaleString("pt-BR",{maximumFractionDigits:1})+"%";};
var safe=function(x){return String(x||"").replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});};
function margin(v){return(Number(v["13"])||0)-(Number(v["22"])||0);}
function leader(m){return m>0?"Lula":m<0?"Flávio":"Empate";}
function describe(m){return m===0?"Empate entre Lula e Flávio":leader(m)+" com "+fmt(Math.abs(m))+" votos de vantagem";}
function build(){
  var first={},second={},pt={};items=[];cityMap={};
  part.municipios.forEach(function(r){pt[r.turno+"|"+r.uf+"|"+r.codigo]=r;});
  data.municipios.forEach(function(r){var id=r.uf+"|"+r.codigo;if(Number(r.turno)===1)first[id]=r;else second[id]=r;});
  Object.keys(first).forEach(function(id){
    if(!second[id]||!pt["1|"+id]||!pt["2|"+id])return;
    var a=first[id],b=second[id],v={
      key:id,uf:a.uf,codigo:a.codigo,nome:a.municipio,
      primeiro:a,segundo:b,participacao1:pt["1|"+id],participacao2:pt["2|"+id],
      margem1:margin(a.votos),margem2:margin(b.votos)
    };
    cityMap[id]=v;items.push(v);
  });
  items.sort(function(a,b){return a.nome.localeCompare(b.nome,"pt-BR")||a.uf.localeCompare(b.uf)||String(a.codigo).localeCompare(String(b.codigo));});
}
function fromLink(){
 if(!global.location)return;
 var params=new URL(global.location.href).searchParams,raw=params.get("municipio");
 if(!raw)return;
 var match=raw.match(/^([A-Za-z]{2})-(\d+)$/);
 if(match){var k=match[1].toUpperCase()+"|"+String(Number(match[2]));if(cityMap[k])selected=k;}
}
function writeLink(){
 if(!global.history||!global.location)return;
 var url=new URL(global.location.href);
 if(selected){var c=cityMap[selected];url.searchParams.set("municipio",c.uf+"-"+c.codigo);}
 else url.searchParams.delete("municipio");
 url.searchParams.delete("pergunta");
 global.history.replaceState(null,"",url.pathname+url.search+url.hash);
}
function setSelected(key){
 if(key&& !cityMap[key])return;
 selected=key||null;
 writeLink();render();
 if(typeof onChange==="function")onChange();
}
function stats(label,value,detail){return '<div class="qa-stat"><span>'+safe(label)+'</span><strong>'+safe(value)+'</strong><small>'+safe(detail)+'</small></div>';}
function profile(c){
 if(!c)return '<p class="qa-muted">Escolha uma localidade da lista. O resumo e as respostas serão calculados só para ela.</p>';
 var a=c.participacao1,b=c.participacao2,m1=c.margem1,m2=c.margem2,virou=(m1*m2<0);
 var sentence=virou?"A liderança mudou entre Lula e Flávio.":(m1===0||m2===0)?"Houve empate entre Lula e Flávio em pelo menos um turno.":"A liderança entre Lula e Flávio não mudou.";
 var delta=b.comparecimento-a.comparecimento;
 return '<div class="qa-city-profile"><div class="qa-city-profile-title"><strong>'+safe(c.nome)+' ('+safe(c.uf)+')</strong><button type="button" class="qa-city-reset" id="qaCityReset">Limpar cidade</button></div>'+
 '<p class="qa-lead">'+sentence+'</p>'+
 '<div class="qa-stats">'+stats("No primeiro turno",describe(m1),"Comparação Lula × Flávio")+
 stats("No segundo turno",describe(m2),"Comparação Lula × Flávio")+
 stats("Quem compareceu", (delta>0?"+":delta<0?"−":"")+fmt(Math.abs(delta)), "Mudança do 1º para o 2º turno")+'</div>'+
 '<p>De cada 100 eleitores aptos, aproximadamente '+Math.round(b.aptos?100*b.comparecimento/b.aptos:0)+' compareceram no segundo turno. Os votos individuais são secretos.</p>'+
 '<p class="qa-city-disclaimer">As perguntas abaixo usarão os números desta localidade. As outras seções do Observatório continuam usando o filtro geral por estado ou Brasil.</p></div>';
}
function suggestions(){
 var input=$("qaCityInput"),output=$("qaCitySuggestions");if(!input||!output)return;
 var q=normal(input.value.trim());
 if(q.length<2){output.innerHTML="";input.setAttribute("aria-expanded","false");return;}
 var found=items.filter(function(c){return normal(c.nome+" "+c.uf+" "+c.codigo).includes(q);}).slice(0,9);
 output.innerHTML=found.length?found.map(function(c){return '<button type="button" data-local-key="'+safe(c.key)+'"><strong>'+safe(c.nome)+'</strong><small>'+safe(c.uf==='ZZ'?'Exterior':c.uf)+'</small></button>';}).join(""):'<p class="qa-muted">Não encontrei esta localidade. Verifique a grafia.</p>';
 input.setAttribute("aria-expanded",String(found.length>0));
}
function render(){
 var host=$("qaCity");if(!host)return;
 host.innerHTML='<div class="qa-city-top"><div><p class="qa-overline">COMECE POR SUA CIDADE</p><h3>O que aconteceu onde você mora?</h3><p>Digite um nome e escolha um resultado. Mostraremos uma explicação em palavras simples.</p></div>'+
 '<label for="qaCityInput">Buscar município ou localidade do exterior</label><input id="qaCityInput" type="search" autocomplete="off" placeholder="Ex.: Campinas, Guaraciaba, Lisboa" aria-controls="qaCitySuggestions" aria-expanded="false" aria-describedby="qaCityHint">'+
 '<p class="qa-muted" id="qaCityHint">Digite pelo menos duas letras e selecione uma opção na lista.</p>'+
 '<div id="qaCitySuggestions" class="qa-city-suggestions" role="group" aria-label="Resultados de cidades"></div></div>'+
 '<div id="qaCityProfile">'+profile(selected?cityMap[selected]:null)+'</div>';
}
function bind(){
 var host=$("qaCity");if(!host||host.dataset.bound==="1")return;
 host.dataset.bound="1";
 host.addEventListener("input",function(e){if(e.target.id==="qaCityInput")suggestions();});
 host.addEventListener("click",function(e){
  var btn=e.target.closest("[data-local-key]");if(btn){setSelected(btn.getAttribute("data-local-key"));return;}
  if(e.target.closest("#qaCityReset"))setSelected(null);
 });
}
global.ObsCidade={
 init:function(context){
  if(ready)return;
  data=context.votos;part=context.participacao;onChange=context.aoSelecionar;
  build();fromLink();bind();ready=true;render();
 },
 selected:function(){return selected?cityMap[selected]:null;},
 count:function(){return items.length;},
 select:function(key){setSelected(key);},
 getByCode:function(key){return cityMap[key]||null;}
};
})(window);