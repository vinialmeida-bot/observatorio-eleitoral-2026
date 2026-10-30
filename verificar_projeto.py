# -*- coding: utf-8 -*-
"""Conferencia local dos dados e arquivos do Observatorio Eleitoral 2026.
Uso: python verificar_projeto.py
Nao altera arquivos e nao usa pacotes de terceiros.
"""
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def arquivo(nome):
    path = ROOT / nome
    if not path.is_file():
        raise AssertionError(f"Arquivo ausente: {nome}")
    return path


def carregar(nome):
    return json.loads(arquivo(nome).read_text(encoding="utf-8"))


def chave(x):
    return str(x["turno"]), x["uf"], str(int(x["codigo"]))


def votos_registro(x):
    return sum(int(v) for v in x["votos"].values())


def conferir():
    votos = carregar("dados_eleicao_2026.json")
    part = carregar("dados_participacao_2026.json")
    html = arquivo("index.html").read_text(encoding="utf-8")
    for nome in ("cidade.js", "perguntas.js", "cases.js", "mapa.js"):
        arquivo(nome)
        assert f'./{nome}' in html, f"O site nao carrega {nome}"
    cases = arquivo("cases.js").read_text(encoding="utf-8")
    assert "window.ObsCases.render" in html, "O site nao executa o motor dos cases"
    assert 'data-tab="cases"' in html, "A aba dos cases nao esta no menu"
    for case_id in ("virada", "transferencia", "abstencoes", "brancos-nulos", "apoios", "bolhas"):
        assert f'card("{case_id}"' in cases, f"Case nao implementado: {case_id}"
    mapa_script = arquivo("mapa.js").read_text(encoding="utf-8")
    assert "window.ObsMapa.render" in html and 'data-tab="mapa"' in html, "A nova investigacao nao esta ligada a interface"
    for marcador in ("lulaPp", "flavioPp", "lulaVotes", "flavioVotes", "both"):
        assert marcador in mapa_script, f"Campo de calculo do mapa ausente: {marcador}"
    a = {chave(x): x for x in votos["municipios"]}
    b = {chave(x): x for x in part["municipios"]}
    assert len(a) == len(votos["municipios"]), "Locais repetidos na base de votos"
    assert len(b) == len(part["municipios"]), "Locais repetidos na participacao"
    for k, x in a.items():
        assert k in b, f"Local de votos ausente da participacao: {k}"
        p = b[k]
        assert votos_registro(x) == int(x["validos"]) == int(p["validos"]), f"Votos validos: {k}"
    for k, x in b.items():
        assert x["nulos"] == x["nulos_comuns"] + x["nulos_tecnicos"], f"Nulos: {k}"
        assert x["comparecimento"] == x["validos"] + x["brancos"] + x["nulos"] + x["anulados"], f"Comparecimento: {k}"
        if k not in a:
            assert int(x["validos"]) == 0, f"Local extra com votos validos: {k}"
    for turno in ("1", "2"):
        candidatos = sum(int(v) for v in votos["nacional"][turno].values())
        nacional = part["nacional"][turno]
        assert candidatos == int(votos["totais_conferidos"][turno])
        assert candidatos == int(nacional["validos"]), f"Votos nacional: {turno}"
        for field in ("aptos", "comparecimento", "abstencoes", "validos", "brancos", "nulos"):
            cidades = sum(int(x[field]) for k, x in b.items() if k[0] == turno)
            estados = sum(int(x[field]) for x in part["estados"][turno].values())
            assert cidades == estados == int(nacional[field]), f"Total {field}: {turno}"
        assert nacional["comparecimento"] == nacional["validos"] + nacional["brancos"] + nacional["nulos"] + nacional["anulados"]
        saldo = nacional["aptos"] - nacional["comparecimento"] - nacional["abstencoes"]
        print(f"Turno {turno}: {candidatos:,} votos validos; {nacional['abstencoes']:,} abstencoes; saldo tecnico de aptos {saldo:,}".replace(",", "."))
    por_local = defaultdict(dict)
    for k, x in a.items():
        v = x["votos"]
        por_local[(k[1], k[2])][k[0]] = int(v.get("13", 0)) - int(v.get("22", 0))
    mudou_lula = mudou_flavio = empates = 0
    for (uf, cod), turnos in por_local.items():
        if uf == "ZZ" or len(turnos) != 2:
            continue
        m1, m2 = turnos["1"], turnos["2"]
        if m1 < 0 < m2:
            mudou_lula += 1
        if m1 > 0 > m2:
            mudou_flavio += 1
        if m1 == 0 or m2 == 0:
            empates += 1
    print(f"Viradas municipais: Flavio -> Lula: {mudou_lula}; Lula -> Flavio: {mudou_flavio}; empate em algum turno: {empates}")
    # Verificacao independente do estudo 07: crescimento por municipio,
    # incluindo sobreposicoes. Sem somar o exterior (ZZ) nem contar duas vezes.
    turno1 = {(x["uf"], str(int(x["codigo"]))): x
              for x in votos["municipios"] if int(x["turno"]) == 1 and x["uf"] != "ZZ"}
    turno2 = {(x["uf"], str(int(x["codigo"]))): x
              for x in votos["municipios"] if int(x["turno"]) == 2 and x["uf"] != "ZZ"}
    contagem = {"municipios": 0, "lula_pp": 0, "flavio_pp": 0, "ambos_pp": 0,
                "lula_votos": 0, "flavio_votos": 0, "ambos_votos": 0}
    for chave_municipal, primeiro in turno1.items():
        segundo = turno2.get(chave_municipal)
        if not segundo or not primeiro["validos"] or not segundo["validos"]:
            continue
        v1, v2 = primeiro["votos"], segundo["votos"]
        vl1, vf1 = int(v1.get("13", 0)), int(v1.get("22", 0))
        vl2, vf2 = int(v2.get("13", 0)), int(v2.get("22", 0))
        lula_pp = vl2 / segundo["validos"] - vl1 / primeiro["validos"]
        flavio_pp = vf2 / segundo["validos"] - vf1 / primeiro["validos"]
        lula_votos, flavio_votos = vl2 - vl1, vf2 - vf1
        contagem["municipios"] += 1
        contagem["lula_pp"] += lula_pp > 0
        contagem["flavio_pp"] += flavio_pp > 0
        contagem["ambos_pp"] += lula_pp > 0 and flavio_pp > 0
        contagem["lula_votos"] += lula_votos > 0
        contagem["flavio_votos"] += flavio_votos > 0
        contagem["ambos_votos"] += lula_votos > 0 and flavio_votos > 0
    referencias = {"municipios": 5571, "lula_pp": 5567, "flavio_pp": 3827,
                   "ambos_pp": 3823, "lula_votos": 5491, "flavio_votos": 4624,
                   "ambos_votos": 4619}
    assert contagem == referencias, f"Auditoria estudo 07: {contagem} difere de {referencias}"
    print("Estudo 07 auditado: " + ", ".join(f"{k}={v}" for k, v in contagem.items()))
    print(f"Conferencia aprovada: {len(a):,} localidades/turnos de votos e {len(b):,} de participacao.".replace(",", "."))


if __name__ == "__main__":
    try:
        conferir()
    except (AssertionError, KeyError, ValueError, OSError, json.JSONDecodeError) as exc:
        print("FALHA NA CONFERENCIA:", exc)
        raise SystemExit(1)
