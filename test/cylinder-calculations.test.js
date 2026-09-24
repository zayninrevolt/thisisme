import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateRecommendedCylinderLitres,
  calculateTheoreticalTapWaterLitres,
  calculateStoredEnergyKwh,
  calculateRechargeTimeHours,
  calculateRequiredKilowatts,
} from '../cylinder/src/calculations.js';

test('selects the greater of the occupant and bedroom-plus-one sizing rules', () => {
  assert.equal(calculateRecommendedCylinderLitres({ occupants: 3, bedrooms: 2 }), 135);
  assert.equal(calculateRecommendedCylinderLitres({ occupants: 2, bedrooms: 3 }), 180);
  assert.equal(calculateRecommendedCylinderLitres({ occupants: 5, bedrooms: 3 }), 225);
});

test('requires whole, non-negative household inputs for the sizing rule', () => {
  assert.throws(
    () => calculateRecommendedCylinderLitres({ occupants: 2.5, bedrooms: 3 }),
    /occupants must be a whole number/i,
  );
  assert.throws(
    () => calculateRecommendedCylinderLitres({ occupants: 2, bedrooms: -1 }),
    /bedrooms must be zero or greater/i,
  );
});

test('calculates the theoretical 40°C mixed water available at the taps', () => {
  assert.equal(
    calculateTheoreticalTapWaterLitres({
      cylinderLitres: 200,
      coldFeedTemperature: 10,
      storageTemperature: 55,
      tapTemperature: 40,
    }),
    300,
  );
  assert.throws(
    () => calculateTheoreticalTapWaterLitres({
      cylinderLitres: 200,
      coldFeedTemperature: 10,
      storageTemperature: 40,
      tapTemperature: 40,
    }),
    /storage temperature must be greater than tap temperature/i,
  );
});

test('retains the idealised energy and recharge calculations', () => {
  assert.equal(calculateStoredEnergyKwh({ cylinderLitres: 200, startTemperature: 10, targetTemperature: 55 }), 10.465);
  assert.equal(calculateRechargeTimeHours({ cylinderLitres: 200, startTemperature: 10, targetTemperature: 55, heatOutputKw: 3 }), 3.4883333333333333);
  assert.equal(calculateRequiredKilowatts({ cylinderLitres: 200, startTemperature: 10, targetTemperature: 55, rechargeHours: 2.5 }), 4.186);
});
