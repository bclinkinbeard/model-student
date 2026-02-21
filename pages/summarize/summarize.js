import { createLoader } from '../../lib/model-loader.js';
import { nextModelStatus, formatProgress, STATES } from '../../lib/model-status.js';
import { FALLBACK_MODELS, loadWithFallback, computeSummaryStats, isTooShort } from './summarize-logic.js';

const TASK = 'summarization';

const statusEl = document.getElementById('model-status');
const textInput = document.getElementById('text-input');
const runBtn = document.getElementById('run-btn');
const resultArea = document.getElementById('result-area');
const shortTextWarning = document.getElementById('short-text-warning');

let modelState = STATES.IDLE;
let summarizerPipeline = null;

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
  const text = textInput.value.trim();
  runBtn.disabled = modelState !== STATES.READY || text.length === 0;

  if (text.length > 0 && isTooShort(text)) {
    shortTextWarning.innerHTML = `<p class="input-warning">Text may be too short for meaningful summarization</p>`;
  } else {
    shortTextWarning.innerHTML = '';
  }
}

async function startLoadModel() {
  updateStatus('LOAD_START');
  const result = await loadWithFallback(loadModel, TASK, FALLBACK_MODELS, {
    onProgress: (e) => {
      if (modelState === STATES.LOADING) renderStatus(e);
    },
  });
  if (result) {
    summarizerPipeline = result.pipeline;
    updateStatus('LOAD_SUCCESS');
  } else {
    updateStatus('LOAD_FAILURE');
  }
}

async function runInference() {
  const text = textInput.value.trim();
  if (!text || !summarizerPipeline) return;

  runBtn.disabled = true;
  runBtn.innerHTML = '<span class="spinner"></span>';

  try {
    const result = await summarizerPipeline(text, { max_new_tokens: 150 });
    const summaryText = result[0].summary_text;
    const stats = computeSummaryStats(text, summaryText);

    resultArea.innerHTML = `
      <div class="result-area">
        <p class="section-label">Summary</p>
        <blockquote class="summary-blockquote">${summaryText}</blockquote>
        <div class="summary-stats">
          <div>Original: ${stats.originalWords} words → Summary: ${stats.summaryWords} words</div>
          <div>Compression: <span class="summary-stats-compression">${stats.compressionPercent}%</span></div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Inference failed:', err);
    resultArea.innerHTML = `
      <div class="result-area result-area--error">
        Something went wrong during summarization. Please try again.
      </div>
    `;
  } finally {
    runBtn.textContent = 'Summarize';
    updateButtonState();
  }
}

textInput.addEventListener('input', updateButtonState);
runBtn.addEventListener('click', runInference);

startLoadModel();
