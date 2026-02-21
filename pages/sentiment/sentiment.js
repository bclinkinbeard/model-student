import { createLoader } from '../../lib/model-loader.js';
import { nextModelStatus, formatProgress, STATES } from '../../lib/model-status.js';
import { formatSentimentResult, isInputValid } from './sentiment-logic.js';

const TASK = 'sentiment-analysis';
const MODEL = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';

const statusEl = document.getElementById('model-status');
const textInput = document.getElementById('text-input');
const runBtn = document.getElementById('run-btn');
const resultArea = document.getElementById('result-area');

let modelState = STATES.IDLE;
let classifierPipeline = null;

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
  runBtn.disabled = modelState !== STATES.READY || !isInputValid(textInput.value);
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
  const text = textInput.value.trim();
  if (!text || !classifierPipeline) return;

  runBtn.disabled = true;
  runBtn.innerHTML = '<span class="spinner"></span>';

  try {
    const result = await classifierPipeline(text);
    const viewModel = formatSentimentResult(result);
    resultArea.innerHTML = `
      <div class="result-area">
        <div class="sentiment-result">
          <div class="sentiment-label">
            <span class="sentiment-emoji">${viewModel.emoji}</span>
            <span class="sentiment-text" style="color: var(${viewModel.colorVar})">${viewModel.label}</span>
          </div>
          <div class="sentiment-confidence">
            <div class="confidence-bar-track">
              <div class="confidence-bar-fill" style="width: ${viewModel.barWidthPercent}%; background: var(${viewModel.colorVar})"></div>
            </div>
            <span class="confidence-percent">${viewModel.percentText}</span>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Inference failed:', err);
    resultArea.innerHTML = `
      <div class="result-area result-area--error">
        Something went wrong during analysis. Please try again.
      </div>
    `;
  } finally {
    runBtn.textContent = 'Analyze';
    updateButtonState();
  }
}

textInput.addEventListener('input', updateButtonState);
runBtn.addEventListener('click', runInference);

startLoadModel();
