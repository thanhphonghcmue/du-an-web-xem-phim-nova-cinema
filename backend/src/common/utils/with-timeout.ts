export async function withTimeout<T>(
  operation: Promise<T>,
  milliseconds: number,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new Error("Infrastructure probe timed out."));
        }, milliseconds);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
