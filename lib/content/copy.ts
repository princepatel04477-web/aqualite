/**
 * Copy trimming for small viewports (M06): the mobile hero shows the
 * first sentence of a multi-sentence lead so the first viewport fits.
 */
export function firstSentence(copy: string): string {
  const trimmed = copy.trim();
  const match = trimmed.match(/^[^.!?]*[.!?]/);
  const sentence = match?.[0].trim();
  return sentence && sentence.length > 0 ? sentence : trimmed;
}
