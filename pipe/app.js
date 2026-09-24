import {
  calculateGasSection,
  calculateGravityFedTapRoute,
  calculateHeatingFlowLitresPerMinute,
  calculateWaterSection,
} from './src/calculations.js';

const MAX_SECTIONS = 4;
const $ = (id) => document.getElementById(id);

const PIPE_OPTIONS = {
  gas: [
    { value: 'copper-15', label: 'Copper 15 mm', internalDiameterMm: 13, efficiencyFactor: 0.95 },
    { value: 'copper-22', label: 'Copper 22 mm', internalDiameterMm: 19, efficiencyFactor: 0.95 },
    { value: 'copper-28', label: 'Copper 28 mm', internalDiameterMm: 25, efficiencyFactor: 0.95 },
    { value: 'copper-35', label: 'Copper 35 mm', internalDiameterMm: 32, efficiencyFactor: 0.95 },
    { value: 'steel-half', label: 'Steel R 1/2', internalDiameterMm: 15.8, efficiencyFactor: 0.86 },
    { value: 'steel-three-quarter', label: 'Steel R 3/4', internalDiameterMm: 21.3, efficiencyFactor: 0.86 },
    { value: 'steel-one', label: 'Steel R 1', internalDiameterMm: 26.9, efficiencyFactor: 0.86 },
  ],
  water: [
    { value: 'copper-15', label: 'Copper 15 mm', internalDiameterMm: 13, roughnessMetres: 0.0000015 },
    { value: 'copper-22', label: 'Copper 22 mm', internalDiameterMm: 19, roughnessMetres: 0.0000015 },
    { value: 'copper-28', label: 'Copper 28 mm', internalDiameterMm: 25, roughnessMetres: 0.0000015 },
    { value: 'pex-16', label: 'PEX 16 mm', internalDiameterMm: 12, roughnessMetres: 0.000007 },
    { value: 'pex-20', label: 'PEX 20 mm', internalDiameterMm: 16, roughnessMetres: 0.000007 },
    { value: 'mlcp-16', label: 'MLCP 16 mm', internalDiameterMm: 12, roughnessMetres: 0.000007 },
    { value: 'mlcp-20', label: 'MLCP 20 mm', internalDiameterMm: 16, roughnessMetres: 0.000007 },
  ],
};

let service = 'gas';
let sections = [createSection(1)];
const settings = {
  gasAllowanceMbar: 1,
  waterTemperatureC: 20,
  waterSupplyType: 'dynamic',
  waterAvailablePressureBar: 3,
  gravityVerticalHeadMetres: 3,
  gravityTapReferenceFlowLitresPerMinute: 7,
  gravityTapReferencePressureBar: 0.1,
  heatingDeltaTK: 20,
  heatingAvailableHeadMetres: 6,
};

function createSection(index) {
  return {
    name: `Section ${index}`,
    actualLengthMetres: 3,
    fittingsEquivalentLengthMetres: 0.5,
    gasDemandKw: 24,
    waterFlowLitresPerMinute: 10,
    heatingLoadKw: 12,
    heatingFittingsMethod: 'unknown-50-percent',
    pipeByService: { gas: 'copper-22', water: 'copper-22', heating: 'copper-22' },
  };
}

// All templates below are application-owned markup. State-derived text is escaped or
// formatted before insertion, and no remote content is rendered into this document.
function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]);
}

function format(value, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits, minimumFractionDigits: 0 }).format(value);
}

function pipeOptionsForCurrentService() {
  return PIPE_OPTIONS[service === 'gas' ? 'gas' : 'water'];
}

function currentPipe(section) {
  const value = section.pipeByService[service];
  return pipeOptionsForCurrentService().find((option) => option.value === value) ?? pipeOptionsForCurrentService()[1];
}

