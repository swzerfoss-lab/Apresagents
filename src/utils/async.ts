/**
 * Async utilities for parallel processing with concurrency control
 */

/**
 * Process items in parallel with a concurrency limit
 * @param items - Array of items to process
 * @param processor - Async function to process each item
 * @param concurrency - Maximum number of parallel operations (default: 3)
 */
export async function parallelLimit<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  concurrency: number = 3
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const promise = processor(item, i).then((result) => {
      results[i] = result;
    });

    const executingPromise = promise.then(() => {
      executing.splice(executing.indexOf(executingPromise), 1);
    });

    executing.push(executingPromise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Retry an async operation with exponential backoff
 * @param operation - Async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Base delay in ms (default: 1000)
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms: ${lastError.message}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Maximum file size constants
 */
export const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB

/**
 * Validate buffer size against maximum allowed
 */
export function validateBufferSize(buffer: Buffer, maxSize: number, type: string): void {
  if (buffer.length > maxSize) {
    throw new Error(
      `${type} size (${(buffer.length / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed (${(maxSize / 1024 / 1024).toFixed(0)}MB)`
    );
  }
}
