import type { ProcessDto } from '../types/production';

const DEFAULT_BASE_URL = 'http://localhost:8080/api/v1/production-process';

export const getStoredBaseUrl = (): string => {
  return DEFAULT_BASE_URL;
};


/**
 * Creates a new process entry along with its production entries.
 * API Endpoint: POST {baseUrl}
 */
export const createProductionEntry = async (processDto: ProcessDto): Promise<any> => {
  const baseUrl = getStoredBaseUrl();
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(processDto),
  });

  if (!response.ok) {
    let errorMessage = `Failed to create production entry (Status: ${response.status})`;
    try {
      const errData = await response.json();
      if (errData && errData.message) {
        errorMessage = errData.message;
      } else if (typeof errData === 'string') {
        errorMessage = errData;
      }
    } catch {
      // Failed to parse JSON error, use status text
      if (response.statusText) {
        errorMessage += `: ${response.statusText}`;
      }
    }
    throw new Error(errorMessage);
  }

  // Handle empty or JSON response
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  return await response.text();
};

/**
 * Fetches all process entries (hourly records) for a given process date.
 * API Endpoint: GET {baseUrl}/all-for-date?processDate=YYYY-MM-DD
 */
export const getAllProductionEntriesForDate = async (processDate: string): Promise<ProcessDto[]> => {
  const baseUrl = getStoredBaseUrl();
  const url = `${baseUrl}/all-for-date?processDate=${encodeURIComponent(processDate)}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    let errorMessage = `Failed to fetch production entries (Status: ${response.status})`;
    try {
      const errData = await response.json();
      if (errData && errData.message) {
        errorMessage = errData.message;
      }
    } catch {
      if (response.statusText) {
        errorMessage += `: ${response.statusText}`;
      }
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};
