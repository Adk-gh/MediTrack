// C:\Users\HP\MediTrack\frontend\src\services\records.service.js

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api"
).replace(/\/$/, "");


// ─────────────────────────────────────────────────────────────────────────────
// AUTH HEADERS
// ─────────────────────────────────────────────────────────────────────────────

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};


// ─────────────────────────────────────────────────────────────────────────────
// GET ALL RECORDS
// ─────────────────────────────────────────────────────────────────────────────

export const getAllRecords = async () => {
  const res = await fetch(`${API_URL}/records`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.message || "Failed to fetch records"
    );
  }

  return data.data;
};


// ─────────────────────────────────────────────────────────────────────────────
// GET RECORD BY ID
// ─────────────────────────────────────────────────────────────────────────────

export const getRecordById = async (id) => {
  if (!id) {
    throw new Error("Record ID is required");
  }

  const res = await fetch(`${API_URL}/records/${id}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.message || "Failed to fetch record"
    );
  }

  return data.data;
};


// ─────────────────────────────────────────────────────────────────────────────
// CREATE RECORD
// ─────────────────────────────────────────────────────────────────────────────

export const createRecord = async (recordData) => {
  const res = await fetch(`${API_URL}/records`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(recordData),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.message || "Failed to create record"
    );
  }

  return data.data;
};


// ─────────────────────────────────────────────────────────────────────────────
// UPDATE RECORD
// ─────────────────────────────────────────────────────────────────────────────

export const updateRecord = async (id, recordData) => {
  if (!id) {
    throw new Error("Record ID is required");
  }

  const res = await fetch(`${API_URL}/records/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(recordData),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.message || "Failed to update record"
    );
  }

  return data.data;
};


// ─────────────────────────────────────────────────────────────────────────────
// DELETE RECORD
// ─────────────────────────────────────────────────────────────────────────────

export const deleteRecord = async (id) => {
  if (!id) {
    throw new Error("Record ID is required");
  }

  const res = await fetch(`${API_URL}/records/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.message || "Failed to delete record"
    );
  }

  return data;
};

// ─────────────────────────────────────────────────────────────────────────────
// ARCHIVE (SOFT DELETE) RECORD
// ─────────────────────────────────────────────────────────────────────────────

export const archiveRecord = async (id, recordType) => {
  if (!id || !recordType) {
    throw new Error("Record ID and recordType ('medical' or 'dental') are required");
  }

  const endpoint = recordType === 'medical' ? 'medical' : 'dental';

  console.log(`[RecordsService] Sending archive request for ${endpoint} record ID: ${id}`);

  const res = await fetch(`${API_URL}/records/${endpoint}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.message || `Failed to archive ${endpoint} record`
    );
  }

  return data;
};


// ─────────────────────────────────────────────────────────────────────────────
// REQUEST MEDICAL CERTIFICATE / DENTAL REPORT
// ─────────────────────────────────────────────────────────────────────────────
//
// Backend endpoint:
//
// POST /api/records/:id/certificate-request
//
// Medical:
//   recordType = "medical"
//   requestType = "certificate"
//   → Doctor is notified
//
// Dental:
//   recordType = "dental"
//   requestType = "report"
//   → Dentist is notified
//
// ─────────────────────────────────────────────────────────────────────────────

export const requestCertificate = async (
  recordId,
  recordType = "medical",
  requestType = null
) => {
  if (!recordId) {
    throw new Error(
      "Record ID is required to submit a request"
    );
  }

  const normalizedRecordType =
    String(recordType || "medical")
      .trim()
      .toLowerCase();

  const normalizedRequestType =
    requestType ||
    (
      normalizedRecordType === "dental"
        ? "report"
        : "certificate"
    );

  // Safety: only allow the two supported record types.
  const finalRecordType =
    normalizedRecordType === "dental"
      ? "dental"
      : "medical";

  const finalRequestType =
    finalRecordType === "dental"
      ? "report"
      : "certificate";

  console.log(
    "[RecordsService] Submitting record request:",
    {
      recordId,
      recordType: finalRecordType,
      requestType: finalRequestType,
      url: `${API_URL}/records/${recordId}/certificate-request`,
    }
  );

  const res = await fetch(
    `${API_URL}/records/${recordId}/certificate-request`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        recordType: finalRecordType,
        requestType: finalRequestType,
      }),
    }
  );

  let data;

  try {
    data = await res.json();
  } catch {
    throw new Error(
      `Server returned an invalid response (${res.status})`
    );
  }

  if (!res.ok) {
    console.error(
      "[RecordsService] Record request failed:",
      {
        status: res.status,
        data,
      }
    );

    throw new Error(
      data.message ||
      "Failed to submit certificate/report request"
    );
  }

  console.log(
    "[RecordsService] Record request submitted successfully:",
    data
  );

  return data.data;
};


// ─────────────────────────────────────────────────────────────────────────────
// REQUEST MEDICAL CERTIFICATE
// ─────────────────────────────────────────────────────────────────────────────
//
// Convenience wrapper for medical records.
// ─────────────────────────────────────────────────────────────────────────────

export const requestMedicalCertificate = async (recordId) => {
  return requestCertificate(
    recordId,
    "medical",
    "certificate"
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// REQUEST DENTAL REPORT
// ─────────────────────────────────────────────────────────────────────────────
//
// Convenience wrapper for dental records.
// ─────────────────────────────────────────────────────────────────────────────

export const requestDentalReport = async (recordId) => {
  return requestCertificate(
    recordId,
    "dental",
    "report"
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export default {
  getAllRecords,
  getRecordById,
  createRecord,
  updateRecord,
  deleteRecord,
  archiveRecord, // <-- This is now correctly exported!
  requestCertificate,
  requestMedicalCertificate,
  requestDentalReport,
};