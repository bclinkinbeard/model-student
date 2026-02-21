import { createLoader } from '../../lib/model-loader.js';
import { nextModelStatus, formatProgress, STATES } from '../../lib/model-status.js';
import { formatClassificationResults, isValidImageFile } from './image-classify-logic.js';

const TASK = 'image-classification';
const MODEL = 'Xenova/vit-base-patch16-224';

const statusEl = document.getElementById('model-status');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const runBtn = document.getElementById('run-btn');
const resultArea = document.getElementById('result-area');

let modelState = STATES.IDLE;
let classifierPipeline = null;
let currentBlobUrl = null;

const loadModel = createLoader();

function updateStatus(event, progressEvent) {
  modelState = nextModelStatus(modelState, event);
  renderStatus(progressEvent);
  updateButtonState();
}

function renderStatus(progressEvent) {
  statusEl.className = 'model-status';

  if (modelState === STATES.LOADING) {
    const progress = formatProgress(progressEvent);
    statusEl.classList.add('model-status--loading');
    statusEl.innerHTML = `
      <span class="spinner"></span>
      <span>Loading model...</span>
      <div class="progress-bar-track">
        <div class="progress-bar-fill ${progress.isIndeterminate ? 'progress-bar-fill--indeterminate' : ''}"
             style="width: ${progress.isIndeterminate ? '' : progress.percent + '%'}"></div>
      </div>
    `;
  } else if (modelState === STATES.READY) {
    statusEl.classList.add('model-status--ready');
    statusEl.innerHTML = `<span class="model-status-dot"></span><span>Model ready</span>`;
  } else if (modelState === STATES.ERROR) {
    statusEl.classList.add('model-status--error');
    statusEl.innerHTML = `
      <span class="model-status-dot"></span>
      <span>Failed to load model</span>
      <button class="retry-btn" id="retry-btn">Retry</button>
    `;
    document.getElementById('retry-btn').addEventListener('click', startLoadModel);
  }
}

function updateButtonState() {
  runBtn.disabled = modelState !== STATES.READY || !currentBlobUrl;
}

function handleFile(file) {
  if (!isValidImageFile(file)) {
    resultArea.innerHTML = `
      <div class="result-area result-area--error">
        Please upload an image file (JPEG, PNG, etc.)
      </div>
    `;
    return;
  }

  resultArea.innerHTML = '';

  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
  }
  currentBlobUrl = URL.createObjectURL(file);

  dropZone.classList.add('drop-zone--has-image');
  dropZone.innerHTML = `
    <img class="drop-zone-preview" src="${currentBlobUrl}" alt="Uploaded image preview" />
    <button class="drop-zone-change" type="button">Change image</button>
  `;

  dropZone.querySelector('.drop-zone-change').addEventListener('click', (e) => {
    e.stopPropagation();
    resetDropZone();
    fileInput.click();
  });

  updateButtonState();
}

function resetDropZone() {
  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl);
    currentBlobUrl = null;
  }
  resultArea.innerHTML = '';
  dropZone.classList.remove('drop-zone--has-image');
  dropZone.innerHTML = `
    <svg class="drop-zone-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
    <span class="drop-zone-text">Drop an image here or click to upload</span>
    <span class="drop-zone-subtitle">PNG, JPG, WebP</span>
  `;
  updateButtonState();
}

async function startLoadModel() {
  updateStatus('LOAD_START');
  classifierPipeline = await loadModel(TASK, MODEL, {
    onProgress: (e) => {
      if (modelState === STATES.LOADING) renderStatus(e);
    },
  });
  if (classifierPipeline) {
    updateStatus('LOAD_SUCCESS');
  } else {
    updateStatus('LOAD_FAILURE');
  }
}

async function runInference() {
  if (!currentBlobUrl || !classifierPipeline) return;

  runBtn.disabled = true;
  runBtn.innerHTML = '<span class="spinner"></span>';

  try {
    const result = await classifierPipeline(currentBlobUrl, { topk: 5 });
    const viewModel = formatClassificationResults(result);

    resultArea.innerHTML = `
      <div class="result-area">
        <div class="classification-results">
          ${viewModel.map((item, i) => `
            <div class="classification-row" data-rank="${item.rank}" style="animation-delay: ${i * 80}ms">
              <span class="classification-rank">${item.rank}</span>
              <span class="classification-label">${item.label}</span>
              <div class="classification-bar-track">
                <div class="classification-bar-fill" style="width: ${item.barWidthPercent}%; background: var(${item.colorVar})"></div>
              </div>
              <span class="classification-percent">${item.percentText}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Inference failed:', err);
    resultArea.innerHTML = `
      <div class="result-area result-area--error">
        Something went wrong during classification. Please try again.
      </div>
    `;
  } finally {
    runBtn.textContent = 'Classify';
    updateButtonState();
  }
}

// Event listeners
dropZone.addEventListener('click', () => {
  if (!dropZone.classList.contains('drop-zone--has-image')) {
    fileInput.click();
  }
});

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

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (file) handleFile(file);
});

runBtn.addEventListener('click', runInference);

startLoadModel();
