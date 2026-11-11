"""Oppdater oversikten over åpne NVDB-vegobjekttyper og geografiske filtre."""

from datetime import datetime, timezone
import json
import os
from pathlib import Path
import tempfile
import urllib.request

BASE = 'https://nvdbapiles.atlas.vegvesen.no'


def get(path):
    request = urllib.request.Request(BASE + path, headers={
        'Accept': 'application/json', 'X-Client': 'PBI-API-query-builder'})
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.load(response)


def main():
    raw_types = get('/datakatalog/api/v1/vegobjekttyper')
    counties = get('/omrader/api/v4/fylker')
    municipalities = get('/omrader/api/v4/kommuner')
    types = [{
        'id': item['id'], 'name': item['navn'],
        'description': item.get('beskrivelse', ''),
        'categories': sorted({c['navn'] for c in item.get('kategorier', [])}),
    } for item in raw_types if not item.get('sensitiv') and not item.get('abstrakt_type')]
    if not types or not counties or not municipalities:
        raise ValueError('Tom NVDB-oversikt. Eksisterende metadata beholdes.')
    if len({t['id'] for t in types}) != len(types):
        raise ValueError('Duplikate vegobjekttyper fra NVDB.')
    document = {
        'version': 1, 'fetchedAt': datetime.now(timezone.utc).isoformat(), 'source': BASE,
        'types': sorted(types, key=lambda t: t['name'].casefold()),
        'counties': sorted([{'number': str(c['nummer']).zfill(2), 'name': c['navn']} for c in counties], key=lambda c: c['name'].casefold()),
        'municipalities': sorted([{'number': str(m['nummer']).zfill(4), 'name': m['navn'], 'county': str(m['fylke']).zfill(2)} for m in municipalities], key=lambda m: m['name'].casefold()),
    }
    target = Path(__file__).resolve().parents[1] / 'data' / 'vegvesen' / 'nvdb.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=target.parent, delete=False) as handle:
        json.dump(document, handle, ensure_ascii=False, separators=(',', ':'))
        temporary = handle.name
    os.replace(temporary, target)
    print(f"Oppdatert NVDB: {len(types)} åpne vegobjekttyper, {len(counties)} fylker og {len(municipalities)} kommuner.")


if __name__ == '__main__':
    main()
