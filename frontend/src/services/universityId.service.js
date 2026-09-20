// C:\Users\HP\MediTrack\frontend\src\services\universityId.service.js

import authService from './auth.service';

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const IMPORT_ENDPOINT = `${API_URL}/user/university-ids/import`;

const importUniversityIds = async (files = []) => {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('Please select at least one XLSX or XLS file.');
  }

  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const authHeaders = await authService.getAuthHeaders();

  if (!authHeaders.Authorization) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  const response = await fetch(IMPORT_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: authHeaders.Authorization,
    },
    body: formData,
  });

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error('The server returned an invalid response.');
  }

  if (!response.ok) {
    throw new Error(
      result?.message || 'Failed to import university IDs.'
    );
  }

  return result;
};

export default {
  importUniversityIds,
};
