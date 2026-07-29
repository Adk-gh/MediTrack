// C:\Users\HP\MediTrack\features/Records/records.service.js
const supabase = require('../../configs/database');
const notificationsService = require('../notifications/notifications.service');
const archiveHelper = require('../archives/archiveHelper');

const ARCHIVE_TYPE = 'record';

exports.getAllRecords = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('is_archived', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(doc => ({ id: doc.uid, ...doc }));
};

exports.getRecordById = async (id) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('uid', id)
    .eq('is_archived', false)
    .single();

  if (error || !data) {
    const error = new Error('Record not found');
    error.statusCode = 404;
    throw error;
  }
  return { id: data.uid, ...data };
};

exports.createRecord = async (data) => {
  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password || 'Plsp12345!',
      email_confirm: true,
      user_metadata: {
        firstName: data.firstName,
        lastName: data.lastName,
        display_name: `${data.firstName} ${data.lastName}`.trim(),
      },
    });

    if (authError) throw authError;
    const user = authData.user;
    if (!user) throw new Error('Failed to create auth user');

    // snake_case to match your Supabase schema
    const newDoc = {
      id: user.id,                                    // PK = auth UUID, no separate uid
      first_name: data.firstName || '',
      last_name: data.lastName || '',
      middle_name: data.middleName || '',
      suffix: data.suffix || '',
      email: data.email || '',
      university_id: data.universityId || '',
      role: data.role || 'student',
      sex: data.sex || '',
      birthday: data.birthday || null,
      age: data.age ? parseInt(data.age) : null,
      department: data.department || '',
      phone_number: data.phoneNumber || '',
      civil_status: data.civilStatus || '',
      nationality: data.nationality || '',
      religion: data.religion || '',
      blood_type: data.bloodType || '',
      home_address: data.homeAddress || '',
      emergency_contact: data.emergencyContact || {},
      vaccinations: data.vaccinations || {},
      is_profile_setup: true,
      profile_complete: true,
      ...(data.role === 'student'
        ? {
            program: data.program || '',
            year_level: data.yearLevel || '',
            section: data.section || '',
            student_classification: data.studentClassification || '',
          }
        : {
            job_title: data.jobTitle || '',
            classification: data.classification || '',
          }),
    };

    const { error: insertError } = await supabase.from('users').insert(newDoc);

    if (insertError) {
      await supabase.auth.admin.deleteUser(user.id);
      throw insertError;
    }

    await notificationsService.notifyAdmins({
      type: 'record_added',
      title: 'New User Record Created',
      message: `New user: ${newDoc.first_name} ${newDoc.last_name} (${newDoc.role})`,
      referenceId: user.id,
      referenceType: 'user',
    });

    return { id: user.id, ...newDoc };
  } catch (error) {
    throw new Error(error.message || 'Error executing admin account creation');
  }
};

exports.getAllRecords = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(doc => ({ id: doc.id, ...doc }));
};

exports.getRecordById = async (id) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)           // was uid
    .single();

  if (error || !data) {
    const err = new Error('Record not found');
    err.statusCode = 404;
    throw err;
  }
  return { id: data.id, ...data };
};

exports.updateRecord = async (id, data) => {
  const updateData = { ...data, updated_at: new Date().toISOString() };  // was updatedAt
  const { error } = await supabase.from('users').update(updateData).eq('id', id);
  if (error) throw error;
  return { id, ...updateData };
};

exports.deleteRecord = async (id, deletedBy) => {
  // Move to archives before deletion
  await archiveHelper.archiveAndDelete({
    type: ARCHIVE_TYPE,
    originalId: id,
    tableName: 'users',
    idColumn: 'id',
    deletedBy
  }, supabase);

  // Also delete from auth if exists
  try {
    await supabase.auth.admin.deleteUser(id);
  } catch (e) {
    console.log('Auth user already deleted or mismatch');
  }

  return { id };
};

