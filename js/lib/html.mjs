export function parseHtmlToTree(htmlString) {
    if (typeof htmlString !== 'string') return htmlString;

    const result = [];
    let lastIndex = 0;
    const tagRegex = /<\/?(\w+)((?:\s+[\w:]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/g;
    let match;
    const stack = [];

    while ((match = tagRegex.exec(htmlString)) !== null) {
        if (match.index > lastIndex) {
            const text = htmlString.substring(lastIndex, match.index);
            if (stack.length === 0) {
                result.push(text);
            } else {
                stack[stack.length - 1].children.push(text);
            }
        }

        const tagName = match[1].toLowerCase();
        const isClosing = match[0].startsWith('</');

        if (isClosing) {
            if (stack.length > 0 && stack[stack.length - 1].tag === tagName) {
                const element = stack.pop();
                if (stack.length === 0) {
                    result.push(element);
                } else {
                    stack[stack.length - 1].children.push(element);
                }
            }
        } else {
            const element = {
                tag: tagName,
                children: [],
                self: match[0].endsWith('/')
            };

            if (element.self || ['br', 'hr'].includes(tagName)) {
                if (stack.length === 0) {
                    result.push(element);
                } else {
                    stack[stack.length - 1].children.push(element);
                }
            } else {
                stack.push(element);
            }
        }

        lastIndex = tagRegex.lastIndex;
    }

    if (lastIndex < htmlString.length) {
        const text = htmlString.substring(lastIndex);
        if (stack.length === 0) {
            result.push(text);
        } else {
            stack[stack.length - 1].children.push(text);
        }
    }

    return result;
}

export function parseHTML(htmlString, h) {
    const tree = parseHtmlToTree(htmlString);
    if (typeof tree !== 'object' || tree === null) return tree;

    function renderElement(el, idx) {
        if (typeof el === 'string') return el;
        if (!el.tag) return el;

        const children = el.children.map((child, i) => renderElement(child, i));

        switch (el.tag) {
            case 'strong':
            case 'b':
                return h('strong', { key: idx, className: 'font-bold' }, children);
            case 'em':
            case 'i':
                return h('em', { key: idx, style: { fontStyle: 'italic' } }, children);
            case 'p':
                return h('p', { key: idx, style: { marginBottom: '0.5rem' } }, children);
            case 'ul':
                return h('ul', { key: idx, style: { marginLeft: '1.5rem', marginBottom: '0.5rem', listStyleType: 'disc' } }, children);
            case 'ol':
                return h('ol', { key: idx, style: { marginLeft: '1.5rem', marginBottom: '0.5rem', listStyleType: 'decimal' } }, children);
            case 'li':
                return h('li', { key: idx, style: { marginBottom: '0.25rem' } }, children);
            case 'br':
                return h('br', { key: idx });
            case 'hr':
                return h('hr', { key: idx, style: { margin: '0.5rem 0', border: 'none', borderTop: '1px solid #e5e7eb' } });
            default:
                return h('div', { key: idx }, children);
        }
    }

    return tree.map((el, idx) => renderElement(el, idx));
}
