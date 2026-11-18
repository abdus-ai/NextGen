# NextGen AI — System #13: Smart Error Recovery

**Version:** 1.0  
**Status:** Initial implementation module prepared; integration and runtime verification pending.

## Scope from the approved design

- Detect and classify model loading, CUDA/GPU, out-of-memory, API timeout, network, invalid argument, missing file, video generation, database, and publishing errors.
- Permit at most three automatic retries with delays of 5, 15, and 30 seconds.
- Do not retry unchanged invalid input or automatically retry publishing/payment actions.
- Preserve task checkpoints supplied by the caller.
- Prevent duplicate in-flight execution when the caller supplies the same idempotency key.
- Emit structured recovery events for logging and dashboard integration.
- Do not start paid API or paid resource usage automatically.

## Safety rules

1. Automatic retries are limited to transient network/timeout/database errors.
2. The caller must explicitly declare the operation idempotent.
3. Publishing, payment, non-idempotent, cancelled, and paid-resource-dependent work is not retried.
4. GPU/OOM/model/file/argument errors stop and return recovery guidance; they are not blindly retried.
5. Publishing failures require manual review to avoid duplicate posts.
6. The in-memory idempotency guard covers concurrent calls in one runtime only. Durable duplicate prevention requires a server-side unique key/transaction and is not claimed by this module.

## Files

- `smart-error-recovery.js`: dependency-free browser/CommonJS recovery primitives.
- `smart-error-recovery.test.js`: Node built-in assertion tests.

## Verification

Run `node smart-error-recovery.test.js` in a Node.js environment. This repository currently has no root package manifest or established test runner, so the test file is deliberately dependency-free.

## Remaining integration work

- Wire structured events to the existing authenticated server-side logging path.
- Add durable checkpoint and idempotency storage with owner-scoped authorization.
- Add a Control Room view for active/recovered/failed tasks.
- Integrate with the AI Router and Video Engine only through their verified task interfaces.
- Add failure simulation and integration tests before marking System #13 implemented or complete.

No GPU, paid API, paid billing, or production publishing action is required for this initial module.
