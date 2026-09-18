import { describe, expect, it } from 'vitest';
import { computeFingerprint } from './fingerprint.util';

describe('computeFingerprint', () => {
  it('is stable for the same type/message/stack', () => {
    const a = computeFingerprint(
      'TypeError',
      'Cannot read properties of undefined',
      'at foo (a.js:1:1)',
    );
    const b = computeFingerprint(
      'TypeError',
      'Cannot read properties of undefined',
      'at foo (a.js:1:1)',
    );
    expect(a).toBe(b);
  });

  it('ignores numeric differences in the message', () => {
    const a = computeFingerprint('Error', 'User 123 not found');
    const b = computeFingerprint('Error', 'User 456 not found');
    expect(a).toBe(b);
  });

  it('is case-insensitive on the message', () => {
    const a = computeFingerprint('Error', 'Something Broke');
    const b = computeFingerprint('Error', 'something broke');
    expect(a).toBe(b);
  });

  it('differs when the type differs', () => {
    const a = computeFingerprint('TypeError', 'Something broke');
    const b = computeFingerprint('RangeError', 'Something broke');
    expect(a).not.toBe(b);
  });

  it('differs when the top stack frames differ', () => {
    const a = computeFingerprint('Error', 'boom', 'at foo (a.js:1:1)');
    const b = computeFingerprint('Error', 'boom', 'at bar (b.js:2:2)');
    expect(a).not.toBe(b);
  });

  it('groups structured stack frames the same way as their JSON shape', () => {
    const frames = [{ file: 'a.js', line: 1 }];
    const a = computeFingerprint('Error', 'boom', frames);
    const b = computeFingerprint('Error', 'boom', [{ file: 'a.js', line: 1 }]);
    expect(a).toBe(b);
  });
});
