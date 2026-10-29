/* Observatório Eleitoral 2026 — perguntas que os dados podem responder.
   Respostas calculadas exclusivamente das duas bases de dados TSE publicadas.
   Uma correlação geográfica não identifica o comportamento de cada eleitor. */
(function (global) {
 "use strict";
 var state = {candidate:"70",rendered:false};
 var names = {},UF = {},data = null,part = null,region = "ALL";
 var labels = {AC:"Acre",AL:"Alagoas",AP:"Amapá",AM:"Amazonas",BA:"Bahia",CE:"Ceará",DF:"Distrito Federal",ES:"Espírito Santo",GO:"Goiás",MA:"Maranhão",MT:"Mato Grosso",MS:"Mato Grosso do Sul",MG:"Minas Gerais",PA:"Pará",PB:"Paraíba",PR:"Paraná",PE:"Pernambuco",PI:"Piauí",RJ:"Rio de Janeiro",RN:"Rio Grande do Norte",RS:"Rio Grande do Sul",RO:"Rondônia",RR:"Roraima",SC:"Santa Catarina",SP:"São Paulo",SE:"Sergipe",TO:"Tocantins",ZZ:"Exterior"};
 function n(x){return Number(x)||0;}
 function fmt(x){return n(x).toLocaleString("pt-BR");}
 function sign(x){return (x>0?"+":x<0?"−":"")+fmt(Math.abs(x));}
 function pct(x){return (n(x)*100).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})+"%";}
 function points(x){return (Math.abs(n(x))*100).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})+" pontos percentuais";}
 function safe(x){return String(x==null?"":x).replace(/[&<>"']/g,function(a){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[a];});}
 function normal(x){return String(x||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
 function territoryLabel(r){return r==="ALL"?"Brasil completo, incluindo o exterior":r==="DOM"?"Brasil, sem o exterior":r==="ZZ"?"Exterior":labels[r]||r;}
 function votes(t,r){
  var v=data.nacional[t],e=data.estados[t]||{};
  if(r==="ALL")return v;
  if(r==="DOM"){var o={};Object.keys(v).forEach(function(k){o[k]=v[k]-n((e.ZZ||{})[k]);});return o;}
  return e[r]||{};
 }
 function participation(t,r){
  var v=part.nacional[t],e=part.exterior[t];
  if(r==="ALL")return v;
  if(r==="DOM"){var o={};Object.keys(v).forEach(function(k){o[k]=n(v[k])-n(e[k]);});return o;}
  if(r==="ZZ")return e;
  return (part.estados[t]||{})[r]||{};
 }
 function sum(v){return Object.keys(v||{}).reduce(function(s,k){return s+n(v[k]);},0);}
 function margin(v){return n(v["13"])-n(v["22"]);}
 function winner(m){return m>0?"Lula":m<0?"Flávio":"Empate";}
 function howFar(m){return (m===0?"Empate":winner(m)+" com "+fmt(Math.abs(m))+" votos de vantagem");}
 function matches(uf,r){return r==="ALL"||(r==="DOM"?uf!=="ZZ":uf===r);}
 function buildMunicipalities(){
  var a={},b={};
  data.municipios.forEach(function(x){var key=x.uf+"|"+x.codigo;if(x.turno===1)a[key]=x;else b[key]=x;});
  return Object.keys(a).filter(function(k){return !!b[k]&&matches(a[k].uf,region);}).map(function(k){
   var x=a[k],y=b[k],m1=margin(x.votos),m2=margin(y.votos);
   return {uf:x.uf,name:x.municipio,key:k,m1:m1,m2:m2,delta:m2-m1,one:x,two:y};
  });
 }
 function stat(label,value,detail){return '<div class="qa-stat"><span>'+safe(label)+'</span><strong>'+safe(value)+'</strong>'+(detail?'<small>'+safe(detail)+'</small>':'')+'</div>';}
 function stats(items){return '<div class="qa-stats">'+items.join("")+'</div>';}
 function note(txt){return '<p class="qa-limit"><strong>O que isso não prova:</strong> '+txt+'</p>';}
 function method(txt){return '<p class="qa-method">'+txt+'</p>';}
 function list(items,renderItem){
  if(!items.length)return '<p>Não houve registros desse tipo no território selecionado.</p>';
  return '<ol class="qa-list">'+items.map(renderItem).join("")+'</ol>';
 }
 function card(id,num,question,short,content,terms,opened){
  var lookup=normal(question+" "+short+" "+terms);
  return '<article class="qa-card" data-qa-search="'+safe(lookup)+'"><details data-qa-id="'+id+'"'+(opened?' open':'')+'><summary><span class="qa-index">'+num+'</span><span class="qa-question"><strong>'+question+'</strong><small>'+short+'</small></span><span class="qa-chevron" aria-hidden="true">⌄</span></summary><div class="qa-answer">'+content+'</div></details></article>';
 }
 function make(){
  var v1=votes("1",region),v2=votes("2",region),p1=participation("1",region),p2=participation("2",region);
  var s1=margin(v1),s2=margin(v2),swing=s2-s1,l1=n(v1["13"]),l2=n(v2["13"]),f1=n(v1["22"]),f2=n(v2["22"]);
  var dL=l2-l1,dF=f2-f1,total1=sum(v1),total2=sum(v2),locals=buildMunicipalities();
  var toLula=locals.filter(function(x){return x.m1<0&&x.m2>0;});
  var toFlavio=locals.filter(function(x){return x.m1>0&&x.m2<0;});
  var tie=locals.filter(function(x){return x.m1===0||x.m2===0;});
  var localName=territoryLabel(region);
  var aa={};
  var previously=document.querySelectorAll("#qaAnswers details[open]");
  for(var j=0;j<previously.length;j++)aa[previously[j].getAttribute("data-qa-id")]=true;
  var first=!state.rendered;
  var cards=[];
  var intro1=(s1<0&&s2>0?"Aqui houve uma virada entre os dois candidatos.":s1>0&&s2<0?"Aqui a liderança mudou de Lula para Flávio.":"Aqui não houve troca de liderança entre os dois candidatos.");
  var q1= '<p class="qa-lead">'+safe(intro1)+' No primeiro turno: <strong>'+safe(howFar(s1))+'</strong>. No segundo: <strong>'+safe(howFar(s2))+'</strong>.</p>'+
   stats([stat("Votos a mais para Lula",sign(dL),"Do 1º para o 2º turno"),stat("Votos a mais para Flávio",sign(dF),"Do 1º para o 2º turno"),stat("Mudança na diferença",sign(swing),"A favor de Lula quando positiva")])+
   '<p>A diferença na quantidade de votos recebidos por cada candidato é o que explica <strong>matematicamente</strong> a mudança do resultado. Não precisamos supor a intenção dos eleitores para fazer essa conta.</p>'+
   note("Por que uma pessoa escolheu determinado candidato, se mudou seu voto ou se foi influenciada por uma campanha.")+
   method("Conta utilizada: votos de Lula menos votos de Flávio em cada turno. A comparação é sempre dos mesmos candidatos.");
  cards.push(card("virada","01","Como Lula passou Flávio no segundo turno?",
     safe(region==="ALL"?"Flávio liderou o primeiro turno; Lula teve mais votos no segundo. Veja como a diferença mudou.":intro1),q1,"virou virada diferença 1º segundo resultado lula flavio",aa.virada||first));
  var domL=region==="ALL"?toLula.filter(function(x){return x.uf!=="ZZ";}).length:null;
  var domF=region==="ALL"?toFlavio.filter(function(x){return x.uf!=="ZZ";}).length:null;
  var q2='<p class="qa-lead">Em '+safe(localName)+', <strong>'+fmt(toLula.length)+'</strong> localidades passaram da liderança de Flávio para a de Lula, e <strong>'+fmt(toFlavio.length)+'</strong> fizeram o caminho inverso.</p>'+
   (region==="ALL"?'<p>Considerando somente municípios brasileiros, foram <strong>'+fmt(domL)+'</strong> viradas para Lula e <strong>'+fmt(domF)+'</strong> para Flávio. O restante corresponde a localidades do exterior.</p>':'')+
   stats([stat("Passaram para Lula",fmt(toLula.length),"Liderança entre os dois candidatos"),stat("Passaram para Flávio",fmt(toFlavio.length),"Liderança entre os dois candidatos"),stat("Com empate em algum turno",fmt(tie.length),"Não entram na contagem de viradas")])+
   '<p>Uma cidade pode ter dado mais votos a Lula ou Flávio sem necessariamente mudar o candidato que ficou à frente. Contamos como virada somente a troca efetiva da liderança.</p>'+
   method("Unidade: município ou localidade exterior. Critério: comparar os votos de Lula e Flávio em cada turno; empates não contam como virada.");
  cards.push(card("municipios","02","Quantas cidades mudaram de lado?",
    fmt(toLula.length)+" passaram a ter Lula à frente; "+fmt(toFlavio.length)+" passaram a ter Flávio à frente.",q2,"cidades municipios viradas mudança de lado liderança",aa.municipios));
  var sortedFlip=toLula.slice().sort(function(a,b){return b.delta-a.delta;}).slice(0,5);
  var largest=locals.slice().sort(function(a,b){return b.delta-a.delta;}).slice(0,5);
  var q3='<p class="qa-lead">Entre as localidades em que houve virada para Lula, estas tiveram as maiores mudanças na <strong>diferença de votos</strong>:</p>'+
    list(sortedFlip,function(x){return '<li><strong>'+safe(x.name)+' ('+safe(x.uf)+')</strong><span>Antes, Flávio tinha '+fmt(-x.m1)+' votos de vantagem. Depois, Lula ficou '+fmt(x.m2)+' à frente.</span></li>';})+
    '<h3>Onde a diferença mais mudou, mesmo sem trocar a liderança?</h3>'+
    list(largest,function(x){return '<li><strong>'+safe(x.name)+' ('+safe(x.uf)+')</strong><span>A diferença entre Lula e Flávio mudou '+fmt(x.delta)+' votos a favor de Lula.</span></li>';})+
    method("Ranking por variação em votos absolutos. Isso favorece municípios grandes; não equivale a uma classificação por crescimento percentual.");
  cards.push(card("onde","03","Quais cidades tiveram as maiores viradas?",
    sortedFlip.length?sortedFlip[0].name+" ("+sortedFlip[0].uf+") aparece entre as maiores mudanças em votos.":"Nenhuma cidade do filtro teve essa virada.",q3,"onde maior virada cidades rio de janeiro itabirito ranking",aa.onde));
  var turnout=n(p2.comparecimento)-n(p1.comparecimento);
  var abst=n(p2.abstencoes)-n(p1.abstencoes);
  var q4='<p class="qa-lead">'+(turnout>0?"Mais pessoas compareceram no segundo turno.":turnout<0?"Menos pessoas compareceram no segundo turno.":"O comparecimento foi igual nos dois turnos.")+'</p>'+
    stats([stat("Comparecimento no 1º turno",fmt(p1.comparecimento),pct(n(p1.comparecimento)/n(p1.aptos))+" dos aptos"),stat("Comparecimento no 2º turno",fmt(p2.comparecimento),pct(n(p2.comparecimento)/n(p2.aptos))+" dos aptos"),stat("Mudança no comparecimento",sign(turnout),"Diferença de votantes")])+
    '<p>As abstenções passaram de <strong>'+fmt(p1.abstencoes)+'</strong> para <strong>'+fmt(p2.abstencoes)+'</strong> ('+sign(abst)+' de diferença).</p>'+
    note("O comparecimento maior não revela quem voltou a votar, quem faltou desta vez, nem em qual candidato essas pessoas votaram.")+
    method("Comparecimento e abstenções são dados do TSE separados por turno e território.");
  cards.push(card("comparecimento","04","Mais gente foi votar no segundo turno?",
    turnout>=0?fmt(turnout)+" comparecimentos a mais no segundo turno.":fmt(-turnout)+" comparecimentos a menos no segundo turno.",q4,"abstenção eleitores compareceram votaram presença",aa.comparecimento));
  var invalid1=n(p1.brancos)+n(p1.nulos),invalid2=n(p2.brancos)+n(p2.nulos),netInvalid=invalid2-invalid1,netValid=n(p2.validos)-n(p1.validos);
  var q5='<p class="qa-lead">Os votos brancos e nulos somados foram de <strong>'+fmt(invalid1)+'</strong> para <strong>'+fmt(invalid2)+'</strong> neste território.</p>'+
   stats([stat("Brancos + nulos no 1º",fmt(invalid1)),stat("Brancos + nulos no 2º",fmt(invalid2)),stat("Variação de brancos + nulos",sign(netInvalid))])+
   '<p>No mesmo período, os votos válidos mudaram <strong>'+sign(netValid)+'</strong>. Esses números ajudam a explicar o total de votos disponíveis para os candidatos no segundo turno, mas não identificam uma transferência.</p>'+
   note("Que alguém que votou em branco ou nulo no primeiro turno tenha escolhido Lula ou Flávio no segundo.")+
   method("Nulos técnicos, quando existentes, já fazem parte do total de nulos.");
  cards.push(card("brancos","05","Brancos e nulos ajudaram a mudar o resultado?",
     "A quantidade mudou "+sign(netInvalid)+", mas não sabemos como votou cada pessoa.",q5,"branco nulo invalidos mudaram votos",aa.brancos));
  var eliminated=total1-l1-f1;
  var cand=(data.candidatos["1"]||[]).filter(function(c){return c.numero!=="13"&&c.numero!=="22";});
  if(!cand.some(function(c){return c.numero===state.candidate;}))state.candidate=cand[0]?cand[0].numero:null;
  var chosen=cand.find(function(c){return c.numero===state.candidate;});
  var chosenV=chosen?n(v1[chosen.numero]):0;
  var selector='<label class="qa-label" for="qaCandidate">Veja os números de um candidato do 1º turno:</label><select id="qaCandidate">'+cand.map(function(c){return '<option value="'+safe(c.numero)+'"'+(c.numero===state.candidate?' selected':'')+'>'+safe(c.nome)+' ('+safe(c.partido)+')</option>';}).join("")+'</select>';
  var q6='<p class="qa-lead">Os candidatos que ficaram fora do segundo turno somaram <strong>'+fmt(eliminated)+'</strong> votos válidos no primeiro turno neste território.</p>'+
   selector+stats([stat("Votos para "+(chosen?chosen.nome:"outros candidatos"),fmt(chosenV),"No 1º turno"),stat("Crescimento de Lula",sign(dL),"Do 1º para o 2º turno"),stat("Crescimento de Flávio",sign(dF),"Do 1º para o 2º turno")])+
   '<p>É possível comparar quantos votos os candidatos eliminados tiveram com o crescimento dos finalistas. Mas os resultados por cidade <strong>não mostram para quem cada eleitor transferiu seu voto</strong>.</p>'+
   note("Que o apoio público de um candidato causou determinada quantidade de votos ou que seus eleitores seguiram sua orientação.")+
   method("São somas e diferenças de votos. Não há dados de transferência individual ou de efeito causal de apoios.");
  cards.push(card("apoios","06","Os votos de Caiado, Cury, Zema e dos outros candidatos foram para quem?",
    "As urnas mostram quantos votos cada um recebeu, não para quem seus eleitores votaram depois.",q6,"apoio endosso segundo turno caiado cury zema transferencia eliminados",aa.apoios));
  var q7='<p class="qa-lead">'+(dF>0?"Sim. Flávio teve mais votos absolutos no segundo turno.":"Neste território, Flávio não aumentou seus votos absolutos.")+' Isso não determina sozinho quem terminou à frente.</p>'+
   stats([stat("Flávio no 1º turno",fmt(f1),pct(total1?f1/total1:0)+" dos votos válidos"),stat("Flávio no 2º turno",fmt(f2),pct(total2?f2/total2:0)+" dos votos válidos"),stat("Mudança em votos",sign(dF))])+
   '<p>Para saber quem recebeu mais votos no segundo turno, compare os dois candidatos na <strong>mesma eleição</strong>: Lula teve '+fmt(l2)+' e Flávio teve '+fmt(f2)+' votos em '+safe(localName)+'.</p>'+
   method("Votos absolutos e porcentagens são medidas distintas. As porcentagens do primeiro turno incluem todos os candidatos daquele turno.");
  cards.push(card("crescimento","07","Como um candidato pode crescer e ainda ficar atrás?",
     "Receber mais votos que antes não significa receber mais votos que o adversário.",q7,"flavio cresceu perdeu ganhou porcentagem votos absolutos",aa.crescimento));
  var states=[];
  Object.keys(data.estados["1"]).filter(function(u){return u!=="ZZ";}).forEach(function(uf){
   var first=margin(data.estados["1"][uf]),last=margin(data.estados["2"][uf]);
   if((first<0&&last>0)||(first>0&&last<0))states.push({uf:uf,first:first,last:last});
  });
  states.sort(function(a,b){return (b.last-b.first)-(a.last-a.first);});
  var q8='<p class="qa-lead">Considerando os 26 estados e o Distrito Federal, <strong>'+fmt(states.length)+'</strong> unidade(s) federativa(s) trocaram a liderança entre Lula e Flávio.</p>'+
   list(states,function(x){return '<li><strong>'+safe(labels[x.uf])+' ('+x.uf+')</strong><span>Primeiro turno: '+safe(howFar(x.first))+'. Segundo turno: '+safe(howFar(x.last))+'.</span></li>';})+
   '<p>Em outros estados a diferença de votos pode ter aumentado ou diminuído sem mudança de quem ficou à frente.</p>'+
   method("Critério: liderança entre Lula e Flávio em cada turno; o exterior não é um estado.");
  cards.push(card("estados","08","Algum estado também mudou de lado?",
    states.length?states.map(function(x){return labels[x.uf];}).join(", ")+" mudou a liderança.":"Nenhum estado mudou a liderança nesta comparação.",q8,"minas gerais estado virada unidades federativas",aa.estados));
  var ext1=data.estados["1"]["ZZ"]||{},ext2=data.estados["2"]["ZZ"]||{},diffExt=margin(ext2),domScore=margin(votes("2","DOM")),nationalScore=margin(votes("2","ALL"));
  var q9='<p class="qa-lead">No segundo turno, a diferença no exterior foi de <strong>'+fmt(Math.abs(diffExt))+' votos a favor de '+winner(diffExt)+'</strong>.</p>'+
    stats([stat("Diferença no exterior",sign(diffExt),"Lula menos Flávio"),stat("Diferença no Brasil sem exterior",sign(domScore),"Lula menos Flávio"),stat("Diferença no total",sign(nationalScore),"Brasil e exterior")])+
    '<p>O total nacional inclui os votos no exterior. A comparação acima mostra exatamente quanto eles acrescentaram à diferença entre os candidatos, sem tratar isso como uma eleição alternativa.</p>'+
    method("Diferença = votos de Lula menos votos de Flávio no segundo turno. Exterior identificado por ZZ.");
  cards.push(card("exterior","09","Os votos do exterior mudaram a diferença final?",
    "No segundo turno, o exterior acrescentou "+sign(diffExt)+" votos ao saldo Lula menos Flávio.",q9,"exterior estrangeiro fora pais zz voto",aa.exterior));
  var q10='<p class="qa-lead">Uma virada numérica, por si só, <strong>não é prova de fraude</strong>. Ela mostra uma mudança de totais entre duas votações distintas.</p>'+
   '<p>Para investigar uma irregularidade seria preciso reunir evidências específicas, verificar as etapas da apuração e conferir registros e procedimentos de auditoria. Este Observatório compara resultados divulgados pelo TSE; ele não substitui uma auditoria eleitoral.</p>'+
   note("Que a eleição foi fraudada ou que nenhuma irregularidade ocorreu. Dados agregados, sozinhos, não resolvem essas alegações.")+
   method('Fonte dos números: <a href="https://dadosabertos.tse.jus.br/dataset/resultados-2026" target="_blank" rel="noopener noreferrer">Portal de Dados Abertos do TSE</a>.');
  cards.push(card("fraude","10","Uma virada nos números prova fraude?",
     "Não. É necessário analisar evidências concretas, não apenas a mudança dos totais.",q10,"fraude suspeita irregularidade apuração seguranca auditoria",aa.fraude));
  var header='<div class="qa-intro"><p class="qa-overline">COMECE POR AQUI</p><h2>As perguntas que muita gente faz sobre a eleição</h2><p>Você não precisa entender gráficos. Abra uma pergunta, leia a resposta e veja os números que a sustentam. Quando não há como saber algo, explicamos isso também.</p><div class="qa-selected"><strong>Onde estamos olhando:</strong> '+safe(localName)+' <span>Use o filtro de território acima para comparar outro local.</span></div></div>';
  return header+'<div class="qa-search-line"><label for="qaSearch"><strong>Procurar uma pergunta</strong><span>Ex.: virada, abstenção, Caiado, exterior</span></label><input type="search" id="qaSearch" placeholder="Digite uma palavra ou assunto" autocomplete="off"></div><p class="qa-count" id="qaCount"></p><div id="qaAnswers">'+cards.join("")+'</div><p class="qa-footer">Todas as respostas numéricas são recalculadas a partir dos arquivos oficiais do TSE. As perguntas resumem debates públicos; nenhum resultado é atribuído a comportamento individual sem evidência. <a href="https://dadosabertos.tse.jus.br/dataset/resultados-2026" target="_blank" rel="noopener noreferrer">Conferir dados originais do TSE</a>.</p>';
 }
 function filter(){
  var input=document.getElementById("qaSearch"),q=normal(input?input.value:""),cards=document.querySelectorAll("#qaAnswers .qa-card"),shown=0;
  for(var i=0;i<cards.length;i++){var yes=!q||cards[i].getAttribute("data-qa-search").indexOf(q)!==-1;cards[i].hidden=!yes;if(yes)shown++;}
  var c=document.getElementById("qaCount");
  if(c)c.textContent=shown===cards.length?"10 perguntas respondidas com dados":fmt(shown)+" pergunta(s) encontrada(s)";
 }
 function bind(){
  var target=document.getElementById("qaArea");if(!target||target.dataset.bound)return;
  target.dataset.bound="1";
  target.addEventListener("input",function(ev){if(ev.target.id==="qaSearch")filter();});
  target.addEventListener("change",function(ev){if(ev.target.id==="qaCandidate"){state.candidate=ev.target.value;var q=document.getElementById("qaSearch"),prev=q?q.value:"";draw();var fresh=document.getElementById("qaSearch");if(fresh)fresh.value=prev;filter();}});
 }
 function draw(){var area=document.getElementById("qaArea");if(!area||!data||!part)return;area.innerHTML=make();state.rendered=true;filter();}
 global.ObsPerguntas={
  render:function(ctx){data=ctx.votos;part=ctx.participacao;region=ctx.regiao||"ALL";bind();draw();}
 };
})(window);
