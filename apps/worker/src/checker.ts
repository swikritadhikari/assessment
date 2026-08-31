import * as cheerio from 'cheerio';
import { TIMING, LIMITS } from '@healthchecker/shared';

export interface HttpCheckOutcome {
  status: 'SUCCESS' | 'FAILED';
  isTransient: boolean;
  httpStatus: number | null;
  responseTimeMs: number;
  pageTitle: string | null;
  errorMessage: string | null;
}

export const executeHttpCheck = async (targetUrl: string): Promise<HttpCheckOutcome> => {
  const startTime = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMING.HTTP_PROBE_TIMEOUT_MS);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Bulk-URL-Health-Checker/1.0 (Mozilla/5.0 Compatible Health Probe)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      redirect: 'follow',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const durationMs = Math.round(performance.now() - startTime);
    const httpStatus = response.status;

    let pageTitle: string | null = null;
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
        const text = await response.text();
        const $ = cheerio.load(text);
        const titleText = $('title').first().text().trim();
        if (titleText) {
          pageTitle = titleText.slice(0, LIMITS.MAX_PAGE_TITLE_LENGTH);
        }
      }
    } catch {
      // ignore
    }

    if (httpStatus >= 200 && httpStatus < 400) {
      return {
        status: 'SUCCESS',
        isTransient: false,
        httpStatus,
        responseTimeMs: durationMs,
        pageTitle,
        errorMessage: null
      };
    } else if (httpStatus >= 500 || httpStatus === 429) {
      return {
        status: 'FAILED',
        isTransient: true,
        httpStatus,
        responseTimeMs: durationMs,
        pageTitle,
        errorMessage: `Server error HTTP ${httpStatus}`
      };
    } else {
      return {
        status: 'FAILED',
        isTransient: false,
        httpStatus,
        responseTimeMs: durationMs,
        pageTitle,
        errorMessage: `Client error HTTP ${httpStatus}`
      };
    }
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const durationMs = Math.round(performance.now() - startTime);

    let isAbort = false;
    let errMsg = 'Network error';

    if (error instanceof Error) {
      isAbort = error.name === 'AbortError' || error.message.includes('aborted');
      errMsg = isAbort ? `Connection timed out (${TIMING.HTTP_PROBE_TIMEOUT_MS / 1000}s limit)` : error.message;
    }

    return {
      status: 'FAILED',
      isTransient: true,
      httpStatus: null,
      responseTimeMs: durationMs,
      pageTitle: null,
      errorMessage: errMsg
    };
  }
};