function demandField(section, index) {
  if (service === 'gas') {
    return `<label>Downstream net heat input (kW)
      <input data-section="${index}" data-field="gasDemandKw" type="number" min="0.1" step="0.1" value="${escapeHtml(section.gasDemandKw)}" inputmode="decimal">
    </label>`;
  }
  if (service === 'water') {
    if (settings.waterSupplyType === 'gravity-tank') {
      return '<p class="field-note">Flow is derived from the tank head, entered tap performance and route friction.</p>';
    }
    return `<label>Design flow for Section ${index + 1} (L/min)
      <input data-section="${index}" data-field="waterFlowLitresPerMinute" type="number" min="0.1" step="0.1" value="${escapeHtml(section.waterFlowLitresPerMinute)}" inputmode="decimal">
    </label>`;
  }
  return `<label>Downstream heat load for Section ${index + 1} (kW)
    <input data-section="${index}" data-field="heatingLoadKw" type="number" min="0.1" step="0.1" value="${escapeHtml(section.heatingLoadKw)}" inputmode="decimal">
  </label>`;
}

function fittingsField(section, index) {
  if (service !== 'heating') {
    return `<label>Fittings equivalent length (m)
      <input data-section="${index}" data-field="fittingsEquivalentLengthMetres" type="number" min="0" step="0.1" value="${escapeHtml(section.fittingsEquivalentLengthMetres)}" inputmode="decimal">
    </label>`;
  }
  const unknown = section.heatingFittingsMethod === 'unknown-50-percent';
  return `<label>Fittings method for Section ${index + 1}
    <select aria-label="Fittings method for Section ${index + 1}" data-section="${index}" data-field="heatingFittingsMethod">
      <option value="unknown-50-percent"${unknown ? ' selected' : ''}>Unknown fittings, add 50%</option>
      <option value="known"${unknown ? '' : ' selected'}>Known fittings, enter equivalent length</option>
    </select>
  </label>${unknown
    ? '<p class="field-note">Adds 50% of the actual developed length for pressure loss only. Velocity is unchanged.</p>'
    : `<label>Known fittings equivalent length (m)
      <input data-section="${index}" data-field="fittingsEquivalentLengthMetres" type="number" min="0" step="0.1" value="${escapeHtml(section.fittingsEquivalentLengthMetres)}" inputmode="decimal">
    </label>`}`;
}

function renderServiceFields() {
  if (service === 'gas') {
    $('service-fields').innerHTML = `<label>Route pressure-loss allowance (mbar)
      <input data-service-setting="gasAllowanceMbar" type="number" min="0.1" step="0.1" value="${escapeHtml(settings.gasAllowanceMbar)}" inputmode="decimal">
    </label>`;
    return;
  }
  if (service === 'water') {
    const gravity = settings.waterSupplyType === 'gravity-tank';
    $('service-fields').innerHTML = `<label>Water source
      <select aria-label="Water source" data-service-setting="waterSupplyType">
        <option value="dynamic"${gravity ? '' : ' selected'}>Stated dynamic inlet pressure</option>
        <option value="gravity-tank"${gravity ? ' selected' : ''}>Vented storage tank to one tap</option>
      </select>
    </label><label>Water temperature (°C)
      <input aria-label="Water temperature (°C)" data-service-setting="waterTemperatureC" type="number" min="10" max="80" step="1" value="${escapeHtml(settings.waterTemperatureC)}" inputmode="decimal">
    </label>${gravity
      ? `<label>Vertical drop from tank water surface to tap outlet (m)
          <input aria-label="Vertical drop from tank water surface to tap outlet (m)" data-service-setting="gravityVerticalHeadMetres" type="number" min="0.1" step="0.1" value="${escapeHtml(settings.gravityVerticalHeadMetres)}" inputmode="decimal">
        </label><label>Tap flow at reference pressure (L/min)
          <input aria-label="Tap flow at reference pressure (L/min)" data-service-setting="gravityTapReferenceFlowLitresPerMinute" type="number" min="0.1" step="0.1" value="${escapeHtml(settings.gravityTapReferenceFlowLitresPerMinute)}" inputmode="decimal">
        </label><label>Tap reference pressure (bar)
          <input aria-label="Tap reference pressure (bar)" data-service-setting="gravityTapReferencePressureBar" type="number" min="0.01" step="0.01" value="${escapeHtml(settings.gravityTapReferencePressureBar)}" inputmode="decimal">
        </label>`
      : `<label>Available dynamic pressure (bar)
          <input data-service-setting="waterAvailablePressureBar" type="number" min="0.1" step="0.1" value="${escapeHtml(settings.waterAvailablePressureBar)}" inputmode="decimal">
        </label>`}`;
    return;
  }
  $('service-fields').innerHTML = `<label>Heating design temperature difference (K)
    <input aria-label="Heating design temperature difference (K)" data-service-setting="heatingDeltaTK" type="number" min="1" step="1" value="${escapeHtml(settings.heatingDeltaTK)}" inputmode="decimal">
  </label><label>Available pump head (m)
    <input data-service-setting="heatingAvailableHeadMetres" type="number" min="0.1" step="0.1" value="${escapeHtml(settings.heatingAvailableHeadMetres)}" inputmode="decimal">
  </label>`;
}

