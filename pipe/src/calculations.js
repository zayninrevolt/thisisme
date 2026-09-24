const GAS_FLOW_COEFFICIENT = 57.1e-5;
const NATURAL_GAS_RELATIVE_DENSITY = 0.6;
const NATURAL_GAS_GROSS_CALORIFIC_VALUE_MJ_PER_M3 = 38.9;
const NET_TO_GROSS_FACTOR = 1.1;
const WATER_SPECIFIC_HEAT_KJ_PER_KG_K = 4.186;
const GRAVITY_M_PER_S2 = 9.80665;

const WATER_PROPERTIES = [
  { temperatureC: 10, densityKgPerM3: 999.7, dynamicViscosityPaS: 0.0013060 },
  { temperatureC: 20, densityKgPerM3: 998.2, dynamicViscosityPaS: 0.0010016 },
  { temperatureC: 40, densityKgPerM3: 992.2, dynamicViscosityPaS: 0.0006527 },
  { temperatureC: 60, densityKgPerM3: 983.2, dynamicViscosityPaS: 0.0004660 },
  { temperatureC: 80, densityKgPerM3: 971.8, dynamicViscosityPaS: 0.0003540 },
];

function positiveNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new RangeError(`${label} must be greater than zero.`);
  }
  return number;
}

function nonNegativeNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new RangeError(`${label} must be zero or greater.`);
  }
  return number;
}

function interpolateWaterProperties(temperatureC) {
  const temperature = positiveNumber(temperatureC, 'Water temperature');
  if (temperature < WATER_PROPERTIES[0].temperatureC || temperature > WATER_PROPERTIES.at(-1).temperatureC) {
    throw new RangeError('Water temperature must be between 10°C and 80°C.');
  }
  const upperIndex = WATER_PROPERTIES.findIndex(({ temperatureC: point }) => point >= temperature);
  if (upperIndex === 0) return WATER_PROPERTIES[0];
  const upper = WATER_PROPERTIES[upperIndex];
  const lower = WATER_PROPERTIES[upperIndex - 1];
  const ratio = (temperature - lower.temperatureC) / (upper.temperatureC - lower.temperatureC);
  return {
    densityKgPerM3: lower.densityKgPerM3 + ratio * (upper.densityKgPerM3 - lower.densityKgPerM3),
    dynamicViscosityPaS: lower.dynamicViscosityPaS + ratio * (upper.dynamicViscosityPaS - lower.dynamicViscosityPaS),
  };
}

export function calculateEffectiveLengthMetres({
  actualLengthMetres,
  fittingsEquivalentLengthMetres = 0,
  fittingsMethod = 'known',
}) {
  const actualLength = nonNegativeNumber(actualLengthMetres, 'Actual length');
  if (fittingsMethod === 'unknown-50-percent') return actualLength * 1.5;
  if (fittingsMethod !== 'known') throw new RangeError('Fittings method must be known or unknown-50-percent.');
  return actualLength + nonNegativeNumber(fittingsEquivalentLengthMetres, 'Fittings equivalent length');
}

function waterFrictionFactor(reynoldsNumber, roughnessMetres, diameterMetres) {
  if (reynoldsNumber < 2300) return 64 / reynoldsNumber;
  const relativeRoughness = roughnessMetres / diameterMetres;
  return 0.25 / Math.log10(relativeRoughness / 3.7 + 5.74 / reynoldsNumber ** 0.9) ** 2;
}

export function calculateGasSection({
  netHeatInputKw,
  internalDiameterMm,
  efficiencyFactor,
  actualLengthMetres,
  fittingsEquivalentLengthMetres,
}) {
  const netKw = positiveNumber(netHeatInputKw, 'Net heat input');
  const diameterMm = positiveNumber(internalDiameterMm, 'Internal diameter');
  const efficiency = positiveNumber(efficiencyFactor, 'Pipe efficiency factor');
  const effectiveLength = calculateEffectiveLengthMetres({ actualLengthMetres, fittingsEquivalentLengthMetres });
  const actualFlowM3h = netKw * NET_TO_GROSS_FACTOR / (NATURAL_GAS_GROSS_CALORIFIC_VALUE_MJ_PER_M3 / 3.6);
  const designFlowM3h = Math.ceil(actualFlowM3h * 4) / 4;
  const reynoldsNumber = 25043 * designFlowM3h / diameterMm;
  const x = Math.log10(reynoldsNumber) - 5;
  const smoothPipeFrictionFactor = (14.7519 + 3.5657 * x + 0.0362 * x ** 2) ** -2;
  const frictionFactor = smoothPipeFrictionFactor / efficiency ** 2;
  const pressureLossPerMetreMbar = (designFlowM3h / GAS_FLOW_COEFFICIENT) ** 2
    * NATURAL_GAS_RELATIVE_DENSITY * frictionFactor / diameterMm ** 5;
  return {
    actualFlowM3h,
    designFlowM3h,
    reynoldsNumber,
    frictionFactor,
    effectiveLengthMetres: effectiveLength,
    pressureLossPerMetreMbar,
    pressureLossMbar: pressureLossPerMetreMbar * effectiveLength,
  };
}

