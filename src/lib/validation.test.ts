import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BLOOD_GROUPS,
  DB_BLOOD_GROUP,
  parseDonorInput,
  parseDonorQuery,
  parseGrantInput,
  parseRequestQuery,
  parseRespondInput,
  parseRoleInput,
  parseSosInput,
  parseDonorUpdateInput,
  parseFraudStatusInput,
  parseStatusInput,
  parseStockInput,
} from './validation.ts';

const donor = { name: 'Tanvir Ahmed', phone: '017-5249 4315', bloodGroup: 'O+', area: 'Dhanmondi 27' };
const sos = { bloodGroup: 'AB+', bags: 1, place: 'Chander Hashi Hospital', phones: ['01752494315'], postText: 'post' };

test('every blood group has a database value', () => {
  assert.equal(BLOOD_GROUPS.length, 8);
  for (const group of BLOOD_GROUPS) assert.match(DB_BLOOD_GROUP[group], /^(A|B|AB|O)_(POS|NEG)$/);
});

test('accepts a minimal donor and fills defaults', () => {
  const result = parseDonorInput(donor);
  assert.equal(result.error, null);
  if (!result.error) {
    assert.equal(result.value.name, 'Tanvir Ahmed');
    assert.equal(result.value.phone, '01752494315');
    assert.equal(result.value.isAvailable, true);
  }
});

test('trims donor text and keeps valid optional fields', () => {
  const result = parseDonorInput({ ...donor, name: '  Tanvir  ', age: 24, gender: 'Male', weightKg: 65, lastDonationMonths: 4, email: 'a@b.co', isAvailable: false });
  assert.equal(result.error, null);
  if (!result.error) {
    assert.equal(result.value.name, 'Tanvir');
    assert.equal(result.value.age, 24);
    assert.equal(result.value.isAvailable, false);
  }
});

test('rejects bad donor input with the failing field name', () => {
  const bad = (patch: object) => {
    const result = parseDonorInput({ ...donor, ...patch });
    return result.error ?? 'ok';
  };
  assert.equal(bad({ name: 'A' }), 'name');
  assert.equal(bad({ name: 'x'.repeat(81) }), 'name');
  assert.equal(bad({ name: 42 }), 'name');
  assert.equal(bad({ phone: '12345' }), 'phone');
  assert.equal(bad({ bloodGroup: 'C+' }), 'bloodGroup');
  assert.equal(bad({ area: '' }), 'area');
  assert.equal(bad({ age: 12 }), 'age');
  assert.equal(bad({ age: 24.5 }), 'age');
  assert.equal(bad({ gender: 'Robot' }), 'gender');
  assert.equal(bad({ email: 'not-an-email' }), 'email');
  assert.equal(bad({ weightKg: 5 }), 'weightKg');
  assert.equal(bad({ lastDonationMonths: -1 }), 'lastDonationMonths');
  assert.equal(bad({ isAvailable: 'yes' }), 'isAvailable');
});

test('rejects non-object donor input', () => {
  for (const raw of [null, undefined, 'x', 42, [], true]) assert.notEqual(parseDonorInput(raw).error, null);
});

test('accepts a minimal SOS and fills defaults', () => {
  const result = parseSosInput(sos);
  assert.equal(result.error, null);
  if (!result.error) {
    assert.deepEqual(result.value.phones, ['01752494315']);
    assert.equal(result.value.isCritical, true);
    assert.equal(result.value.language, 'bn');
    assert.equal(result.value.bags, 1);
  }
});

test('normalises SOS phones and keeps two at most', () => {
  const two = parseSosInput({ ...sos, phones: ['017-5249 4315', '+8801316151118'] });
  assert.equal(two.error, null);
  if (!two.error) assert.deepEqual(two.value.phones, ['01752494315', '+8801316151118']);
  assert.notEqual(parseSosInput({ ...sos, phones: ['01752494315', '01316151118', '01912345678'] }).error, null);
});

test('rejects bad SOS input with the failing field name', () => {
  const bad = (patch: object) => {
    const result = parseSosInput({ ...sos, ...patch });
    return result.error ?? 'ok';
  };
  assert.equal(bad({ bloodGroup: 'Z' }), 'bloodGroup');
  assert.equal(bad({ bags: 0 }), 'bags');
  assert.equal(bad({ bags: 9 }), 'bags');
  assert.equal(bad({ bags: 1.5 }), 'bags');
  assert.equal(bad({ bags: '2' }), 'bags');
  assert.equal(bad({ place: ' ' }), 'place');
  assert.equal(bad({ phones: [] }), 'phones');
  assert.equal(bad({ phones: 'x' }), 'phones');
  assert.equal(bad({ phones: ['nope'] }), 'phones');
  assert.equal(bad({ postText: '' }), 'postText');
  assert.equal(bad({ postText: 'x'.repeat(1001) }), 'postText');
  assert.equal(bad({ language: 'fr' }), 'language');
  assert.equal(bad({ isCritical: 'yes' }), 'isCritical');
  assert.equal(bad({ area: 'x'.repeat(121) }), 'area');
});

