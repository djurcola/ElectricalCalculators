// Module for the Enhanced Power Factor Calculator

// --- Utility Function (debounce - keep as before) ---
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

/**
 * Initializes the Power Factor calculator elements and event listeners.
 * @param {HTMLElement} sectionElement - The container element for this calculator section.
 */
export function init(sectionElement) {
    // Find elements
    const kwInput = sectionElement.querySelector('#kw');
    const kvaInput = sectionElement.querySelector('#kva');
    const kvarInput = sectionElement.querySelector('#kvar');
    const pfInput = sectionElement.querySelector('#pf');
    const clearBtn = sectionElement.querySelector('.clearBtn');
    const statusDiv = sectionElement.querySelector('.status');
    const inputs = [kwInput, kvaInput, kvarInput, pfInput];

    // --- State Variables ---
    let initialCalculationDone = false; // Track if initial calculation has happened
    let sourceFieldIds = []; // Stores the IDs ('kw', 'kva', etc.) of the two initial input fields

    // --- Helper Functions (clearStatus, resetPlaceholder, setReadOnly - keep as before) ---
    function clearStatus() { statusDiv.textContent = ''; }

    function resetPlaceholder(inputElement) { /* ... keep implementation ... */
         switch (inputElement.id) {
            case 'pf': inputElement.placeholder = 'Enter value (0-1)'; break;
            default: inputElement.placeholder = 'Enter value'; break;
        }
    }

    function setReadOnly(inputElement, isReadOnly) { /* ... keep implementation ... */
        if (inputElement.readOnly !== isReadOnly) { inputElement.readOnly = isReadOnly; }
        if (isReadOnly && inputElement.value !== '') { inputElement.placeholder = 'Calculated'; }
        else if (!isReadOnly) { if (inputElement.value === '') { resetPlaceholder(inputElement); } }
    }


    // --- Main Calculation Logic ---
    function calculatePowerFactor() {
        clearStatus();

        let currentValidInputs = {};
        let sourceValues = {};
        let targetFieldIds = []; // Fields to be calculated

        if (initialCalculationDone) {
            // --- RECALCULATION MODE ---
            let proceedRecalc = true;
            sourceFieldIds.forEach(id => {
                const inputElement = inputs.find(el => el.id === id);
                const value = parseFloat(inputElement.value);

                if (inputElement.value.trim() === '' || isNaN(value)) {
                    statusDiv.textContent = `Please provide a valid number for ${id.toUpperCase()}.`;
                    proceedRecalc = false;
                } else if ((id === 'kw' || id === 'kva' || id === 'kvar') && value < 0) {
                     statusDiv.textContent = `Value for ${id.toUpperCase()} cannot be negative.`;
                     proceedRecalc = false;
                } else if (id === 'pf' && (value < 0 || value > 1)) {
                     statusDiv.textContent = "Power Factor (PF) must be between 0 and 1.";
                     proceedRecalc = false;
                }
                if (!proceedRecalc) {
                    // Reset state if input becomes invalid during recalculation attempt
                    resetToInitialState();
                    return; // Exit forEach early - calculation will stop
                }
                sourceValues[id] = value; // Store valid source value
            });

            if (!proceedRecalc) return; // Stop if validation failed

            // If we got here, the two source fields are valid.
            currentValidInputs = sourceValues; // Use these for calculation
            targetFieldIds = inputs.map(inp => inp.id).filter(id => !sourceFieldIds.includes(id));

        } else {
            // --- INITIAL CALCULATION MODE ---
            let potentialValidInputs = {};
            let validCount = 0;
            let hasInvalidFormat = false;

            inputs.forEach(inputElement => {
                const key = inputElement.id;
                const value = parseFloat(inputElement.value);

                if (inputElement.value.trim() !== '') {
                     if (!isNaN(value)) {
                         // Basic range validation
                         if ((key === 'kw' || key === 'kva' || key === 'kvar') && value < 0) {
                             statusDiv.textContent = `Value for ${key.toUpperCase()} cannot be negative.`; hasInvalidFormat = true;
                         } else if (key === 'pf' && (value < 0 || value > 1)) {
                             statusDiv.textContent = "Power Factor (PF) must be between 0 and 1."; hasInvalidFormat = true;
                         } else {
                             potentialValidInputs[key] = value; validCount++;
                         }
                     } else {
                         statusDiv.textContent = `Invalid number entered for ${key.toUpperCase()}.`; hasInvalidFormat = true;
                     }
                 }
            });

            if (hasInvalidFormat) {
                resetToInitialState(); // Make all editable on format error
                return;
            }

            if (validCount !== 2) {
                 if (validCount > 2) { statusDiv.textContent = "Please provide exactly two values."; }
                 else if (validCount === 1) { statusDiv.textContent = "Please provide one more value."; }
                 else { clearStatus(); }
                 resetToInitialState(); // Ensure all editable if count wrong
                 return;
             }

             // Exactly 2 valid inputs found for initial calculation
             currentValidInputs = potentialValidInputs;
             sourceFieldIds = Object.keys(currentValidInputs); // *** Store the sources ***
             targetFieldIds = inputs.map(inp => inp.id).filter(id => !sourceFieldIds.includes(id));
        }


        // --- PERFORM CALCULATION (Common logic for initial and recalc) ---
        let results = { kw: NaN, kva: NaN, kvar: NaN, pf: NaN };
        let calculationPossible = true;

        console.log("Attempting calculation with valid inputs:", JSON.stringify(currentValidInputs)); // Log inputs going into calculation

        try {
             const sortedKeys = Object.keys(currentValidInputs).sort(); // Sort keys alphabetically

             if (sortedKeys.length !== 2) {
                 // Failsafe - should have been caught earlier
                 console.error("Internal Error: Input count mismatch before calculation.", sortedKeys);
                 throw new Error("Internal error: Expected 2 valid inputs for pair generation.");
             }

             const pairKey = `${sortedKeys[0]}-${sortedKeys[1]}`; // Generate key like "kw-kva"
             console.log("Generated pairKey:", pairKey); // *** Log the generated key ***

             // Use a switch based on the *sorted* pairKey
             switch (pairKey) {
                 case 'kva-kw': { // Changed from kw-kva (JS sorts 'kva' first)
                     const { kw, kva } = currentValidInputs; // Still extract kw, kva
                     // ... calculation logic for kw, kva ...
                     if (kva === 0 && kw !== 0) throw new Error("kVA cannot be 0 if kW is non-zero.");
                     if (Math.abs(kw) > Math.abs(kva)) throw new Error("Absolute kW cannot be greater than absolute kVA.");
                     results.kw = kw; results.kva = kva;
                     results.pf = (kva === 0) ? (kw === 0 ? 1 : NaN) : kw / kva;
                     results.kvar = (kva*kva < kw*kw) ? 0 : Math.sqrt(kva*kva - kw*kw);
                     if (isNaN(results.pf)) throw new Error("Calculation resulted in undefined PF.");
                     break;
                 }
                 case 'kvar-kw': { // Changed from kw-kvar (JS sorts 'kvar' first)
                     const { kw, kvar } = currentValidInputs; // Still extract kw, kvar
                     // ... calculation logic for kw, kvar ...
                     results.kw = kw; results.kvar = kvar;
                     results.kva = Math.sqrt(kw*kw + kvar*kvar);
                     results.pf = (results.kva === 0) ? (kw === 0 ? 1 : NaN) : kw / results.kva;
                     if (isNaN(results.pf)) throw new Error("Calculation resulted in undefined PF.");
                     break;
                 }
                 // ***** OTHER CASES (verified as correct based on JS sort) *****
                 case 'kw-pf': { /* kw, pf */
                     const { kw, pf } = currentValidInputs;
                     // ... calculation logic ...
                      if (pf === 0 && kw !== 0) throw new Error("PF cannot be 0 if kW is non-zero.");
                     if (pf < 0 || pf > 1) throw new Error("PF must be between 0 and 1.");
                     results.kw = kw; results.pf = pf;
                     results.kva = (pf === 0) ? (kw === 0 ? 0 : Infinity) : kw / pf;
                     if (!isFinite(results.kva)) throw new Error("kVA is infinite (PF=0 with non-zero kW).");
                     results.kvar = (results.kva*results.kva < kw*kw) ? 0 : Math.sqrt(results.kva*results.kva - kw*kw);
                     break;
                 }
                 case 'kva-kvar': { /* kva, kvar */
                     const { kva, kvar } = currentValidInputs;
                     // ... calculation logic ...
                     if (Math.abs(kvar) > Math.abs(kva)) throw new Error("Absolute kVAR cannot be greater than absolute kVA.");
                     results.kva = kva; results.kvar = kvar;
                     results.kw = (kva*kva < kvar*kvar) ? 0 : Math.sqrt(kva*kva - kvar*kvar);
                     results.pf = (kva === 0) ? (results.kw === 0 ? 1: NaN) : results.kw / kva;
                     if (isNaN(results.pf)) throw new Error("Calculation resulted in undefined PF.");
                     break;
                 }
                 case 'kva-pf': { /* kva, pf */
                     const { kva, pf } = currentValidInputs;
                     // ... calculation logic ...
                      if (pf < 0 || pf > 1) throw new Error("PF must be between 0 and 1.");
                     results.kva = kva; results.pf = pf;
                     results.kw = kva * pf;
                     results.kvar = (kva*kva < results.kw*results.kw) ? 0 : Math.sqrt(kva*kva - results.kw*results.kw);
                     break;
                 }
                 case 'kvar-pf': { /* kvar, pf */
                     const { kvar, pf } = currentValidInputs;
                     // ... calculation logic ...
                     if (pf < 0 || pf > 1) throw new Error("PF must be between 0 and 1.");
                     results.kvar = kvar; results.pf = pf;
                     if (pf === 1 && kvar !== 0) throw new Error("PF cannot be 1 if kVAR is non-zero.");
                     if (pf === 0 && kvar === 0) { results.kw = 0; results.kva = 0; }
                     else if (pf === 1) { throw new Error("Cannot calculate from kVAR and PF=1. Please provide kW or kVA instead."); }
                     else if (pf === 0) { results.kw = 0; results.kva = Math.abs(kvar); }
                     else {
                        const angle = Math.acos(pf);
                        if (Math.abs(pf) < 1e-9) { results.kw = 0; } else { results.kw = kvar / Math.tan(angle); }
                        if (Math.abs(pf - 1.0) < 1e-9) { results.kva = Math.abs(results.kw); } else { results.kva = kvar / Math.sin(angle); }
                     }
                     break;
                 }
                 default:
                     // Error occurs here
                     console.error("Unhandled pairKey:", pairKey, "Sorted Keys:", sortedKeys, "Valid inputs:", currentValidInputs); // *** More detailed log ***
                     throw new Error("Invalid input pair detected."); // The reported error
             }

        } catch (error) {
             console.error("Calculation block error:", error); // Log the actual error object
             statusDiv.textContent = `Calculation Error: ${error.message}`;
             calculationPossible = false;
             resetToInitialState(); // Reset state fully on calculation error
        }

        // --- Update UI ---
        if (calculationPossible) {
            targetFieldIds.forEach(id => {
                const inputElement = inputs.find(el => el.id === id);
                let outputValue = Number(results[id]);
                 if (isNaN(outputValue)) {
                      inputElement.value = ''; // Clear if calc failed for this output
                      setReadOnly(inputElement, false); // Make editable if calc failed
                      resetPlaceholder(inputElement);
                 } else {
                     if (Math.abs(outputValue) < 1e-9) outputValue = 0;
                     inputElement.value = outputValue.toFixed(3);
                     setReadOnly(inputElement, true); // Make calculated fields read-only
                 }
            });

             // Ensure source fields remain editable
             sourceFieldIds.forEach(id => {
                 const inputElement = inputs.find(el => el.id === id);
                 setReadOnly(inputElement, false);
             });

            // If this was the first successful calculation, mark it
            if (!initialCalculationDone) {
                initialCalculationDone = true;
            }

        } // else: error handling already reset the state

    } // End calculatePowerFactor


    /** Resets calculator to initial state: all fields editable, state flags reset */
    function resetToInitialState() {
         initialCalculationDone = false;
         sourceFieldIds = [];
         inputs.forEach(input => {
             // Clear only calculated fields or fields with invalid text
             if(input.readOnly || (input.value.trim() !== '' && isNaN(parseFloat(input.value)))) {
                 input.value = '';
             }
             setReadOnly(input, false); // Make all editable
             resetPlaceholder(input);
         });
         // Don't clear status here, might overwrite a specific error message
    }


    function clearFields() {
        initialCalculationDone = false; // Reset state
        sourceFieldIds = [];
        inputs.forEach(input => {
            input.value = '';
            setReadOnly(input, false); // Make all editable
            resetPlaceholder(input);
        });
        clearStatus(); // Clear any status messages
        kwInput.focus();
    }

    // --- Event Listeners ---
    const debouncedCalculate = debounce(calculatePowerFactor, 500);

    inputs.forEach(input => {
        input.addEventListener('input', debouncedCalculate);
        input.addEventListener('change', calculatePowerFactor);
    });

    clearBtn.addEventListener('click', clearFields);

    console.log('PF Calc Initialized: Dynamic recalculation active.');
} // End init
