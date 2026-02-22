// Sentiment analysis — DOM wiring layer
import { loadModel } from '../../lib/model-loader.js';
import { STATES, EVENTS, nextModelStatus, formatProgress } from '../../lib/model-status.js';
import { TASK, MODEL, formatSentimentResult, isInputValid } from './sentiment-logic.js';

const statusEl = document.getElementById('model-status');
const textInput = document.getElementById('text-input');
const runBtn = document.getElementById('run-btn');
const resultArea = document.getElementById('result-area');

let modelState = STATES.IDLE;
let classifier = null;
let inferring = false;

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
  runBtn.disabled = modelState !== STATES.READY || !isInputValid(textInput.value) || inferring;
}

function renderResult(viewModel) {
  resultArea.innerHTML = `
    <div class="result-area sentiment-result">
      <div class="sentiment-label" style="color: var(${viewModel.colorVar})">
        <span class="sentiment-emoji">${viewModel.emoji}</span>
        <span class="sentiment-label-text">${viewModel.label}</span>
      </div>
      <div class="sentiment-confidence">
        <div class="confidence-bar-track">
          <div class="confidence-bar-fill" style="width: ${viewModel.barWidthPercent}%; background: var(${viewModel.colorVar})"></div>
        </div>
        <span class="confidence-percent">${viewModel.percentText}</span>
      </div>
    </div>`;
}

// --- Model loading ---

function transition(event) {
  modelState = nextModelStatus(modelState, event);
  updateButtonState();
}

async function startModelLoad() {
  transition(EVENTS.LOAD_START);
  renderStatus(STATES.LOADING);

  const pipe = await loadModel(TASK, MODEL, {
    onProgress: (e) => {
      const p = formatProgress(e);
      const barClass = p.isIndeterminate ? 'progress-bar-fill progress-bar-fill--indeterminate' : 'progress-bar-fill';
      const width = p.isIndeterminate ? '' : `width: ${p.percent}%`;
      renderStatus(STATES.LOADING, `<div class="progress-bar-track"><div class="${barClass}" style="${width}"></div></div>`);
    },
  });

  if (pipe) {
    classifier = pipe;
    transition(EVENTS.LOAD_SUCCESS);
    renderStatus(STATES.READY);
  } else {
    transition(EVENTS.LOAD_FAILURE);
    renderStatus(STATES.ERROR);
  }
}

// --- Inference ---

async function runInference() {
  if (!classifier || !isInputValid(textInput.value)) return;

  inferring = true;
  updateButtonState();
  runBtn.innerHTML = `<span class="spinner"></span> Analyzing…`;

  try {
    const rawResult = await classifier(textInput.value);
    const viewModel = formatSentimentResult(rawResult);
    renderResult(viewModel);
  } catch (err) {
    resultArea.innerHTML = `<div class="result-area result-area--error">Analysis failed. Please try again.</div>`;
  } finally {
    inferring = false;
    runBtn.textContent = 'Analyze';
    updateButtonState();
    textInput.focus();
  }
}

// --- Event listeners ---

textInput.addEventListener('input', updateButtonState);
runBtn.addEventListener('click', (e) => {
  e.preventDefault();
  runInference();
});

// --- Init: eager model load ---
startModelLoad();