const HOSPITALS = ['ORG-01', 'ORG-02'];

test('accepts a grant, lower-cases the email and keeps an optional known hospital', () => {
  const plain = parseGrantInput({ email: '  Boss@Example.COM ', roleId: 'r-admin' }, HOSPITALS);
  assert.equal(plain.error, null);
  if (!plain.error) assert.deepEqual(plain.value, { email: 'boss@example.com', roleId: 'r-admin', hospitalId: null });
  const withHospital = parseGrantInput({ email: 'staff@dmch.gov.bd', roleId: 'r1', hospitalId: 'ORG-02' }, HOSPITALS);
  assert.equal(withHospital.error, null);
  if (!withHospital.error) assert.deepEqual(withHospital.value, { email: 'staff@dmch.gov.bd', roleId: 'r1', hospitalId: 'ORG-02' });
  assert.equal(parseGrantInput({ email: 'a@b.co', roleId: 'r1', hospitalId: null }, HOSPITALS).error, null);
  assert.equal(parseGrantInput({ email: 'a@b.co', roleId: 'r1', hospitalId: '' }, HOSPITALS).error, null);
});

test('rejects bad grants with the failing field name', () => {
  const bad = (patch: object) => parseGrantInput({ email: 'a@b.co', roleId: 'r1', ...patch }, HOSPITALS).error ?? 'ok';
  assert.equal(bad({ email: 'nope' }), 'email');
  assert.equal(bad({ email: 'a@b.co ' + 'x'.repeat(260) }), 'email');
  assert.equal(bad({ email: 42 }), 'email');
  assert.equal(bad({ roleId: '' }), 'roleId');
  assert.equal(bad({ roleId: '   ' }), 'roleId');
  assert.equal(bad({ roleId: 7 }), 'roleId');
  assert.equal(bad({ roleId: undefined }), 'roleId');
  assert.equal(bad({ roleId: 'x'.repeat(65) }), 'roleId');
  assert.equal(bad({ hospitalId: 'ORG-99' }), 'hospitalId');
  assert.equal(bad({ hospitalId: 7 }), 'hospitalId');
  assert.notEqual(parseGrantInput(null, HOSPITALS).error, null);
  assert.notEqual(parseGrantInput('x', HOSPITALS).error, null);
});

test('accepts a role and cleans it up', () => {
  const result = parseRoleInput({ name: '  Fraud reviewer ', description: ' checks reports ', permissions: ['panel.fraud', 'panel.logs'] });
  assert.equal(result.error, null);
  if (!result.error) {
    assert.deepEqual(result.value, { name: 'Fraud reviewer', description: 'checks reports', permissions: ['panel.open', 'panel.fraud', 'panel.logs'] });
  }
  const noDescription = parseRoleInput({ name: 'Bank', permissions: ['stock.all'] });
  assert.equal(noDescription.error, null);
  if (!noDescription.error) assert.equal(noDescription.value.description, null);
});

test('rejects bad roles with the failing field name', () => {
  const bad = (patch: object) => parseRoleInput({ name: 'Role', permissions: ['panel.open'], ...patch }).error ?? 'ok';
  assert.equal(bad({ name: 'A' }), 'name');
  assert.equal(bad({ name: '   ' }), 'name');
  assert.equal(bad({ name: 'x'.repeat(41) }), 'name');
  assert.equal(bad({ name: 5 }), 'name');
  assert.equal(bad({ description: 'x'.repeat(201) }), 'description');
  assert.equal(bad({ description: 5 }), 'description');
  assert.equal(bad({ permissions: [] }), 'permissions');
  assert.equal(bad({ permissions: 'panel.open' }), 'permissions');
  assert.equal(bad({ permissions: ['panel.open', 'fly'] }), 'permissions');
  assert.equal(bad({ permissions: [1] }), 'permissions');
  assert.notEqual(parseRoleInput(undefined).error, null);
});

