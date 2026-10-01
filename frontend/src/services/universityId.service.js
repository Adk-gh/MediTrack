// C:\Users\HP\MediTrack\frontend\src\services\universityId.service.js

import authService from './auth.service';

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const IMPORT_ENDPOINT =
  `${API_URL}/user/university-ids/import`;

const IMPORT_MANUAL_ENDPOINT =
  `${API_URL}/user/university-ids/import-manual`;

const parseResponse = async (response) => {
  const raw = await response.text();

  if (!raw) {
    throw new Error(
      `The server returned an empty response (HTTP ${response.status}).`
    );
  }

  try {
    return JSON.parse(raw);
  } catch {
    console.error(
      '[University ID Service] Invalid server response:',
      raw
    );

    throw new Error(
      `The server returned an invalid response (HTTP ${response.status}).`
    );
  }
};

const importUniversityIds = async (files = []) => {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error(
      'Please select at least one XLSX or XLS file.'
    );
  }

  const formData = new FormData();

  files.forEach((file) => {
    formData.append('files', file);
  });

  const authHeaders =
    await authService.getAuthHeaders();

  if (!authHeaders.Authorization) {
    throw new Error(
      'Your session has expired. Please sign in again.'
    );
  }

  const response = await fetch(
    IMPORT_ENDPOINT,
    {
      method: 'POST',
      headers: {
        Authorization:
          authHeaders.Authorization,
      },
      body: formData,
    }
  );

  const result =
    await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      result?.message ||
      'Failed to import university IDs.'
    );
  }

  return result;
};

const importManualIds = async (payload) => {
  if (
    !payload ||
    !Array.isArray(payload.ids) ||
    payload.ids.length === 0
  ) {
    throw new Error(
      'Please provide at least one University ID.'
    );
  }

  const authHeaders =
    await authService.getAuthHeaders();

  if (!authHeaders.Authorization) {
    throw new Error(
      'Your session has expired. Please sign in again.'
    );
  }

  const response = await fetch(
    IMPORT_MANUAL_ENDPOINT,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:
          authHeaders.Authorization,
      },
      body: JSON.stringify({
        ids: payload.ids,
      }),
    }
  );

  const result =
    await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      result?.message ||
      'Failed to import university IDs manually.'
    );
  }

  return result;
};

export default {
  importUniversityIds,
  importManualIds,
};
