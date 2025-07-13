// powerFactorCalculator.js

// --- Utility Function (debounce) ---
// This remains a module-scoped helper function.
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


const powerFactorCalculator = {
    // 1. METADATA for HTML Generation
    id: 'power-factor',
    title: 'Power Factor',
    description: 'Enter exactly two values (kW, kVA, kVAR, or PF) to calculate the others.',

    // 2. FIELD DEFINITIONS for HTML Generation
    // All fields are interactive, so none are 'readonly' by default.
    // The init logic will dynamically set readonly status on calculated fields.
    fields: [
        {
            id: 'kw',
            label: 'Real Power (P) [W]:',
            type: 'number',
            placeholder: 'Enter value',
            attributes: { step: 'any' }
        },
        {
            id: 'kvar',
            label: 'Reactive Power (Q) [VAR]:',
            type: 'number',
            placeholder: 'Enter value',
            attributes: { step: 'any' }
        },
        {
            id: 'kva',
            label: 'Apparent Power (S) [VA]:',
            type: 'number',
            placeholder: 'Enter value',
            attributes: { step: 'any' }
        },
        {
            id: 'pf',
            label: 'Power Factor (PF):',
            type: 'number',
            placeholder: 'Enter value (0-1)',
            attributes: { step: 'any', min: '0', max: '1' }
        }
    ],

    // 3. INITIALIZATION LOGIC (The original 'init' function)
    init(sectionElement) {
        // Find elements
        const kwInput = sectionElement.querySelector('#kw');
        const kvaInput = sectionElement.querySelector('#kva');
        const kvarInput = sectionElement.querySelector('#kvar');
        const pfInput = sectionElement.querySelector('#pf');
        const clearBtn = sectionElement.querySelector('.clearBtn');
        const statusDiv = sectionElement.querySelector('.status');
        const inputs = [kwInput, kvaInput, kvarInput, pfInput];

        // --- State Variables ---
        let initialCalculationDone = false;
        let sourceFieldIds = [];

        // --- Helper Functions ---
        // These are scoped within init and operate on the elements found above.
        function clearStatus() { statusDiv.textContent = ''; }

        function resetPlaceholder(inputElement) {
            switch (inputElement.id) {
                case 'pf': inputElement.placeholder = 'Enter value (0-1)'; break;
                default: inputElement.placeholder = 'Enter value'; break;
            }
        }

        function setReadOnly(inputElement, isReadOnly) {
            if (inputElement.readOnly !== isReadOnly) { inputElement.readOnly = isReadOnly; }
            if (isReadOnly && inputElement.value !== '') { inputElement.placeholder = 'Calculated'; }
            else if (!isReadOnly) { if (inputElement.value === '') { resetPlaceholder(inputElement); } }
        }
        
        function resetToInitialState() {
             initialCalculationDone = false;
             sourceFieldIds = [];
             inputs.forEach(input => {
                 if(input.readOnly || (input.value.trim() !== '' && isNaN(parseFloat(input.value)))) {
                     input.value = '';
                 }
                 setReadOnly(input, false);
                 resetPlaceholder(input);
             });
        }

        function clearFields() {
            initialCalculationDone = false;
            sourceFieldIds = [];
            inputs.forEach(input => {
                input.value = '';
                setReadOnly(input, false);
                resetPlaceholder(input);
            });
            clearStatus();
            kwInput.focus();
        }

        // --- Main Calculation Logic ---
        function calculatePowerFactor() {
            // (The entire, complex calculatePowerFactor function from your original
            // file goes here, without any changes to its internal logic.)
            clearStatus();
            let currentValidInputs = {};
            let sourceValues = {};
            let targetFieldIds = [];
    
            if (initialCalculationDone) {
                let proceedRecalc = true;
                sourceFieldIds.forEach(id => {
                    const inputElement = inputs.find(el => el.id === id);
                    const value = parseFloat(inputElement.value);
                    if (inputElement.value.trim() === '' || isNaN(value)) { statusDiv.textContent = `Please provide a valid number for ${id.toUpperCase()}.`; proceedRecalc = false; }
                    else if ((id === 'kw' || id === 'kva' || id === 'kvar') && value < 0) { statusDiv.textContent = `Value for ${id.toUpperCase()} cannot be negative.`; proceedRecalc = false; }
                    else if (id === 'pf' && (value < 0 || value > 1)) { statusDiv.textContent = "Power Factor (PF) must be between 0 and 1."; proceedRecalc = false; }
                    if (!proceedRecalc) { resetToInitialState(); return; }
                    sourceValues[id] = value;
                });
                if (!proceedRecalc) return;
                currentValidInputs = sourceValues;
                targetFieldIds = inputs.map(inp => inp.id).filter(id => !sourceFieldIds.includes(id));
            } else {
                let potentialValidInputs = {};
                let validCount = 0;
                let hasInvalidFormat = false;
                inputs.forEach(inputElement => {
                    const key = inputElement.id;
                    const value = parseFloat(inputElement.value);
                    if (inputElement.value.trim() !== '') {
                         if (!isNaN(value)) {
                             if ((key === 'kw' || key === 'kva' || key === 'kvar') && value < 0) { statusDiv.textContent = `Value for ${key.toUpperCase()} cannot be negative.`; hasInvalidFormat = true; }
                             else if (key === 'pf' && (value < 0 || value > 1)) { statusDiv.textContent = "Power Factor (PF) must be between 0 and 1."; hasInvalidFormat = true; }
                             else { potentialValidInputs[key] = value; validCount++; }
                         } else { statusDiv.textContent = `Invalid number entered for ${key.toUpperCase()}.`; hasInvalidFormat = true; }
                     }
                });
                if (hasInvalidFormat) { resetToInitialState(); return; }
                if (validCount !== 2) {
                     if (validCount > 2) { statusDiv.textContent = "Please provide exactly two values."; }
                     else if (validCount === 1) { statusDiv.textContent = "Please provide one more value."; }
                     else { clearStatus(); }
                     resetToInitialState();
                     return;
                 }
                 currentValidInputs = potentialValidInputs;
                 sourceFieldIds = Object.keys(currentValidInputs);
                 targetFieldIds = inputs.map(inp => inp.id).filter(id => !sourceFieldIds.includes(id));
            }
    
            let results = { kw: NaN, kva: NaN, kvar: NaN, pf: NaN };
            let calculationPossible = true;
            try {
                 const sortedKeys = Object.keys(currentValidInputs).sort();
                 if (sortedKeys.length !== 2) throw new Error("Internal error: Expected 2 valid inputs.");
                 const pairKey = `${sortedKeys[0]}-${sortedKeys[1]}`;
                 switch (pairKey) {
                    case 'kva-kw': { const { kw, kva } = currentValidInputs; if (kva === 0 && kw !== 0) throw new Error("kVA cannot be 0 if kW is non-zero."); if (Math.abs(kw) > Math.abs(kva)) throw new Error("Absolute kW cannot be greater than absolute kVA."); results.kw = kw; results.kva = kva; results.pf = (kva === 0) ? (kw === 0 ? 1 : NaN) : kw / kva; results.kvar = (kva*kva < kw*kw) ? 0 : Math.sqrt(kva*kva - kw*kw); if (isNaN(results.pf)) throw new Error("Calculation resulted in undefined PF."); break; }
                    case 'kvar-kw': { const { kw, kvar } = currentValidInputs; results.kw = kw; results.kvar = kvar; results.kva = Math.sqrt(kw*kw + kvar*kvar); results.pf = (results.kva === 0) ? (kw === 0 ? 1 : NaN) : kw / results.kva; if (isNaN(results.pf)) throw new Error("Calculation resulted in undefined PF."); break; }
                    case 'kw-pf': { const { kw, pf } = currentValidInputs; if (pf === 0 && kw !== 0) throw new Error("PF cannot be 0 if kW is non-zero."); if (pf < 0 || pf > 1) throw new Error("PF must be between 0 and 1."); results.kw = kw; results.pf = pf; results.kva = (pf === 0) ? (kw === 0 ? 0 : Infinity) : kw / pf; if (!isFinite(results.kva)) throw new Error("kVA is infinite (PF=0 with non-zero kW)."); results.kvar = (results.kva*results.kva < kw*kw) ? 0 : Math.sqrt(results.kva*results.kva - kw*kw); break; }
                    case 'kva-kvar': { const { kva, kvar } = currentValidInputs; if (Math.abs(kvar) > Math.abs(kva)) throw new Error("Absolute kVAR cannot be greater than absolute kVA."); results.kva = kva; results.kvar = kvar; results.kw = (kva*kva < kvar*kvar) ? 0 : Math.sqrt(kva*kva - kvar*kvar); results.pf = (kva === 0) ? (results.kw === 0 ? 1: NaN) : results.kw / kva; if (isNaN(results.pf)) throw new Error("Calculation resulted in undefined PF."); break; }
                    case 'kva-pf': { const { kva, pf } = currentValidInputs; if (pf < 0 || pf > 1) throw new Error("PF must be between 0 and 1."); results.kva = kva; results.pf = pf; results.kw = kva * pf; results.kvar = (kva*kva < results.kw*results.kw) ? 0 : Math.sqrt(kva*kva - results.kw*results.kw); break; }
                    case 'kvar-pf': { const { kvar, pf } = currentValidInputs; if (pf < 0 || pf > 1) throw new Error("PF must be between 0 and 1."); results.kvar = kvar; results.pf = pf; if (pf === 1 && kvar !== 0) throw new Error("PF cannot be 1 if kVAR is non-zero."); if (pf === 0 && kvar === 0) { results.kw = 0; results.kva = 0; } else if (pf === 1) { throw new Error("Cannot calculate from kVAR and PF=1. Please provide kW or kVA instead."); } else if (pf === 0) { results.kw = 0; results.kva = Math.abs(kvar); } else { const angle = Math.acos(pf); if (Math.abs(pf) < 1e-9) { results.kw = 0; } else { results.kw = kvar / Math.tan(angle); } if (Math.abs(pf - 1.0) < 1e-9) { results.kva = Math.abs(results.kw); } else { results.kva = kvar / Math.sin(angle); } } break; }
                    default: throw new Error("Invalid input pair detected.");
                 }
            } catch (error) {
                 statusDiv.textContent = `Calculation Error: ${error.message}`;
                 calculationPossible = false;
                 resetToInitialState();
            }
    
            if (calculationPossible) {
                targetFieldIds.forEach(id => {
                    const inputElement = inputs.find(el => el.id === id);
                    let outputValue = Number(results[id]);
                     if (isNaN(outputValue)) { inputElement.value = ''; setReadOnly(inputElement, false); resetPlaceholder(inputElement); }
                     else { if (Math.abs(outputValue) < 1e-9) outputValue = 0; inputElement.value = outputValue.toFixed(3); setReadOnly(inputElement, true); }
                });
                 sourceFieldIds.forEach(id => { const inputElement = inputs.find(el => el.id === id); setReadOnly(inputElement, false); });
                if (!initialCalculationDone) { initialCalculationDone = true; }
            }
        } // End calculatePowerFactor

        // --- Event Listeners ---
        const debouncedCalculate = debounce(calculatePowerFactor, 500);
        inputs.forEach(input => {
            input.addEventListener('input', debouncedCalculate);
        });
        clearBtn.addEventListener('click', clearFields);

        console.log('PF Calc Initialized: Dynamic recalculation active.');
    }
};

export default powerFactorCalculator;