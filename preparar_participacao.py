# -*- coding: utf-8 -*-
"""
Observatorio Eleitoral 2026 - comparecimento, abstencoes, brancos e nulos.
Fonte oficial TSE: detalhe_votacao_munzona_2026.zip
Nao exige bibliotecas externas. Nao publica dados sem reconciliacao.

Uso no PowerShell:
    python preparar_participacao.py

Arquivos esperados na mesma pasta:
    dados_eleicao_2026.json (gerado anteriormente)
O ZIP do TSE sera baixado automaticamente se estiver ausente.
"""
import csv
import hashlib
import io
import json
import sys
import urllib.request
import zipfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

PASTA = Path(__file__).resolve().parent
ZIP = PASTA / "detalhe_votacao_munzona_2026.zip"
VOTOS = PASTA / "dados_eleicao_2026.json"
SAIDA = PASTA / "dados_participacao_2026.json"
URL = ("https://cdn.tse.jus.br/estatistica/sead/odsele/"
       "detalhe_votacao_munzona/detalhe_votacao_munzona_2026.zip")
UFS = set("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO ZZ".split())
CAMPOS = ("aptos", "comparecimento", "abstencoes", "validos",
          "brancos", "nulos", "anulados")


def n(v):
    s = str(v or "").strip()
    if not s or s in {"#NULO", "#NE"}:
        return 0
    return int(s)


def codigo(s):
    s = str(s or "").strip()
    return str(int(s)) if s.isdigit() else s


def novo():
    return {campo: 0 for campo in CAMPOS}


def somar(destino, origem):
    for campo in CAMPOS:
        destino[campo] += origem[campo]


def baixar():
    if ZIP.is_file() and ZIP.stat().st_size > 0:
        print("ZIP ja existe:", ZIP, "-", f"{ZIP.stat().st_size:,}", "bytes")
        return
    print("Baixando arquivo oficial do TSE:", URL)
    temp = ZIP.with_suffix(".part")
    try:
        req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0 ObservatorioEleitoral/1.0"})
        with urllib.request.urlopen(req, timeout=120) as origem, temp.open("wb") as saida:
            while True:
                bloco = origem.read(1024 * 1024)
                if not bloco:
                    break
                saida.write(bloco)
                print(f"\rRecebidos {saida.tell() / (1024*1024):.1f} MiB", end="", flush=True)
        print()
        with zipfile.ZipFile(temp) as z:
            erro = z.testzip()
            if erro:
                raise RuntimeError("Arquivo ZIP corrompido: " + erro)
        temp.replace(ZIP)
    except Exception:
        temp.unlink(missing_ok=True)
        print("\nFalha no download automatico. Baixe manualmente pelo link acima")
        print("e salve o ZIP nesta pasta:", PASTA)
        raise


def membro_principal(z):
    csvs = [p for p in z.namelist() if p.lower().endswith(".csv")]
    # BRASIL e o consolidado nacional; BR e outro arquivo e nao deve
    # ser somado nem escolhido no lugar do BRASIL.
    brasil = [p for p in csvs if Path(p).name.lower() ==
              "detalhe_votacao_munzona_2026_brasil.csv"]
    if len(brasil) == 1:
        return brasil[0]
    if len(csvs) == 1:
        return csvs[0]
    raise ValueError("CSV BRASIL nao encontrado de forma inequivoca: " + str(csvs[:20]))


