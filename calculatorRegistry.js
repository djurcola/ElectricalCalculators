// This file acts as a central registry for all available calculators.
// To add a new calculator to the app, simply import its module here
// and add it to the 'calculators' array.

import powerFactorCalculator from './powerFactorCalculator.js';
import voltageConverter from './voltageCalculator.js';
import threePhasePowerCalculator from './threePhasePowerCalculator.js';
import frequencyDroopCalculator from './frequencyDroopCalculator.js';
import socCalculator from './socCalculator.js';
import roundTripEfficiencyCalculator from './roundTripEfficiencyCalculator.js';
import voltageDroopCalculator from './voltageDroopCalculator.js';
//import voltageControlDroopCalculator from './voltageControlDroopCalculator.js'; 
// import myFutureCalculator from './myFutureCalculator.js'; // <-- Add future calculators here

export const calculators = [
    powerFactorCalculator,
    voltageConverter,
    threePhasePowerCalculator,
    frequencyDroopCalculator,
    socCalculator,
    roundTripEfficiencyCalculator,
    voltageDroopCalculator
    // voltageControlDroopCalculator
    // myFutureCalculator, // <-- And here
];