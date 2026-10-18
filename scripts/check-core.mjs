// Same-release analytical regression and machine-brief parity. No DOM, network or source writes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { ROOT } from './serve.mjs';
import * as core from '../js/core.js';
import { BASEMAPS, validDisplay } from '../js/basemaps.js';

const readJSON = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const contract = readJSON('contracts/product-contract.json');
const fixture = readJSON('scripts/fixtures/model-baseline.json');
for (const key of ['meta', 'areas', 'supply', 'plan', 'vehicles', 'cars']) core.D[key] = readJSON(`data/${key}.json`);
let passed = 0, failed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log(`PASS  [core] ${name}`); }
  catch (error) { failed++; console.error(`FAIL  [core] ${name}: ${error.message}`); }
}
const tiers = core.computeTiers(core.DEFAULT_CRITERIA);
const queue = core.computeQueue(core.DEFAULT_LENSES, tiers);
const members = t => [...t.res].filter(([, v]) => v.tier).map(([id]) => id).sort();

check('data release and exact input bytes match the approved unchanged snapshot', () => {
  assert.equal(core.DATA_RELEASE, contract.release.dataRelease);
  assert.equal(core.D.meta.release.id, core.DATA_RELEASE);
  assert.equal(fixture.dataRelease, core.DATA_RELEASE);
  for (const [file, expected] of Object.entries(contract.release.inputIdentity)) {
    const bytes = fs.readFileSync(path.join(ROOT, file));
    assert.equal(bytes.length, expected.bytes, file);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), expected.sha256, file);
  }
});
check('runtime metric meaning and grain agree with the machine-readable brief', () => {
  const fields = ['id', 'group', 'label', 'unit', 'family', 'measure', 'grains'];
  const project = rows => rows.map(row => Object.fromEntries(fields.map(key => [key, row[key]])));
  assert.deepEqual(project(core.METRICS), project(contract.data.metrics));
  assert.deepEqual(core.VIEWS, contract.stateAndActions.views);
  assert.deepEqual(core.THRESHOLDS, contract.decisionModel.demand.allowedPercentiles);
  assert.deepEqual(core.DEFAULT_CRITERIA, contract.decisionModel.demand.defaultConditions);
  assert.deepEqual(core.LENSES.map(lens => lens.id), contract.decisionModel.opportunity.lensIds);
  assert.deepEqual(core.DEFAULT_LENSES, contract.decisionModel.opportunity.defaultLenses);
});
check('same-release Demand memberships and tiers remain exactly the baseline (9/15/12)', () => {
  assert.deepEqual(Object.fromEntries([...tiers.res].map(([id, row]) => [id, row.tier])), fixture.tiers);
  for (const tier of [1, 2, 3]) assert.equal([...tiers.res.values()].filter(v => v.tier === tier).length, fixture.tierCounts[tier]);
  assert.equal([...tiers.res.values()].filter(v => v.tier === null).length, fixture.tierCounts.outsideDemand);
});
check('same-release opportunity evidence states remain exactly the baseline (28/8/0)', () => {
  assert.deepEqual(Object.fromEntries(queue.map(row => [row.u.code, row.status])), fixture.queue);
  for (const status of ['candidate', 'evidence', 'none']) assert.equal(queue.filter(row => row.status === status).length, fixture.queueCounts[status]);
});
check('every selection of up to three lenses preserves the complete Demand membership and tier', () => {
  const ids = core.LENSES.map(lens => lens.id), selections = [[]];
  function choose(start, picked) { if (picked.length) selections.push(picked); if (picked.length === 3) return; for (let i = start; i < ids.length; i++) choose(i + 1, [...picked, ids[i]]); }
  choose(0, []);
  const wanted = members(tiers);
  for (const selection of selections) {
    const rows = core.computeQueue(selection, tiers);
    assert.deepEqual(rows.map(row => row.u.code).sort(), wanted, selection.join(','));
    assert.ok(rows.every(row => row.tier === fixture.tiers[row.u.code]));
  }
});
check('disabling criteria yields no Demand or queue; lenses cannot promote unknown eligibility', () => {
  const none = core.computeTiers(core.DEFAULT_CRITERIA.map(c => ({ ...c, on: false })));
  assert.equal(members(none).length, 0);
  assert.equal(core.computeQueue(core.DEFAULT_LENSES, none).length, 0);
});
check('zero and missing values cannot pass a positive Demand criterion', () => {
  const old = core.D.areas.tambon;
  try {
    core.D.areas.tambon = [{ code: 'zero', buildings: 0 }, { code: 'missing', buildings: null }, { code: 'a', buildings: 10 }, { code: 'b', buildings: 20 }];
    const got = core.computeTiers([{ metric: 'buildings', p: 50, on: true }]);
    assert.equal(got.res.get('zero').tier, null); assert.equal(got.res.get('missing').tier, null);
    assert.equal(got.res.get('a').tier, 1); assert.equal(got.res.get('b').tier, 1);
  } finally { core.D.areas.tambon = old; }
});
check('LUT ranking keeps tied midranks, measured zero and exceptional states distinct', () => {
  const rows = [{ key: 'zero', value: 0, state: 'measured_zero' }, { key: 'a', value: 10, state: 'measured' }, { key: 'b', value: 10, state: 'measured' }, { key: 'max', value: 30, state: 'measured' }, ...['no_data', 'suppressed', 'not_yet', 'out_of_scope', 'unverified'].map(state => ({ key: state, value: null, state }))];
  const ranks = core.percentileLut(rows);
  assert.equal(ranks.get('zero').idx, 0); assert.equal(ranks.get('a').idx, 20); assert.equal(ranks.get('b').idx, 20); assert.equal(ranks.get('max').idx, 40);
  for (const row of rows.slice(4)) assert.deepEqual(ranks.get(row.key), { state: row.state, idx: null, p: null });
  assert.equal(core.quantileValue([null, 0, 10, 20], .6), 12);
  assert.equal(core.quantileValue([null], .6), null);
});
check('invalid URL fields recover to known values and retain the three-choice caps', () => {
  core.D.tambonBy = new Map(core.D.areas.tambon.map(u => [u.code, u]));
  core.D.laoBy = new Map(core.D.areas.lao.map(u => [u.code, u]));
  core.D.districtBy = new Map(core.D.areas.district.map(u => [u.code, u]));
  const oldLocation = globalThis.location;
  try {
    globalThis.location = { search: '?v=invalid&lvl=bad&d=0000&a=xxx&b=invalid&m=unknown&lens=roof,ev,pump,safety,efficiency&c=buildings>=P99|elec_total>=P60|fuel_diesel>=P60|veh_total>=P50|pop>=P40' };
    core.readURL(); assert.equal(core.S.view, 'overview'); assert.equal(core.S.area, null); assert.equal(core.S.district, null); assert.equal(core.S.building, null);
    assert.equal(core.S.metric, 'elec_total'); assert.equal(core.S.criteria.length, 3); assert.ok(core.S.criteria.every(c => core.THRESHOLDS.includes(c.p))); assert.equal(core.S.lenses.length, 3);
  } finally { if (oldLocation === undefined) delete globalThis.location; else globalThis.location = oldLocation; }
});
check('basemap display settings validate independently and default to no external requests', () => {
  assert.deepEqual(Object.keys(BASEMAPS), ['analysis', 'simplified', 'detailed', 'satellite']);
  assert.equal(BASEMAPS.analysis.external, false);
  assert.deepEqual(validDisplay({ basemap: 'bad', areaColours: false }), { basemap: 'analysis', areaColours: false });
  assert.deepEqual(validDisplay(null), { basemap: 'analysis', areaColours: true });
});
check('production and coordinate publication are not claimed by the static runtime contract', () => {
  assert.equal(contract.currentArchitecture.backend, false);
  assert.equal(contract.currentArchitecture.authentication, false);
  assert.equal(contract.currentArchitecture.serverRbac, false);
  assert.equal(contract.capabilities.siteCoordinates, 'withheld_not_cleared');
  assert.equal(contract.capabilities.masterSheetWrite, 'not_authorized_for_this_release');
});

console.log(`\n${passed} core checks passed · ${failed} failed`);
process.exitCode = failed ? 1 : 0;
