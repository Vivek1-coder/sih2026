/** Bound operations such as chunk loading that cannot use AbortSignal. */
export function withTimeout<T>(operation: Promise<T>, milliseconds: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('errors:timeout')), milliseconds);
    operation.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}
