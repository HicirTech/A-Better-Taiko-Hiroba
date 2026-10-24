/** What `ask` answers, or what `otherwise` gives when it throws or rejects instead. */
export async function settled<T>(ask: () => Promise<T>, otherwise: () => T): Promise<T> {
  try {
    return await ask();
  } catch {
    return otherwise();
  }
}
