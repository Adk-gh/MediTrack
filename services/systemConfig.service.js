// C:\Users\HP\MediTrack\services\systemConfig.service.js

const supabase = require('../configs/supabase');

/**
 * Fetch the global MediTrack system configuration.
 */
const getSystemConfig = async () => {
    const { data, error } = await supabase
        .from('system_config')
        .select(`
            id,
            departments,
            non_academic_offices,
            clinic_roles,
            faculty_roles,
            admin_roles,
            classifications,
            job_titles,
            sections,
            password_rules,
            updated_at
        `)
        .eq('id', 1)
        .single();

    if (error) {
        console.error(
            '[SystemConfig] Failed to fetch configuration:',
            error
        );
        throw error;
    }

    if (!data) {
        throw new Error(
            'System configuration was not found.'
        );
    }

    return data;
};

/**
 * Update the global MediTrack system configuration.
 */
const updateSystemConfig = async (configData) => {
    // Exclude fields that should never be manually changed.
    const {
        id,
        updated_at,
        ...payload
    } = configData;

    // Automatically update timestamp.
    payload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
        .from('system_config')
        .update(payload)
        .eq('id', 1)
        .select(`
            id,
            departments,
            non_academic_offices,
            clinic_roles,
            faculty_roles,
            admin_roles,
            classifications,
            job_titles,
            sections,
            password_rules,
            updated_at
        `)
        .single();

    if (error) {
        console.error(
            '[SystemConfig] Failed to update configuration:',
            error
        );
        throw error;
    }

    return data;
};

module.exports = {
    getSystemConfig,
    updateSystemConfig,
};