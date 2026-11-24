const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadModule(filename) {
  const context = { exports: {}, require: name => loadModule(path.resolve(path.dirname(filename), `${name}.ts`)) };
  const source = fs.readFileSync(filename, 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  return context.exports;
}
const { allJobs } = loadModule(path.join(__dirname, '../src/features/jobs/model.ts'));

test('pending reference bid has five submitted trucks and preserves the assigned jobs', () => {
  const jobs = allJobs([], []);
  assert.equal(jobs.filter(job => job.status === 'Assigned').length, 3);
  const pending = jobs.find(job => job.id === 'LAQ-5400');
  assert.equal(pending.trucks, 5);
  assert.equal(pending.details.submittedTrucks.length, 5);
});

test('a new bid replaces the reference with the actual offer and selected trucks', () => {
  const jobs = allJobs([{ loadId: 'LAQ-5400', truckIds: ['truck-2'], offer: 270000, total: 270000, submittedAt: '2026-11-06T09:00:00Z' }], []);
  const matching = jobs.filter(job => job.id === 'LAQ-5400');
  assert.equal(matching.length, 1);
  assert.equal(matching[0].bid, 270000);
  assert.equal(matching[0].trucks, 1);
  assert.equal(matching[0].details.submittedTrucks[0].registration, 'VXY-498-W');
});

test('withdrawing a pending bid does not restore its reference fixture or remove assigned loads', () => {
  for (const bids of [[], [{ loadId: 'LAQ-5400', truckIds: ['truck-1'], offer: 300000, total: 300000 }]]) {
    const jobs = allJobs(bids, ['LAQ-5400']);
    assert.equal(jobs.some(job => job.id === 'LAQ-5400'), false);
    assert.equal(jobs.filter(job => job.status === 'Assigned').length, 3);
  }
});

const { createWithdrawal } = loadModule(path.join(__dirname, '../src/features/jobs/withdrawal.ts'));
test('withdrawal requires a valid reason and records the selected load and reason', () => {
  assert.throws(() => createWithdrawal('LAQ-5400', ''));
  assert.throws(() => createWithdrawal('LAQ-5400', 'invalid'));
  const record = createWithdrawal('LAQ-5400', 'Schedule conflict');
  assert.equal(record.loadId, 'LAQ-5400');
  assert.equal(record.reason, 'Schedule conflict');
  assert.ok(Number.isFinite(Date.parse(record.submittedAt)));
  assert.equal(allJobs([], [record.loadId]).some(job => job.id === record.loadId), false);
});

const { isValidDemoPickupCode } = loadModule(path.join(__dirname, '../src/features/jobs/pickup.ts'));
test('pickup demo verification rejects incomplete, incorrect and nonnumeric codes', () => {
  for (const code of ['', '12345', '1234567', '357333', 'abcdef', ' 123456']) assert.equal(isValidDemoPickupCode(code), false);
  assert.equal(isValidDemoPickupCode('123456'), true);
});

const { withdrawDemoEarnings } = loadModule(path.join(__dirname, '../src/features/jobs/earnings.ts'));
test('earnings withdrawals enforce balance limits and conserve the remaining balance', () => {
  assert.equal(withdrawDemoEarnings(90000, 30000), 60000);
  assert.equal(withdrawDemoEarnings(90000, 90000), 0);
  for (const amount of [0, -1, 0.5, NaN, Infinity, 300000]) assert.throws(() => withdrawDemoEarnings(90000, amount));
  assert.throws(() => withdrawDemoEarnings(0, 1));
});

test('in-transit demo loads match their cards and remain searchable by load ID', () => {
  const { filterJobs, initialJobFilters } = loadModule(path.join(__dirname, '../src/features/jobs/model.ts'));
  const jobs = allJobs([], []);
  const transit = jobs.filter(job => job.status === 'In Transit');
  assert.equal(transit.length, 5);
  assert.equal(new Set(jobs.map(job => job.id)).size, jobs.length);
  for (const job of transit) {
    assert.equal(job.trucks, job.details.submittedTrucks.length);
    assert.equal(job.bid, 180000);
    assert.equal(job.maximum, 250000);
  }
  assert.equal(filterJobs(jobs, 'In Transit', { ...initialJobFilters, query: 'LAQ-7103' }, 'Recommended').length, 1);
});

const { createChatMessage, MAX_ATTACHMENT_BYTES } = loadModule(path.join(__dirname, '../src/features/jobs/chatModel.ts'));
test('chat validates messages and files and records the sender and timestamp', () => {
  assert.throws(() => createChatMessage('carrier', '   '));
  assert.throws(() => createChatMessage('carrier', 'x'.repeat(2001)));
  const message = createChatMessage('shipper', ' Hello ');
  assert.equal(message.text, 'Hello');
  assert.equal(message.role, 'shipper');
  assert.ok(Number.isFinite(Date.parse(message.createdAt)));
  const file = { uri: 'file:///demo.pdf', name: 'demo.pdf', mime: 'application/pdf', size: 100 };
  assert.equal(createChatMessage('carrier', '', file).attachment.name, 'demo.pdf');
  assert.throws(() => createChatMessage('carrier', '', { ...file, size: MAX_ATTACHMENT_BYTES + 1 }));
});

const { createIncidentReport } = loadModule(path.join(__dirname, '../src/features/jobs/incidentModel.ts'));
test('incident reports require type, description, and an explicit delivery impact choice', () => {
  assert.throws(() => createIncidentReport('LAQ-7101', '', 'Broken axle', false, []));
  assert.throws(() => createIncidentReport('LAQ-7101', 'Vehicle breakdown', '  ', false, []));
  assert.throws(() => createIncidentReport('LAQ-7101', 'Vehicle breakdown', 'Broken axle', null, []));
  const report = createIncidentReport('LAQ-7101', 'Vehicle breakdown', ' Broken axle ', false, []);
  assert.equal(report.description, 'Broken axle');
  assert.equal(report.impactsDelivery, false);
  assert.equal(report.loadId, 'LAQ-7101');
  assert.equal(report.status, 'saved-locally');
});
test('incident attachments reject oversized files and preserve source attachments', () => {
  const file = { name: 'photo.jpg', uri: 'file:///photo.jpg', mime: 'image/jpeg', size: 1024 };
  assert.throws(() => createIncidentReport('LAQ-7101', 'Other', 'Issue', true, [{ ...file, size: 3 * 1024 * 1024 }]));
  assert.throws(() => createIncidentReport('LAQ-7101', 'Other', 'Issue', true, Array(6).fill(file)));
  const report = createIncidentReport('LAQ-7101', 'Other', 'Issue', true, [file]);
  report.attachments[0].uri = 'file:///saved.jpg';
  assert.equal(file.uri, 'file:///photo.jpg');
});

const { validateProofFiles, canContinueProof } = loadModule(path.join(__dirname, '../src/features/jobs/deliveryProof.ts'));
test('delivery proof requires two valid JPEG or PDF files, each up to 1 MB', () => {
  const image = { name: 'cargo.jpg', uri: 'file:///cargo.jpg', mime: 'image/jpeg', size: 100 };
  const pdf = { name: 'waybill.pdf', uri: 'file:///waybill.pdf', mime: 'application/pdf', size: 1024 * 1024 };
  assert.equal(canContinueProof([]), false);
  assert.equal(canContinueProof([image]), false);
  assert.equal(canContinueProof([image, pdf]), true);
  assert.throws(() => validateProofFiles([{ ...pdf, size: pdf.size + 1 }]));
  assert.throws(() => validateProofFiles([{ ...image, mime: 'text/plain' }]));
  assert.throws(() => validateProofFiles(Array(6).fill(image)));
});

const { validateDemoDeliveryCode } = loadModule(path.join(__dirname, '../src/features/jobs/deliveryProof.ts'));
test('delivery verification accepts only the demo code before expiry', () => {
  assert.doesNotThrow(() => validateDemoDeliveryCode('357333', 2000, 1000));
  for (const code of ['', '35733', '123456', 'abcdef']) assert.throws(() => validateDemoDeliveryCode(code, 2000, 1000));
  assert.throws(() => validateDemoDeliveryCode('357333', 2000, 2000));
  assert.throws(() => validateDemoDeliveryCode('357333', 2000, 3000));
});

test('completed jobs have matching vehicle details and completion overrides in-transit progress', () => {
  const { jobsWithProgress } = loadModule(path.join(__dirname, '../src/features/jobs/model.ts'));
  const jobs = allJobs([], []);
  assert.equal(jobs.filter(job => job.status === 'Completed').length, 5);
  const updated = jobsWithProgress(jobs, { 'LAQ-7101': { started: true, completedAt: '2026-11-23T10:00:00Z' } });
  const completed = updated.find(job => job.id === 'LAQ-7101');
  assert.equal(completed.status, 'Completed');
  assert.equal(completed.deliveredOn, 'Nov 23');
  assert.equal(updated.filter(job => job.status === 'Completed').length, 6);
  assert.equal(updated.filter(job => job.status === 'In Transit').length, 4);
  assert.equal(jobs.find(job => job.id === 'LAQ-7101').status, 'In Transit');
});
