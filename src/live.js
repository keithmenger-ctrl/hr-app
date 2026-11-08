// Estimated calories burned per minute from heart rate (Keytel et al. 2005).
// Needs age, weight and sex; returns null when any is missing.
const LB_TO_KG = 0.45359237;

export function caloriesPerMinute({ bpm, age, weightLb, sex }) {
  if (![bpm, age, weightLb].every(Number.isFinite) || (sex !== 'male' && sex !== 'female')) return null;
  const kg = weightLb * LB_TO_KG;
  const kj = sex === 'male'
    ? -55.0969 + 0.6309 * bpm + 0.1988 * kg + 0.2017 * age
    : -20.4022 + 0.4472 * bpm - 0.1263 * kg + 0.074 * age;
  return Math.max(0, kj / 4.184);
}
