// voltageControlDroopCalculator.js

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
const voltageControlDroopCalculator = {
    // 1. METADATA
    id: 'voltage-control-droop',
    title: 'Voltage Droop Control Calculator (Q-V)',
    description: 'Calculates the required reactive power (Q) response of a BESS. Set deadband values equal to Nominal Voltage for a no-deadband response.',

    // 2. FIELD DEFINITIONS
    fields: [
        // Control & System Parameters
        { id: 'droop-percent', label: 'Voltage Droop [%]:', type: 'number', placeholder: 'e.g., 2 to 7', attributes: { step: 'any' } },
        { id: 'nominal-voltage', label: 'Nominal Voltage (V<sub>nom</sub>) [V]:', type: 'number', placeholder: 'e.g., 480', attributes: { step: 'any' } },
        { id: 'q-max', label: 'Qmax (Rated Reactive Power) [kVAR]:', type: 'number', placeholder: 'e.g., 500', attributes: { step: 'any' } },
        { id: 'q-initial', label: 'Qinitial (Initial Setpoint) [kVAR]:', type: 'number', placeholder: 'e.g., 0', value: 0, attributes: { step: 'any' } },

        // Deadband & Measurement
        { isSeparator: true },
        { id: 'deadband-lower', label: 'Voltage Deadband Lower (V<sub>db_low</sub>) [V]:', type: 'number', placeholder: 'e.g., 475 (or 480 for no deadband)', attributes: { step: 'any' } },
        { id: 'deadband-higher', label: 'Voltage Deadband Higher (V<sub>db_high</sub>) [V]:', type: 'number', placeholder: 'e.g., 485 (or 480 for no deadband)', attributes: { step: 'any' } },
        { id: 'voltage-actual', label: 'Actual Voltage (V<sub>actual</sub>) [V]:', type: 'number', placeholder: 'e.g., 470', attributes: { step: 'any' } },

        // Output
        { isSeparator: true },
        { id: 'q-setpoint', label: 'Calculated Q Setpoint [kVAR]:', type: 'number', placeholder: 'Calculated', attributes: { readonly: true, title: 'Positive = Inject Q (capacitive), Negative = Absorb Q (inductive)' } }
    ],

    // 3. INITIALIZATION LOGIC
    init(sectionElement) {
        // --- Find DOM Elements ---
        const inputs = {
            droop: sectionElement.querySelector('#droop-percent'),
            vNom: sectionElement.querySelector('#nominal-voltage'),
            qMax: sectionElement.querySelector('#q-max'),
            qInitial: sectionElement.querySelector('#q-initial'),
            dbLower: sectionElement.querySelector('#deadband-lower'),
            dbHigher: sectionElement.querySelector('#deadband-higher'),
            vActual: sectionElement.querySelector('#voltage-actual'),
        };
        const qSetpointOutput = sectionElement.querySelector('#q-setpoint');
        const clearBtn = sectionElement.querySelector('.clearBtn');
        const statusDiv = sectionElement.querySelector('.status');
        const allInputElements = Object.values(inputs);

        // --- Helper Functions ---
        function clearStatus() { if (statusDiv) statusDiv.textContent = ''; }
        function resetOutputFields() { if (qSetpointOutput) qSetpointOutput.value = ''; }

        // --- Main Calculation Logic ---
        function calculateDroop() {
            clearStatus();
            resetOutputFields();

            const values = Object.fromEntries(Object.entries(inputs).map(([key, el]) => [key, parseFloat(el.value)]));

            // --- Validation ---
            if (Object.values(values).some(v => isNaN(v))) {
                if (!allInputElements.every(el => el.value.trim() === '')) {
                     statusDiv.textContent = 'Please fill all input fields with valid numbers.';
                }
                return;
            }

            let errors = [];
            if (Math.abs(values.droop) < 1e-9) errors.push('Droop cannot be zero.');
            if (values.vNom <= 0) errors.push('Nominal Voltage must be > 0.');
            if (values.dbLower > values.vNom) errors.push('Deadband Lower should be ≤ Nominal Voltage.');
            if (values.dbHigher < values.vNom) errors.push('Deadband Higher should be ≥ Nominal Voltage.');
            
            // *** UPDATED VALIDATION LOGIC ***
            // Now only triggers an error if lower is strictly greater than higher.
            if (values.dbLower > values.dbHigher) {
                errors.push('Deadband Lower cannot be greater than Deadband Higher.');
            }

            if (errors.length > 0) {
                statusDiv.textContent = `Validation Error(s): ${errors.join(' ')}`;
                return;
            }

            // --- Perform Calculation ---
            let qSetpoint = values.qInitial;
            const droop = values.droop / 100; // Convert from percent to per-unit

            if (values.vActual > values.dbHigher) {
                // Voltage is too high (swell), so absorb reactive power (negative Q).
                // Formula: ΔQ = - (1/Droop) * (V_actual - V_db_high) / V_nom
                const deltaV = values.vActual - values.dbHigher;
                const deltaQ = (-1 / droop) * (deltaV / values.vNom) * values.qMax;
                qSetpoint += deltaQ;
            } else if (values.vActual < values.dbLower) {
                // Voltage is too low (sag), so inject reactive power (positive Q).
                // Formula: ΔQ = - (1/Droop) * (V_actual - V_db_low) / V_nom
                const deltaV = values.vActual - values.dbLower;
                const deltaQ = (-1 / droop) * (deltaV / values.vNom) * values.qMax;
                qSetpoint += deltaQ;
            }
            // If inside the deadband, qSetpoint remains at its initial value.
            // This logic works correctly even with no deadband (where dbLower == dbHigher).

            // Crucial Step: Clip the final output to the system's Qmax limits.
            const finalQSetpoint = Math.max(-values.qMax, Math.min(values.qMax, qSetpoint));

            // Display Result
            qSetpointOutput.value = finalQSetpoint.toFixed(3);
        }

        // --- Clear All Fields Function ---
        function clearFields() {
            allInputElements.forEach(input => {
                const id = input.id;
                const fieldDef = voltageControlDroopCalculator.fields.find(f => f.id === id);
                if (fieldDef && typeof fieldDef.value !== 'undefined') {
                    input.value = fieldDef.value;
                } else {
                    input.value = '';
                }
            });
            resetOutputFields();
            clearStatus();
            if (inputs.droop) inputs.droop.focus();
        }

        // --- Event Listeners ---
        const debouncedCalculate = debounce(calculateDroop, 300);
        allInputElements.forEach(input => { if (input) input.addEventListener('input', debouncedCalculate); });
        if (clearBtn) clearBtn.addEventListener('click', clearFields);

        console.log('Voltage Droop Control (Q-V) Calculator Initialized.');
    }
};

export default voltageControlDroopCalculator;