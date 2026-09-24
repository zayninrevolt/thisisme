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

function nonNegativeWholeNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new RangeError(`${label} must be zero or greater.`);
  }
  if (!Number.isInteger(number)) {
    throw new RangeError(`${label} must be a whole number.`);
  }
  return number;
}

export function calculateRecommendedCylinderLitres({ occupants, bedrooms }) {
  const householdOccupants = nonNegativeWholeNumber(occupants, 'Occupants');
  const householdBedrooms = nonNegativeWholeNumber(bedrooms, 'Bedrooms');
  const occupantRuleLitres = householdOccupants * 45;
  const bedroomRuleLitres = (householdBedrooms + 1) * 45;
  return Math.max(occupantRuleLitres, bedroomRuleLitres);
}

function finiteTemperature(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new RangeError(`${label} must be a valid temperature.`);
  }
  return number;
}

export function calculateTheoreticalTapWaterLitres({
  cylinderLitres,
  coldFeedTemperature,
  storageTemperature,
  tapTemperature = 40,
}) {
  const litres = positiveNumber(cylinderLitres, 'Cylinder litres');
  const cold = finiteTemperature(coldFeedTemperature, 'Cold feed temperature');
  const storage = finiteTemperature(storageTemperature, 'Storage temperature');
  const tap = finiteTemperature(tapTemperature, 'Tap temperature');
  if (tap <= cold) {
    throw new RangeError('Tap temperature must be greater than cold feed temperature.');
  }
  if (storage <= tap) {
    throw new RangeError('Storage temperature must be greater than tap temperature.');
  }
  return litres * (storage - cold) / (tap - cold);
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
