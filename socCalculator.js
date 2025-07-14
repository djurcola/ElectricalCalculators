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
    if (isNaN(decimalHours) || decimalHours < 0) {
        return "N/A";
    }
    if (!isFinite(decimalHours)) {
        return "Never (infinite)";
    }
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    let result = '';
    if (hours > 0) {
        result += `${hours} hour${hours > 1 ? 's' : ''}`;
    }
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
        // Battery Specs
        { id: 'usable-energy', label: 'Usable System Energy [kWh]:', type: 'number', placeholder: 'e.g., 100', attributes: { step: 'any' } },
        { id: 'start-soc', label: 'Start SoC [%]:', type: 'number', placeholder: 'e.g., 20', attributes: { step: 'any', min: '0', max: '100' } },
        { id: 'target-soc', label: 'Target SoC [%]:', type: 'number', placeholder: 'e.g., 80', attributes: { step: 'any', min: '0', max: '100' } },
        
        // Operation
        { isSeparator: true },
        { id: 'power-kw', label: 'Charge/Discharge Power [kW]:', type: 'number', placeholder: '+ for charge, - for discharge', attributes: { step: 'any' } },

        // Losses & Efficiency
        { isSeparator: true },
        { id: 'inverter-efficiency', label: 'Inverter Efficiency (One-Way) [%]:', type: 'number', placeholder: 'e.g., 98', value: 98, attributes: { step: 'any', min: '0', max: '100' } },
        { id: 'battery-efficiency', label: 'Battery Efficiency (One-Way) [%]:', type: 'number', placeholder: 'e.g., 95', value: 95, attributes: { step: 'any', min: '0', max: '100' } },
        { id: 'aux-loss-watts', label: 'Auxiliary System Losses [W]:', type: 'number', placeholder: 'e.g., 150', value: 150, attributes: { step: 'any', min: '0' } },
        
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
            usableEnergy: sectionElement.querySelector('#usable-energy'),
            startSoc: sectionElement.querySelector('#start-soc'),
            targetSoc: sectionElement.querySelector('#target-soc'),
            power: sectionElement.querySelector('#power-kw'),
            inverterEff: sectionElement.querySelector('#inverter-efficiency'),
            batteryEff: sectionElement.querySelector('#battery-efficiency'),
            auxLoss: sectionElement.querySelector('#aux-loss-watts'),
        };
        const outputs = {
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

        // --- Main Calculation Logic ---
        function calculateTime() {
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
            if (values.startSoc < 0 || values.startSoc > 100) errors.push('Start SoC must be 0-100%.');
            if (values.targetSoc < 0 || values.targetSoc > 100) errors.push('Target SoC must be 0-100%.');
            if (values.usableEnergy <= 0) errors.push('Usable Energy must be > 0.');
            if (values.inverterEff <= 0 || values.inverterEff > 100) errors.push('Inverter Efficiency must be > 0 and ≤ 100%.');
            if (values.batteryEff <= 0 || values.batteryEff > 100) errors.push('Battery Efficiency must be > 0 and ≤ 100%.');
            if (values.startSoc === values.targetSoc) errors.push('Start and Target SoC cannot be the same.');
            
            // --- Determine Operation Mode ---
            let mode = 'Idle';
            let effectivePower = 0;
            const powerDirection = Math.sign(values.power); // +1 for charge, -1 for discharge, 0 for idle
            const socDirection = Math.sign(values.targetSoc - values.startSoc); // +1 for charge, -1 for discharge

            if (powerDirection === 0 || socDirection === 0) {
                 mode = 'Idle';
            } else if (powerDirection !== socDirection) {
                errors.push('Power direction conflicts with SoC target (e.g., positive power to a lower SoC).');
            } else if (powerDirection === 1) {
                mode = 'Charging';
            } else if (powerDirection === -1) {
                mode = 'Discharging';
            }
            
            if (errors.length > 0) {
                statusDiv.textContent = `Validation Error(s): ${errors.join(' ')}`;
                return;
            }
            outputs.mode.value = mode;

            // --- Calculate ---
            const invEff = values.inverterEff / 100;
            const batEff = values.batteryEff / 100;
            const auxLoss_kW = values.auxLoss / 1000;

            if (mode === 'Charging') {
                // Net power available at the DC bus after inverter losses.
                let powerAfterInverter = (values.power * invEff);
                // The net power that actually charges the battery after supplying auxiliary loads.
                let netPowerToBattery = powerAfterInverter - auxLoss_kW;
                
                if (netPowerToBattery <= 0) {
                    statusDiv.textContent = 'Charge power is too low to overcome system losses. The battery will not charge.';
                    return;
                }
                // The battery's own inefficiency means it takes more energy to store a certain amount.
                // The rate of change of stored energy is determined by the net power delivered to the terminals.
                effectivePower = netPowerToBattery;
            }
            
            if (mode === 'Discharging') {
                // To deliver power to the load, the inverter needs more power from the DC bus due to its inefficiency.
                let powerForLoadAndInverter = Math.abs(values.power) / invEff;
                // The battery must supply power for the load/inverter AND the auxiliary system.
                let totalPowerFromBattery = powerForLoadAndInverter + auxLoss_kW;

                // The battery's inefficiency means it must provide even more chemical power.
                // The rate of stored energy depletion is based on the total power drawn from the terminals.
                effectivePower = totalPowerFromBattery;
            }

            if (mode === 'Idle' || effectivePower === 0) {
                outputs.time.value = 'N/A';
                return;
            }
            
            outputs.effectivePower.value = effectivePower.toFixed(3);
            
            const deltaSoc = Math.abs(values.targetSoc - values.startSoc);
            const energyToTransfer_kWh = (deltaSoc / 100) * values.usableEnergy;
            
            const time_hours = energyToTransfer_kWh / effectivePower;
            outputs.time.value = formatTime(time_hours);
        }

        // --- Clear All Fields Function ---
        function clearFields() {
            allInputElements.forEach(input => {
                const id = input.id;
                // Reset to default values if they exist in the definition
                const fieldDef = socCalculator.fields.find(f => f.id === id);
                input.value = fieldDef && fieldDef.value ? fieldDef.value : '';
            });
            resetOutputFields();
            clearStatus();
        }

        // --- Event Listeners ---
        const debouncedCalculate = debounce(calculateTime, 350);
        allInputElements.forEach(input => { if (input) input.addEventListener('input', debouncedCalculate); });
        if (clearBtn) clearBtn.addEventListener('click', clearFields);

        console.log('SoC / Energy Time Calculator Initialized.');
    }
};

export default socCalculator;