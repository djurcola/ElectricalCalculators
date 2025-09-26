// voltageDroopCalculator.js

// --- Utility Function (debounce) ---
// This is a useful helper to prevent calculations on every single keystroke.
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

const voltageDroopCalculator = {
    // 1. METADATA for HTML Generation
    id: 'voltage-droop',
    title: 'Voltage Droop',
    description: 'Calculate the reactive power (Q) response based on voltage droop settings.',

    // 2. FIELD DEFINITIONS for HTML Generation
    fields: [
        // --- Inputs ---
        {
            id: 'nominalVoltage',
            label: 'Nominal Voltage [V]:',
            type: 'number',
            placeholder: 'e.g., 480',
            attributes: { step: 'any', min: '0' }
        },
        {
            id: 'voltageSetpoint',
            label: 'Voltage Setpoint [V]:',
            type: 'number',
            placeholder: 'e.g., 485',
            attributes: { step: 'any', min: '0' }
        },
        {
            id: 'measuredVoltage',
            label: 'Measured Voltage [V]:',
            type: 'number',
            placeholder: 'e.g., 478',
            attributes: { step: 'any', min: '0' }
        },
        {
            id: 'droopBaseQ',
            label: 'Droop Base Q [VAR]:',
            type: 'number',
            placeholder: 'e.g., 100000',
            attributes: { step: 'any' } // Can be negative
        },
        {
            id: 'droopPercentage',
            label: 'Droop Percentage [%]:',
            type: 'number',
            placeholder: 'e.g., 5',
            attributes: { step: 'any', min: '0' }
        },
        // --- Separator ---
        { isSeparator: true },
        // --- Outputs ---
        {
            id: 'qResponse',
            label: 'Q Response [VAR]:',
            type: 'number',
            placeholder: 'Calculated',
            attributes: { readonly: true } // This field is always an output
        }
    ],

    // 3. INITIALIZATION LOGIC
    init(sectionElement) {
        // Find elements within the module's section
        const nominalVoltageInput = sectionElement.querySelector('#nominalVoltage');
        const voltageSetpointInput = sectionElement.querySelector('#voltageSetpoint');
        const measuredVoltageInput = sectionElement.querySelector('#measuredVoltage');
        const droopBaseQInput = sectionElement.querySelector('#droopBaseQ');
        const droopPercentageInput = sectionElement.querySelector('#droopPercentage');
        const qResponseInput = sectionElement.querySelector('#qResponse');
        const clearBtn = sectionElement.querySelector('.clearBtn');
        const statusDiv = sectionElement.querySelector('.status');
        
        const inputs = [
            nominalVoltageInput,
            voltageSetpointInput,
            measuredVoltageInput,
            droopBaseQInput,
            droopPercentageInput
        ];

        // --- Helper Functions ---
        function clearStatus() {
            statusDiv.textContent = '';
        }

        function clearFields() {
            inputs.forEach(input => input.value = '');
            qResponseInput.value = '';
            clearStatus();
            nominalVoltageInput.focus();
        }
        
        // --- Main Calculation Logic ---
        function calculateDroop() {
            clearStatus();

            const nominalV = parseFloat(nominalVoltageInput.value);
            const setpointV = parseFloat(voltageSetpointInput.value);
            const measuredV = parseFloat(measuredVoltageInput.value);
            const droopBase = parseFloat(droopBaseQInput.value);
            const droopPercent = parseFloat(droopPercentageInput.value);

            // Check if all fields are filled with valid numbers
            if ([nominalV, setpointV, measuredV, droopBase, droopPercent].some(isNaN)) {
                qResponseInput.value = ''; // Clear output if any input is invalid or empty
                return;
            }

            // Perform validation for division-by-zero errors
            if (nominalV === 0) {
                statusDiv.textContent = 'Error: Nominal Voltage cannot be zero.';
                qResponseInput.value = '';
                return;
            }
            if (droopPercent === 0) {
                statusDiv.textContent = 'Error: Droop Percentage cannot be zero.';
                qResponseInput.value = '';
                return;
            }

            // --- Apply the formula ---
            // Q Response = ((Voltage Setpoint / Nominal Voltage) - (Measured Voltage / Nominal Voltage)) * (Droop Base Q / Droop Percentage)
            // Note: Droop Percentage must be converted to a decimal (e.g., 5% -> 0.05)
            const qResponse = ((setpointV / nominalV) - (measuredV / nominalV)) * (droopBase / (droopPercent / 100));

            // Display the result
            qResponseInput.value = qResponse.toFixed(3);
        }

        // --- Event Listeners ---
        const debouncedCalculate = debounce(calculateDroop, 300);
        inputs.forEach(input => {
            input.addEventListener('input', debouncedCalculate);
        });
        
        clearBtn.addEventListener('click', clearFields);
        
        console.log('Voltage Droop Calculator Initialized');
    }
};

export default voltageDroopCalculator;