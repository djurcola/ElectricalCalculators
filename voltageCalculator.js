// voltageCalculator.js

const voltageConverter = {
    // 1. METADATA for HTML Generation
    id: 'voltage-converter',
    title: '3-Phase Voltage Converter',
    description: 'Enter a value in either field to calculate the other. Assumes a balanced system (√3 factor).',

    // 2. FIELD DEFINITIONS for HTML Generation
    fields: [
        {
            id: 'vll',
            label: 'Line-to-Line Voltage (V<sub>L-L</sub>):',
            type: 'number',
            placeholder: 'e.g., 480',
            attributes: { step: 'any', min: '0' }
        },
        {
            id: 'vln',
            label: 'Line-to-Neutral Voltage (V<sub>L-N</sub>):',
            type: 'number',
            placeholder: 'e.g., 277',
            attributes: { step: 'any', min: '0' }
        }
    ],

    // 3. INITIALIZATION LOGIC
    init(sectionElement) {
        const SQRT3 = Math.sqrt(3);

        // Find elements *within* the passed sectionElement context
        const vllInput = sectionElement.querySelector('#vll');
        const vlnInput = sectionElement.querySelector('#vln');
        const clearBtn = sectionElement.querySelector('.clearBtn');
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

        // --- Event Listeners ---
        vllInput.addEventListener('input', calculateFromLL);
        vlnInput.addEventListener('input', calculateFromLN);
        clearBtn.addEventListener('click', clearFields);

        console.log('Voltage Converter Initialized');
    }
};

export default voltageConverter;