/* Run with: node smart-error-recovery.test.js */
'use strict';
const assert = require('node:assert/strict');
const recovery = require('./smart-error-recovery.js');

assert.equal(recovery.classifyError(new Error('CUDA out of memory')), 'out_of_memory');
assert.equal(recovery.classifyError(new Error('fetch failed: network offline')), 'network_error');
assert.equal(recovery.classifyError(new Error('HTTP 504 timeout')), 'api_timeout');
assert.equal(recovery.classifyError(new Error('invalid argument --p')), 'invalid_arguments');
assert.equal(recovery.classifyError(new Error('publishing failed')), 'publishing');
assert.equal(recovery.getRetryDelay(1), 5000);
assert.equal(recovery.getRetryDelay(2), 15000);
assert.equal(recovery.getRetryDelay(3), 30000);
assert.equal(recovery.canRetry('network_error', { idempotent: true }), true);
assert.equal(recovery.canRetry('network_error', { idempotent: false }), false);
assert.equal(recovery.canRetry('network_error', { idempotent: true, paidResourceRequired: true }), false);
assert.equal(recovery.canRetry('publishing', { idempotent: true }), false);

(async function () {
  let calls = 0;
  const events = [];
  const controller = recovery.createRecoveryController({
    wait: async () => {},
    onEvent: event => events.push(event)
  });
  const result = await controller.run(async () => {
    calls += 1;
    if (calls < 3) throw new Error('temporary network error');
    return 'recovered';
  }, { idempotent: true, idempotencyKey: 'unit-test-task-1' });
  assert.equal(result, 'recovered');
  assert.equal(calls, 3);
  assert.equal(events.filter(e => e.type === 'retry_scheduled').length, 2);

  let unsafeCalls = 0;
  await assert.rejects(
    controller.run(async () => { unsafeCalls += 1; throw new Error('publishing failed'); },
      { idempotent: true, publishing: true }),
    /publishing failed/
  );
  assert.equal(unsafeCalls, 1);
  console.log('Smart Error Recovery tests passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
