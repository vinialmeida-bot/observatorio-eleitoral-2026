/* Observatório Eleitoral — Estudo de caso 07: mapas de crescimento.
   Fonte: JSONs eleitorais já publicados. O mapa de rede social não está sendo reproduzido.
   Um padrão geográfico, isoladamente, não é um teste de anomalia estatística. */
(function(global){
"use strict";
var votesData=null,rowsCache=null,selectedRegion="ALL",selectedCity=null;
var view={metric:"pp",mode:"growth",search:""};
var colors={lula:"#c65358",flavio:"#357fba",both:"#718b84",neither:"#d9ae53",tie:"#9ba7a2"};
var nameUf={AC:"Acre",AL:"Alagoas",AP:"Amapá",AM:"Amazonas",BA:"Bahia",CE:"Ceará",DF:"Distrito Federal",ES:"Espírito Santo",GO:"Goiás",MA:"Maranhão",MT:"Mato Grosso",MS:"Mato Grosso do Sul",MG:"Minas Gerais",PA:"Pará",PB:"Paraíba",PR:"Paraná",PE:"Pernambuco",PI:"Piauí",RJ:"Rio de Janeiro",RN:"Rio Grande do Norte",RS:"Rio Grande do Sul",RO:"Rondônia",RR:"Roraima",SC:"Santa Catarina",SP:"São Paulo",SE:"Sergipe",TO:"Tocantins"};
function num(x){return Number(x)||0;}
function fmt(x){return num(x).toLocaleString("pt-BR");}
function signed(x,metric){var amount=metric==="pp"?Math.abs(x).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})+" p.p.":fmt(Math.abs(x));return (x>0?"+":x<0?"−":"")+amount;}
function pct(n,d){return d?(100*n/d).toLocaleString("pt-BR",{maximumFractionDigits:1,minimumFractionDigits:1})+"%":"0,0%";}
function esc(x){return String(x==null?"":x).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function normal(x){return String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
function build(){
 if(rowsCache&&rowsCache.data===votesData)return rowsCache.items;
 var a=new Map(),b=new Map(),items=[];
 votesData.municipios.forEach(function(x){
  if(!nameUf[x.uf])return;
  var key=x.uf+"|"+x.codigo;
  if(Number(x.turno)===1)a.set(key,x);
  else if(Number(x.turno)===2)b.set(key,x);
 });
 a.forEach(function(x,key){
  var y=b.get(key);
  if(!y)return;
  var v1=num(x.validos),v2=num(y.validos);
  if(!v1||!v2)return;
  var l1=num((x.votos||{})["13"]),l2=num((y.votos||{})["13"]);
  var f1=num((x.votos||{})["22"]),f2=num((y.votos||{})["22"]);
  items.push({key:key,uf:x.uf,name:x.municipio,valid1:v1,valid2:v2,
   lulaVotes:l2-l1,flavioVotes:f2-f1,lulaPp:100*(l2/v2-l1/v1),flavioPp:100*(f2/v2-f1/v1)});
 });
 rowsCache={data:votesData,items:items};
 return items;
}
function values(r){return view.metric==="pp"?[r.lulaPp,r.flavioPp]:[r.lulaVotes,r.flavioVotes];}
function group(r){
 var v=values(r),l=v[0],f=v[1];
 // Valores de crescimento exatamente zero não são positivos.
 if(view.mode==="compare")return l>f?"lula":f>l?"flavio":"tie";
 return l>0&&f>0?"both":l>0?"lula":f>0?"flavio":"neither";
}
function definition(){
 return view.metric==="pp"?"Diferença entre a porcentagem de votos válidos de cada candidato no 2º e no 1º turno.":"Votos nominais do candidato no 2º turno menos os do 1º turno.";
}
function legend(){
 return view.mode==="growth"?
 [{key:"both",title:"Ambos cresceram"},{key:"lula",title:"Somente Lula cresceu"},{key:"flavio",title:"Somente Flávio cresceu"},{key:"neither",title:"Nenhum cresceu"}]:
 [{key:"lula",title:"Lula cresceu mais"},{key:"flavio",title:"Flávio cresceu mais"},{key:"tie",title:"Crescimento igual"}];
}
function filterTerritory(all){
 var r=selectedRegion;
 return all.filter(function(x){return r==="ALL"||r==="DOM"||x.uf===r;});
}
function stateBars(rows){
 var states={};rows.forEach(function(r){var v=states[r.uf]||(states[r.uf]={uf:r.uf,total:0,both:0,lula:0,flavio:0,neither:0,tie:0});v.total++;v[group(r)]++;});
 var legendItems=legend();
 return '<div class="map-states" role="list" aria-label="Distribuição por estado">'+
 Object.keys(states).sort().map(function(uf){
  var s=states[uf];var bar=legendItems.map(function(g){var count=s[g.key]||0,share=100*count/s.total;return '<span style="width:'+share.toFixed(4)+'%;background:'+colors[g.key]+'" title="'+esc(g.title+": "+fmt(count))+'"></span>';}).join("");
  return '<div class="map-state" role="listitem"><span><strong>'+esc(uf)+'</strong> <small>'+esc(nameUf[uf])+'</small></span><div class="map-state-track" role="img" aria-label="'+esc(legendItems.map(function(g){return g.title+": "+fmt(s[g.key]||0);}).join(", "))+'">'+bar+'</div><strong>'+fmt(s.total)+'</strong></div>';
 }).join("")+'</div>';
}
function summaryRows(rows){
 var l=0,f=0,both=0,neither=0,compL=0,compF=0,tie=0;
 rows.forEach(function(r){
  var v=values(r),a=v[0],b=v[1];
  if(a>0)l++;if(b>0)f++;
  if(a>0&&b>0)both++;
  if(a<=0&&b<=0)neither++;
  if(a>b)compL++;else if(b>a)compF++;else tie++;
 });
 return {total:rows.length,lula:l,flavio:f,both:both,neither:neither,compL:compL,compF:compF,tie:tie};
}
function itemStat(title,n,desc){return '<div class="map-stat"><span>'+esc(title)+'</span><strong>'+fmt(n)+'</strong><small>'+esc(desc)+'</small></div>';}
function makeTable(rows){
 var q=normal(view.search),found=rows.filter(function(r){return !q||normal(r.name+" "+r.uf).includes(q);});
 // Ordenação por eleitorado torna os exemplos reproduzíveis e evita chamar
 // diferenças grandes de "anomalias".
 found.sort(function(a,b){return b.valid2-a.valid2||a.uf.localeCompare(b.uf)||a.name.localeCompare(b.name);});
 var chosen=found.slice(0,25);
 return '<p class="small">'+fmt(found.length)+' município(s) encontrado(s). Mostrando até 25, ordenados por votos válidos no 2º turno.</p>'+
 '<div class="tablewrap map-table"><table><thead><tr><th>UF</th><th>Município</th><th class="num">Lula: variação</th><th class="num">Flávio: variação</th><th>Leitura</th></tr></thead><tbody>'+
 chosen.map(function(r){var v=values(r),cat=group(r);var label=legend().find(function(a){return a.key===cat;});
  return '<tr'+(selectedCity&&selectedCity.uf===r.uf&&String(selectedCity.codigo)===r.key.split("|")[1]?' class="map-selected"':'')+'><td>'+esc(r.uf)+'</td><td>'+esc(r.name)+'</td><td class="num">'+esc(signed(v[0],view.metric))+'</td><td class="num">'+esc(signed(v[1],view.metric))+'</td><td><span class="map-pill" style="border-color:'+colors[cat]+'">'+esc(label?label.title:"—")+'</span></td></tr>';
 }).join("")+'</tbody></table></div>';
}
function shell(){
 var el=document.getElementById("mapStudy");if(!el)return;
 el.innerHTML='<div class="panel map-intro"><div class="case-kicker">GRÁFICOS SOB ANÁLISE · CASE 07</div>'+
 '<h2>Um mapa quase todo vermelho é uma “anomalia estatística”?</h2>'+
 '<p class="sub">Uma publicação apresenta municípios em vermelho quando Lula cresceu e em azul quando Flávio cresceu. Mas o que significa “crescer”? E se ambos cresceram no mesmo município?</p>'+
 '<div class="map-claim"><strong>Afirmação investigada:</strong> “Em vermelho as cidades onde Lula cresceu. Em azul as que Flávio cresceu. Apenas uma anomalia estatística.”</div>'+
 '<p><strong>Conclusão sobre a alegada anomalia: inconclusiva.</strong> Um mapa de cores, sem hipótese estatística definida, valor esperado, método e teste, não prova nem refuta uma irregularidade. Aqui avaliamos a interpretação da legenda com os dados municipais.</p>'+
 '</div><div class="panel">'+
 '<h3>Compare diferentes critérios de crescimento</h3>'+
 '<div class="map-controls">'+
 '<label for="mapMetric">Como medir crescimento?<select id="mapMetric"><option value="pp">Pontos percentuais (p.p.)</option><option value="votes">Votos absolutos</option></select></label>'+
 '<label for="mapMode">Como classificar os municípios?<select id="mapMode"><option value="growth">Crescimento de cada candidato (inclui ambos)</option><option value="compare">Quem cresceu mais (classificação exclusiva)</option></select></label>'+
 '</div><p id="mapExplanation" class="case-method"></p>'+
 '<div id="mapNumbers" class="map-numbers"></div>'+
 '<div id="mapOverlap" class="map-overlap"></div>'+
 '<h3>Distribuição dos municípios por UF</h3><p class="small">Cada barra é composta pela quantidade de municípios em cada categoria — não representa extensão territorial, votação absoluta ou quantidade de eleitores.</p>'+
 '<div id="mapLegend" class="map-legend"></div><div id="mapStates"></div>'+
 '</div><div class="panel"><h3>Confira os municípios</h3><p class="sub">Os dois crescimentos podem ser positivos no mesmo município. Confira as duas colunas, independentemente da categoria usada.</p>'+
 '<label class="field map-search" for="mapSearch">Buscar município ou UF<input id="mapSearch" type="search" placeholder="Ex.: São Paulo, Guaraciaba, SC" autocomplete="off"></label>'+
 '<div id="mapTable"></div></div>'+
 '<div class="panel"><h3>Como interpretar o resultado?</h3>'+
 '<p><strong>As duas coisas podem ser verdade ao mesmo tempo:</strong> Lula e Flávio podem ganhar participação ou votos no mesmo município. Isso é esperado quando há candidatos eliminados, mudanças no comparecimento ou na composição dos votos válidos.</p>'+
 '<p><strong>Uma classificação de duas cores não é a mesma coisa que “cresceu ou não cresceu”.</strong> Para desenhar um mapa exclusivo, é necessário declarar o critério — por exemplo, quem cresceu <em>mais</em> — e não dizer apenas que cada cor identifica onde um candidato cresceu.</p>'+
 '<p><strong>O que ainda não sabemos:</strong> a imagem isolada não fornece a planilha original, a métrica de crescimento ou o procedimento de teste de anomalia. Nossa análise verifica interpretações possíveis com dados oficiais; não afirma reproduzir a metodologia do autor.</p>'+
 '<p class="case-source">Fonte: arquivos do TSE já usados pelo Observatório — <a href="https://dadosabertos.tse.jus.br/dataset/resultados-2026" target="_blank" rel="noopener noreferrer">Resultados de 2026</a>. Comparação dos municípios das 27 UFs; localidades do exterior fora do estudo.</p>'+
 '<button type="button" class="case-share" id="mapShare">Compartilhar investigação</button> <span id="mapFeedback" class="case-feedback" role="status"></span></div>';
 document.getElementById("mapMetric").addEventListener("change",function(){view.metric=this.value;update();});
 document.getElementById("mapMode").addEventListener("change",function(){view.mode=this.value;update();});
 document.getElementById("mapSearch").addEventListener("input",function(){view.search=this.value;updateTable();});
 document.getElementById("mapShare").addEventListener("click",function(){
  var url=new URL(global.location.href);url.searchParams.set("grafico","crescimento");url.searchParams.set("metrica",view.metric);url.searchParams.set("classificacao",view.mode);url.searchParams.delete("pergunta");
  var feedback=document.getElementById("mapFeedback");
  if(global.navigator&&global.navigator.clipboard&&global.navigator.clipboard.writeText){
   global.navigator.clipboard.writeText(url.toString()).then(function(){feedback.textContent="Link copiado.";},function(){feedback.textContent=url.toString();});
  }else feedback.textContent=url.toString();
 });
}
function updateTable(){
 var el=document.getElementById("mapTable");if(!el||!votesData)return;
 el.innerHTML=makeTable(filterTerritory(build()));
}
function update(){
 if(!votesData)return;
 var all=build(),rows=filterTerritory(all);
 var count=summaryRows(rows),metric=view.metric,territory=selectedRegion==="ALL"||selectedRegion==="DOM"?"27 UFs (exterior excluído)":selectedRegion==="ZZ"?"Exterior":nameUf[selectedRegion]||selectedRegion;
 var explanation=definition()+' Recorte: '+territory+'.';
 document.getElementById("mapExplanation").textContent=explanation;
 var cards=[];
 if(view.mode==="growth"){
  cards=[itemStat("Municípios analisados",count.total,"Com votos válidos nos dois turnos"),itemStat("Lula cresceu",count.lula,pct(count.lula,count.total)+" dos municípios"),itemStat("Flávio cresceu",count.flavio,pct(count.flavio,count.total)+" dos municípios"),itemStat("Ambos cresceram",count.both,pct(count.both,count.total)+" dos municípios")];
 }else{
  cards=[itemStat("Municípios analisados",count.total,"Mesmo conjunto de municípios"),itemStat("Lula cresceu mais",count.compL,pct(count.compL,count.total)+" dos municípios"),itemStat("Flávio cresceu mais",count.compF,pct(count.compF,count.total)+" dos municípios"),itemStat("Crescimento igual",count.tie,pct(count.tie,count.total)+" dos municípios")];
 }
 document.getElementById("mapNumbers").innerHTML=cards.join("");
 document.getElementById("mapOverlap").innerHTML=view.mode==="growth"?
  '<p class="map-note"><strong>Sobreposição identificada:</strong> em '+fmt(count.both)+' de '+fmt(count.total)+' municípios, ambos cresceram segundo a métrica escolhida. A legenda “vermelho onde um cresceu, azul onde outro cresceu” não define como representar esses casos.</p>':
  '<p class="map-note"><strong>Classificação exclusiva:</strong> aqui cada município recebe uma categoria comparando a <em>variação</em> dos candidatos. Isso é diferente de contar todos os municípios onde cada um cresceu.</p>';
 var keys=legend();
 document.getElementById("mapLegend").innerHTML=keys.map(function(k){return '<span><i style="background:'+colors[k.key]+'"></i>'+esc(k.title)+'</span>';}).join("");
 var states=document.getElementById("mapStates");
 states.innerHTML=rows.length?stateBars(rows):'<div class="empty">Este estudo compara municípios das 27 UFs. Escolha Brasil ou uma UF no filtro acima; localidades no exterior não fazem parte deste recorte.</div>';
 updateTable();
}
function init(ctx){
 if(!ctx||!ctx.votos)return;
 votesData=ctx.votos;selectedRegion=ctx.regiao||"ALL";selectedCity=ctx.cidade||null;
 if(!document.getElementById("mapMetric")){
  shell();
  if(global.location){
   var par=new URL(global.location.href).searchParams;
   if(par.get("grafico")==="crescimento"){
    var metric=par.get("metrica"),mode=par.get("classificacao");
    if(metric==="pp"||metric==="votes")view.metric=metric;
    if(mode==="growth"||mode==="compare")view.mode=mode;
    var tab=document.querySelector('nav [data-tab="mapa"]');
    if(tab){
     document.querySelectorAll("nav [data-tab]").forEach(function(x){x.setAttribute("aria-selected",String(x===tab));});
     document.querySelectorAll("section.page").forEach(function(x){x.hidden=x.id!=="mapa";});
    }
   }
  }
 }
 document.getElementById("mapMetric").value=view.metric;
 document.getElementById("mapMode").value=view.mode;
 update();
}
global.ObsMapa={render:init};
})(window);
