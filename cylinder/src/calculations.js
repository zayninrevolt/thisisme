const WATER_SPECIFIC_HEAT_KJ_PER_KG_K = 4.186;
const KJ_PER_KWH = 3600;

function positiveNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new RangeError(`${label} must be greater than zero.`);
  }
  return number;
}

function temperatureRise(startTemperature, targetTemperature) {
  const start = Number(startTemperature);
  const target = Number(targetTemperature);
  if (!Number.isFinite(start) || !Number.isFinite(target) || target <= start) {
    throw new RangeError('Target temperature must be greater than start temperature.');
  }
  return target - start;
}

export function calculateStoredEnergyKwh({ cylinderLitres, startTemperature, targetTemperature }) {
  const litres = positiveNumber(cylinderLitres, 'Cylinder litres');
  const deltaT = temperatureRise(startTemperature, targetTemperature);
  return litres * WATER_SPECIFIC_HEAT_KJ_PER_KG_K * deltaT / KJ_PER_KWH;
}

export function calculateRequiredCylinderLitres({
  deliveredLitres,
  coldTemperature,
  deliveryTemperature,
  storageTemperature,
}) {
  const demand = positiveNumber(deliveredLitres, 'Delivered litres');
  const storageRise = temperatureRise(coldTemperature, storageTemperature);
  const deliveryRise = temperatureRise(coldTemperature, deliveryTemperature);
  if (deliveryTemperature > storageTemperature) {
    throw new RangeError('Storage temperature must be at least the delivery temperature.');
  }
  return demand * deliveryRise / storageRise;
}

export function calculateRechargeTimeHours({
  cylinderLitres,
  startTemperature,
  targetTemperature,
  heatOutputKw,
}) {
  const kilowatts = positiveNumber(heatOutputKw, 'Heat output');
  return calculateStoredEnergyKwh({ cylinderLitres, startTemperature, targetTemperature }) / kilowatts;
}

export function calculateRequiredKilowatts({
  cylinderLitres,
  startTemperature,
  targetTemperature,
  rechargeHours,
}) {
  const hours = positiveNumber(rechargeHours, 'Recharge hours');
  return calculateStoredEnergyKwh({ cylinderLitres, startTemperature, targetTemperature }) / hours;
}
