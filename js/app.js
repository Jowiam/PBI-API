import { Icons, getSourceIcon } from './components/icons.mjs';
import { parseTableLabelsCSV } from './lib/csv.mjs';
import { getTableLabel, getTableCategory, flattenCategories } from './lib/tableLabels.mjs';
import { getGeographyGroups } from './lib/geo.mjs';
import { findMetricDimension, buildQuery } from './lib/query.mjs';
import { generatePowerQueryCode } from './lib/powerquery.mjs';
import { renderStepIndicator } from './components/StepIndicator.mjs';
import { renderSourceSelection } from './components/SourceSelection.mjs';
import { renderTableSelection } from './components/TableSelection.mjs';
import { renderDimensionConfiguration } from './components/DimensionConfiguration.mjs';
import { renderQueryResult } from './components/QueryResult.mjs';
import { renderMetadataModal, closeMetadataModal as closeMetadataModalImpl } from './components/MetadataModal.mjs';

const { useState, useEffect, createElement: h } = React;
const API_BASE = 'https://statistikk-data.fhi.no/api/open/v1';

function FHIQueryBuilder() {
    const [step, setStep] = useState(1);
    const [sources, setSources] = useState([]);
    const [selectedSource, setSelectedSource] = useState(null);
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [dimensions, setDimensions] = useState([]);
    const [queryConfig, setQueryConfig] = useState({});
    const [finalQuery, setFinalQuery] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [responseFormat, setResponseFormat] = useState('json-stat2');
    const [maxRowCount, setMaxRowCount] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [globalSearch, setGlobalSearch] = useState('');
    const [allTables, setAllTables] = useState([]);
    const [tableSearch, setTableSearch] = useState('');
    const [outputFormat, setOutputFormat] = useState('json');
    const [geoSearch, setGeoSearch] = useState('');
    const [expandedCounties, setExpandedCounties] = useState({});
    const [tableMetadata, setTableMetadata] = useState(null);
    const [firstSentence, setFirstSentence] = useState('');
    const [showMetadataModal, setShowMetadataModal] = useState(false);
    const [expandedMunicipalities, setExpandedMunicipalities] = useState({});
    const [tableLabels, setTableLabels] = useState({});
    const [expandedCategories, setExpandedCategories] = useState({});
    const [geoMappingUrl] = useState('https://raw.githubusercontent.com/janhli/FHI-API-Query-Builder/main/geo_mapping.csv');

    useEffect(() => {
        fetchSources();
        fetchTableLabels();
    }, []);

    useEffect(() => {
        function handleEscKey(e) {
            if (e.key === 'Escape' && showMetadataModal) closeMetadataModal();
        }
        document.addEventListener('keydown', handleEscKey);
        return function() {
            document.removeEventListener('keydown', handleEscKey);
        };
    }, [showMetadataModal]);

    useEffect(() => {
        let sentence = '';
        if (tableMetadata && tableMetadata.paragraphs && Array.isArray(tableMetadata.paragraphs)) {
            for (let i = 0; i < tableMetadata.paragraphs.length; i++) {
                if (tableMetadata.paragraphs[i].header !== 'Geografi') {
                    let text = tableMetadata.paragraphs[i].content;
                    if (typeof text === 'string') {
                        const match = text.match(/^[^!?]*?\.(?=\s[A-Z]|$)|^[^!?]*?[!?]/);
                        if (match) {
                            sentence = match[0]
                                .replace(/<\/(p|div|li|h[1-6]|br)\s*>/gi, ' ')
                                .replace(/<[^>]*>/g, '')
                                .replace(/\s+/g, ' ')
                                .trim();
                            break;
                        }
                    }
                }
            }
        }
        setFirstSentence(sentence);
    }, [tableMetadata]);

    async function fetchSources() {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(API_BASE + '/Common/source');
            if (!response.ok) throw new Error('Kunne ikke hente kilder');
            const data = await response.json();
            setSources(data);

            const promises = data.map(async function(source) {
                try {
                    const resp = await fetch(API_BASE + '/' + source.id + '/Table');
                    if (resp.ok) {
                        const tables = await resp.json();
                        return tables.map(function(table) {
                            return Object.assign({}, table, { sourceId: source.id, sourceName: source.title || source.name });
                        });
                    }
                } catch (e) {
                    return [];
                }
                return [];
            });
            const results = await Promise.all(promises);
            const flatTables = results.reduce(function(acc, tables) { return acc.concat(tables); }, []);
            setAllTables(flatTables);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function fetchTableLabels() {
        try {
            const response = await fetch('./fhi_table_label_mapping.csv');
            if (!response.ok) throw new Error('Kunne ikke hente tabell-labels (status: ' + response.status + ')');
            const csvText = await response.text();
            setTableLabels(parseTableLabelsCSV(csvText));
        } catch (err) {
            console.error('Kunne ikke hente tabell-labels:', err.message);
        }
    }

    async function fetchTables(sourceId) {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(API_BASE + '/' + sourceId + '/Table');
            if (!response.ok) throw new Error('Kunne ikke hente tabeller');
            setTables(await response.json());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function fetchDimensions(sourceId, tableId) {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(API_BASE + '/' + sourceId + '/Table/' + tableId + '/dimension');
            if (!response.ok) throw new Error('Kunne ikke hente dimensjoner');
            const data = await response.json();

            let dimensionsArray = data;
            if (data && typeof data === 'object' && !Array.isArray(data) && data.dimensions) {
                dimensionsArray = data.dimensions;
            }
            if (!Array.isArray(dimensionsArray)) {
                console.error('Uventet data format:', data);
                throw new Error('Kunne ikke finne dimensions i API-responsen');
            }

            dimensionsArray = dimensionsArray.map(function(dim) {
                if (dim.categories && !dim.category) {
                    dim.category = flattenCategories(dim.categories);
                }
                return dim;
            });

            setDimensions(dimensionsArray);

            const initialConfig = {};
            dimensionsArray.forEach(function(dim) {
                initialConfig[dim.code] = { filter: 'all', values: ['*'], selectedCategories: [] };
            });
            setQueryConfig(initialConfig);
        } catch (err) {
            setError(err.message);
            setDimensions([]);
        } finally {
            setLoading(false);
        }
    }

    async function fetchMetadata(sourceId, tableId, options) {
        const openModal = Boolean(options && options.openModal);
        try {
            const response = await fetch(API_BASE + '/' + sourceId + '/Table/' + tableId + '/metadata');
            if (!response.ok) throw new Error('Kunne ikke hente metadata');
            const data = await response.json();
            setTableMetadata(data);
            if (openModal) setShowMetadataModal(true);
        } catch (err) {
            if (openModal) setError(err.message);
        }
    }

    async function fetchPreview() {
        if (!finalQuery) return;
        setLoading(true);
        setError(null);
        try {
            const previewQuery = JSON.parse(JSON.stringify(finalQuery));
            previewQuery.response.format = 'json-stat2';

            const response = await fetch(
                API_BASE + '/' + selectedSource.id + '/Table/' + selectedTable.tableId + '/data',
                { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(previewQuery) }
            );

            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    if (errorData.errors) {
                        const errorMessages = [];
                        for (const field in errorData.errors) {
                            errorMessages.push(field + ': ' + errorData.errors[field][0]);
                        }
                        throw new Error('Validationsfeil: ' + errorMessages.join(', '));
                    }
                    throw new Error(errorData.message || 'Kunne ikke hente data');
                } catch (parseError) {
                    throw new Error('Kunne ikke hente preview: ' + response.statusText + ' - ' + parseError.message);
                }
            }

            const contentType = response.headers.get('content-type');
            let data;
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else if (contentType && contentType.includes('text/csv')) {
                data = { csvText: await response.text() };
            } else {
                data = await response.json();
            }
            setPreviewData(data);
        } catch (err) {
            setError(err.message || 'Feil ved henting av preview');
        } finally {
            setLoading(false);
        }
    }

    function selectSourceAndTable(source, table) {
        setSelectedSource(source);
        setSelectedTable(table);
        setDimensions([]);
        setQueryConfig({});
        setFinalQuery(null);
        setPreviewData(null);
        setTableSearch('');
        setGlobalSearch('');
        setShowMetadataModal(false);
        fetchDimensions(source.id, table.tableId);
        fetchMetadata(source.id, table.tableId);
        setStep(3);
    }

    function selectSource(source) {
        setSelectedSource(source);
        setSelectedTable(null);
        setDimensions([]);
        setQueryConfig({});
        setFinalQuery(null);
        setPreviewData(null);
        setTableSearch('');
        setExpandedCategories({});
        fetchTables(source.id);
        setStep(2);
    }

    function selectTable(table) {
        selectSourceAndTable(selectedSource, table);
    }

    function updateDimensionConfig(dimCode, updates) {
        setQueryConfig(function(prev) {
            const newConfig = Object.assign({}, prev);
            newConfig[dimCode] = Object.assign({}, prev[dimCode], updates);
            return newConfig;
        });
    }

    function buildFinalQuery() {
        setFinalQuery(buildQuery(dimensions, queryConfig, responseFormat, maxRowCount));
        setStep(4);
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text);
        alert('Kopiert til utklippstavle!');
    }

    function closeMetadataModal() {
        closeMetadataModalImpl(setShowMetadataModal);
    }

    const boundGetTableLabel = (table) => getTableLabel(tableLabels, table);
    const boundGetTableCategory = (table) => getTableCategory(tableLabels, table);
    const boundGeneratePowerQueryCode = () => generatePowerQueryCode(
        finalQuery, API_BASE, selectedSource && selectedSource.id, selectedTable && selectedTable.tableId
    );

    return h('div', { className: 'bg-gradient' },
        h('a', { href: '#main-content', className: 'skip-link' }, 'Gå til hovedinnhold'),
        renderMetadataModal(showMetadataModal, tableMetadata, closeMetadataModal),
        h('div', { className: 'container', id: 'main-content', tabIndex: -1 },
            h('div', { className: 'text-center mb-8' },
                h('h1', { className: 'mb-2' }, 'FHI API Query Builder'),
                h('p', { className: 'text-gray-600' }, 'Bygg spørringer mot FHIs åpne statistikk-API. '),
                h('p', { className: 'text-gray-600' }, 'Velg kilde, tabell og variabler. Kopier JSON-spørring, innbyggingskode for Power Query eller last ned som CSV-fil.')
            ),
            renderStepIndicator(step, selectedSource, selectedTable, finalQuery, setStep),
            h('div', { className: 'card' },
                step === 1 && renderSourceSelection(
                    sources, tables, globalSearch, loading, error,
                    selectSource, selectSourceAndTable, setGlobalSearch,
                    getSourceIcon, boundGetTableLabel, Icons
                ),
                step === 2 && renderTableSelection(
                    tables, selectedSource, tableSearch, expandedCategories, loading, error, step,
                    selectTable, setTableSearch, setExpandedCategories, setStep,
                    boundGetTableLabel, boundGetTableCategory
                ),
                step === 3 && renderDimensionConfiguration(
                    dimensions, queryConfig, selectedSource, selectedTable, step,
                    responseFormat, maxRowCount, loading, error, firstSentence,
                    geoSearch, expandedCounties, expandedMunicipalities,
                    updateDimensionConfig, buildFinalQuery, getGeographyGroups, boundGetTableLabel, fetchMetadata,
                    setGeoSearch, setExpandedCounties, setExpandedMunicipalities,
                    setResponseFormat, setMaxRowCount, setStep, Icons
                ),
                step === 4 && renderQueryResult(
                    finalQuery, selectedSource, selectedTable, dimensions,
                    previewData, outputFormat, loading, error, firstSentence, geoMappingUrl,
                    fetchPreview, copyToClipboard, boundGeneratePowerQueryCode, findMetricDimension, boundGetTableLabel,
                    setOutputFormat, setStep,
                    setSelectedSource, setSelectedTable, setDimensions, setQueryConfig, setFinalQuery, setPreviewData,
                    API_BASE, Icons
                )
            ),
            h('div', { className: 'mt-6 text-center text-sm text-gray-600' },
                h('p', null,
                    'Data fra ',
                    h('a', {
                        href: 'https://statistikk-data.fhi.no',
                        className: 'text-blue-600',
                        target: '_blank',
                        rel: 'noopener noreferrer'
                    }, 'FHI Statistikk')
                ),
                h('p', { className: 'mt-4' },
                    'Utarbeidet av ',
                    h('a', {
                        href: 'https://akershusanalyse.no/',
                        className: 'text-blue-600',
                        target: '_blank',
                        rel: 'noopener noreferrer'
                    }, 'Akershus analyse'),
                    ', en del av ',
                    h('a', {
                        href: 'https://afk.no/',
                        className: 'text-blue-600',
                        target: '_blank',
                        rel: 'noopener noreferrer'
                    }, 'Akershus fylkeskommune')
                ),
                h('p', { className: 'mt-2' },
                    'kontakt: ',
                    h('a', { href: 'mailto:janli@afk.no', className: 'text-blue-600' }, 'janli@afk.no')
                )
            )
        )
    );
}

function mount() {
    ReactDOM.createRoot(document.getElementById('root')).render(h(FHIQueryBuilder));
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
} else {
    mount();
}
