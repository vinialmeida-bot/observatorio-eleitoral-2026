#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prepara resultados presidenciais do TSE para o Observatorio Eleitoral 2026.

Uso (Python 3.12, sem pacotes externos):
    python preparar_dados.py

O CSV original fica no computador. O script cria dados_eleicao_2026.json
na mesma pasta do script, sem publicar nada automaticamente.
"""
import csv
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ARQUIVO = Path(r"H:\votacao_candidato_munzona_2026\votacao_candidato_munzona_2026_BRASIL.csv")
SAIDA = Path(__file__).resolve().parent / "dados_eleicao_2026.json"
UFS = set("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split())
COLUNAS = {
    "ANO_ELEICAO", "NR_TURNO", "DS_CARGO", "SG_UF",
    "CD_MUNICIPIO", "NM_MUNICIPIO", "NR_CANDIDATO",
    "NM_URNA_CANDIDATO", "SG_PARTIDO", "QT_VOTOS_NOMINAIS_VALIDOS",
}

def numero(valor):
    try:
        return int((valor or "").strip())
    except (ValueError, TypeError):
        return None

def main():
    if not ARQUIVO.is_file():
        print("ERRO: arquivo CSV nao encontrado:", ARQUIVO)
        sys.exit(1)

    print("Arquivo:", ARQUIVO)
    print("Tamanho:", f"{ARQUIVO.stat().st_size:,}", "bytes")
    print("Lendo em fluxo (nao carrega os 3 GB na memoria)...", flush=True)

    candidatos = {}
    # chave (turno, uf, codigo municipio) -> {numero candidato: votos}
    municipios = defaultdict(lambda: defaultdict(int))
    nomes_municipios = {}
    linhas_turno = Counter()
    linhas_excluidas = Counter()
    linhas_lidas = 0
    votos_por_turno = Counter()

    with ARQUIVO.open("r", encoding="latin-1", newline="", buffering=1024 * 1024) as arquivo:
        leitor = csv.DictReader(arquivo, delimiter=";", quotechar='"')
        if not leitor.fieldnames:
            sys.exit("ERRO: CSV vazio ou sem cabecalho.")
        leitor.fieldnames = [c.strip().lstrip("\ufeff") for c in leitor.fieldnames]
        faltantes = sorted(COLUNAS - set(leitor.fieldnames))
        if faltantes:
            sys.exit("ERRO: colunas ausentes: " + ", ".join(faltantes))

        for linha in leitor:
            linhas_lidas += 1
            if linhas_lidas % 500_000 == 0:
                print(f"  {linhas_lidas:,} linhas verificadas...", flush=True)

            if linha["ANO_ELEICAO"].strip() != "2026":
                linhas_excluidas["outro_ano"] += 1
                continue
            if linha["DS_CARGO"].strip().casefold() != "presidente":
                linhas_excluidas["outro_cargo"] += 1
                continue

            turno = numero(linha["NR_TURNO"])
            if turno not in (1, 2):
                linhas_excluidas["turno_invalido"] += 1
                continue
            linhas_turno[turno] += 1

            uf = linha["SG_UF"].strip().upper()
            if uf not in UFS:
                linhas_excluidas[f"uf_fora_das_27_{uf or 'VAZIA'}"] += 1
                continue

            cod_municipio = linha["CD_MUNICIPIO"].strip()
            if not cod_municipio or cod_municipio.startswith("#"):
                linhas_excluidas["municipio_sem_codigo"] += 1
                continue
            numero_candidato = linha["NR_CANDIDATO"].strip()
            if not numero_candidato.isdigit():
                linhas_excluidas["candidato_invalido"] += 1
                continue
            votos = numero(linha["QT_VOTOS_NOMINAIS_VALIDOS"])
            if votos is None or votos < 0:
                linhas_excluidas["votos_invalidos"] += 1
                continue

            nome = linha["NM_URNA_CANDIDATO"].strip()
            partido = linha["SG_PARTIDO"].strip()
            candidatos[(turno, numero_candidato)] = {
                "numero": numero_candidato, "nome": nome, "partido": partido
            }
            chave = (turno, uf, cod_municipio)
            nomes_municipios[(uf, cod_municipio)] = linha["NM_MUNICIPIO"].strip()
            municipios[chave][numero_candidato] += votos
            votos_por_turno[turno] += votos

    print("\n=== VALIDACAO ===")
    print("Linhas totais lidas:", f"{linhas_lidas:,}")
    for turno in (1, 2):
        print(f"Turno {turno}: {linhas_turno[turno]:,} linhas de presidente, "
              f"{len({n for t, n in candidatos if t == turno})} candidatos, "
              f"{votos_por_turno[turno]:,} votos validos nas 27 UFs")
    print("Municipios/turnos agregados:", f"{len(municipios):,}")
    print("Linhas ignoradas por motivo:", dict(linhas_excluidas))

    if not linhas_turno[1] or not linhas_turno[2]:
        print("\nATENCAO: pelo menos um turno nao foi encontrado. "
              "Nao sera gerado JSON para publicacao.")
        sys.exit(2)

    # Total nacional e por UF, SEM adicionar linhas de BR/VT/ZZ.
    totais = defaultdict(lambda: defaultdict(int))
    estados = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    registros = []
    for (turno, uf, cod), votos_candidatos in sorted(municipios.items()):
        total = sum(votos_candidatos.values())
        for num, votos in votos_candidatos.items():
            totais[turno][num] += votos
            estados[turno][uf][num] += votos
        registros.append({
            "turno": turno, "uf": uf, "codigo": cod,
            "municipio": nomes_municipios[(uf, cod)],
            "validos": total,
            "votos": dict(sorted(votos_candidatos.items()))
        })

    resultado = {
        "versao": 1,
        "fonte": "TSE - votacao_candidato_munzona_2026_BRASIL.csv",
        "gerado_em_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "observacoes": [
            "Votos nominais validos para presidente, agregados por municipio e turno.",
            "Nao contem votos brancos, nulos, comparecimento ou abstencoes.",
            "SG_UF BR, VT e ZZ nao entram no total; votos no exterior e em transito precisam de tratamento separado.",
            "Conferir os totais com a apuracao oficial antes de publicar."
        ],
        "candidatos": {
            str(turno): sorted(
                [v for (t, _), v in candidatos.items() if t == turno],
                key=lambda c: int(c["numero"])
            ) for turno in (1, 2)
        },
        "nacional": {str(t): dict(totais[t]) for t in (1, 2)},
        "estados": {
            str(t): {uf: dict(v) for uf, v in sorted(estados[t].items())}
            for t in (1, 2)
        },
        "municipios": registros,
    }
    with SAIDA.open("w", encoding="utf-8") as arq:
        json.dump(resultado, arq, ensure_ascii=False, separators=(",", ":"))
    print("\nJSON GERADO:", SAIDA)
    print("Tamanho:", f"{SAIDA.stat().st_size / (1024 * 1024):.2f} MiB")
    print("IMPORTANTE: valide os totais antes de enviar o JSON ao GitHub.")

if __name__ == "__main__":
    main()
