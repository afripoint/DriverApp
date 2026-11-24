const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/features/marketplace/model.ts'), 'utf8');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
const { validateBid, createBid, marketplaceLoads, trucks } = context.exports;
const load = marketplaceLoads[0];

test('requires an available matching truck', () => {
  assert.match(validateBid(load, trucks, [], 300000), /Select at least/);
  assert.match(validateBid(load, trucks, ['truck-3'], 300000), /available matching/);
  assert.match(validateBid(load, trucks, ['missing'], 300000), /available matching/);
  const nonMatching = trucks.map(truck => ({ ...truck, matches: false }));
  assert.match(validateBid(load, nonMatching, ['truck-1'], 300000), /available matching/);
});

test('enforces both range boundaries while accepting the endpoints', () => {
  for (const amount of [249999, 320001, NaN, Infinity, 270000.5, 0]) {
    assert.match(validateBid(load, trucks, ['truck-1'], amount), /Bid must be within/);
  }
  for (const amount of [250000, 320000]) assert.equal(validateBid(load, trucks, ['truck-1'], amount), null);
});

test('rejects too many or duplicate truck IDs', () => {
  assert.match(validateBid(load, trucks, ['truck-1', 'truck-2'], 300000), /Select up to/);
  assert.match(validateBid({ ...load, requiredTrucks: 2 }, trucks, ['truck-1', 'truck-1'], 300000), /Select up to/);
});

test('calculates totals from the actual offer and number of trucks', () => {
  assert.equal(createBid(load, trucks, ['truck-2'], 270000).total, 270000);
  const bid = createBid({ ...load, requiredTrucks: 2 }, trucks, ['truck-1', 'truck-2'], 300000);
  assert.equal(bid.total, 600000);
  assert.equal(bid.offer, 300000);
  assert.equal(bid.truckIds.length, 2);
});

test('revalidates at confirmation and snapshots the selected trucks', () => {
  assert.throws(() => createBid(load, trucks, ['truck-1'], 320001), /Bid must be within/);
  const selected = ['truck-1'];
  const bid = createBid(load, trucks, selected, 300000);
  selected.length = 0;
  assert.equal(bid.truckIds.length, 1);
});