function renderSections() {
  const options = pipeOptionsForCurrentService();
  $('sections').innerHTML = sections.map((section, index) => {
    const selectedPipe = currentPipe(section).value;
    return `<fieldset class="section-card">
      <legend>${escapeHtml(section.name)}</legend>
      <div class="section-grid">
        ${demandField(section, index)}
        <label>Pipe size and material
          <select aria-label="Pipe size for Section ${index + 1}" data-section="${index}" data-field="pipe">
            ${options.map((option) => `<option value="${option.value}"${option.value === selectedPipe ? ' selected' : ''}>${option.label}</option>`).join('')}
          </select>
        </label>
        <label>Actual length (m)
          <input data-section="${index}" data-field="actualLengthMetres" type="number" min="0" step="0.1" value="${escapeHtml(section.actualLengthMetres)}" inputmode="decimal">
        </label>
        ${fittingsField(section, index)}
        <button class="remove-section" data-remove-section="${index}" type="button" aria-label="Remove Section ${index + 1}"${sections.length === 1 ? ' disabled' : ''}>Remove</button>
      </div>
    </fieldset>`;
  }).join('');
  $('section-count').textContent = `${sections.length} section${sections.length === 1 ? '' : 's'}`;
  $('add-section').disabled = sections.length >= MAX_SECTIONS;
}

function renderMethodCopy() {
  if (service === 'gas') {
    $('method-copy').innerHTML = '<p>Natural-gas results use the low-pressure BS 6891 Annex A flow relationship for copper or steel pipe. Net appliance input is converted to gross gas flow, then rounded up to the next 0.25 m³/h design step before calculating pressure loss. It covers a single route downstream of a meter or ECV, not buried service pipework.</p><ul><li>Check each section’s downstream input for the route being assessed.</li><li>Use manufacturer data and the current applicable standard for final design.</li></ul>';
  } else if (service === 'water') {
    $('method-copy').innerHTML = settings.waterSupplyType === 'gravity-tank'
      ? '<p>Vented-tank results calculate static head from the vertical distance between the tank water surface and the tap outlet. Expected flow solves the stated tap performance curve together with Darcy-Weisbach route friction.</p><ul><li>At an open spout, the water itself discharges at atmospheric pressure. “Across tap” is the dynamic pressure available at the tap inlet.</li><li>Enter the exact tap manufacturer flow at its quoted pressure. This mode is for one outlet, not simultaneous draw-off elsewhere in the system.</li></ul>'
      : '<p>Domestic-water results use Darcy-Weisbach friction loss with an explicit equivalent-length allowance for fittings. The available pressure check includes pipe friction only, not elevation, outlet, valve, meter or appliance losses.</p><ul><li>Enter the design flow actually carried by each section.</li><li>Confirm required residual outlet pressure and any manufacturer-specific losses separately.</li></ul>';
  } else {
    $('method-copy').innerHTML = '<p>Heating flow is derived from the section heat load and the selected flow/return temperature difference. Pressure loss uses Darcy-Weisbach friction loss and reports the equivalent pump head for the route.</p><ul><li>For each section, choose known fittings and enter their equivalent length, or unknown fittings to add 50% to that section’s developed length. This allowance changes pressure loss and pump head, not velocity.</li><li>Use the downstream load carried by each section, not the whole system load after a branch. Add pump, valve, heat-emitter and heat-source losses separately.</li></ul>';
  }
}

