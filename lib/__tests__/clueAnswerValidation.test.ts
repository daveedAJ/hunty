import { describe, expect, it } from 'vitest';
import {
  EMPTY_ANSWER_ERROR,
  isValidClueAnswer,
  normalizeClueAnswer,
} from '../clueAnswerValidation';

describe('clueAnswerValidation', () => {
  it('rejects empty and whitespace-only answers', () => {
    expect(isValidClueAnswer('')).toBe(false);
    expect(isValidClueAnswer('   ')).toBe(false);
    expect(isValidClueAnswer('\n\t')).toBe(false);
  });

  it('accepts answers with non-whitespace content', () => {
    expect(isValidClueAnswer('treasure')).toBe(true);
    expect(isValidClueAnswer('  mural  ')).toBe(true);
  });

  it('normalizes answers by trimming', () => {
    expect(normalizeClueAnswer('  hello world  ')).toBe('hello world');
  });

  it('exposes a user-facing empty answer message', () => {
    expect(EMPTY_ANSWER_ERROR).toMatch(/empty/i);
  });
});
