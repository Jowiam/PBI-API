const h = React.createElement;

export function renderStepIndicator(step, selectedSource, selectedTable, finalQuery, setStep) {
    const steps = [
        { num: 1, label: 'Kilde' },
        { num: 2, label: 'Tabeller' },
        { num: 3, label: 'Variabler' },
        { num: 4, label: 'Spørring' }
    ];

    // Calculate the width of the completed line
    let completedWidth = 0;
    if (step > 1) {
        completedWidth = ((step - 1) / (steps.length - 1)) * 100;
    }

    return h('div', {
        className: 'step-indicator',
        style: {
            '--completed-width': completedWidth + '%'
        }
    },
        steps.map(function(stepItem, idx) {
            const isCompleted = step > stepItem.num;
            const isActive = step === stepItem.num;
            const isClickable = stepItem.num < step || (stepItem.num === 2 && selectedSource) || (stepItem.num === 3 && selectedTable) || (stepItem.num === 4 && finalQuery) || stepItem.num === step;

            let circleClass = 'step-circle ';
            if (isCompleted) circleClass += 'step-completed';
            else if (isActive) circleClass += 'step-active';
            else circleClass += 'step-inactive';

            return h(React.Fragment, { key: stepItem.num },
                h('div', {
                    className: 'step-item ' + (!isClickable ? 'step-disabled' : ''),
                    role: 'button',
                    tabIndex: isClickable ? 0 : -1,
                    'aria-label': 'Steg ' + stepItem.num + ': ' + stepItem.label + (isCompleted ? ' (fullført)' : isActive ? ' (aktiv)' : ''),
                    'aria-current': isActive ? 'step' : undefined,
                    onKeyDown: isClickable ? function(e) {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (stepItem.num === 1) setStep(1);
                            else if (stepItem.num === 2 && selectedSource) setStep(2);
                            else if (stepItem.num === 3 && selectedTable) setStep(3);
                            else if (stepItem.num === 4 && finalQuery) setStep(4);
                        }
                    } : undefined,
                    onClick: isClickable ? function() {
                        if (stepItem.num === 1) setStep(1);
                        else if (stepItem.num === 2 && selectedSource) setStep(2);
                        else if (stepItem.num === 3 && selectedTable) setStep(3);
                        else if (stepItem.num === 4 && finalQuery) setStep(4);
                    } : undefined
                },
                    h('div', { className: circleClass },
                        isCompleted ? '✓' : stepItem.num
                    ),
                    h('div', { className: 'step-label ' + (isCompleted ? 'step-completed' : isActive ? 'step-active' : 'step-inactive') },
                        stepItem.label
                    )
                )
            );
        })
    );
}