function setRouteResult(html) {
  $('route-result').innerHTML = html;
}

function calculateGravityRoute() {
  return calculateGravityFedTapRoute({
    verticalHeadMetres: Number(settings.gravityVerticalHeadMetres),
    tapReferenceFlowLitresPerMinute: Number(settings.gravityTapReferenceFlowLitresPerMinute),
    tapReferencePressureBar: Number(settings.gravityTapReferencePressureBar),
    waterTemperatureC: Number(settings.waterTemperatureC),
    sections: sections.map((section) => {
      const pipe = currentPipe(section);
      return {
        internalDiameterMm: pipe.internalDiameterMm,
        roughnessMetres: pipe.roughnessMetres,
        actualLengthMetres: Number(section.actualLengthMetres),
        fittingsEquivalentLengthMetres: Number(section.fittingsEquivalentLengthMetres),
      };
    }),
  });
}

function renderCalculation() {
  try {
    const gravityRoute = service === 'water' && settings.waterSupplyType === 'gravity-tank'
      ? calculateGravityRoute()
      : null;
    const results = sections.map((section) => calculateSection(section, gravityRoute?.expectedFlowLitresPerMinute));
    const totalPressureLoss = results.reduce((total, result) => total + result.pressureLoss, 0);
    if (service === 'gas') {
      const allowance = Number(settings.gasAllowanceMbar);
      const remaining = allowance - totalPressureLoss;
      setRouteResult(`<span>Total route pressure loss</span><strong>${format(totalPressureLoss, 3)} mbar</strong><span class="${remaining >= 0 ? 'pass' : 'warning'}">${remaining >= 0 ? `${format(remaining, 3)} mbar remaining within allowance` : `${format(Math.abs(remaining), 3)} mbar above allowance`}</span>`);
    } else if (service === 'water' && gravityRoute) {
      setRouteResult(`<span>Static head at tap height: ${format(gravityRoute.staticPressureBar, 3)} bar</span><strong data-testid="gravity-expected-flow">Expected tap flow ${format(gravityRoute.expectedFlowLitresPerMinute, 1)} L/min</strong><span class="pass">${format(gravityRoute.pipePressureLossKpa, 2)} kPa pipe loss · ${format(gravityRoute.tapInletPressureBar, 3)} bar available across tap</span>`);
    } else if (service === 'water') {
      const availableKpa = Number(settings.waterAvailablePressureBar) * 100;
      const remaining = availableKpa - totalPressureLoss / 1000;
      setRouteResult(`<span>Total route pressure loss</span><strong>${format(totalPressureLoss / 1000, 2)} kPa</strong><span class="${remaining >= 0 ? 'pass' : 'warning'}">${remaining >= 0 ? `${format(remaining, 1)} kPa remaining from stated dynamic pressure` : `${format(Math.abs(remaining), 1)} kPa exceeds stated dynamic pressure`}</span>`);
    } else {
      const totalHead = results.reduce((total, result) => total + result.pumpHeadMetres, 0);
      const remaining = Number(settings.heatingAvailableHeadMetres) - totalHead;
      setRouteResult(`<span>Total route pressure loss</span><strong>${format(totalPressureLoss / 1000, 2)} kPa</strong><span class="${remaining >= 0 ? 'pass' : 'warning'}">Pump head required: ${format(totalHead, 2)} m · ${remaining >= 0 ? `${format(remaining, 2)} m available` : `${format(Math.abs(remaining), 2)} m above stated head`}</span>`);
    }
    $('section-results').innerHTML = results.map((result, index) => `<article class="section-result" data-testid="section-result-${index}"><strong>${escapeHtml(sections[index].name)}</strong>${result.description}</article>`).join('');
    showError();
  } catch (error) {
    $('section-results').innerHTML = '';
    setRouteResult('<span>Enter valid section values to calculate.</span>');
    showError(error instanceof Error ? error.message : 'Enter valid values to calculate.');
  }
}

