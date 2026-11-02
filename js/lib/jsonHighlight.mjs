export function tokenizeJson(jsonString) {
    const tokens = [];
    const regex = /("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(jsonString)) !== null) {
        if (match.index > lastIndex) {
            tokens.push({ type: 'punctuation', text: jsonString.slice(lastIndex, match.index) });
        }

        const value = match[0];
        let type;
        if (value[0] === '"') {
            type = /:\s*$/.test(value) ? 'key' : 'string';
        } else if (value === 'true' || value === 'false') {
            type = 'boolean';
        } else if (value === 'null') {
            type = 'null';
        } else {
            type = 'number';
        }
        tokens.push({ type, text: value });
        lastIndex = regex.lastIndex;
    }

    if (lastIndex < jsonString.length) {
        tokens.push({ type: 'punctuation', text: jsonString.slice(lastIndex) });
    }

    return tokens;
}
