// frequencyDroopCalculator.js

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
const frequencyDroopCalculator = {
    // 1. METADATA for HTML Generation
    id: 'frequency-droop',
    title: 'Frequency Droop Calculator',
    description: 'Calculates the required change in power (Delta P) based on frequency deviation outside a specified deadband.',

    // 2. FIELD DEFINITIONS for HTML Generation
    fields: [
        // Input Fields
        { id: 'droop-percent', label: 'Droop [%]:', type: 'number', placeholder: 'e.g., 5', attributes: { step: 'any' } },
        { id: 'base-frequency', label: 'Base Frequency (f<sub>base</sub>) [Hz]:', type: 'number', placeholder: 'e.g., 50 or 60', attributes: { step: 'any' } },
        { id: 'p-max', label: 'Pmax (Rated Power) [W]:', type: 'number', placeholder: 'e.g., 1000000', attributes: { step: 'any' } },
        { id: 'p-initial', label: 'Pinitial (Initial Power) [W]:', type: 'number', placeholder: 'e.g., 0', attributes: { step: 'any' } },
        { id: 'deadband-lower', label: 'Frequency Deadband Lower (f<sub>db_low</sub>) [Hz]:', type: 'number', placeholder: 'e.g., 49.9', attributes: { step: 'any' } },
        { id: 'deadband-higher', label: 'Frequency Deadband Higher (f<sub>db_high</sub>) [Hz]:', type: 'number', placeholder: 'e.g., 50.1', attributes: { step: 'any' } },
        { id: 'frequency-actual', label: 'Frequency Actual (f<sub>actual</sub>) [Hz]:', type: 'number', placeholder: 'e.g., 50.2', attributes: { step: 'any' } },
        // Separator
        { isSeparator: true },
        // Output Field
        { id: 'delta-p', label: 'Calculated Delta P [W]:', type: 'number', placeholder: 'Calculated', attributes: { readonly: true } }
    ],

    // 3. INITIALIZATION LOGIC
    init(sectionElement) {
        // --- Find DOM Elements ---
        const droopInput = sectionElement.querySelector('#droop-percent');
        const baseFreqInput = sectionElement.querySelector('#base-frequency');
        const pMaxInput = sectionElement.querySelector('#p-max');
        const pInitialInput = sectionElement.querySelector('#p-initial');
        const dbLowerInput = sectionElement.querySelector('#deadband-lower');
        const dbHigherInput = sectionElement.querySelector('#deadband-higher');
        const freqActualInput = sectionElement.querySelector('#frequency-actual');
        const deltaPOutput = sectionElement.querySelector('#delta-p');
        const clearBtn = sectionElement.querySelector('.clearBtn');
        const statusDiv = sectionElement.querySelector('.status');

        const allInputElements = [droopInput, baseFreqInput, pMaxInput, pInitialInput, dbLowerInput, dbHigherInput, freqActualInput];
        const allOutputElements = [deltaPOutput];

        // --- Helper Functions ---
        function clearStatus() { if (statusDiv) statusDiv.textContent = ''; }
        function resetOutputFields() { allOutputElements.forEach(output => { if (output) output.value = ''; }); }

        // --- Main Calculation Logic ---
        function calculateDroop() {
            clearStatus();
            resetOutputFields();

            const inputs = allInputElements.map(el => el.value.trim());
            if (inputs.some(val => val === '')) {
                const allEmpty = inputs.every(val => val === '');
                if (!allEmpty) statusDiv.textContent = 'Please fill all input fields.';
                return;
            }

            // Parse all values
            const droopValue = parseFloat(droopInput.value);
            const baseFreqValue = parseFloat(baseFreqInput.value);
            const pMaxValue = parseFloat(pMaxInput.value);
            const pInitialValue = parseFloat(pInitialInput.value);
            const dbLowerValue = parseFloat(dbLowerInput.value);
            const dbHigherValue = parseFloat(dbHigherInput.value);
            const freqActualValue = parseFloat(freqActualInput.value);

            // --- Validation ---
            let validationErrors = [];
            if (isNaN(droopValue) || isNaN(baseFreqValue) || isNaN(pMaxValue) || isNaN(pInitialValue) || isNaN(dbLowerValue) || isNaN(dbHigherValue) || isNaN(freqActualValue)) {
                validationErrors.push('All inputs must be valid numbers.');
            }
            if (Math.abs(droopValue) < 1e-9) validationErrors.push('Droop cannot be zero.');
            if (Math.abs(baseFreqValue) < 1e-9) validationErrors.push('Base Frequency cannot be zero.');
            if (dbLowerValue > baseFreqValue) validationErrors.push('Deadband Lower must be ≤ Base Frequency.');
            if (dbHigherValue < baseFreqValue) validationErrors.push('Deadband Higher must be ≥ Base Frequency.');
            if (dbLowerValue > dbHigherValue) validationErrors.push('Deadband Lower cannot be greater than Deadband Higher.');

            if (validationErrors.length > 0) {
                statusDiv.textContent = `Validation Error(s): ${validationErrors.join(' ')}`;
                return;
            }
            
            // --- Perform Calculation ---
            let deltaP = 0;
            const droop = droopValue / 100; // Convert from percent to per-unit

            if (freqActualValue > dbHigherValue) {
                // Formula: Delta P = Pinitial + (-1/Droop) * ((Freq_DB_High - Freq_Actual) / Freq_Base) * Pmax
                deltaP = pInitialValue - ((-1 / droop) * ((dbHigherValue - freqActualValue) / baseFreqValue) * pMaxValue);
            } else if (freqActualValue < dbLowerValue) {
                // Formula: Delta P = Pinitial + (-1/Droop) * ((Freq_DB_Low - Freq_Actual) / Freq_Base) * Pmax
                deltaP = pInitialValue - ((-1 / droop) * ((dbLowerValue - freqActualValue) / baseFreqValue) * pMaxValue);
            }
            // else: if inside the deadband, Delta P remains 0 as initialized.
            
            // Display Result
            deltaPOutput.value = deltaP.toFixed(3);
        }

        // --- Clear All Fields Function ---
        function clearFields() {
            allInputElements.forEach(input => { if (input) input.value = ''; });
            resetOutputFields();
            clearStatus();
            if (droopInput) droopInput.focus();
        }

        // --- Event Listeners ---
        const debouncedCalculate = debounce(calculateDroop, 300);
        allInputElements.forEach(input => { if (input) input.addEventListener('input', debouncedCalculate); });
        if (clearBtn) clearBtn.addEventListener('click', clearFields);

        console.log('Frequency Droop Calculator Initialized.');
    }
};

export default frequencyDroopCalculator;