import {
  calculateRequiredCylinderLitres,
  calculateStoredEnergyKwh,
  calculateRechargeTimeHours,
  calculateRequiredKilowatts,
} from './src/calculations.js';

const $ = (id) => document.getElementById(id);
const fields = [
  'delivered-litres', 'sizing-cold-temperature', 'delivery-temperature', 'sizing-storage-temperature',
  'cylinder-volume', 'start-temperature', 'target-temperature', 'heat-output', 'recharge-hours',
].map($);

function numberValue(id) {
  return Number($(id).value);
}

function formatNumber(value, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits, minimumFractionDigits: 0 }).format(value);
}

function formatDuration(hours) {
  const totalMinutes = Math.round(hours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (wholeHours === 0) return `${minutes} min`;
  if (minutes === 0) return `${wholeHours} hr`;
  return `${wholeHours} hr ${minutes} min`;
}

function setResult(testId, text) {
  document.querySelector(`[data-testid="${testId}"]`).textContent = text;
}

function showError(message = '') {
  const error = $('calculator-error');
  error.hidden = !message;
  error.textContent = message;
}

function update() {
  try {
    const sizing = {
      deliveredLitres: numberValue('delivered-litres'),
      coldTemperature: numberValue('sizing-cold-temperature'),
      deliveryTemperature: numberValue('delivery-temperature'),
      storageTemperature: numberValue('sizing-storage-temperature'),
    };
    const suggestedLitres = calculateRequiredCylinderLitres(sizing);
    const suggestedEnergy = calculateStoredEnergyKwh({
      cylinderLitres: suggestedLitres,
      startTemperature: sizing.coldTemperature,
      targetTemperature: sizing.storageTemperature,
    });
    setResult('cylinder-result', `${formatNumber(suggestedLitres, 0)} L`);
    setResult('cylinder-energy', `${formatNumber(suggestedEnergy)} kWh stored from cold`);

    const shared = {
      cylinderLitres: numberValue('cylinder-volume'),
      startTemperature: numberValue('start-temperature'),
      targetTemperature: numberValue('target-temperature'),
    };
    const sharedEnergy = calculateStoredEnergyKwh(shared);
    $('shared-energy').textContent = `Heat required: ${formatNumber(sharedEnergy)} kWh`;

    const rechargeHours = calculateRechargeTimeHours({ ...shared, heatOutputKw: numberValue('heat-output') });
    const requiredKilowatts = calculateRequiredKilowatts({ ...shared, rechargeHours: numberValue('recharge-hours') });
    setResult('recharge-result', formatDuration(rechargeHours));
    setResult('output-result', `${formatNumber(requiredKilowatts)} kW`);
    showError();
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Enter valid positive values to calculate.');
  }
}

fields.forEach((field) => field.addEventListener('input', update));
update();
