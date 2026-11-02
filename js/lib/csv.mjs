export function parseTableLabelsCSV(text) {
    const lines = text.split('\n');
    const result = {};

    if (lines.length < 2) {
        console.error('CSV-filen er tom eller har ingen data-linjer');
        return result;
    }

    const headerLine = lines[0].trim();
    const separator = ',';

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cells = [];
        let current = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            const nextChar = line[j + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    j++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === separator && !inQuotes) {
                cells.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }

        if (current) {
            cells.push(current.trim().replace(/^"|"$/g, ''));
        }

        // Kolonner: 0=source_id, 1=tableId, 2=title, 3=label, 4=category
        if (cells.length > 3 && cells[1]) {
            const tableId = cells[1];
            const label = cells[3];
            const category = cells[4] || '';

            if (tableId && label) {
                result[tableId] = { label: label, category: category };
            }
        }
    }

    return result;
}