test('stock updates take a known blood group and a whole number of units from 0 to 9999', () => {
  const ok = parseStockInput({ bloodGroup: 'O-', units: 12 });
  assert.equal(ok.error, null);
  if (!ok.error) assert.deepEqual(ok.value, { bloodGroup: 'O-', units: 12 });
  assert.equal(parseStockInput({ bloodGroup: 'O-', units: 0 }).error, null);
  assert.equal(parseStockInput({ bloodGroup: 'O-', units: 9999 }).error, null);
  const bad = (patch: object) => parseStockInput({ bloodGroup: 'A+', units: 5, ...patch }).error ?? 'ok';
  assert.equal(bad({ bloodGroup: 'Q+' }), 'bloodGroup');
  assert.equal(bad({ units: -1 }), 'units');
  assert.equal(bad({ units: 10000 }), 'units');
  assert.equal(bad({ units: 1.5 }), 'units');
  assert.equal(bad({ units: '5' }), 'units');
  assert.equal(bad({ units: Number.NaN }), 'units');
  assert.notEqual(parseStockInput(undefined).error, null);
});

test('an SOS may carry optional patient details, trimmed and range-checked', () => {
  const ok = parseSosInput({ ...sos, patientName: ' Rahim ', patientAge: 34, attendantName: ' Karim ' });
  assert.equal(ok.error, null);
  if (!ok.error) {
    assert.equal(ok.value.patientName, 'Rahim');
    assert.equal(ok.value.patientAge, 34);
    assert.equal(ok.value.attendantName, 'Karim');
  }
  const plain = parseSosInput(sos);
  if (!plain.error) assert.deepEqual([plain.value.patientName, plain.value.patientAge, plain.value.attendantName], [undefined, undefined, undefined]);
  const bad = (patch: object) => parseSosInput({ ...sos, ...patch }).error ?? 'ok';
  assert.equal(bad({ patientName: 'R' }), 'patientName');
  assert.equal(bad({ patientName: 'x'.repeat(81) }), 'patientName');
  assert.equal(bad({ patientAge: -1 }), 'patientAge');
  assert.equal(bad({ patientAge: 121 }), 'patientAge');
  assert.equal(bad({ patientAge: 30.5 }), 'patientAge');
  assert.equal(bad({ patientAge: '30' }), 'patientAge');
  assert.equal(bad({ attendantName: 'K' }), 'attendantName');
  assert.equal(bad({ patientAge: 0 }), 'ok');
  assert.equal(bad({ patientAge: 120 }), 'ok');
});

test('a response needs a name and a Bangladesh phone, which is normalised', () => {
  const ok = parseRespondInput({ name: '  Sadia ', phone: '017-5249 4315' });
  assert.equal(ok.error, null);
  if (!ok.error) assert.deepEqual(ok.value, { name: 'Sadia', phone: '01752494315' });
  const bad = (patch: object) => parseRespondInput({ name: 'Sadia', phone: '01752494315', ...patch }).error ?? 'ok';
  assert.equal(bad({ name: 'S' }), 'name');
  assert.equal(bad({ name: 5 }), 'name');
  assert.equal(bad({ phone: '123' }), 'phone');
  assert.equal(bad({ phone: undefined }), 'phone');
  assert.notEqual(parseRespondInput(null).error, null);
});

test('a status change takes one of the four statuses', () => {
  for (const status of ['PENDING', 'DONOR_FOUND', 'COMPLETED', 'CANCELLED']) {
    const result = parseStatusInput({ status });
    assert.equal(result.error, null, status);
  }
  for (const bad of [{ status: 'DONE' }, { status: 'pending' }, { status: 7 }, {}, null, 'COMPLETED']) {
    assert.notEqual(parseStatusInput(bad).error, null, JSON.stringify(bad));
  }
});

test('a donor profile update accepts any subset of its fields', () => {
  const r1 = parseDonorUpdateInput({ isAvailable: false });
  assert.equal(r1.error, null);
  if (!r1.error) assert.deepEqual(r1.value, { isAvailable: false });

  const r2 = parseDonorUpdateInput({ name: 'Tanvir Ahmed', area: 'Dhanmondi 27', lastDonationMonths: 3 });
  assert.equal(r2.error, null);
  if (!r2.error) assert.deepEqual(r2.value, { name: 'Tanvir Ahmed', area: 'Dhanmondi 27', lastDonationMonths: 3 });
});

test('a donor profile update rejects an empty body (nothing to update)', () => {
  assert.notEqual(parseDonorUpdateInput({}).error, null);
  assert.notEqual(parseDonorUpdateInput(null).error, null);
});