// Auto-archive old records based on retention policy
exports.autoArchiveOldRecords = async (dryRun = false, archivedByName = 'system') => {
  const RETENTION_STUDENT = 5; // years
  const RETENTION_EMPLOYEE = 4; // years

  const now = new Date();
  const studentCutoff = new Date(now.getFullYear() - RETENTION_STUDENT, now.getMonth(), now.getDate());
  const employeeCutoff = new Date(now.getFullYear() - RETENTION_EMPLOYEE, now.getMonth(), now.getDate());

  const archived = {
    medical: 0,
    dental: 0,
    users: 0,
    details: []
  };

  // 1. Archive old medical records (by exam_date)
  const { data: oldMedRecords, error: medError } = await supabase
    .from('medical_records')
    .select('id, exam_date, user_id')
    .eq('is_archived', false)
    .lt('exam_date', studentCutoff.toISOString().split('T')[0]);

  if (!medError && oldMedRecords?.length > 0) {
    for (const record of oldMedRecords) {
      if (!dryRun) {
        await supabase
          .from('medical_records')
          .update({ is_archived: true, deleted_by: archivedByName })
          .eq('id', record.id);
      }
      archived.medical++;
      archived.details.push({ type: 'medical', id: record.id, examDate: record.exam_date, reason: 'exam > retention period' });
    }
  }

  // 2. Archive old dental records (by exam_date)
  const { data: oldDenRecords, error: denError } = await supabase
    .from('dental_records')
    .select('id, exam_date, user_id')
    .eq('is_archived', false)
    .lt('exam_date', studentCutoff.toISOString().split('T')[0]);

  if (!denError && oldDenRecords?.length > 0) {
    for (const record of oldDenRecords) {
      if (!dryRun) {
        await supabase
          .from('dental_records')
          .update({ is_archived: true, deleted_by: archivedByName })
          .eq('id', record.id);
      }
      archived.dental++;
      archived.details.push({ type: 'dental', id: record.id, examDate: record.exam_date, reason: 'exam > retention period' });
    }
  }

  // 3. Archive users based on their LAST exam date (not creation date)
  const { data: allUsers, error: usersError } = await supabase
    .from('users')
    .select('uid, role')
    .eq('is_archived', false)
    .eq('is_verified', true);

  if (!usersError && allUsers?.length > 0) {
    for (const user of allUsers) {
      // Determine retention based on role
      const isEmployee = user.role && !['student'].includes(user.role.toLowerCase());
      const cutoffDate = isEmployee ? employeeCutoff : studentCutoff;

      // Get user's most recent medical exam
      const { data: lastMed } = await supabase
        .from('medical_records')
        .select('exam_date')
        .eq('user_id', user.uid)
        .eq('is_archived', false)
        .order('exam_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get user's most recent dental exam
      const { data: lastDen } = await supabase
        .from('dental_records')
        .select('exam_date')
        .eq('user_id', user.uid)
        .eq('is_archived', false)
        .order('exam_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Find the most recent exam date
      const lastExamDates = [lastMed?.exam_date, lastDen?.exam_date].filter(Boolean);
      if (lastExamDates.length === 0) continue; // No exams, skip

      const maxTimestamp = Math.max(...lastExamDates.map(d => new Date(d).getTime()));
      const lastExamDate = new Date(maxTimestamp);

      // If last exam is older than cutoff, archive the user
      if (lastExamDate < cutoffDate) {
        if (!dryRun) {
          await supabase
            .from('users')
            .update({ is_archived: true, deleted_by: archivedByName })
            .eq('uid', user.uid);
        }
        archived.users++;
        archived.details.push({
          type: 'user',
          id: user.uid,
          role: user.role,
          lastExamDate: lastExamDate.toISOString().split('T')[0],
          reason: isEmployee ? 'last exam > 4 years' : 'last exam > 5 years'
        });
      }
    }
  }

  return archived;
};