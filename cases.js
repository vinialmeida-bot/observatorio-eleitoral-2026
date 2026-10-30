/* Observatório Eleitoral 2026 — seis cases baseados nos resultados do TSE.
   Indicadores calculados localmente; não há inferência do voto individual. */
(function(global){
"use strict";
var D=null,P=null,municipalCache=null,initialized=false,linked=false;
var UF={AC:"Acre",AL:"Alagoas",AP:"Amapá",AM:"Amazonas",BA:"Bahia",CE:"Ceará",DF:"Distrito Federal",ES:"Espírito Santo",GO:"Goiás",MA:"Maranhão",MT:"Mato Grosso",MS:"Mato Grosso do Sul",MG:"Minas Gerais",PA:"Pará",PB:"Paraíba",PR:"Paraná",PE:"Pernambuco",PI:"Piauí",RJ:"Rio de Janeiro",RN:"Rio Grande do Norte",RS:"Rio Grande do Sul",RO:"Rondônia",RR:"Roraima",SC:"Santa Catarina",SP:"São Paulo",SE:"Sergipe",TO:"Tocantins",ZZ:"Exterior"};
var IDS=["virada","transferencia","abstencoes","brancos-nulos","apoios","bolhas"];
function num(x){return Number(x)||0;}
function fmt(x){return num(x).toLocaleString("pt-BR");}
function signed(x){return (x>0?"+":x<0?"−":"")+fmt(Math.abs(x));}
function percent(x){return num(x).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})+"%";}
function pp(x){return (x>0?"+":x<0?"−":"")+percent(Math.abs(x)).replace("%"," p.p.");}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function total(v){return Object.keys(v||{}).reduce(function(a,k){return a+num(v[k]);},0);}
function margem(v){return num(v["13"])-num(v["22"]);}
function lado(m){return m>0?"Lula":m<0?"Flávio":"empate";}
function local(r){return r==="ALL"?"Brasil completo, incluindo exterior":r==="DOM"?"Brasil, sem exterior":r==="ZZ"?"Exterior":(UF[r]||r)+" ("+r+")";}
function votos(t,r,c){
 if(c)return (t==="1"?c.primeiro:c.segundo).votos;
 if(r==="ALL")return D.nacional[t];
 if(r==="DOM"){var o={},z=(D.estados[t]||{}).ZZ||{};Object.keys(D.nacional[t]||{}).forEach(function(k){o[k]=num(D.nacional[t][k])-num(z[k]);});return o;}
 return (D.estados[t]||{})[r]||{};
}
function participacao(t,r,c){
 if(c)return t==="1"?c.participacao1:c.participacao2;
 if(r==="ALL")return P.nacional[t];
 if(r==="DOM"){var o={},z=P.exterior[t]||{};Object.keys(P.nacional[t]||{}).forEach(function(k){o[k]=num(P.nacional[t][k])-num(z[k]);});return o;}
 if(r==="ZZ")return P.exterior[t];
 return (P.estados[t]||{})[r]||{};
}
function cidades(){
 if(municipalCache&&municipalCache.source===D)return municipalCache.list;
 var a={},b={},list=[];
 D.municipios.forEach(function(x){var k=x.uf+"|"+x.codigo;if(Number(x.turno)===1)a[k]=x;else b[k]=x;});
 Object.keys(a).forEach(function(k){if(!b[k])return;var x=a[k],y=b[k],m1=margem(x.votos),m2=margem(y.votos);
  list.push({uf:x.uf,codigo:String(x.codigo),nome:x.municipio,m1:m1,m2:m2,delta:m2-m1,primeiro:x,segundo:y});
 });
 municipalCache={source:D,list:list};return list;
}
function stat(t,v,desc){return '<div class="case-stat"><span>'+esc(t)+'</span><strong>'+esc(v)+'</strong>'+(desc?'<small>'+esc(desc)+'</small>':"")+'</div>';}
function stats(items){return '<div class="case-stats">'+items.join("")+'</div>';}
function bars(rows){
 var mx=Math.max(1,...rows.map(function(r){return Math.max(0,num(r.value));}));
 return '<div class="case-bars">'+rows.map(function(r){var width=Math.max(0,Math.min(100,100*num(r.value)/mx));return '<div class="case-bar"><div class="case-bar-head"><span>'+esc(r.label)+'</span><strong>'+fmt(r.value)+'</strong></div><div class="case-track"><span style="width:'+width.toFixed(2)+'%;background:'+esc(r.color||"#087653")+'"></span></div></div>';}).join("")+'</div>';
}
function boxTitle(t){return '<h3>'+esc(t)+'</h3>';}
function assessment(status,claim){return '<p class="case-verdict"><strong>Leitura da afirmação:</strong> <span>'+esc(status)+'</span><small>'+esc(claim)+'</small></p>';}
function boundary(txt){return '<p class="case-boundary"><strong>O que não podemos concluir:</strong> '+esc(txt)+'</p>';}
function source(){return '<p class="case-source">Fonte: arquivos eleitorais do TSE usados no Observatório. <a href="https://dadosabertos.tse.jus.br/dataset/resultados-2026" target="_blank" rel="noopener noreferrer">Consultar base original</a>.</p>';}
function card(id,number,title,question,short,html){
 return '<article class="case-card" id="case-'+esc(id)+'"><details '+(number===1?'open':"")+'><summary><span class="case-number">'+String(number).padStart(2,"0")+'</span><span class="case-heading"><strong>'+esc(title)+'</strong><small>'+esc(question)+'</small></span><span class="case-chevron" aria-hidden="true">⌄</span></summary><div class="case-content"><p class="case-lead">'+esc(short)+'</p>'+html+source()+'<button class="case-share" type="button" data-case-share="'+esc(id)+'">Compartilhar este estudo</button><span class="case-feedback" role="status"></span></div></details></article>';
}
function render(ctx){
 if(!ctx||!ctx.votos||!ctx.participacao)return;
 D=ctx.votos;P=ctx.participacao;
 var r=ctx.regiao||"ALL",c=ctx.cidade||null,name=c?c.nome+" ("+c.uf+")":local(r);
 var v1=votos("1",r,c),v2=votos("2",r,c),p1=participacao("1",r,c),p2=participacao("2",r,c);
 var m1=margem(v1),m2=margem(v2),s1=total(v1),s2=total(v2);
 var c13=num(v2["13"])-num(v1["13"]),c22=num(v2["22"])-num(v1["22"]);
 var deltaSaldo=m2-m1;
 var items=[];
 // 01 — Mudança entre turnos: os números evidenciam uma variação, mas não suas causas.
 var invert=m1*m2<0,changeLabel=invert?"A liderança entre os dois candidatos se inverteu.":"Não houve inversão de liderança entre os dois candidatos.";
 var change=(s1&&s2)?100*m2/s2-100*m1/s1:0;
 items.push(card("virada",1,"A mudança entre os turnos","Por que a diferença de votos mudou?","O que podemos medir é a mudança da vantagem entre os candidatos — não o motivo individual de cada voto.",
  assessment(m1!==m2?"Sustentada pelos dados":"Não observada no recorte","Afirmação examinada: houve mudança no saldo Lula menos Flávio entre os turnos.")+
  '<p><strong>'+esc(changeLabel)+'</strong> No primeiro turno, a diferença Lula menos Flávio foi '+signed(m1)+' votos; no segundo, '+signed(m2)+'. Isso representa uma alteração de '+signed(deltaSaldo)+' votos na diferença.</p>'+
  stats([stat("Saldo no 1º turno",signed(m1),m1===0?"Empate":lado(m1)+" à frente"),stat("Saldo no 2º turno",signed(m2),m2===0?"Empate":lado(m2)+" à frente"),stat("Variação da diferença",signed(deltaSaldo),pp(change)+" na distância dos percentuais")])+
  boxTitle("Votos dos dois finalistas no 2º turno")+
  bars([{label:"Lula",value:num(v2["13"]),color:"#287eba"},{label:"Flávio",value:num(v2["22"]),color:"#df9039"}])+
  boundary("Essas diferenças não identificam quem mudou de candidato, quem passou a votar ou o que motivou a escolha.")));
 // 02 — Transferência: cálculo agregado não identifica eleitores.
 var third=Math.max(0,s1-num(v1["13"])-num(v1["22"]));
 items.push(card("transferencia",2,"Os votos dos eliminados","Os votos de outros candidatos foram todos para um finalista?","É possível comparar o tamanho do eleitorado dos demais candidatos e o crescimento dos finalistas, mas não rastrear votos individuais.",
  assessment("Inconclusiva","Afirmação examinada: todos os votos dos candidatos eliminados migraram para o mesmo finalista.")+
  '<p>No primeiro turno, os demais candidatos somaram '+fmt(third)+' votos válidos em '+esc(name)+'. Entre os turnos, Lula variou '+signed(c13)+' votos e Flávio variou '+signed(c22)+'. O total de votos válidos mudou '+signed(s2-s1)+'.</p>'+
  stats([stat("Outros candidatos no 1º turno",fmt(third)),stat("Variação de Lula",signed(c13)),stat("Variação de Flávio",signed(c22))])+
  bars([{label:"Demais candidatos — 1º turno",value:third,color:"#84978f"},{label:"Crescimento positivo de Lula",value:Math.max(0,c13),color:"#287eba"},{label:"Crescimento positivo de Flávio",value:Math.max(0,c22),color:"#df9039"}])+
  boundary("O crescimento entre turnos também pode envolver comparecimento diferente, brancos, nulos e mudanças de preferência. Uma soma semelhante não prova transferência direta.")));
 // 03 — Abstenção: o contrafactual é um limite matemático, não previsão ou fato.
 var a1=num(p1.abstencoes),a2=num(p2.abstencoes),required=Math.abs(m2)+1;
 var enough=a2>=required,needPct=a2?100*required/a2:0;
 var abstText=m2===0?"O recorte terminou empatado entre os dois finalistas.":enough?
  "Em um exercício puramente matemático, votos válidos de "+fmt(required)+" pessoas ausentes, todos para o candidato que ficou atrás e sem mudar os demais votos, seriam suficientes para inverter a diferença.":
  "Mesmo se todas as pessoas ausentes votassem validamente no candidato que ficou atrás, sem mudar nenhum outro voto, a vantagem observada seria maior que esse contingente.";
 items.push(card("abstencoes",3,"Quem deixou de votar","As abstenções poderiam ter alterado o resultado?","A quantidade de ausentes é conhecida. Como votariam, caso comparecessem, não é.",
  assessment("Inconclusiva","Afirmação examinada: a abstenção efetivamente decidiu o resultado.")+
  '<p>Em '+esc(name)+', as abstenções passaram de '+fmt(a1)+' no primeiro turno para '+fmt(a2)+' no segundo ('+signed(a2-a1)+'). '+esc(abstText)+'</p>'+
  stats([stat("Abstenções no 1º turno",fmt(a1)),stat("Abstenções no 2º turno",fmt(a2)),stat("Diferença entre finalistas no 2º turno",fmt(Math.abs(m2)))])+
  bars([{label:"Eleitores ausentes — 1º turno",value:a1,color:"#84978f"},{label:"Eleitores ausentes — 2º turno",value:a2,color:"#df9039"}])+
  '<p class="case-method">'+(m2===0?"Houve empate na comparação entre os dois candidatos.":enough?"Esse cenário mínimo representa "+percent(needPct)+" das abstenções do segundo turno.":"O cenário exige "+fmt(required)+" votos adicionais exclusivamente ao candidato atrás, acima das abstenções registradas.")+'</p>'+
  boundary("Trata-se de um cenário hipotético, não de prova de como os ausentes votariam. Também não consideramos mudanças simultâneas nos votos já depositados.")));
 // 04 — Brancos e nulos: regras de contagem e números.
 var inv1=num(p1.brancos)+num(p1.nulos),inv2=num(p2.brancos)+num(p2.nulos);
 var t1=num(p1.comparecimento),t2=num(p2.comparecimento);
 items.push(card("brancos-nulos",4,"Brancos e nulos","Esses votos foram para algum candidato?","Não. Brancos e nulos não são somados à votação nominal de nenhum candidato.",
  assessment("Contradita pelos dados e pelas regras eleitorais","Afirmação examinada: votos brancos ou nulos são transferidos ao candidato que recebe mais votos.")+
  '<p>No segundo turno, '+fmt(p2.brancos)+' votos foram brancos e '+fmt(p2.nulos)+' foram nulos em '+esc(name)+'. Juntos, equivalem a '+percent(t2?100*inv2/t2:0)+' das pessoas que compareceram, e não são incluídos entre os votos válidos para candidatos.</p>'+
  stats([stat("Brancos no 2º turno",fmt(p2.brancos)),stat("Nulos no 2º turno",fmt(p2.nulos)),stat("Brancos + nulos",fmt(inv2),signed(inv2-inv1)+" entre turnos")])+
  bars([{label:"Brancos + nulos — 1º turno",value:inv1,color:"#84978f"},{label:"Brancos + nulos — 2º turno",value:inv2,color:"#df9039"}])+
  '<p class="case-method">Denominador dos percentuais de brancos e nulos: comparecimento. O voto nulo técnico já está incluído no total de nulos. Consulte também as definições em “Palavras explicadas”.</p>'+
  boundary("Os totais não revelam por que alguém decidiu anular ou votar em branco, nem qual candidato essa pessoa escolheria em outra situação.")));
 // 05 — Apoios: não há registro de endossos nem identificação individual na base.
 var minor=Object.keys(v1).filter(function(k){return k!=="13"&&k!=="22";}).sort(function(a,b){return num(v1[b])-num(v1[a]);});
 var topMinor=minor.length?minor[0]:null,nomes=(D.candidatos&&D.candidatos["1"])||[];
 var cand=topMinor?nomes.find(function(x){return String(x.numero)===String(topMinor);}):null;
 var minorName=cand?(cand.nome||cand.numero):"Outros candidatos";
 items.push(card("apoios",5,"O efeito dos apoios políticos","O apoio de um candidato eliminado decidiu a eleição?","As urnas mostram onde a votação mudou. Não registram quem seguiu uma recomendação de outro político.",
  assessment("Inconclusiva","Afirmação examinada: determinado apoio político foi a causa da mudança de votos.")+
  '<p>O candidato fora da disputa final com mais votos no primeiro turno neste recorte foi '+esc(minorName)+', com '+fmt(topMinor?num(v1[topMinor]):0)+' votos. No segundo turno, as mudanças de Lula e Flávio foram, respectivamente, '+signed(c13)+' e '+signed(c22)+'.</p>'+
  stats([stat("Maior votação entre outros candidatos",fmt(topMinor?num(v1[topMinor]):0),minorName),stat("Variação Lula",signed(c13)),stat("Variação Flávio",signed(c22))])+
  '<p class="case-method">Para investigar apoios seria necessário também documentar declarações e datas dos apoios e considerar outros fatores. Comparar municípios pode identificar associações geográficas, mas não efeitos individuais ou causalidade.</p>'+
  boundary("O candidato com mais votos entre os eliminados não foi necessariamente quem apoiou algum finalista; nenhum apoio específico é atribuído por este estudo.")));
 // 06 — Bolhas: municípios não são eleitores, e uma amostra de conhecidos não é representativa.
 var mun=cidades().filter(function(x){return x.uf!=="ZZ";});
 var selectedMun=mun.filter(function(x){return !c? (r==="ALL"||r==="DOM"||x.uf===r):x.uf===c.uf;});
 var lua=selectedMun.filter(function(x){return x.m2>0;}).length,flav=selectedMun.filter(function(x){return x.m2<0;}).length,eq=selectedMun.filter(function(x){return x.m2===0;}).length;
 var all2=D.nacional["2"],nat13=100*num(all2["13"])/total(all2),nat22=100*num(all2["22"])/total(all2);
 var loc13=total(v2)?100*num(v2["13"])/total(v2):0,loc22=total(v2)?100*num(v2["22"])/total(v2):0;
 var isLocal=Boolean(c)||r==="ZZ";
 var compareLocal=isLocal?'<p>No recorte '+esc(name)+', Lula obteve '+percent(loc13)+' dos votos válidos e Flávio, '+percent(loc22)+' no segundo turno. No Brasil completo, os percentuais foram '+percent(nat13)+' e '+percent(nat22)+', respectivamente.</p>':
 '<p>Entre os '+fmt(selectedMun.length)+' municípios comparáveis neste recorte, Lula esteve à frente de Flávio em '+fmt(lua)+', Flávio esteve à frente em '+fmt(flav)+' e houve '+fmt(eq)+' empates. Contar municípios não é o mesmo que contar votos: cada município tem um eleitorado de tamanho diferente.</p>';
 items.push(card("bolhas",6,"A bolha eleitoral","Se na minha cidade muitos votaram em um candidato, por que o país teve outro resultado?","A experiência local pode ser verdadeira sem representar o conjunto dos eleitores brasileiros.",
  assessment("Contradita como inferência estatística","Afirmação examinada: o resultado da minha cidade ou do meu círculo de conhecidos representa automaticamente o resultado nacional.")+
  compareLocal+
  stats([stat(isLocal?"Lula no recorte":"Municípios à frente: Lula",isLocal?percent(loc13):fmt(lua)),stat(isLocal?"Flávio no recorte":"Municípios à frente: Flávio",isLocal?percent(loc22):fmt(flav)),stat("Votação Lula no Brasil",percent(nat13),"Segundo turno, todos os votos válidos")])+
  bars([{label:"Brasil — Lula (votos válidos)",value:num(all2["13"]),color:"#287eba"},{label:"Brasil — Flávio (votos válidos)",value:num(all2["22"]),color:"#df9039"}])+
  '<p class="case-method">As contagens municipais consideram as 27 UFs, excluindo o exterior. A liderança entre os dois finalistas é calculada por município. Os percentuais nacionais incluem exterior.</p>'+
  boundary("A eleição não revela as preferências de amigos e familiares, nem autoriza tratar uma amostra pessoal ou uma cidade como representativa do Brasil inteiro.")));
 var el=document.getElementById("casesArea");if(!el)return;
 var opened=Array.from(el.querySelectorAll(".case-card details[open]")).map(function(x){return x.closest(".case-card").id;});
 el.innerHTML='<div class="case-intro"><div class="case-kicker">SEIS INVESTIGAÇÕES · DADOS E PERCEPÇÕES</div><h2>Entre Dados e Achismos</h2><p>O que as pessoas dizem sobre a eleição? Compare afirmações com dados públicos, veja o que pode ser demonstrado e descubra onde termina a evidência.</p><p class="case-scope">Recorte: <strong>'+esc(name)+'</strong> · Comparação entre 1º e 2º turnos. '+(c?'A cidade foi escolhida em “Perguntas e minha cidade”.':'Use o filtro de território acima para explorar outro local.')+'</p></div>'+
 '<div class="case-help"><strong>Como ler as conclusões?</strong> “Sustentada” significa que os dados apoiam a afirmação específica; “contradita”, que eles ou as regras a negam; “inconclusiva”, que os números não conseguem estabelecer a causa ou o comportamento individual. Não são notas para políticos.</div>'+
 items.join("")+
 '<div class="case-method-global"><strong>Metodologia:</strong> os cases são recalculados no navegador com os mesmos arquivos de resultados e participação do TSE que alimentam o Observatório. Cenários hipotéticos são explicitamente identificados. Não realizamos análise de sentimento das redes sociais porque esta versão não dispõe de uma amostra de opiniões com metodologia documentada.</div>';
 if(initialized){el.querySelectorAll(".case-card details").forEach(function(x){x.open=opened.indexOf(x.closest(".case-card").id)!==-1;});}
 initialized=true;
 if(!linked&&global.location){
  linked=true;
  var param=new URL(global.location.href).searchParams.get("case");
  if(IDS.indexOf(param)!==-1){
   var target=document.getElementById("case-"+param);
   if(target){target.querySelector("details").open=true;var tab=document.querySelector('nav [data-tab="cases"]');
    if(tab){document.querySelectorAll("nav [data-tab]").forEach(function(x){x.setAttribute("aria-selected",String(x===tab));});document.querySelectorAll("section.page").forEach(function(x){x.hidden=x.id!=="cases";});}
   }
  }
 }
}
document.addEventListener("click",function(e){
 var button=e.target.closest("[data-case-share]");if(!button)return;
 var id=button.getAttribute("data-case-share"),url=new URL(global.location.href);
 url.searchParams.set("case",id);url.searchParams.delete("pergunta");
 var fb=button.nextElementSibling;
 function show(t){if(fb)fb.textContent=t;}
 if(navigator.clipboard&&navigator.clipboard.writeText){
  navigator.clipboard.writeText(url.toString()).then(function(){show("Link copiado.");},function(){show("Copie este endereço: "+url.toString());});
 }else show("Copie este endereço: "+url.toString());
});
global.ObsCases={render:render};
})(window);
