"""Oppdater Politilogg-filtermetadata (ingen meldinger lagres)."""

from datetime import datetime, timezone
import json
import os
from pathlib import Path
import tempfile
import urllib.request

BASE = 'https://api.politiloggen.politiet.no'
ROOT = Path(__file__).resolve().parents[1]


def read_json(path):
    request = urllib.request.Request(BASE + path, headers={'Accept': 'application/json'})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def build_metadata(spec, districts, categories):
    codes = spec['components']['schemas']['DistrictEnum']['enum']
    normalize = lambda value: ''.join(c for c in value.casefold().replace('politidistrikt', '') if c.isalpha())
    by_name = {normalize(code): code for code in codes}
    result = []
    for item in districts:
        district = item['district']
        code = by_name[normalize(district['name'])]
        municipalities = item['municipalities']
        if not municipalities or any(not m.get('name') for m in municipalities):
            raise ValueError('Ugyldig kommuneoversikt.')
        result.append({'code': code, 'name': district['name'], 'municipalities': municipalities})
    if len(result) != len(codes) or not categories or any(not c.get('name') for c in categories):
        raise ValueError('Ufullstendige filtermetadata; eksisterende fil beholdes.')
    return {'version': 1, 'fetchedAt': datetime.now(timezone.utc).isoformat(),
            'source': BASE, 'districts': result, 'categories': categories}


def main():
    metadata = build_metadata(read_json('/swagger/v1/swagger.json'),
                              read_json('/districts/extended'), read_json('/categories'))
    target = ROOT / 'data' / 'politiet' / 'metadata.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=target.parent, delete=False) as handle:
        json.dump(metadata, handle, ensure_ascii=False, separators=(',', ':'))
        temporary = handle.name
    os.replace(temporary, target)
    print(f"Oppdatert {len(metadata['districts'])} distrikter og {len(metadata['categories'])} kategorier.")


if __name__ == '__main__':
    main()
