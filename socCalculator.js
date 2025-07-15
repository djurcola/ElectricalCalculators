// socCalculator.js

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

// --- Helper to format time from decimal hours to a readable string ---
function formatTime(decimalHours) {
    if (isNaN(decimalHours) || decimalHours < 0) return "N/A";
    if (!isFinite(decimalHours)) return "Never (infinite)";
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    let result = '';
    if (hours > 0) result += `${hours} hour${hours > 1 ? 's' : ''}`;
    if (minutes > 0) {
        if (result !== '') result += ', ';
        result += `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    return result === '' ? 'Less than a minute' : result;
}

// --- Calculator Definition ---
const socCalculator = {
    // 1. METADATA
    id: 'soc-energy-calculator',
    title: 'SoC / Energy Time Calculator',
    description: 'Calculate the time required to charge or discharge a battery system to a target State of Charge (SoC), accounting for system losses.',

    // 2. FIELD DEFINITIONS
    fields: [
        // Energy Input Mode
        {
            id: 'energy-input-mode',
            label: 'Define System Energy By:',
            type: 'select',
            options: [
                { value: 'system', text: 'Total Usable System Energy' },
                { value: 'blocks', text: 'Individual DC Blocks' }
            ]
        },
        // Mutually Exclusive Energy Inputs
        { id: 'usable-energy', label: 'Usable System Energy [kWh]:', type: 'number', placeholder: 'e.g., 100', attributes: { step: 'any' } },
        { id: 'dc-block-energy', label: 'DC Block Energy [kWh]:', type: 'number', placeholder: 'e.g., 50', attributes: { step: 'any' } },
        { id: 'num-dc-blocks', label: 'Number of DC Blocks:', type: 'number', placeholder: 'e.g., 2', attributes: { step: '1', min: '1' } },
        
        // *** NEW INTERIM FIELD ***
        { id: 'total-calculated-energy', label: 'Calculated Total Usable Energy [kWh]:', type: 'number', placeholder: 'Calculated', attributes: { readonly: true, style: 'font-weight: bold; color: #0056b3;' } },

        // Other Specs
        { id: 'start-soc', label: 'Start SoC [%]:', type: 'number', placeholder: 'e.g., 20', attributes: { step: 'any', min: '0', max: '100' } },
        { id: 'target-soc', label: 'Target SoC [%]:', type: 'number', placeholder: 'e.g., 80', attributes: { step: 'any', min: '0', max: '100' } },
        
        // Operation
        { isSeparator: true },
        { id: 'power-kw', label: 'Charge/Discharge Power [kW]:', type: 'number', placeholder: 'Enter positive value, e.g., 50', attributes: { step: 'any' } },

        // Losses & Efficiency
        { isSeparator: true },
        { id: 'inverter-efficiency', label: 'Inverter Efficiency (One-Way) [%]:', type: 'number', value: 98, attributes: { step: 'any', min: '0', max: '100' } },
        { id: 'battery-efficiency', label: 'Battery Efficiency (One-Way) [%]:', type: 'number', value: 95, attributes: { step: 'any', min: '0', max: '100' } },
        { id: 'aux-loss-watts', label: 'Auxiliary System Losses [W]:', type: 'number', value: 150, attributes: { step: 'any', min: '0' } },
        
        // Outputs
        { isSeparator: true },
        { id: 'operation-mode', label: 'Operation Mode:', type: 'text', placeholder: 'Calculated', attributes: { readonly: true, style: 'font-weight: bold;' } },
        { id: 'effective-power', label: 'Effective Power at Battery [kW]:', type: 'number', placeholder: 'Calculated', attributes: { readonly: true } },
        { id: 'time-to-target', label: 'Calculated Time to Target:', type: 'text', placeholder: 'Calculated', attributes: { readonly: true } },
    ],

    // 3. INITIALIZATION LOGIC
    init(sectionElement) {
        // --- Find DOM Elements ---
        const inputs = {
            mode: sectionElement.querySelector('#energy-input-mode'),
            usableEnergy: sectionElement.querySelector('#usable-energy'),
            dcBlockEnergy: sectionElement.querySelector('#dc-block-energy'),
            numDcBlocks: sectionElement.querySelector('#num-dc-blocks'),
            startSoc: sectionElement.querySelector('#start-soc'),
            targetSoc: sectionElement.querySelector('#target-soc'),
            power: sectionElement.querySelector('#power-kw'),
            inverterEff: sectionElement.querySelector('#inverter-efficiency'),
            batteryEff: sectionElement.querySelector('#battery-efficiency'),
            auxLoss: sectionElement.querySelector('#aux-loss-watts'),
        };
        const outputs = {
            totalCalculatedEnergy: sectionElement.querySelector('#total-calculated-energy'),
            mode: sectionElement.querySelector('#operation-mode'),
            effectivePower: sectionElement.querySelector('#effective-power'),
            time: sectionElement.querySelector('#time-to-target'),
        };
        const clearBtn = sectionElement.querySelector('.clearBtn');
        const statusDiv = sectionElement.querySelector('.status');
        const allInputElements = Object.values(inputs);

        // --- Helper Functions ---
        function clearStatus() { if (statusDiv) statusDiv.textContent = ''; }
        function resetOutputFields() { Object.values(outputs).forEach(output => { if (output) output.value = ''; }); }

        function toggleEnergyInputs() {
            const systemGroup = inputs.usableEnergy.parentElement;
            const blockEnergyGroup = inputs.dcBlockEnergy.parentElement;
            const blockNumGroup = inputs.numDcBlocks.parentElement;
            const totalEnergyGroup = outputs.totalCalculatedEnergy.parentElement; // Get the new field's group

            if (inputs.mode.value === 'system') {
                systemGroup.style.display = '';
                blockEnergyGroup.style.display = 'none';
                blockNumGroup.style.display = 'none';
                totalEnergyGroup.style.display = 'none'; // Hide interim field
            } else { // 'blocks'
                systemGroup.style.display = 'none';
                blockEnergyGroup.style.display = '';
                blockNumGroup.style.display = '';
                totalEnergyGroup.style.display = ''; // Show interim field
            }
        }

        // --- Main Calculation Logic ---
        function calculateTime() {
            clearStatus();
            resetOutputFields();

            const values = Object.fromEntries(Object.entries(inputs).map(([key, el]) => [key, parseFloat(el.value)]));

            // --- Determine Usable Energy from selected mode ---
            let usableEnergy_kWh;
            if (inputs.mode.value === 'system') {
                usableEnergy_kWh = values.usableEnergy;
            } else { // 'blocks'
                if (!isNaN(values.dcBlockEnergy) && !isNaN(values.numDcBlocks)) {
                    usableEnergy_kWh = values.dcBlockEnergy * values.numDcBlocks;
                    // Update the interim display field
                    outputs.totalCalculatedEnergy.value = usableEnergy_kWh.toFixed(2);
                } else {
                    usableEnergy_kWh = NaN; // Ensure it's NaN if inputs are bad
                }
            }
            
            // --- Validation of other fields ---
            const otherValues = { power: values.power, startSoc: values.startSoc, targetSoc: values.targetSoc, inverterEff: values.inverterEff, batteryEff: values.batteryEff, auxLoss: values.auxLoss };
            if (isNaN(usableEnergy_kWh) || Object.values(otherValues).some(v => isNaN(v))) {
                 if (Object.values(inputs).some(el => el.offsetParent && el.value.trim() && isNaN(parseFloat(el.value)))) {
                     statusDiv.textContent = 'Please fill all visible fields with valid numbers.';
                }
                return;
            }
            
            let errors = [];
            // ... (rest of validation remains the same)
            if (values.startSoc < 0 || values.startSoc > 100) errors.push('Start SoC must be 0-100%.');
            if (values.targetSoc < 0 || values.targetSoc > 100) errors.push('Target SoC must be 0-100%.');
            if (usableEnergy_kWh <= 0) errors.push('Total Usable Energy must be > 0.');
            if (values.inverterEff <= 0 || values.inverterEff > 100) errors.push('Inverter Efficiency must be > 0 and ≤ 100%.');
            if (values.batteryEff <= 0 || values.batteryEff > 100) errors.push('Battery Efficiency must be > 0 and ≤ 100%.');
            if (values.power < 0) errors.push('Power value should be positive.');

            if (errors.length > 0) {
                statusDiv.textContent = `Validation Error(s): ${errors.join(' ')}`;
                return;
            }

            // --- Determine Operation Mode based on SoC ---
            // ... (rest of calculation logic remains the same)
            let mode = 'Idle';
            const socDirection = Math.sign(values.targetSoc - values.startSoc);
            if (socDirection > 0) mode = 'Charging';
            else if (socDirection < 0) mode = 'Discharging';
            if (mode === 'Idle') {
                statusDiv.textContent = 'Start and Target SoC are the same. No operation needed.';
                return;
            }
            outputs.mode.value = mode;

            let effectivePower = 0;
            const powerValue = Math.abs(values.power);
            const invEff = values.inverterEff / 100;
            const batEff = values.batteryEff / 100;
            const auxLoss_kW = values.auxLoss / 1000;
            if (mode === 'Charging') {
                let powerAfterInverter = (powerValue * invEff);
                let netPowerToBattery = powerAfterInverter - auxLoss_kW;
                if (netPowerToBattery <= 0) {
                    statusDiv.textContent = 'Charge power is too low to overcome system losses. The battery will not charge.';
                    return;
                }
                effectivePower = netPowerToBattery;
            } else { // Discharging
                let powerForLoadAndInverter = powerValue / invEff;
                let totalPowerFromBattery = powerForLoadAndInverter + auxLoss_kW;
                effectivePower = totalPowerFromBattery;
            }
            outputs.effectivePower.value = effectivePower.toFixed(3);
            const deltaSoc = Math.abs(values.targetSoc - values.startSoc);
            const energyToTransfer_kWh = (deltaSoc / 100) * usableEnergy_kWh;
            const time_hours = energyToTransfer_kWh / effectivePower;
            outputs.time.value = formatTime(time_hours);
        }

        // --- Clear All Fields Function ---
        function clearFields() {
            // ... (remains the same)
            allInputElements.forEach(input => {
                const id = input.id;
                const fieldDef = socCalculator.fields.find(f => f.id === id);
                if (fieldDef && fieldDef.value !== undefined) {
                    input.value = fieldDef.value;
                } else if (input.tagName !== 'SELECT') {
                    input.value = '';
                }
            });
            resetOutputFields();
            clearStatus();
        }

        // --- Event Listeners ---
        const debouncedCalculate = debounce(calculateTime, 350);
        allInputElements.forEach(input => { if (input) input.addEventListener('input', debouncedCalculate); });
        inputs.mode.addEventListener('change', () => {
            toggleEnergyInputs();
            calculateTime();
        });
        if (clearBtn) clearBtn.addEventListener('click', clearFields);
        
        // Initial setup
        toggleEnergyInputs();
        console.log('SoC / Energy Time Calculator Initialized.');
    }
};

export default socCalculator;