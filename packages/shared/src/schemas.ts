import { z } from 'zod';
import { LIMITS } from './constants.js';

export const normalizeUrl = (input: string): string => {
  let trimmed = input.trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed;
};

export const isValidHttpUrl = (string: string): boolean => {
  try {
    const url = new URL(normalizeUrl(string));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const parseUrlsFromText = (text: string): string[] => {
  if (!text) return [];
  const lines = text
    .split(/[\r\n,]+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const seen = new Set<string>();
  const validUrls: string[] = [];

  for (const raw of lines) {
    const unquoted = raw.replace(/^["']|["']$/g, '').trim();
    if (!unquoted) continue;
    const normalized = normalizeUrl(unquoted);
    if (isValidHttpUrl(normalized) && !seen.has(normalized)) {
      seen.add(normalized);
      validUrls.push(normalized);
    }
  }

  return validUrls;
};

export const createBatchSchema = z.object({
  name: z.string().max(LIMITS.MAX_NAME_LENGTH).optional(),
  urls: z
    .array(z.string())
    .min(LIMITS.MIN_URLS_PER_BATCH, `At least ${LIMITS.MIN_URLS_PER_BATCH} URL is required`)
    .max(LIMITS.MAX_URLS_PER_BATCH, `Max ${LIMITS.MAX_URLS_PER_BATCH} URLs per batch`)
});

export type CreateBatchSchemaType = z.infer<typeof createBatchSchema>;
