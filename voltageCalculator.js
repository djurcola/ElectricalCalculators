// Module for the Voltage Converter Calculator

const SQRT3 = Math.sqrt(3); // Approx 1.732

// Initialization function for this specific calculator
export function init(sectionElement) {
    // Find elements *within* the passed sectionElement context
    const vllInput = sectionElement.querySelector('#vll');
    const vlnInput = sectionElement.querySelector('#vln');
    const clearBtn = sectionElement.querySelector('.clearBtn'); // Use class for clear
    const statusDiv = sectionElement.querySelector('.status');

    // --- Helper Functions ---
    function clearStatus() {
        statusDiv.textContent = '';
    }

    function calculateFromLL() {
        clearStatus();
        const vllValue = parseFloat(vllInput.value);

        if (!isNaN(vllValue) && vllValue >= 0) {
            const vlnCalculated = vllValue / SQRT3;
            vlnInput.value = vlnCalculated.toFixed(2);
        } else if (vllInput.value.trim() === '') {
            vlnInput.value = '';
        } else if (vllValue < 0) {
            vlnInput.value = '';
            statusDiv.textContent = 'Voltage cannot be negative.';
        } else {
             vlnInput.value = ''; // Clear on any other invalid input
        }
    }

    function calculateFromLN() {
        clearStatus();
        const vlnValue = parseFloat(vlnInput.value);

        if (!isNaN(vlnValue) && vlnValue >= 0) {
            const vllCalculated = vlnValue * SQRT3;
            vllInput.value = vllCalculated.toFixed(2);
        } else if (vlnInput.value.trim() === '') {
            vllInput.value = '';
        } else if (vlnValue < 0) {
            vllInput.value = '';
            statusDiv.textContent = 'Voltage cannot be negative.';
        } else {
             vllInput.value = ''; // Clear on any other invalid input
        }
    }

    function clearFields() {
        vllInput.value = '';
        vlnInput.value = '';
        clearStatus();
        vllInput.focus();
    }

    // --- Event Listeners (scoped to this section's elements) ---
    vllInput.addEventListener('input', calculateFromLL);
    vllInput.addEventListener('change', calculateFromLL); // Handle pasting/spinners

    vlnInput.addEventListener('input', calculateFromLN);
    vlnInput.addEventListener('change', calculateFromLN); // Handle pasting/spinners

    clearBtn.addEventListener('click', clearFields);

    console.log('Voltage Converter Initialized'); // Confirmation
}

// You could add other exported functions if needed, but init is the main entry point.