test('a donor profile update validates whichever fields are present', () => {
  assert.equal(parseDonorUpdateInput({ name: 'A' }).error, 'name');
  assert.equal(parseDonorUpdateInput({ area: 'A' }).error, 'area');
  assert.equal(parseDonorUpdateInput({ age: 500 }).error, 'age');
  assert.equal(parseDonorUpdateInput({ gender: 'Other' }).error, 'gender');
  assert.equal(parseDonorUpdateInput({ vehicle: 'x'.repeat(61) }).error, 'vehicle');
  assert.equal(parseDonorUpdateInput({ nearestHospital: 'x'.repeat(121) }).error, 'nearestHospital');
  assert.equal(parseDonorUpdateInput({ lastDonationMonths: -1 }).error, 'lastDonationMonths');
  assert.equal(parseDonorUpdateInput({ isAvailable: 'yes' }).error, 'isAvailable');
});

test('a fraud incident is resolved as banned or dismissed, nothing else', () => {
  for (const status of ['banned', 'dismissed']) {
    assert.equal(parseFraudStatusInput({ status }).error, null, status);
  }
  for (const bad of [{ status: 'pending' }, { status: 'BANNED' }, { status: 'throttled' }, { status: 7 }, {}, null]) {
    assert.notEqual(parseFraudStatusInput(bad).error, null, JSON.stringify(bad));
  }
});

const params = (query: string) => new URLSearchParams(query);

test('donor query defaults', () => {
  const result = parseDonorQuery(params(''));
  assert.equal(result.error, null);
  if (!result.error) assert.deepEqual(result.value, { bloodGroup: undefined, q: undefined, available: false, mine: false, page: 1, pageSize: 20 });
});

test('donor query reads its filters', () => {
  const result = parseDonorQuery(params('bloodGroup=O%2B&q=%20dhanmondi%20&available=true&mine=1&page=3&pageSize=10'));
  assert.equal(result.error, null);
  if (!result.error) assert.deepEqual(result.value, { bloodGroup: 'O+', q: 'dhanmondi', available: true, mine: true, page: 3, pageSize: 10 });
});

test('donor query rejects an unknown blood group but clamps paging quietly', () => {
  assert.equal(parseDonorQuery(params('bloodGroup=Z%2B')).error, 'bloodGroup');
  const clamped = parseDonorQuery(params('page=-4&pageSize=9999'));
  if (!clamped.error) assert.deepEqual([clamped.value.page, clamped.value.pageSize], [1, 50]);
  const junk = parseDonorQuery(params('page=abc&pageSize=xyz'));
  if (!junk.error) assert.deepEqual([junk.value.page, junk.value.pageSize], [1, 20]);
  const zero = parseDonorQuery(params('pageSize=0'));
  if (!zero.error) assert.equal(zero.value.pageSize, 1);
  const text = parseDonorQuery(params(`q=${'x'.repeat(200)}`));
  if (!text.error) assert.equal(text.value.q?.length, 60);
  const blank = parseDonorQuery(params('q=%20%20'));
  if (!blank.error) assert.equal(blank.value.q, undefined);
  const flag = parseDonorQuery(params('available=yes'));
  if (!flag.error) assert.equal(flag.value.available, false);
});

test('request query defaults and filters', () => {
  const none = parseRequestQuery(params(''));
  assert.equal(none.error, null);
  if (!none.error) assert.deepEqual(none.value, { status: undefined, emergency: false, bloodGroup: undefined, ids: undefined, mine: false, page: 1, pageSize: 20 });
  const some = parseRequestQuery(params('status=DONOR_FOUND&emergency=true&bloodGroup=AB-&mine=1&page=2'));
  assert.equal(some.error, null);
  if (!some.error) assert.deepEqual(some.value, { status: 'DONOR_FOUND', emergency: true, bloodGroup: 'AB-', ids: undefined, mine: true, page: 2, pageSize: 20 });
});

test('request query rejects unknown status and blood group', () => {
  assert.equal(parseRequestQuery(params('status=DONE')).error, 'status');
  assert.equal(parseRequestQuery(params('bloodGroup=Q')).error, 'bloodGroup');
});

test('request query ids are cleaned, de-duplicated and capped', () => {
  const some = parseRequestQuery(params('ids=a1,%20b2%20,,a1,c-3,bad%20id,d_4'));
  assert.equal(some.error, null);
  if (!some.error) assert.deepEqual(some.value.ids, ['a1', 'b2', 'c-3', 'd_4']);
  const many = parseRequestQuery(params(`ids=${Array.from({ length: 80 }, (_, i) => `id${i}`).join(',')}`));
  if (!many.error) assert.equal(many.value.ids?.length, 50);
  const empty = parseRequestQuery(params('ids=,,'));
  if (!empty.error) assert.equal(empty.value.ids, undefined);
  const long = parseRequestQuery(params(`ids=${'x'.repeat(70)},ok`));
  if (!long.error) assert.deepEqual(long.value.ids, ['ok']);
});
