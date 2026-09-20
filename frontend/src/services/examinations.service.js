// C:\Users\HP\MediTrack\frontend\src\services\examinations.service.js

const API_URL = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api'
).replace(/\/$/, '');

const getAuthHeaders = () => {
  const token =
    localStorage.getItem('token');

  return {
    'Content-Type':
      'application/json',

    Authorization:
      token
        ? `Bearer ${token}`
        : '',
  };
};

const request = async (
  path,
  options = {}
) => {
  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
    }
  );

  let data;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.error ||
      `Request failed with HTTP ${response.status}`
    );
  }

  return data;
};

// ============================================================
// READ
// ============================================================

export const getAllExaminations =
  async () => {
    const result =
      await request(
        '/examinations'
      );

    return result.data;
  };

export const getMedicalExaminations =
  async () => {
    const result =
      await request(
        '/examinations/medical'
      );

    return result.data;
  };

export const getDentalExaminations =
  async () => {
    const result =
      await request(
        '/examinations/dental'
      );

    return result.data;
  };

export const getExaminationById =
  async (id) => {
    const result =
      await request(
        `/examinations/${id}`
      );

    return result.data;
  };

export const getMedicalExaminationById =
  async (id) => {
    const result =
      await request(
        `/examinations/medical/${id}`
      );

    return result.data;
  };

export const getDentalExaminationById =
  async (id) => {
    const result =
      await request(
        `/examinations/dental/${id}`
      );

    return result.data;
  };

// ============================================================
// CREATE / SUBMIT
// ============================================================

export const createMedicalExamination =
  async (examinationData) => {
    const result =
      await request(
        '/examinations/medical',
        {
          method: 'POST',
          body:
            JSON.stringify(
              examinationData
            ),
        }
      );

    return result.data;
  };

export const createDentalExamination =
  async (examinationData) => {
    const result =
      await request(
        '/examinations/dental',
        {
          method: 'POST',
          body:
            JSON.stringify(
              examinationData
            ),
        }
      );

    return result.data;
  };

// ============================================================
// UPDATE
// ============================================================

export const updateMedicalExamination =
  async (
    id,
    examinationData
  ) => {
    const result =
      await request(
        `/examinations/medical/${id}`,
        {
          method: 'PUT',
          body:
            JSON.stringify(
              examinationData
            ),
        }
      );

    return result.data;
  };

export const updateDentalExamination =
  async (
    id,
    examinationData
  ) => {
    const result =
      await request(
        `/examinations/dental/${id}`,
        {
          method: 'PUT',
          body:
            JSON.stringify(
              examinationData
            ),
        }
      );

    return result.data;
  };

// ============================================================
// APPROVAL
// ============================================================

export const approveMedicalExamination =
  async (
    id,
    approvalData = {}
  ) => {
    const result =
      await request(
        `/examinations/medical/${id}/approve`,
        {
          method: 'PATCH',
          body:
            JSON.stringify(
              approvalData
            ),
        }
      );

    return result.data;
  };

export const approveDentalExamination =
  async (
    id,
    approvalData = {}
  ) => {
    const result =
      await request(
        `/examinations/dental/${id}/approve`,
        {
          method: 'PATCH',
          body:
            JSON.stringify(
              approvalData
            ),
        }
      );

    return result.data;
  };

// ============================================================
// CERTIFICATE
// ============================================================

export const issueMedicalCertificate =
  async (
    id,
    certificateData = {}
  ) => {
    const result =
      await request(
        `/examinations/medical/${id}/certificate`,
        {
          method: 'PATCH',
          body:
            JSON.stringify(
              certificateData
            ),
        }
      );

    return result.data;
  };

export const issueDentalCertificate =
  async (
    id,
    certificateData = {}
  ) => {
    const result =
      await request(
        `/examinations/dental/${id}/certificate`,
        {
          method: 'PATCH',
          body:
            JSON.stringify(
              certificateData
            ),
        }
      );

    return result.data;
  };

// ============================================================
// DELETE / ARCHIVE
// ============================================================

export const deleteMedicalExamination =
  async (id) => {
    return request(
      `/examinations/medical/${id}`,
      {
        method: 'DELETE',
      }
    );
  };

export const deleteDentalExamination =
  async (id) => {
    return request(
      `/examinations/dental/${id}`,
      {
        method: 'DELETE',
      }
    );
  };

// ============================================================
// GENERIC HELPERS
// ============================================================

export const createExamination =
  async (
    type,
    examinationData
  ) => {
    return type === 'dental'
      ? createDentalExamination(
          examinationData
        )
      : createMedicalExamination(
          examinationData
        );
  };

export const updateExamination =
  async (
    type,
    id,
    examinationData
  ) => {
    return type === 'dental'
      ? updateDentalExamination(
          id,
          examinationData
        )
      : updateMedicalExamination(
          id,
          examinationData
        );
  };

export const approveExamination =
  async (
    type,
    id,
    approvalData = {}
  ) => {
    return type === 'dental'
      ? approveDentalExamination(
          id,
          approvalData
        )
      : approveMedicalExamination(
          id,
          approvalData
        );
  };

export const issueCertificate =
  async (
    type,
    id,
    certificateData = {}
  ) => {
    return type === 'dental'
      ? issueDentalCertificate(
          id,
          certificateData
        )
      : issueMedicalCertificate(
          id,
          certificateData
        );
  };

export const deleteExamination =
  async (
    type,
    id
  ) => {
    return type === 'dental'
      ? deleteDentalExamination(id)
      : deleteMedicalExamination(id);
  };

export default {
  getAllExaminations,
  getMedicalExaminations,
  getDentalExaminations,

  getExaminationById,
  getMedicalExaminationById,
  getDentalExaminationById,

  createMedicalExamination,
  createDentalExamination,
  createExamination,

  updateMedicalExamination,
  updateDentalExamination,
  updateExamination,

  approveMedicalExamination,
  approveDentalExamination,
  approveExamination,

  issueMedicalCertificate,
  issueDentalCertificate,
  issueCertificate,

  deleteMedicalExamination,
  deleteDentalExamination,
  deleteExamination,
};
