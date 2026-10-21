import samples from './corpus/samples.json';
import { analyze } from '../src/engine';
import type { Verdict } from '../src/engine';

interface Sample {
  id: string;
  expected: Verdict;
  text: string;
}

describe('corpus', () => {
  it.each((samples as Sample[]).map((sample) => [sample.id, sample]))('%s', (_id, sample) => {
    const result = analyze(sample.text);
    const summary = result.findings.map((item) => `${item.code}:${item.points}`).join(', ');
    expect({ verdict: result.verdict, score: result.score, summary }).toEqual(
      expect.objectContaining({ verdict: sample.expected }),
    );
  });

  it('has unique ids', () => {
    const ids = (samples as Sample[]).map((sample) => sample.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