def executar():
    print("=== PARTICIPACAO ELEITORAL 2026 ===")
    if not VOTOS.is_file():
        sys.exit("ERRO: faltou o arquivo de votos validos: " + str(VOTOS))
    with VOTOS.open("r", encoding="utf-8") as f:
        base = json.load(f)
    base_local = {
        (str(x["turno"]), x["uf"], codigo(x["codigo"])): int(x["validos"])
        for x in base["municipios"]
    }
    if len(base_local) != len(base["municipios"]):
        sys.exit("ERRO: municipios duplicados na base anterior.")
    print("Base de votos validos:", len(base_local), "registros de localidade/turno")
    baixar()
    sha = hashlib.sha256()
    with ZIP.open("rb") as f:
        for bloco in iter(lambda: f.read(1024 * 1024), b""):
            sha.update(bloco)
    print("SHA-256 do ZIP:", sha.hexdigest())
    territorios = defaultdict(novo)
    linhas = Counter()
    ignoradas = Counter()
    exemplo = None
    with zipfile.ZipFile(ZIP) as z:
        arquivo = membro_principal(z)
        print("CSV selecionado:", arquivo)
        with z.open(arquivo) as raw, io.TextIOWrapper(raw, encoding="latin-1", newline="") as f:
            reader = csv.DictReader(f, delimiter=";")
            colunas = set(reader.fieldnames or [])
            print("Colunas identificadas:", ", ".join(reader.fieldnames or []))
            exigidas = {
                "ANO_ELEICAO", "NR_TURNO", "SG_UF", "CD_MUNICIPIO", "NM_MUNICIPIO",
                "CD_CARGO", "QT_APTOS", "QT_COMPARECIMENTO", "QT_ABSTENCOES",
                "QT_VOTOS_VALIDOS", "QT_VOTOS_BRANCOS", "QT_VOTOS_NULOS"
            }
            faltantes = exigidas - colunas
            if faltantes:
                sys.exit("ERRO: colunas obrigatorias ausentes: " + ", ".join(sorted(faltantes)))
            campo_anulados = ("QT_VOTOS_ANULADOS" if "QT_VOTOS_ANULADOS" in colunas
                             else "QT_VOTOS_ANULADOS_APU_SEP" if "QT_VOTOS_ANULADOS_APU_SEP" in colunas
                             else None)
            for i, row in enumerate(reader, 1):
                if i % 100_000 == 0:
                    print(f"  {i:,} linhas examinadas...")
                if row["ANO_ELEICAO"].strip() != "2026":
                    ignoradas["outro_ano"] += 1
                    continue
                if row["CD_CARGO"].strip() != "1":
                    ignoradas["outro_cargo"] += 1
                    continue
                turno = row["NR_TURNO"].strip()
                uf = row["SG_UF"].strip().upper()
                if turno not in ("1", "2"):
                    ignoradas["outro_turno"] += 1
                    continue
                if uf not in UFS:
                    ignoradas["uf_especial_ou_invalida_" + uf] += 1
                    continue
                cod = codigo(row["CD_MUNICIPIO"])
                if not cod:
                    ignoradas["codigo_municipio_vazio"] += 1
                    continue
                valores = {
                    "aptos": n(row["QT_APTOS"]),
                    "comparecimento": n(row["QT_COMPARECIMENTO"]),
                    "abstencoes": n(row["QT_ABSTENCOES"]),
                    "validos": n(row["QT_VOTOS_VALIDOS"]),
                    "brancos": n(row["QT_VOTOS_BRANCOS"]),
                    "nulos": n(row["QT_VOTOS_NULOS"]),
                    "anulados": n(row[campo_anulados]) if campo_anulados else 0,
                }
                if any(x < 0 for x in valores.values()):
                    sys.exit(f"ERRO: valor negativo na linha {i}")
                chave = (turno, uf, cod)
                reg = territorios[chave]
                somar(reg, valores)
                linhas[turno] += 1
                if exemplo is None:
                    exemplo = {k: row.get(k) for k in ("SG_UF", "NM_MUNICIPIO", "NR_ZONA", "CD_CARGO", "NR_TURNO")}
    print("\n=== CONFERENCIA ===")
    print("Exemplo de registro:", exemplo)
    print("Linhas presidenciais:", dict(linhas))
    print("Linhas ignoradas:", dict(ignoradas))
    print("Municipios/localidades por turno:", dict(Counter(t for t, _, _ in territorios)))
    print("Coluna de votos anulados:", campo_anulados or "indisponivel")
    totais = {"1": novo(), "2": novo()}
    exterior = {"1": novo(), "2": novo()}
    estados = {"1": defaultdict(novo), "2": defaultdict(novo)}
    detalhes = []
    for (turno, uf, cod), valores in sorted(territorios.items()):
        somar(totais[turno], valores)
        somar(estados[turno][uf], valores)
        if uf == "ZZ":
            somar(exterior[turno], valores)
        detalhes.append({"turno": int(turno), "uf": uf, "codigo": cod, **valores})
    problemas = []
    for t in ("1", "2"):
        d = totais[t]
        base_nacional = int(base["totais_conferidos"][t])
        print(f"\nTurno {t}")
        for k in CAMPOS:
            print(f"  {k:>16}: {d[k]:,}")
        print("  votos validos da base anterior:", f"{base_nacional:,}")
        if d["validos"] != base_nacional:
            problemas.append(f"turno {t}: votos validos nao batem ({d['validos']} vs {base_nacional})")
        dif_aptos = d["aptos"] - d["comparecimento"] - d["abstencoes"]
        dif_urna = d["comparecimento"] - d["validos"] - d["brancos"] - d["nulos"]
        print("  aptos - comparecimento - abstencoes:", f"{dif_aptos:,}")
        print("  comparecimento - validos - brancos - nulos:", f"{dif_urna:,}")
        if dif_aptos != 0:
            problemas.append(f"turno {t}: diferenca aptos/comparecimento/abstencoes = {dif_aptos}")
        if dif_urna != 0:
            problemas.append(f"turno {t}: diferenca comparecimento/validos/brancos/nulos = {dif_urna}; investigar outras categorias")
        print("  Exterior (ZZ):", {k: exterior[t][k] for k in CAMPOS})
    chaves_atuais = set(territorios)
    faltantes = set(base_local) - chaves_atuais
    extras = chaves_atuais - set(base_local)
    divergentes = [
        (key, validos, territorios[key]["validos"])
        for key, validos in base_local.items()
        if key in territorios and territorios[key]["validos"] != validos
    ]
    print("\nConferencia municipal:")
    print("  locais na base de votos ausentes no detalhe:", len(faltantes))
    print("  locais no detalhe ausentes na base de votos:", len(extras))
    print("  divergencias de votos validos por local:", len(divergentes))
    for x in divergentes[:8]:
        print("  EXEMPLO DIVERGENCIA:", x)
    if faltantes:
        problemas.append(f"{len(faltantes)} locais da base anterior ausentes no detalhe")
    if divergentes:
        problemas.append(f"{len(divergentes)} locais com votos validos divergentes")
    if not all(linhas[t] for t in ("1", "2")):
        problemas.append("faltam registros presidenciais de um turno")
    if problemas:
        print("\nATENCAO - divergencias encontradas:")
        for p in problemas:
            print(" -", p)
        print("NAO foi gerado JSON novo. Envie esta tela para investigarmos.")
        return 2
    saida = {
        "versao": 1,
        "fonte": "TSE - detalhe_votacao_munzona_2026.zip",
        "url_fonte": URL,
        "sha256_zip": sha.hexdigest(),
        "gerado_em_utc": datetime.now(timezone.utc).isoformat(),
        "observacoes": [
            "Somente presidente (CD_CARGO=1); duas rodadas; Brasil completo inclui ZZ (exterior).",
            "Percentuais de abstencao usam aptos; de brancos e nulos usam comparecimento.",
            "Os totais de aptos do TSE podem conter 39 registros duplicados de transferencia temporaria; nao foi feita correcao territorial arbitraria.",
            "Outras categorias de voto, se presentes, precisam de conferencia antes da publicacao."
        ],
        "nacional": totais,
        "exterior": exterior,
        "estados": {t: dict(v) for t, v in estados.items()},
        "municipios": detalhes
    }
    with SAIDA.open("w", encoding="utf-8") as f:
        json.dump(saida, f, ensure_ascii=False, separators=(",", ":"))
    print("\n=== VALIDACAO APROVADA ===")
    print("JSON GERADO:", SAIDA)
    print("Tamanho:", f"{SAIDA.stat().st_size / (1024*1024):.2f} MiB")
    print("O JSON ainda nao foi publicado no site.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(executar())
    except (OSError, ValueError, KeyError, zipfile.BadZipFile) as e:
        print("ERRO:", type(e).__name__, e)
        sys.exit(1)
