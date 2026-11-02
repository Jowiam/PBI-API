import { parseHTML } from '../lib/html.mjs';

const h = React.createElement;
const { useEffect, useRef } = React;

export function closeMetadataModal(setShowMetadataModal) {
    setShowMetadataModal(false);
}

export function renderMetadataModal(showMetadataModal, tableMetadata, closeModalFn) {
    const closeButtonRef = useRef(null);

    useEffect(() => {
        if (showMetadataModal && closeButtonRef.current) {
            closeButtonRef.current.focus();
        }
    }, [showMetadataModal]);

    if (!showMetadataModal || !tableMetadata) return null;

    function parseRelatedMaterialLinks(text) {
        if (typeof text !== 'string') return text;

        const lines = text.split('\n').filter(line => line.trim());
        return lines.map(function(line, idx) {
            const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
            if (urlMatch) {
                const url = urlMatch[1];
                const linkText = line.replace(url, '').replace(/:\s*$/, '').trim();
                return h('div', { key: idx, style: { marginBottom: '0.5rem' }},
                    h('a', {
                        href: url,
                        target: '_blank',
                        rel: 'noopener noreferrer',
                        style: { color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer' }
                    }, linkText || url)
                );
            }
            return h('div', { key: idx, style: { marginBottom: '0.5rem' } }, line);
        });
    }

    return h('div', {
        style: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        },
        role: 'presentation',
        onClick: function(e) {
            if (e.target === e.currentTarget) {
                closeModalFn();
            }
        },
        onKeyDown: function(e) {
            if (e.key === 'Escape') {
                closeModalFn();
            }
        }
    },
        h('div', {
            style: {
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                padding: '1.5rem',
                maxWidth: '700px',
                width: '90%',
                maxHeight: '85vh',
                overflowY: 'auto',
                boxShadow: '0 20px 25px rgba(0,0,0,0.15)'
            },
            role: 'alertdialog',
            'aria-modal': 'true',
            'aria-labelledby': 'modal-title'
        },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }},
                h('h2', { id: 'modal-title', style: { margin: 0 }, className: 'heading-modal' }, 'Tabell informasjon'),
                h('button', {
                    ref: closeButtonRef,
                    onClick: closeModalFn,
                    'aria-label': 'Lukk tabell informasjon',
                    style: {
                        background: 'none',
                        border: 'none',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        color: '#6b7280'
                    }
                }, '✕')
            ),
            h('div', { style: { lineHeight: 1.8, color: '#374151' } },
                tableMetadata.name && h('div', { style: { marginBottom: '1.5rem' }},
                    h('strong', { style: { color: '#111827' }, className: 'text-lg font-bold' }, tableMetadata.name)
                ),
                tableMetadata.isOfficialStatistics !== undefined && h('div', { style: { marginBottom: '1rem' }},
                    h('strong', { style: { color: '#1f2937', display: 'block', marginBottom: '0.25rem' } }, 'Offisiell statistikk:'),
                    h('div', { style: { color: '#4b5563' } }, tableMetadata.isOfficialStatistics ? 'Ja' : 'Nei')
                ),
                tableMetadata.paragraphs && Array.isArray(tableMetadata.paragraphs) && h('div', { style: { marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }},
                    tableMetadata.paragraphs.map(function(paragraph, idx) {
                        // Skip Geografi
                        if (paragraph.header === 'Geografi') return null;

                        const isRelatedMaterial = paragraph.header === 'Relatert materiale';
                        const content = isRelatedMaterial ? parseRelatedMaterialLinks(paragraph.content) : parseHTML(paragraph.content, h);

                        return h('div', { key: idx, style: { marginBottom: '1.5rem' }},
                            h('h3', { style: { margin: 0, marginBottom: '0.5rem', color: '#1f2937' }, className: 'font-semibold' }, paragraph.header),
                            h('div', { style: { color: '#4b5563', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6 } }, content)
                        );
                    })
                )
            )
        )
    );
}
