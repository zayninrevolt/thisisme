import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateEffectiveLengthMetres,
  calculateGasSection,
  calculateGravityFedTapRoute,
  calculateHeatingFlowLitresPerMinute,
  calculateWaterSection,
} from '../pipe/src/calculations.js';

test('reproduces a BS 6891 Annex A copper example with the design flow rounded upward', () => {
  const result = calculateGasSection({
    netHeatInputKw: 50,
    internalDiameterMm: 25,
    efficiencyFactor: 0.95,
    actualLengthMetres: 1,
    fittingsEquivalentLengthMetres: 2.3,
  });

  assert.equal(result.actualFlowM3h, 5.089974293059127);
  assert.equal(result.designFlowM3h, 5.25);
  assert.ok(Math.abs(result.pressureLossPerMetreMbar - 0.05477478357355119) < 1e-12);
  assert.ok(Math.abs(result.pressureLossMbar - 0.18075678579271892) < 1e-12);
});

test('calculates water velocity, friction loss and pump head through a copper section', () => {
  const result = calculateWaterSection({
    flowLitresPerMinute: 10,
    internalDiameterMm: 19,
    roughnessMetres: 0.0000015,
    actualLengthMetres: 10,
    fittingsEquivalentLengthMetres: 0,
    waterTemperatureC: 20,
  });

  assert.equal(result.velocityMetresPerSecond, 0.5878298913828083);
  assert.ok(Math.abs(result.pressureLossPa - 2743.574035603942) < 1e-9);
  assert.ok(Math.abs(result.pumpHeadMetres - 0.2802711806862976) < 1e-12);
});

test('derives heating-water flow from load and temperature difference', () => {
  assert.equal(calculateHeatingFlowLitresPerMinute({ heatLoadKw: 12, deltaTK: 20 }), 8.600095556617296);
});

test('uses either a known fitting equivalent length or the unknown-fittings 50 percent allowance', () => {
  assert.equal(calculateEffectiveLengthMetres({
    actualLengthMetres: 10,
    fittingsMethod: 'known',
    fittingsEquivalentLengthMetres: 4,
  }), 14);
  assert.equal(calculateEffectiveLengthMetres({
    actualLengthMetres: 10,
    fittingsMethod: 'unknown-50-percent',
    fittingsEquivalentLengthMetres: 99,
  }), 15);
});

test('calculates gravity-tank static head and expected tap flow including route friction', () => {
  const result = calculateGravityFedTapRoute({
    verticalHeadMetres: 3,
    tapReferenceFlowLitresPerMinute: 7,
    tapReferencePressureBar: 0.1,
    waterTemperatureC: 20,
    sections: [{
      internalDiameterMm: 19,
      roughnessMetres: 0.0000015,
      actualLengthMetres: 10,
      fittingsEquivalentLengthMetres: 0,
    }],
  });

  assert.ok(Math.abs(result.staticPressureBar - 0.2936699409) < 1e-10);
  assert.ok(result.expectedFlowLitresPerMinute > 11);
  assert.ok(result.expectedFlowLitresPerMinute < 12);
  assert.ok(result.pipePressureLossKpa > 3);
  assert.ok(result.tapInletPressureBar > 0.2);
});

test('rejects impossible section lengths and non-positive heating temperature differences', () => {
  assert.throws(
    () => calculateWaterSection({
      flowLitresPerMinute: 10,
      internalDiameterMm: 19,
      roughnessMetres: 0.0000015,
      actualLengthMetres: -1,
      fittingsEquivalentLengthMetres: 0,
      waterTemperatureC: 20,
    }),
    /actual length/i,
  );
  assert.throws(() => calculateHeatingFlowLitresPerMinute({ heatLoadKw: 12, deltaTK: 0 }), /temperature difference/i);
});
