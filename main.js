import { calculators } from './calculatorRegistry.js';

document.addEventListener('DOMContentLoaded', () => {
    const navContainer = document.getElementById('calculator-nav');
    const contentContainer = document.getElementById('calculator-content');

    if (!navContainer || !contentContainer || calculators.length === 0) {
        console.error("App containers not found or no calculators registered.");
        return;
    }

    // --- 1. Dynamic HTML Generation ---
    calculators.forEach((calculator, index) => {
        // Create Navigation Button
        const navButton = document.createElement('button');
        navButton.dataset.calculatorId = calculator.id;
        navButton.textContent = calculator.title;
        navContainer.appendChild(navButton);

        // Create Calculator Section
        const section = document.createElement('section');
        section.id = calculator.id;
        section.className = 'calculator-section';

        let sectionHTML = `
            <h2>${calculator.title}</h2>
            <p>${calculator.description}</p>
        `;

        // Create Input/Output Fields
        calculator.fields.forEach(field => {
            if (field.isSeparator) {
                sectionHTML += '<hr style="margin: 20px 0;">';
                return;
            }

            const attributesString = field.attributes
                ? Object.entries(field.attributes).map(([key, value]) =>
                    (value === true ? key : `${key}="${value}"`)).join(' ')
                : '';

            sectionHTML += `
                <div class="input-group">
                    <label for="${field.id}">${field.label}</label>
                    <input type="${field.type}" id="${field.id}" placeholder="${field.placeholder}" ${attributesString}>
                </div>
            `;
        });

        sectionHTML += `
            <button class="clearBtn">Clear All</button>
            <p class="status"></p>
        `;

        section.innerHTML = sectionHTML;
        contentContainer.appendChild(section);

        // Set the first calculator as active by default
        if (index === 0) {
            navButton.classList.add('active');
            section.classList.add('active');
            initializeCalculator(calculator.id); // Initialize the first one
        }
    });


    // --- 2. Event Listeners for Navigation ---
    const navButtons = navContainer.querySelectorAll('button');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const calculatorId = button.dataset.calculatorId;
            switchCalculatorView(calculatorId);
        });
    });


    // --- 3. Generic Functions ---
    function switchCalculatorView(calculatorId) {
        // Hide all sections
        contentContainer.querySelectorAll('.calculator-section').forEach(section => {
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
        const targetButton = navContainer.querySelector(`button[data-calculator-id="${calculatorId}"]`);
        if (targetButton) {
            targetButton.classList.add('active');
        }

        // Initialize the calculator if it hasn't been already
        initializeCalculator(calculatorId);
    }

    function initializeCalculator(calculatorId) {
        const sectionElement = document.getElementById(calculatorId);
        if (!sectionElement) return;

        // Prevent re-initialization
        if (sectionElement.dataset.initialized === 'true') {
            return;
        }

        // Find the corresponding module from our registry
        const calculatorModule = calculators.find(c => c.id === calculatorId);

        if (calculatorModule && typeof calculatorModule.init === 'function') {
            console.log(`Initializing calculator: ${calculatorId}`);
            calculatorModule.init(sectionElement);
            sectionElement.dataset.initialized = 'true'; // Mark as initialized
        } else {
            console.warn(`No initialization logic found for calculator: ${calculatorId}`);
        }
    }
});