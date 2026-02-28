// Image classification — DOM wiring layer
import { loadModel } from '../../lib/model-loader.js';
import { STATES, EVENTS, nextModelStatus, formatProgress } from '../../lib/model-status.js';
import { TASK, MODEL, formatClassificationResults, isValidImageFile } from './image-classify-logic.js';
import { debug } from '../../lib/debug-log.js';

const statusEl = document.getElementById('model-status');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const runBtn = document.getElementById('run-btn');
const resultArea = document.getElementById('result-area');

let modelState = STATES.IDLE;
let classifier = null;
let inferring = false;
let currentFile = null;

// Store default drop zone HTML for reset
const defaultDropZoneHTML = dropZone.innerHTML;

// --- State rendering ---

function renderStatus(state, progressHtml = '') {
  statusEl.className = `model-status model-status--${state}`;
  if (state === STATES.LOADING) {
    statusEl.innerHTML = `<span class="spinner"></span><span>Loading model…</span>${progressHtml}`;
  } else if (state === STATES.READY) {
    statusEl.innerHTML = `<span class="status-dot status-dot--ready"></span><span>Model ready</span>`;
  } else if (state === STATES.ERROR) {
    statusEl.innerHTML = `<span class="status-dot status-dot--error"></span><span>Failed to load model</span><button class="retry-btn" id="retry-btn">Retry</button>`;
    document.getElementById('retry-btn').addEventListener('click', startModelLoad);
  }
}

function updateButtonState() {
  runBtn.disabled = modelState !== STATES.READY || !currentFile || inferring;
}

function renderResults(viewModel) {
  const rows = viewModel.map(r => `
    <div class="classify-row" data-rank="${r.rank}" style="animation-delay: ${(r.rank - 1) * 80}ms">
      <span class="classify-rank">${r.rank}</span>
      <span class="classify-label">${r.label}</span>
      <div class="classify-bar-track">
        <div class="classify-bar-fill" style="width: 0%; background: var(${r.colorVar})" data-width="${r.barWidthPercent}"></div>
      </div>
      <span class="classify-percent">${r.percentText}</span>
    </div>
  `).join('');

  resultArea.innerHTML = `<div class="result-area classify-results">${rows}</div>`;

  // Animate bars after paint
  requestAnimationFrame(() => {
    resultArea.querySelectorAll('.classify-bar-fill').forEach(bar => {
      bar.style.width = bar.dataset.width + '%';
    });
  });
}

function showError(message) {
  // Remove existing error message
  const existing = document.getElementById('error-message');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.id = 'error-message';
  el.className = 'error-message';
  el.textContent = message;
  dropZone.parentElement.appendChild(el);
}

function clearError() {
  const existing = document.getElementById('error-message');
  if (existing) existing.remove();
}

// --- File handling ---

function showPreview(file) {
  const blobUrl = URL.createObjectURL(file);
  dropZone.innerHTML = `
    <img src="${blobUrl}" alt="Uploaded image preview" style="max-height: 300px; max-width: 100%; object-fit: contain;" />
    <button type="button" class="change-image-link" id="change-image">Change image</button>
  `;
  dropZone.classList.add('drop-zone--has-image');

  document.getElementById('change-image').addEventListener('click', (e) => {
    e.stopPropagation();
    resetDropZone();
    fileInput.click();
  });
}

function resetDropZone() {
  dropZone.innerHTML = defaultDropZoneHTML;
  dropZone.classList.remove('drop-zone--has-image');
  currentFile = null;
  resultArea.innerHTML = '';
  fileInput.value = '';
  updateButtonState();
  clearError();
}

function handleFile(file) {
  clearError();
  if (!isValidImageFile(file)) {
    debug(`Rejected file: ${file.name} (${file.type})`);
    showError('Please upload an image file (JPEG, PNG, etc.)');
    return;
  }
  debug(`Image selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
  currentFile = file;
  showPreview(file);
  updateButtonState();
}

// --- Model loading ---

function transition(event) {
  modelState = nextModelStatus(modelState, event);
  updateButtonState();
}

async function startModelLoad() {
  debug(`Loading model: ${TASK} / ${MODEL}`);
  transition(EVENTS.LOAD_START);
  renderStatus(STATES.LOADING);

  const pipe = await loadModel(TASK, MODEL, {
    onProgress: (e) => {
      const p = formatProgress(e);
      if (!p.isIndeterminate) debug(`Progress: ${p.percent}%`);
      const barClass = p.isIndeterminate ? 'progress-bar-fill progress-bar-fill--indeterminate' : 'progress-bar-fill';
      const width = p.isIndeterminate ? '' : `width: ${p.percent}%`;
      renderStatus(STATES.LOADING, `<div class="progress-bar-track"><div class="${barClass}" style="${width}"></div></div>`);
    },
  });

  if (pipe) {
    classifier = pipe;
    transition(EVENTS.LOAD_SUCCESS);
    renderStatus(STATES.READY);
    debug('Model loaded successfully');
  } else {
    transition(EVENTS.LOAD_FAILURE);
    renderStatus(STATES.ERROR);
    debug('Model failed to load');
  }
}

// --- Inference ---

async function runInference() {
  if (!classifier || !currentFile) return;

  debug(`Inference started — file: ${currentFile.name}`);
  inferring = true;
  updateButtonState();
  runBtn.innerHTML = `<span class="spinner"></span> Classifying…`;

  const blobUrl = URL.createObjectURL(currentFile);

  try {
    const rawResult = await classifier(blobUrl, { topk: 5 });
    const viewModel = formatClassificationResults(rawResult);
    debug(`Inference complete — top result: ${viewModel[0]?.label} (${viewModel[0]?.percentText})`);
    renderResults(viewModel);
  } catch (err) {
    debug(`Inference error: ${err.message}`);
    console.error('Inference failed:', err);
    resultArea.innerHTML = `<div class="result-area result-area--error">Classification failed. Please try again.</div>`;
  } finally {
    URL.revokeObjectURL(blobUrl);
    inferring = false;
    runBtn.textContent = 'Classify';
    updateButtonState();
  }
}

// --- Event listeners ---

// Click-to-upload
dropZone.addEventListener('click', () => {
  if (!dropZone.classList.contains('drop-zone--has-image')) {
    fileInput.click();
  }
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

// Drag-and-drop
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drop-zone--dragover');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drop-zone--dragover');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drop-zone--dragover');
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

// Classify button
runBtn.addEventListener('click', (e) => {
  e.preventDefault();
  runInference();
});

// --- Init: eager model load ---
startModelLoad();
