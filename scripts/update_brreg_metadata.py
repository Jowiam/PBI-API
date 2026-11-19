"""Refresh public Brreg search fields and municipality choices (no register data)."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from urllib.request import urlopen

BASE = 'https://data.brreg.no'
ROOT = Path(__file__).resolve().parents[1]


def read_json(path):
    with urlopen(BASE + path, timeout=60) as response:
        return json.load(response)


def build(spec, municipalities):
    filters = {}
    for kind in ['enheter', 'underenheter']:
        fields = []
        for field in spec['paths']['/enhetsregisteret/api/' + kind]['get']['parameters']:
            if field['in'] != 'query' or field['name'] in ['page', 'size', 'sort']:
                continue
            schema = field.get('schema', {})
            fields.append({'name': field['name'], 'type': schema.get('type', 'string'),
                           'description': re.sub('<[^>]+>', '', field.get('description', '')).strip(),
                           'example': schema.get('example', ''), 'format': schema.get('format', '')})
        filters[kind] = fields
    return {'fetchedAt': datetime.now(timezone.utc).isoformat(), 'filters': filters,
            'municipalities': [{'code': row['nummer'], 'name': row['navn']}
                               for row in municipalities['_embedded']['kommuner']]}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cached-spec', type=Path)
    parser.add_argument('--cached-municipalities', type=Path)
    args = parser.parse_args()
    if args.cached_spec:
        spec = json.loads(args.cached_spec.read_text(encoding='utf-8'))
    else:
        with urlopen(BASE + '/enhetsregisteret/api/dokumentasjon/no/index.html', timeout=60) as response:
            text = response.read().decode('utf-8')
        marker = '"spec":{"data":'
        spec, _ = json.JSONDecoder().raw_decode(text[text.index(marker) + len(marker):])
    municipalities = (json.loads(args.cached_municipalities.read_text(encoding='utf-8'))
                      if args.cached_municipalities else read_json('/enhetsregisteret/api/kommuner?size=1000'))
    if municipalities.get('page', {}).get('totalPages', 1) > 1:
        raise RuntimeError('Kommuneoversikten krever flere sider; oppdater nedlastingen.')
    target = ROOT / 'data/brreg/metadata.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(build(spec, municipalities), ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(target)
