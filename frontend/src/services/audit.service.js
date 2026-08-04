import { supabase } from '../supabase';

/**
 * Write a generic admin-action record.
 *
 * Matches the actual `audit_logs` schema:
 *   id, created_at, "userId", "userEmail", "userName",
 *   action (not null), type (not null), description, details (jsonb)
 *
 * @param {Object} params
 * @param {string} params.action       – short verb, e.g. 'appointment_updated'
 * @param {Object} [params.details]    – arbitrary payload (appointmentId, updates, etc.) stored as jsonb
 * @param {string} [params.adminUid]   – UID of the admin who performed the action, stored in "userId"
 * @param {string} [params.userEmail]  – email of the admin, stored in "userEmail"
 * @param {string} [params.userName]   – display name of the admin, stored in "userName"
 * @param {string} [params.type]       – category for this log entry (required by schema); defaults to `action` if omitted
 * @param {string} [params.description]– human-readable summary of what happened
 */
export async function logAdminAction({
  action,
  details = {},
  adminUid,
  userEmail = null,
  userName = null,
  type,
  description = null,
}) {
  const { error, data } = await supabase
    .from('audit_logs')
    .insert({
      action,
      // "type" is NOT NULL in the schema — fall back to action if the
      // caller didn't provide a more specific category.
      type: type ?? action,
      description,
      // jsonb column — pass the object directly, postgrest handles encoding
      details,
      userId: adminUid ?? null,
      userEmail,
      userName,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[Audit] Failed to write log:', error);
  }

  return data;
}