import { describe, it, expect } from 'vitest';
import {
  formatExpiry, formatStatus, formatConfidence, formatCredentialType,
  daysUntil,
} from '../js/format.js';

describe('formatExpiry', () => {
  it('returns "today" for today', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(formatExpiry(today)).toMatch(/today/i);
  });
  it('returns "in N days" for future', () => {
    const d = new Date(); d.setDate(d.getDate() + 5);
    expect(formatExpiry(d.toISOString().slice(0, 10))).toMatch(/in 5 days/);
  });
  it('returns "N days ago" for past', () => {
    const d = new Date(); d.setDate(d.getDate() - 3);
    expect(formatExpiry(d.toISOString().slice(0, 10))).toMatch(/3 days ago/);
  });
  it('returns "—" for null', () => {
    expect(formatExpiry(null)).toBe('—');
  });
});

describe('formatStatus', () => {
  it.each([
    ['ACTIVE', 'Active'],
    ['EXPIRING_SOON', 'Expiring soon'],
    ['EXPIRED', 'Expired'],
    ['MISSING', 'Missing'],
  ])('maps %s -> %s', (input, expected) => {
    expect(formatStatus(input)).toBe(expected);
  });
});

describe('formatConfidence', () => {
  it.each([
    ['high', 'High'],
    ['medium', 'Medium'],
    ['low', 'Low'],
    [null, 'Unknown'],
    [undefined, 'Unknown'],
  ])('maps %s -> %s', (input, expected) => {
    expect(formatConfidence(input)).toBe(expected);
  });
});

describe('formatCredentialType', () => {
  it('snake_case to title case', () => {
    expect(formatCredentialType('dea_registration')).toBe('DEA Registration');
    expect(formatCredentialType('biohazardous_waste_permit')).toBe('Biohazardous Waste Permit');
    expect(formatCredentialType('cpr_bls')).toBe('CPR BLS');
  });
  it('passes through null', () => {
    expect(formatCredentialType(null)).toBe('');
  });
});

describe('daysUntil', () => {
  it('positive for future', () => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    expect(daysUntil(d.toISOString().slice(0, 10))).toBe(7);
  });
  it('negative for past', () => {
    const d = new Date(); d.setDate(d.getDate() - 2);
    expect(daysUntil(d.toISOString().slice(0, 10))).toBe(-2);
  });
  it('null returns null', () => {
    expect(daysUntil(null)).toBe(null);
  });
  it('honors the optional today parameter for deterministic computation', () => {
    expect(daysUntil('2026-06-05', '2026-05-06')).toBe(30);
    expect(daysUntil('2026-04-06', '2026-05-06')).toBe(-30);
    expect(daysUntil('2026-05-06', '2026-05-06')).toBe(0);
  });
});
