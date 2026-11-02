"""Oppdater offentlige Udir-filtermetadata for spørringsbyggeren (ingen elevdata)."""

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import tempfile
import urllib.request
import os

BASE = 'https://api.statistikkbanken.udir.no/api/rest/v2/Eksport/'
ROOT = Path(__file__).resolve().parents[1]


def read_json(path):
    request = urllib.request.Request(BASE + path, headers={'Accept': 'application/json'})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def collect_metadata():
    fetched_at = datetime.now(timezone.utc).isoformat()
    tables = read_json('')
    if not isinstance(tables, list) or not tables:
        raise ValueError('Udir returnerte ingen tabeller; eksisterende metadata beholdes.')
    documents = {}
    catalog = []
    for table in tables:
        table_id = str(table['EksportID'])
        if not table_id.isdecimal():
            raise ValueError('Ugyldig Udir-tabellnummer.')
        definition = read_json(table_id + '/filterSpec')
        values = read_json(table_id + '/filterVerdier')
        specs = definition.get('filterSpec')
        if not isinstance(specs, dict) or not specs:
            raise ValueError('Mangler filtre for tabell ' + table_id)
        for code in specs:
            if not isinstance(values.get(code), list) or not values[code]:
                raise ValueError(f'Mangler filterverdier for {table_id}/{code}')
        documents[f'tables/{table_id}.json'] = {
            'version': 1, 'fetchedAt': fetched_at, 'table': table,
            'filterSpec': specs, 'filterValues': values,
        }
        catalog.append({
            'id': table_id, 'title': table['Beskrivelse'], 'description': table['Tabellbeskrivelse'],
            'group': 'Grunnskole' if table['Skjema'] == 'GSK' else 'Videregående' if table['Skjema'] == 'VGO' else table['Skjema'],
            'updated': table['OppdatertDatoTid'], 'published': table['PubliseresDatoTid'],
        })
        print(f"Hentet {table_id}: {table['Beskrivelse']} ({len(specs)} filtre)", flush=True)
    documents['catalog.json'] = {'version': 1, 'fetchedAt': fetched_at, 'source': BASE, 'tables': catalog}
    return documents


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'data' / 'udir')
    args = parser.parse_args()
    # Fetch and validate every table before replacing any existing files.
    documents = collect_metadata()
    output = args.output.resolve()
    for name, document in documents.items():
        target = output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=target.parent, delete=False) as handle:
            json.dump(document, handle, ensure_ascii=False, separators=(',', ':'))
            handle.write('\n')
            temporary = handle.name
        try:
            os.replace(temporary, target)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
    print(f"Oppdatert {len(documents) - 1} tabeller i {output}. Ingen commit eller push er utført.")


if __name__ == '__main__':
    main()
