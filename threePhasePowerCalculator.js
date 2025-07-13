// threePhasePowerCalculator.js

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
const threePhasePowerCalculator = {
    // 1. METADATA for HTML Generation
    id: 'three-phase-power',
    title: '3-Phase Power Calculator',
    description: 'Calculates Real (kW), Reactive (kVAR), and Apparent (kVA) power. Provide EITHER Line-to-Line or Line-to-Neutral voltage, along with current and power factor.',

    // 2. FIELD DEFINITIONS for HTML Generation
    fields: [
        // Input Fields
        {
            id: 'voltage-ll',
            label: 'Line-to-Line Voltage (V<sub>L-L</sub>) [V]:',
            type: 'number',
            placeholder: 'e.g., 480',
            attributes: { step: 'any', min: '0' }
        },
        {
            id: 'voltage-ln',
            label: 'Line-to-Neutral Voltage (V<sub>L-N</sub>) [V] (Optional):',
            type: 'number',
            placeholder: 'e.g., 277',
            attributes: { step: 'any', min: '0' }
        },
        {
            id: 'line-current',
            label: 'Line Current (I) [A]:',
            type: 'number',
            placeholder: 'e.g., 10',
            attributes: { step: 'any', min: '0' }
        },
        {
            id: 'power-factor',
            label: 'Power Factor (PF):',
            type: 'number',
            placeholder: 'e.g., 0.95',
            attributes: { step: 'any', min: '0', max: '1' }
        },
        // Separator
        { isSeparator: true },
        // Output Fields
        {
            id: 'apparent-power',
            label: 'Calculated Apparent Power (S) [kVA]:',
            type: 'number',
            placeholder: 'Calculated',
            attributes: { readonly: true }
        },
        {
            id: 'real-power',
            label: 'Calculated Real Power (P) [kW]:',
            type: 'number',
            placeholder: 'Calculated',
            attributes: { readonly: true }
        },
        {
            id: 'reactive-power',
            label: 'Calculated Reactive Power (Q) [kVAR]:',
            type: 'number',
            placeholder: 'Calculated',
            attributes: { readonly: true }
        }
    ],

    // 3. INITIALIZATION LOGIC
    init(sectionElement) {
        // --- Find DOM Elements ---
        const vllInput = sectionElement.querySelector('#voltage-ll');
        const vlnInput = sectionElement.querySelector('#voltage-ln');
        const currentInput = sectionElement.querySelector('#line-current');
        const pfInput = sectionElement.querySelector('#power-factor');
        const realPowerOutput = sectionElement.querySelector('#real-power');
        const reactivePowerOutput = sectionElement.querySelector('#reactive-power');
        const apparentPowerOutput = sectionElement.querySelector('#apparent-power');
        const clearBtn = sectionElement.querySelector('.clearBtn');
        const statusDiv = sectionElement.querySelector('.status');

        const allInputElements = [vllInput, vlnInput, currentInput, pfInput];
        const allOutputElements = [realPowerOutput, reactivePowerOutput, apparentPowerOutput];

        // --- Helper Functions ---
        function clearStatus() {
            if (statusDiv) statusDiv.textContent = '';
        }

        function resetOutputFields() {
            allOutputElements.forEach(output => {
                if (output) output.value = '';
            });
        }

        // --- Main Calculation Logic ---
        function calculatePower() {
            clearStatus();
            resetOutputFields();

            const vllStr = vllInput.value.trim();
            const vlnStr = vlnInput.value.trim();
            const currentStr = currentInput.value.trim();
            const pfStr = pfInput.value.trim();

            // --- Input Validation ---
            if (vllStr !== '' && vlnStr !== '') {
                statusDiv.textContent = 'Please provide EITHER Line-to-Line OR Line-to-Neutral voltage, not both.';
                return;
            }
            if ((vllStr === '' && vlnStr === '') || currentStr === '' || pfStr === '') {
                const allEmpty = allInputElements.every(input => input.value.trim() === '');
                if (!allEmpty) {
                    statusDiv.textContent = 'Please fill all required input fields.';
                }
                return;
            }

            const vllValue = vllStr !== '' ? parseFloat(vllStr) : null;
            const vlnValue = vlnStr !== '' ? parseFloat(vlnStr) : null;
            const currentValue = parseFloat(currentStr);
            const pfValue = parseFloat(pfStr);

            if ((vllValue !== null && isNaN(vllValue)) || (vlnValue !== null && isNaN(vlnValue)) || isNaN(currentValue) || isNaN(pfValue)) {
                statusDiv.textContent = 'Please enter valid numbers for all required fields.';
                return;
            }
            if ((vllValue !== null && vllValue < 0) || (vlnValue !== null && vlnValue < 0) || currentValue < 0) {
                 statusDiv.textContent = 'Voltage and Current values cannot be negative.';
                 return;
            }
            if (pfValue < 0 || pfValue > 1) {
                statusDiv.textContent = 'Power Factor must be between 0 and 1.';
                return;
            }

            // --- Perform Calculations ---
            const SQRT3 = Math.sqrt(3);
            let apparentPowerInVA;

            // 1. Calculate Apparent Power (S) in VA
            if (vllValue !== null) {
                // Formula: S = V_LL * I * sqrt(3)
                apparentPowerInVA = vllValue * currentValue * SQRT3;
            } else if (vlnValue !== null) {
                // Formula: S = 3 * V_LN * I
                apparentPowerInVA = 3 * vlnValue * currentValue;
            } else {
                return; // Should be caught by validation
            }

            // 2. Calculate Real Power (P) in Watts from Apparent Power
            // Formula: P = S * PF
            const realPowerInWatts = apparentPowerInVA * pfValue;

            // 3. Calculate Reactive Power (Q) in VAR from Apparent and Real Power
            // Formula: Q = sqrt(S^2 - P^2)
            const reactivePowerInVAR = Math.sqrt(Math.pow(apparentPowerInVA, 2) - Math.pow(realPowerInWatts, 2));

            // --- Display Results (converted to k-units) ---
            apparentPowerOutput.value = (apparentPowerInVA / 1000).toFixed(3);
            realPowerOutput.value = (realPowerInWatts / 1000).toFixed(3);
            reactivePowerOutput.value = (reactivePowerInVAR / 1000).toFixed(3);
        }

        // --- Clear All Fields Function ---
        function clearFields() {
            allInputElements.forEach(input => {
                if (input) input.value = '';
            });
            resetOutputFields();
            clearStatus();
            if (vllInput) vllInput.focus();
        }

        // --- Event Listeners ---
        const debouncedCalculate = debounce(calculatePower, 300);
        allInputElements.forEach(input => {
            if (input) input.addEventListener('input', debouncedCalculate);
        });

        if (clearBtn) clearBtn.addEventListener('click', clearFields);

        console.log('3-Phase Power Calculator Initialized.');
    }
};

export default threePhasePowerCalculator;