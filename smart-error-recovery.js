/* NextGen AI — Smart Error Recovery (System #13)
 * Dependency-free safety-first recovery primitives.
 * Browser global: window.NextGenSmartErrorRecovery
 * CommonJS: require('./smart-error-recovery.js')
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NextGenSmartErrorRecovery = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const RETRY_DELAYS_MS = Object.freeze([5000, 15000, 30000]);
  const RETRYABLE = new Set(['api_timeout', 'network_error', 'database_transient']);
  const CATEGORIES = Object.freeze({
    model_loading: 'Model loading error',
    gpu_resource: 'CUDA / GPU resource error',
    out_of_memory: 'Out of memory',
    api_timeout: 'API timeout',
    network_error: 'Network error',
    invalid_arguments: 'Invalid arguments',
    file_missing: 'File missing',
    video_generation: 'Video generation failure',
    database_transient: 'Transient database error',
    database_permanent: 'Database error',
    publishing: 'Publishing error',
    unknown: 'Unknown error'
  });

  function textOf(error) {
    if (typeof error === 'string') return error;
    if (!error || typeof error !== 'object') return String(error || '');
    return [error.message, error.details, error.hint, error.code, error.name]
      .filter(Boolean).join(' ');
  }

  function classifyError(error) {
    const message = textOf(error).toLowerCase();
    const code = String(error && error.code || '').toLowerCase();
    if (/publish|post to (youtube|facebook|instagram)|external_post/.test(message)) return 'publishing';
    if (/out of memory|cuda out of memory|oom|allocation failed/.test(message)) return 'out_of_memory';
    if (/cuda|gpu|cudnn|device-side assert|no kernel image/.test(message)) return 'gpu_resource';
    if (/model.*(load|not found)|checkpoint|weights.*(missing|not found)|safetensors/.test(message)) return 'model_loading';
    if (/invalid argument|unknown option|unrecognized argument|validation error|22023/.test(message)) return 'invalid_arguments';
    if (/no such file|file not found|enoent|storage.*not found/.test(message)) return 'file_missing';
    if (/timeout|timed out|etimedout|408|504/.test(message) || code === '57014') return 'api_timeout';
    if (/network|fetch failed|failed to fetch|econnreset|econnrefused|enotfound|offline/.test(message)) return 'network_error';
    if (/video.*(generation|render)|render.*failed|encoder.*failed/.test(message)) return 'video_generation';
    if (/40001|40p01|serialization failure|deadlock detected|temporarily unavailable|connection pool/.test(message)) return 'database_transient';
    if (/database|postgres|supabase|sqlstate|23505|23503|42501|permission denied/.test(message)) return 'database_permanent';
    return 'unknown';
  }

  function recoveryAdvice(category) {
    const advice = {
      model_loading: 'Pause the task; verify model path, file integrity, and configuration.',
      gpu_resource: 'Pause the task; verify GPU availability and device compatibility. Do not auto-provision paid resources.',
      out_of_memory: 'Pause first. Retry only with an explicitly approved lower-memory fallback.',
      api_timeout: 'Retry with bounded exponential backoff if the operation is safe and idempotent.',
      network_error: 'Wait for connectivity to recover, then retry only if the operation is safe and idempotent.',
      invalid_arguments: 'Stop and validate/correct the command parameters; do not retry unchanged input.',
      file_missing: 'Stop and verify the file path or restore the required file before continuing.',
      video_generation: 'Preserve logs/checkpoints; retry only after confirming the failed attempt produced no billable or duplicate output.',
      database_transient: 'Rollback the failed transaction, then retry only an idempotent transaction.',
      database_permanent: 'Stop and surface the database error for investigation.',
      publishing: 'Stop publishing retries and require manual review to prevent duplicate posts.',
      unknown: 'Stop automatic recovery and request user review.'
    };
    return advice[category] || advice.unknown;
  }

  function getRetryDelay(attemptNumber) {
    if (!Number.isInteger(attemptNumber) || attemptNumber < 1 || attemptNumber > RETRY_DELAYS_MS.length) {
      throw new RangeError('attemptNumber must be 1, 2, or 3');
    }
    return RETRY_DELAYS_MS[attemptNumber - 1];
  }

  function canRetry(category, context) {
    const ctx = context || {};
    if (!RETRYABLE.has(category)) return false;
    if (ctx.cancelled || ctx.paidResourceRequired || ctx.publishing || ctx.payment || ctx.nonIdempotent) return false;
    return ctx.idempotent === true;
  }

  function createRecoveryController(options) {
    const opts = options || {};
    const wait = typeof opts.wait === 'function'
      ? opts.wait
      : ms => new Promise(resolve => setTimeout(resolve, ms));
    const onEvent = typeof opts.onEvent === 'function' ? opts.onEvent : function () {};
    const maxRetries = Math.min(3, Math.max(0, Number.isInteger(opts.maxRetries) ? opts.maxRetries : 3));
    const inFlight = new Map();

    async function run(task, context) {
      if (typeof task !== 'function') throw new TypeError('task must be a function');
      const ctx = Object.assign({}, context || {});
      const key = ctx.idempotencyKey;
      if (key && inFlight.has(key)) return inFlight.get(key);

      const execute = async function () {
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
          if (ctx.cancelled) throw new Error('Recovery cancelled by user');
          try {
            const result = await task({ attempt, checkpoint: ctx.checkpoint || null });
            onEvent({ type: 'success', attempt, idempotencyKey: key || null });
            return result;
          } catch (error) {
            lastError = error;
            const category = classifyError(error);
            const retryAllowed = attempt < maxRetries && canRetry(category, ctx);
            onEvent({
              type: retryAllowed ? 'retry_scheduled' : 'stopped',
              category,
              attempt,
              nextDelayMs: retryAllowed ? getRetryDelay(attempt + 1) : null,
              message: recoveryAdvice(category),
              idempotencyKey: key || null
            });
            if (!retryAllowed) throw error;
            await wait(getRetryDelay(attempt + 1));
          }
        }
        throw lastError;
      };

      const promise = execute();
      if (key) inFlight.set(key, promise);
      try {
        return await promise;
      } finally {
        if (key && inFlight.get(key) === promise) inFlight.delete(key);
      }
    }

    return Object.freeze({ run, get maxRetries() { return maxRetries; } });
  }

  return Object.freeze({
    RETRY_DELAYS_MS,
    CATEGORIES,
    classifyError,
    recoveryAdvice,
    getRetryDelay,
    canRetry,
    createRecoveryController
  });
});
