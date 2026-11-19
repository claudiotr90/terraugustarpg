#!/usr/bin/env python3
"""Copy the published CMs, validating each complete text against its catalog."""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlsplit
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from hashlib import sha256
import json, html

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'compendios'
SOURCE='https://compendios-mestres-claudio.claudiocareerdublin.chatgpt.site'
PAGES='https://claudiotr90.github.io/terraugustarpg/compendios'
RAW='https://raw.githubusercontent.com/claudiotr90/terraugustarpg/main/compendios'
IDENTITY='CompendiosMestres-Sync/1.0 (authorized mirror for claudiotr90)'
EXPECTED={
 'terraugusta':'libfile_a6ca12b4d53c81919fbe1fb055b44fda',
 'reborn-in-london':'libfile_7465107489a08191a486e1777bfb86f4',
 'rage-across-brent':'libfile_b5072a752f988191b5c6454adc8e605b',
 'port-mercer-by-night':'libfile_40d3f85da9f081918766cca8233d437e',
}

def fetch(url):
    if urlsplit(url).netloc!=urlsplit(SOURCE).netloc:
        raise ValueError('Unexpected source host')
    with urlopen(Request(url,headers={'User-Agent':IDENTITY}),timeout=30) as response:
        if response.status!=200:raise ValueError(f'Unexpected status {response.status}')
        return response.read()

catalog=json.loads(fetch(SOURCE+'/catalogo.json'))
documents=catalog['documents']
assert len(documents)==4 and {d['id'] for d in documents}==set(EXPECTED)

def validate(item):
    assert item['library_file_id']==EXPECTED[item['id']]
    data=fetch(item['markdown_url'])
    data.decode('utf-8')
    assert len(data)==item['size_bytes']
    assert sha256(data).hexdigest()==item['sha256']
    return item,data

with ThreadPoolExecutor(max_workers=4) as pool:
    checked=list(pool.map(validate,documents))

DEST.mkdir(exist_ok=True)
published=[]
for item,data in checked:
    slug=item['id']
    for ext in ['md','txt']:(DEST/f'{slug}.{ext}').write_bytes(data)
    record=dict(item)
    record.update({'text_url':PAGES+f'/{slug}.txt','markdown_url':PAGES+f'/{slug}.md',
                   'raw_text_url':RAW+f'/{slug}.txt','raw_markdown_url':RAW+f'/{slug}.md'})
    record.pop('reading_url',None)
    published.append(record)

mirror={'updated_at':catalog['updated_at'],'mirrored_at':datetime.now(timezone.utc).isoformat(),
        'source_site':SOURCE,'documents':published}
(DEST/'catalogo.json').write_text(json.dumps(mirror,ensure_ascii=False,indent=2)+'\n')

rules='''## Regras de leitura

- Consulte a versão atual antes de reutilizar uma cópia antiga.
- CANON é material confirmado; ABERTO identifica lacunas; PROVISÓRIO e propostas não são fatos confirmados.
- Decisões explícitas posteriores do autor prevalecem. Terraugusta conserva o histórico; o bloco de revisão mais recente tem precedência sobre passagens antigas conflitantes.
- Preserve grafias, cronologia e separação entre os quatro cenários. Homônimos não autorizam importar histórias entre continuidades.
- Ler os arquivos não atualiza automaticamente a memória persistente de uma IA.
'''
index='# Compêndios Mestres\n\nTextos integrais dos quatro CMs em português do Brasil.\n\n'
index+=f'[Catálogo de versões e integridade]({PAGES}/catalogo.json)\n\n## Textos no GitHub Pages\n\n'
for d in published:
    index+=f'- [{d["title"]}]({d["text_url"]}) - versão {d["version"]}; Markdown: {d["markdown_url"]}\n'
index+='\n## Acesso direto aos arquivos no GitHub\n\n'
for d in published:index+=f'- [{d["title"]}]({d["raw_text_url"]}) - Markdown: {d["raw_markdown_url"]}\n'
index+='\n'+rules
(DEST/'llms.txt').write_text(index)
(DEST/'llms-full.txt').write_text(index+'\n\n# Textos integrais\n\n'+'\n\n---\n\n'.join(data.decode('utf-8') for _,data in checked))

readme='# Compêndios Mestres\n\nEspelho dos quatro CMs, com textos integrais, versões e integridade verificáveis.\n\n'
for d in published:readme+=f'- [{d["title"]}]({d["id"]}.md) - versão {d["version"]}; [texto puro]({d["id"]}.txt).\n'
readme+='\n[Índice para IAs](llms.txt) · [Todos os textos](llms-full.txt) · [Catálogo](catalogo.json)\n\n'+rules
readme+='\n## Atualização\n\nOs originais dos CMs continuam sendo a fonte editorial. Este espelho reproduz as versões publicadas; não reescreve cânone. Para renovar os arquivos, execute `python3 scripts/sync_compendios.py` a partir da raiz do repositório e publique o resultado. O script usa apenas a biblioteca padrão do Python e valida os quatro documentos antes de substituir os arquivos.\n\nOs arquivos `.md` podem ser abertos no Obsidian. Alterações locais no Obsidian não são enviadas automaticamente aos CMs originais.\n'
(DEST/'README.md').write_text(readme)
items=''
for d in published:
    slug=d['id'];title=html.escape(d['title'])
    items+=f'<li><h2>{title}</h2><p>Versão {d["version"]}</p><p><a href="{slug}.txt">Texto puro</a> · <a href="{slug}.md">Markdown</a> · <a href="{d["raw_text_url"]}">Arquivo direto no GitHub</a></p></li>'
page=f'''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Compêndios Mestres</title><style>body{{font:17px/1.7 system-ui,sans-serif;max-width:800px;margin:3rem auto;padding:0 1.3rem;color:#172a40}}h1,h2{{line-height:1.25}}h1{{font-size:2.3rem}}h2{{font-size:1.35rem}}a{{color:#214d9d;text-underline-offset:3px}}ul{{list-style:none;padding:0}}li{{padding:1.4rem 0;border-top:1px solid #d5e0ec}}li p{{margin:.45rem 0}}nav{{margin:2rem 0}}footer{{border-top:1px solid #d5e0ec;margin-top:2rem;padding-top:1.3rem;color:#52647a}}a:focus-visible{{outline:3px solid #6487d3;outline-offset:4px}}</style></head><body><main><h1>Compêndios Mestres</h1><p>Os quatro CMs em texto integral, com cânone, questões abertas e propostas identificados.</p><nav><a href="llms.txt">Índice para IAs</a> · <a href="llms-full.txt">Todos os CMs em texto</a> · <a href="catalogo.json">Versões e integridade</a></nav><ul>{items}</ul><footer>Terraugusta preserva seu volume anterior com as correções vigentes apresentadas primeiro. Os quatro cenários são continuidades independentes.</footer></main></body></html>'''
(DEST/'index.html').write_text(page)
(ROOT/'.nojekyll').write_text('')
for d,data in checked:
    for ext in ['md','txt']:assert (DEST/(d['id']+'.'+ext)).read_bytes()==data
print(json.dumps({'documents':len(checked),'versions':{d['id']:d['version'] for d in published},'files':[str(p.relative_to(ROOT)) for p in sorted(DEST.iterdir())]},ensure_ascii=False))