function calculateSection(section, flowOverrideLitresPerMinute) {
  const pipe = currentPipe(section);
  if (service === 'gas') {
    const result = calculateGasSection({
      netHeatInputKw: Number(section.gasDemandKw),
      internalDiameterMm: pipe.internalDiameterMm,
      efficiencyFactor: pipe.efficiencyFactor,
      actualLengthMetres: Number(section.actualLengthMetres),
      fittingsEquivalentLengthMetres: Number(section.fittingsEquivalentLengthMetres),
    });
    const area = Math.PI * (pipe.internalDiameterMm / 1000) ** 2 / 4;
    const velocity = result.designFlowM3h / 3600 / area;
    return {
      pressureLoss: result.pressureLossMbar,
      description: `Design flow ${format(result.designFlowM3h, 2)} m³/h · ${format(velocity, 2)} m/s · effective length ${format(result.effectiveLengthMetres, 1)} m · ${format(result.pressureLossPerMetreMbar, 4)} mbar/m · loss ${format(result.pressureLossMbar, 3)} mbar`,
    };
  }
  const flowLitresPerMinute = flowOverrideLitresPerMinute ?? (service === 'water'
    ? Number(section.waterFlowLitresPerMinute)
    : calculateHeatingFlowLitresPerMinute({ heatLoadKw: Number(section.heatingLoadKw), deltaTK: Number(settings.heatingDeltaTK) }));
  const fittingsMethod = service === 'heating' ? section.heatingFittingsMethod : 'known';
  const result = calculateWaterSection({
    flowLitresPerMinute,
    internalDiameterMm: pipe.internalDiameterMm,
    roughnessMetres: pipe.roughnessMetres,
    actualLengthMetres: Number(section.actualLengthMetres),
    fittingsEquivalentLengthMetres: Number(section.fittingsEquivalentLengthMetres),
    fittingsMethod,
    waterTemperatureC: service === 'water' ? Number(settings.waterTemperatureC) : 60,
  });
  const fittingsDescription = fittingsMethod === 'unknown-50-percent' ? 'unknown fittings +50%' : 'known fittings';
  return {
    pressureLoss: result.pressureLossPa,
    pumpHeadMetres: result.pumpHeadMetres,
    description: `${format(flowLitresPerMinute, 2)} L/min · ${format(result.velocityMetresPerSecond, 2)} m/s · ${fittingsDescription} · effective length ${format(result.effectiveLengthMetres, 1)} m · ${format(result.pressureLossKpa, 2)} kPa · head ${format(result.pumpHeadMetres, 2)} m`,
  };
}

function showError(message = '') {
  const error = $('calculator-error');
  error.hidden = !message;
  error.textContent = message;
}

function render() {
  renderServiceFields();
  renderSections();
  renderMethodCopy();
  renderCalculation();
}

$('calculation-purpose').addEventListener('change', (event) => {
  service = event.target.value;
  render();
});

$('add-section').addEventListener('click', () => {
  if (sections.length >= MAX_SECTIONS) return;
  sections.push(createSection(sections.length + 1));
  render();
});

document.addEventListener('input', (event) => {
  const target = event.target;
  if (target.dataset.serviceSetting) {
    settings[target.dataset.serviceSetting] = target.value;
    renderCalculation();
    return;
  }
  if (target.dataset.section === undefined) return;
  const section = sections[Number(target.dataset.section)];
  if (target.dataset.field === 'pipe') {
    section.pipeByService[service] = target.value;
  } else {
    section[target.dataset.field] = target.value;
  }
  renderCalculation();
});

document.addEventListener('change', (event) => {
  const target = event.target;
  if (target.matches('select[data-service-setting]')) {
    settings[target.dataset.serviceSetting] = target.value;
    render();
    return;
  }
  if (!target.matches('select[data-section]')) return;
  const section = sections[Number(target.dataset.section)];
  if (target.dataset.field === 'pipe') section.pipeByService[service] = target.value;
  else section[target.dataset.field] = target.value;
  render();
});

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove-section]');
  if (!button || sections.length === 1) return;
  sections.splice(Number(button.dataset.removeSection), 1);
  sections.forEach((section, index) => { section.name = `Section ${index + 1}`; });
  render();
});

render();
