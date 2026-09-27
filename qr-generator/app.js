const content = document.getElementById('qr-content');
const correction = document.getElementById('error-correction');
const form = document.getElementById('qr-form');
const canvas = document.getElementById('qr-canvas');
const context = canvas.getContext('2d');
const error = document.getElementById('generator-error');
const status = document.getElementById('preview-status');
const download = document.getElementById('download-png');

let hasCode = false;
qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

function showError(message = '') {
  error.hidden = !message;
  error.textContent = message;
}

function drawQr(code) {
  const modules = code.getModuleCount();
  const quietZone = 4;
  const totalModules = modules + quietZone * 2;
  const scale = Math.max(1, Math.floor(1024 / totalModules));
  const size = totalModules * scale;

  canvas.width = size;
  canvas.height = size;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size, size);
  context.fillStyle = '#111111';

  for (let row = 0; row < modules; row += 1) {
    for (let column = 0; column < modules; column += 1) {
      if (code.isDark(row, column)) {
        context.fillRect((column + quietZone) * scale, (row + quietZone) * scale, scale, scale);
      }
    }
  }
}

function generate() {
  const value = content.value.trim();
  if (!value) {
    hasCode = false;
    download.disabled = true;
    showError('Enter a link or some text first.');
    status.textContent = 'Nothing to generate yet.';
    return;
  }

  try {
    const code = qrcode(0, correction.value);
    code.addData(value, 'Byte');
    code.make();
    drawQr(code);
    hasCode = true;
    download.disabled = false;
    showError();
    status.textContent = `QR code ready: ${code.getModuleCount()} by ${code.getModuleCount()} modules.`;
  } catch (cause) {
    hasCode = false;
    download.disabled = true;
    showError('That content is too long for this error-correction level. Shorten it or choose a lower level.');
    status.textContent = 'QR code could not be created.';
  }
}

function downloadPng() {
  if (!hasCode) return;
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = 'zayn-qr-code.png';
  link.click();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  generate();
});
content.addEventListener('input', () => {
  if (hasCode) generate();
});
correction.addEventListener('change', () => {
  if (content.value.trim()) generate();
});
download.addEventListener('click', downloadPng);
