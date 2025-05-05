// Import calculator modules
import * as voltageConverter from './voltageCalculator.js';
import * as powerFactorCalculator from './powerFactorCalculator.js'; // Import when ready

document.addEventListener('DOMContentLoaded', () => {
    const navButtons = document.querySelectorAll('#calculator-nav button');
    const calculatorSections = document.querySelectorAll('.calculator-section');
    const calculatorContent = document.getElementById('calculator-content');

    // --- Initial Setup ---
    // Find the initially active calculator (based on HTML class 'active')
    const initialCalculatorId = document.querySelector('#calculator-nav button.active')?.dataset.calculatorId;
    if (initialCalculatorId) {
        initializeCalculator(initialCalculatorId);
    } else {
        // Fallback: activate the first one if none are marked active
        const firstButton = navButtons[0];
        if (firstButton) {
            const firstCalculatorId = firstButton.dataset.calculatorId;
            switchCalculatorView(firstCalculatorId); // This also calls initialize
        }
    }


    // --- Event Listeners for Navigation ---
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const calculatorId = button.dataset.calculatorId;
            switchCalculatorView(calculatorId);
        });
    });


    // --- Functions ---
    function switchCalculatorView(calculatorId) {
        // Hide all sections
        calculatorSections.forEach(section => {
            section.classList.remove('active');
        });

        // Deactivate all nav buttons
        navButtons.forEach(button => {
            button.classList.remove('active');
        });

        // Show the target section
        const targetSection = document.getElementById(calculatorId);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Activate the target nav button
        const targetButton = document.querySelector(`#calculator-nav button[data-calculator-id="${calculatorId}"]`);
        if (targetButton) {
            targetButton.classList.add('active');
        }

        // Initialize the calculator (if needed)
        initializeCalculator(calculatorId);
    }

    function initializeCalculator(calculatorId) {
        const sectionElement = document.getElementById(calculatorId);
        if (!sectionElement) {
            console.error(`Calculator section with id "${calculatorId}" not found.`);
            return;
        }

        // Prevent re-initialization if already done (optional, but good practice)
        if (sectionElement.dataset.initialized === 'true') {
            return;
        }

        console.log(`Initializing calculator: ${calculatorId}`); // For debugging

        // Call the appropriate init function based on ID
        switch (calculatorId) {
            case 'voltage-converter':
                voltageConverter.init(sectionElement);
                break;
            case 'power-factor':
                 // Check if the module exists before calling init
                if (typeof powerFactorCalculator !== 'undefined' && powerFactorCalculator.init) {
                    powerFactorCalculator.init(sectionElement);
                } else {
                     console.log("Power Factor calculator logic not implemented yet.");
                 }
                break;
            // Add cases for other calculators here
            default:
                console.warn(`No initialization logic found for calculator: ${calculatorId}`);
        }

        // Mark as initialized
        sectionElement.dataset.initialized = 'true';
    }

});
