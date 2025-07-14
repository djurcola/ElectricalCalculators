// roundTripEfficiencyCalculator.js

// --- Utility Function (debounce) ---
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// --- Calculator Definition ---
const roundTripEfficiencyCalculator = {
    // 1. METADATA
    id: 'rte-calculator',
    title: 'Round-Trip Efficiency (RTE) Calculator',
    description: 'Calculate the System (wall-to-wall) and/or Component (BESS-only) efficiency. Select the mode that matches your measurement point.',

    // 2. FIELD DEFINITIONS
    fields: [
        // Mode Selector
        {
            id: 'calculation-mode',
            label: 'My Input Values Are:',
            type: 'select',
            options: [
                { value: 'system', text: 'Measured at Grid Connection (System RTE)' },
                { value: 'component', text: 'Measured at BESS Inverter (Component RTE)' }
            ]
        },
        // Input Fields
        {
            id: 'energy-charged',
            label: 'Energy Charged [kWh]:', // Label will be updated by JS
            type: 'number',
            placeholder: 'e.g., 110.5',
            attributes: { step: 'any', min: '0' }
        },
        {
            id: 'energy-discharged',
            label: 'Energy Discharged [kWh]:', // Label will be updated by JS
            type: 'number',
            placeholder: 'e.g., 100.2',
            attributes: { step: 'any', min: '0' }
        },
        // Optional Auxiliary Load Input
        {
            id: 'aux-energy',
            label: 'Total Auxiliary Energy Consumed (Optional) [kWh]:',
            type: 'number',
            placeholder: 'e.g., 2.5',
            attributes: { step: 'any', min: '0' }
        },
        // Separator
        { isSeparator: true },
        // Output Fields
        {
            id: 'system-rte',
            label: 'Calculated System RTE (Wall-to-Wall) [%]:',
            type: 'number',
            placeholder: 'Calculated',
            attributes: { readonly: true }
        },
        {
            id: 'component-rte',
            label: 'Calculated Component RTE (BESS Block) [%]:',
            type: 'number',
            placeholder: 'Calculated',
            attributes: { readonly: true }
        }
    ],

    // 3. INITIALIZATION LOGIC
    init(sectionElement) {
        // --- Find DOM Elements ---
        const inputs = {
            mode: sectionElement.querySelector('#calculation-mode'),
            charged: sectionElement.querySelector('#energy-charged'),
            discharged: sectionElement.querySelector('#energy-discharged'),
            aux: sectionElement.querySelector('#aux-energy')
        };
        const outputs = {
            system: sectionElement.querySelector('#system-rte'),
            component: sectionElement.querySelector('#component-rte')
        };
        const clearBtn = sectionElement.querySelector('.clearBtn');
        const statusDiv = sectionElement.querySelector('.status');
        const allInputElements = Object.values(inputs);

        // --- Helper Functions ---
        function clearStatus() { if (statusDiv) statusDiv.textContent = ''; }
        function resetOutputFields() { Object.values(outputs).forEach(output => { if (output) output.value = ''; }); }
        
        function updateInputLabels() {
            const chargedLabel = sectionElement.querySelector('label[for="energy-charged"]');
            const dischargedLabel = sectionElement.querySelector('label[for="energy-discharged"]');
            if (inputs.mode.value === 'system') {
                chargedLabel.textContent = 'Energy Charged (from Grid) [kWh]:';
                dischargedLabel.textContent = 'Energy Discharged (to Grid) [kWh]:';
            } else { // component
                chargedLabel.textContent = 'Energy Charged (to BESS Block) [kWh]:';
                dischargedLabel.textContent = 'Energy Discharged (from BESS Block) [kWh]:';
            }
        }

        // --- Main Calculation Logic ---
        function calculateRTE() {
            clearStatus();
            resetOutputFields();

            const eCharged = parseFloat(inputs.charged.value);
            const eDischarged = parseFloat(inputs.discharged.value);
            const eAux = parseFloat(inputs.aux.value) || 0; // Default to 0 if empty or invalid

            // --- Validation ---
            if (isNaN(eCharged) || isNaN(eDischarged)) {
                if (inputs.charged.value || inputs.discharged.value) {
                     statusDiv.textContent = 'Please fill required energy fields with valid numbers.';
                }
                return;
            }
            if (eCharged <= 0) {
                statusDiv.textContent = 'Energy Charged must be greater than zero.';
                return;
            }

            let eInGrid, eOutGrid, eInComponent, eOutComponent;

            if (inputs.mode.value === 'system') {
                eInGrid = eCharged;
                eOutGrid = eDischarged;

                // Directly calculate System RTE
                if (eOutGrid > eInGrid) {
                    statusDiv.textContent = 'Error: Discharged energy cannot be greater than charged energy at the grid.';
                    return;
                }
                outputs.system.value = ((eOutGrid / eInGrid) * 100).toFixed(2);
                
                // If aux energy is provided, infer Component RTE
                if (eAux > 0) {
                    eInComponent = eInGrid - eAux;
                    eOutComponent = eOutGrid; // Assumption: Aux load is on the AC side, so BESS still has to deliver the same amount to the grid.
                    if (eInComponent <= 0) {
                        statusDiv.textContent = 'Auxiliary energy is greater than or equal to charged energy; cannot calculate Component RTE.';
                        return;
                    }
                    outputs.component.value = ((eOutComponent / eInComponent) * 100).toFixed(2);
                }

            } else { // mode is 'component'
                eInComponent = eCharged;
                eOutComponent = eDischarged;
                
                // Directly calculate Component RTE
                if (eOutComponent > eInComponent) {
                    statusDiv.textContent = 'Error: Discharged energy cannot be greater than charged energy for the BESS component.';
                    return;
                }
                outputs.component.value = ((eOutComponent / eInComponent) * 100).toFixed(2);

                // If aux energy is provided, infer System RTE
                if (eAux > 0) {
                    eInGrid = eInComponent + eAux;
                    eOutGrid = eOutComponent;
                    outputs.system.value = ((eOutGrid / eInGrid) * 100).toFixed(2);
                }
            }
        }

        // --- Clear All Fields Function ---
        function clearFields() {
            allInputElements.forEach(input => { if (input) input.value = ''; });
            resetOutputFields();
            clearStatus();
            if (inputs.charged) inputs.charged.focus();
        }

        // --- Event Listeners ---
        const debouncedCalculate = debounce(calculateRTE, 300);
        allInputElements.forEach(input => { if (input) input.addEventListener('input', debouncedCalculate); });
        
        // Also recalculate and update labels when the mode changes
        inputs.mode.addEventListener('change', () => {
            updateInputLabels();
            calculateRTE();
        });

        if (clearBtn) clearBtn.addEventListener('click', clearFields);

        // Initial setup
        updateInputLabels();
        console.log('Advanced Round-Trip Efficiency (RTE) Calculator Initialized.');
    }
};

export default roundTripEfficiencyCalculator;