export function calculateWaterSection({
  flowLitresPerMinute,
  internalDiameterMm,
  roughnessMetres,
  actualLengthMetres,
  fittingsEquivalentLengthMetres,
  fittingsMethod = 'known',
  waterTemperatureC,
}) {
  const flow = positiveNumber(flowLitresPerMinute, 'Flow');
  const diameterMetres = positiveNumber(internalDiameterMm, 'Internal diameter') / 1000;
  const roughness = nonNegativeNumber(roughnessMetres, 'Pipe roughness');
  const effectiveLength = calculateEffectiveLengthMetres({
    actualLengthMetres,
    fittingsEquivalentLengthMetres,
    fittingsMethod,
  });
  const { densityKgPerM3, dynamicViscosityPaS } = interpolateWaterProperties(waterTemperatureC);
  const flowMetresCubedPerSecond = flow / 60000;
  const crossSectionalAreaMetresSquared = Math.PI * diameterMetres ** 2 / 4;
  const velocityMetresPerSecond = flowMetresCubedPerSecond / crossSectionalAreaMetresSquared;
  const reynoldsNumber = densityKgPerM3 * velocityMetresPerSecond * diameterMetres / dynamicViscosityPaS;
  const frictionFactor = waterFrictionFactor(reynoldsNumber, roughness, diameterMetres);
  const pressureLossPa = frictionFactor * (effectiveLength / diameterMetres)
    * densityKgPerM3 * velocityMetresPerSecond ** 2 / 2;
  return {
    effectiveLengthMetres: effectiveLength,
    velocityMetresPerSecond,
    reynoldsNumber,
    frictionFactor,
    pressureLossPa,
    pressureLossKpa: pressureLossPa / 1000,
    pumpHeadMetres: pressureLossPa / (densityKgPerM3 * GRAVITY_M_PER_S2),
  };
}

export function calculateHeatingFlowLitresPerMinute({ heatLoadKw, deltaTK }) {
  const load = positiveNumber(heatLoadKw, 'Heat load');
  const deltaT = positiveNumber(deltaTK, 'Temperature difference');
  return load * 60 / (WATER_SPECIFIC_HEAT_KJ_PER_KG_K * deltaT);
}

export function calculateGravityFedTapRoute({
  verticalHeadMetres,
  tapReferenceFlowLitresPerMinute,
  tapReferencePressureBar,
  waterTemperatureC,
  sections,
}) {
  const verticalHead = positiveNumber(verticalHeadMetres, 'Vertical head');
  const referenceFlow = positiveNumber(tapReferenceFlowLitresPerMinute, 'Tap reference flow');
  const referencePressurePa = positiveNumber(tapReferencePressureBar, 'Tap reference pressure') * 100000;
  if (!Array.isArray(sections) || sections.length === 0) throw new RangeError('At least one pipe section is required.');

  const { densityKgPerM3 } = interpolateWaterProperties(waterTemperatureC);
  const staticPressurePa = densityKgPerM3 * GRAVITY_M_PER_S2 * verticalHead;
  const frictionLossAt = (flowLitresPerMinute) => sections.reduce((total, section) => (
    total + calculateWaterSection({
      flowLitresPerMinute,
      internalDiameterMm: section.internalDiameterMm,
      roughnessMetres: section.roughnessMetres,
      actualLengthMetres: section.actualLengthMetres,
      fittingsEquivalentLengthMetres: section.fittingsEquivalentLengthMetres,
      fittingsMethod: section.fittingsMethod ?? 'known',
      waterTemperatureC,
    }).pressureLossPa
  ), 0);
  const tapLossAt = (flowLitresPerMinute) => referencePressurePa * (flowLitresPerMinute / referenceFlow) ** 2;
  const noPipeMaximumFlow = referenceFlow * Math.sqrt(staticPressurePa / referencePressurePa);
  let low = 0;
  let high = noPipeMaximumFlow;
  for (let iteration = 0; iteration < 80; iteration += 1) {
    const middle = (low + high) / 2;
    if (staticPressurePa - frictionLossAt(middle) - tapLossAt(middle) >= 0) low = middle;
    else high = middle;
  }
  const expectedFlowLitresPerMinute = low;
  const pipePressureLossPa = frictionLossAt(expectedFlowLitresPerMinute);
  const tapInletPressurePa = staticPressurePa - pipePressureLossPa;
  return {
    staticPressurePa,
    staticPressureBar: staticPressurePa / 100000,
    expectedFlowLitresPerMinute,
    pipePressureLossPa,
    pipePressureLossKpa: pipePressureLossPa / 1000,
    tapInletPressurePa,
    tapInletPressureBar: tapInletPressurePa / 100000,
  };
}
