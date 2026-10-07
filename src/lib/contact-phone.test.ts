import assert from 'node:assert/strict';
import test from 'node:test';
import * as contactPhone from './contact-phone.ts';

test('rejects a family contact number that matches No HP', () => {
  assert.equal(
    contactPhone.isDuplicatePhoneNumber?.('081234567890', '081234567890'),
    true,
  );
});

test('allows a family contact number that differs from No HP', () => {
  assert.equal(
    contactPhone.isDuplicatePhoneNumber?.('081234567890', '081298765432'),
    false,
  );
});
