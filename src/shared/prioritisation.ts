export interface RiceInputs {
  reach: number;
  impact: number;
  confidence: number;
  effort: number;
}

export function calculateRice(input: RiceInputs): number {
  const { reach, impact, confidence, effort } = input;
  if (![reach, impact, confidence, effort].every(Number.isFinite)) {
    throw new Error('RICE inputs must be finite numbers.');
  }
  if (reach < 0) throw new Error('Reach cannot be negative.');
  if (impact < 0) throw new Error('Impact cannot be negative.');
  if (confidence < 0 || confidence > 100) {
    throw new Error('Confidence must be between 0 and 100.');
  }
  if (effort <= 0) throw new Error('Effort must be greater than zero.');
  return Number(((reach * impact * (confidence / 100)) / effort).toFixed(1));
}
