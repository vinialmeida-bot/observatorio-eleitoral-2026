# Observatório Eleitoral 2026

**Entenda os dados sem precisar saber ler gráficos.**

O Observatório é um projeto independente, gratuito e aberto para explicar a eleição presidencial de 2026 no Brasil com números oficiais do Tribunal Superior Eleitoral (TSE).

**Página pública:** https://vinialmeida-bot.github.io/observatorio-eleitoral-2026/

## Como usar

1. Abra **Perguntas e minha cidade**, a página inicial.
2. Em **O que aconteceu onde você mora?**, digite o nome do município (por exemplo, Campinas ou Guaraciaba) e selecione a opção com a UF correspondente.
3. Leia o resumo da sua cidade: quem esteve à frente entre Lula e Flávio no 1º e no 2º turno, se houve virada e o que aconteceu com o comparecimento.
4. Abra uma das dez perguntas para ver **a resposta curta, os números e o que eles não provam**. Use **Compartilhar esta resposta** para copiar um link direto, incluindo a cidade escolhida.
5. Para pesquisar o Brasil ou um estado, clique em **Limpar cidade** e use o filtro geral no alto da página. Outras análises estão no menu **Mais consultas e explicações**.

A busca de perguntas serve para **filtrar as dez perguntas publicadas**, não funciona como chatbot e não produz respostas novas a qualquer pergunta. A busca de cidades usa dados carregados localmente no navegador: o site não solicita cadastro, nome do eleitor, endereço ou preferências políticas.

Um link compartilhado pode conter `?municipio=SC-1234&pergunta=virada`: esses parâmetros indicam somente uma localidade pública e uma pergunta publicada, nunca informações pessoais.

**Importante:** selecionar uma cidade adapta o resumo e as perguntas da página inicial; os painéis mais técnicos continuam usando o filtro geral de Brasil/UF indicado no topo.

## O que mostramos

- **Perguntas e minha cidade**: busca por município/localidade do exterior, resumo em português simples e dez perguntas auditáveis sobre a mudança no saldo de votos, viradas municipais, comparecimento, abstenção, votos brancos e nulos, candidatos eliminados, estados e exterior. Cada pergunta tem link próprio compartilhável.
- **Resultado explicado**: quem recebeu mais votos e o que significa a porcentagem apresentada.
- **Dois candidatos**: comparação das quantidades e das porcentagens.
- **O que mudou?**: primeiro versus segundo turno.
- **Estados e exterior**: votação em cada unidade federativa e nas localidades exteriores.
- **Tabela de municípios**: consulta detalhada de votos por nome de município e localidade no exterior; o resumo fácil fica na página inicial.
- **Quem votou e quem faltou?**: comparecimento, abstenção, brancos e nulos por município, estado e exterior.
- **Palavras explicadas**: glossário de conceitos e metodologia.

### Princípios editoriais

- A primeira resposta é **direta, escrita em português simples**, sem depender de gráficos. Os números também aparecem como frases ("de cada 100 eleitores").
- Todos os números apresentados são **calculados a partir dos arquivos disponibilizados pelo TSE**. Não são previsões ou pesquisas de intenção de voto.
- Não explicamos motivações psicológicas, sociais, políticas ou intenções individuais apenas a partir de totais municipais. Os votos são secretos.
- Uma associação territorial não prova que um eleitor transferiu voto para determinado candidato nem que um apoio político causou votos.
- Para "virada municipal", comparamos a liderança **entre Lula e Flávio em ambos os turnos**; só contamos troca efetiva de liderança, excluindo empates. Os resultados do exterior são contados separadamente quando pertinente.
- "Maior virada" pode significar mais votos de diferença, ou maior variação percentual. O ranking mostra os critérios separadamente. Se a cidade estiver selecionada, a comparação por tamanho absoluto e proporcional é feita com as demais localidades do mesmo estado.
- Não usamos as informações para recomendar voto ou fazer avaliações de candidatos.

## Arquivos

| Arquivo | Papel |
| --- | --- |
| `index.html` | Interface acessível em navegador e hospedada pelo GitHub Pages |
| `cidade.js` | Busca de municípios/localidades, narrativa de cada local e leitura de links compartilháveis |
| `perguntas.js` | Motor das dez perguntas automáticas, respostas municipais e compartilhamento de explicações |
| `dados_eleicao_2026.json` | Votos nominais válidos por candidato, turno, estado, município e exterior |
| `dados_participacao_2026.json` | Aptos, comparecimento, abstenção, brancos, nulos e válidos |
| `preparar_dados.py` | Gera a base de candidatos a partir do CSV nacional do TSE |
| `preparar_participacao.py` | Gera a base de participação a partir do ZIP nacional do TSE e reconcilia votos válidos |

As bases JSON são arquivos estáticos; **a página não depende de APIs externas para fazer contas e responder às perguntas**. Links com `?municipio=` e `?pergunta=` permitem abrir um assunto diretamente sem salvar dados do visitante.

## Fontes e verificações

- [Portal de Dados Abertos do TSE — resultados 2026](https://dadosabertos.tse.jus.br/dataset/resultados-2026)
- [Comparecimento e abstenção 2026](https://dadosabertos.tse.jus.br/pt_BR/dataset/comparecimento-e-abstencao-2026)
- Arquivo de detalhe: `detalhe_votacao_munzona_2026.zip` (endereço registrado no JSON de participação).

Votos válidos nacionais conferidos entre as duas bases:

| Indicador | 1º turno | 2º turno |
| --- | ---: | ---: |
| Votos válidos | 119.300.788 | 124.082.273 |
| Comparecimento | 125.275.835 | 128.236.074 |
| Abstenções | 33.469.244 | 30.509.005 |
| Brancos | 2.300.798 | 1.430.496 |
| Nulos totais | 3.674.249 | 2.723.305 |

**Observação técnica:** A soma nacional `comparecimento + abstenções` fica **423 abaixo** do total de aptos em cada turno nos arquivos utilizados. Essa diferença não foi inventada como abstenção. Os nulos técnicos já estão incluídos nos nulos totais, evitando dupla contagem.

### Reprodução local

Abra o repositório numa pasta com os dois arquivos JSON e rode um servidor HTTP local para abrir `index.html`:

```powershell
python -m http.server 8000
```

Visite http://localhost:8000 no navegador. Abrir o HTML como `file://` pode bloquear o carregamento dos JSONs em alguns navegadores.

Para recalcular os dados oficiais, leia as instruções no início de cada arquivo `preparar_*.py`.

## Independência

Projeto cívico independente, sem vínculo institucional com o TSE, partidos ou campanhas. Textos do projeto são educativos e não substituem documentos oficiais, perícias ou auditorias eleitorais.
