export const STATES = { IDLE: 'idle', LOADING: 'loading', READY: 'ready', ERROR: 'error' };
export const EVENTS = { LOAD_START: 'LOAD_START', LOAD_SUCCESS: 'LOAD_SUCCESS', LOAD_FAILURE: 'LOAD_FAILURE', RETRY: 'RETRY' };

const transitions = {
  idle:    { LOAD_START: 'loading' },
  loading: { LOAD_SUCCESS: 'ready', LOAD_FAILURE: 'error' },
  error:   { RETRY: 'loading' },
  ready:   {},
};

export function nextModelStatus(current, event) {
  return transitions[current]?.[event] ?? current;
}

export function formatProgress(progressEvent) {
  if (!progressEvent || progressEvent.status !== 'progress') {
    return { percent: 0, isIndeterminate: true, file: '' };
  }
  return {
    percent: Math.round(progressEvent.progress),
    isIndeterminate: false,
    file: progressEvent.file,
  };
}
