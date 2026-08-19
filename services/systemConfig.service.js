// C:\Users\HP\MediTrack\services\systemConfig.service.js

const supabase = require('../configs/database');

const SYSTEM_CONFIG_FIELDS = `
    id,
    departments,
    non_academic_offices,
    clinic_roles,
    faculty_roles,
    staff_roles,
    admin_roles,
    classifications,
    job_titles,
    sections,
    password_rules,
    prompt_student_academic_update,
    academic_update_version,
    updated_at
`;


/**
 * Fetch the global MediTrack system configuration.
 */
const getSystemConfig = async () => {
    const { data, error } = await supabase
        .from('system_config')
        .select(SYSTEM_CONFIG_FIELDS)
        .eq('id', 1)
        .maybeSingle();

    if (error) {
        console.error(
            '[SystemConfig] Failed to fetch configuration:',
            error
        );

        throw error;
    }

    if (!data) {
        const error = new Error(
            'System configuration was not found.'
        );

        error.statusCode = 404;

        throw error;
    }

    return data;
};


/**
 * Update the global MediTrack system configuration.
 *
 * Academic update version behavior:
 *
 * FALSE -> TRUE
 *     Increment academic_update_version.
 *
 * TRUE -> TRUE
 *     Keep current version.
 *
 * TRUE -> FALSE
 *     Disable prompt but keep current version.
 *
 * FALSE -> FALSE
 *     Keep current version.
 */
const updateSystemConfig = async (configData) => {
    if (
        !configData ||
        typeof configData !== 'object' ||
        Array.isArray(configData)
    ) {
        throw new Error(
            'Invalid system configuration data.'
        );
    }

    // -------------------------------------------------------------
    // Get current configuration
    // -------------------------------------------------------------

    const {
        data: currentConfig,
        error: fetchError
    } = await supabase
        .from('system_config')
        .select(`
            id,
            prompt_student_academic_update,
            academic_update_version
        `)
        .eq('id', 1)
        .maybeSingle();

    if (fetchError) {
        console.error(
            '[SystemConfig] Failed to fetch current configuration:',
            fetchError
        );

        throw fetchError;
    }

    if (!currentConfig) {
        const error = new Error(
            'System configuration row with id 1 was not found.'
        );

        error.statusCode = 404;

        throw error;
    }

    console.log(
        '[SystemConfig] Current config:',
        currentConfig
    );

    // -------------------------------------------------------------
    // Remove protected fields
    // -------------------------------------------------------------

    const {
        id,
        updated_at,
        academic_update_version,
        ...payload
    } = configData;

    // -------------------------------------------------------------
    // Academic update version logic
    // -------------------------------------------------------------

    const currentPrompt =
        Boolean(
            currentConfig.prompt_student_academic_update
        );

    const requestedPrompt =
        payload.prompt_student_academic_update !== undefined
            ? payload.prompt_student_academic_update
            : currentPrompt;

    const currentVersion =
        Number(
            currentConfig.academic_update_version
        ) || 1;

    let newVersion = currentVersion;

    /*
     * Only increment when:
     *
     * false -> true
     */
    if (
        currentPrompt === false &&
        requestedPrompt === true
    ) {
        newVersion =
            currentVersion + 1;

        console.log(
            `[SystemConfig] Starting new academic update cycle: ${currentVersion} -> ${newVersion}`
        );
    }

    /*
     * Always preserve the current version unless this is
     * the explicit FALSE -> TRUE transition above.
     */
    payload.academic_update_version =
        newVersion;

    payload.updated_at =
        new Date().toISOString();

    console.log(
        '[SystemConfig] Update payload:',
        payload
    );

    // -------------------------------------------------------------
    // Update using the actual database ID we just fetched.
    // -------------------------------------------------------------

    const {
        data: updatedRows,
        error: updateError
    } = await supabase
        .from('system_config')
        .update(payload)
        .eq('id', currentConfig.id)
        .select(SYSTEM_CONFIG_FIELDS);

    if (updateError) {
        console.error(
            '[SystemConfig] Failed to update configuration:',
            updateError
        );

        throw updateError;
    }

    // -------------------------------------------------------------
    // Important diagnostic:
    //
    // If UPDATE returns an empty array, the row matched SELECT
    // but could not be updated. This is usually RLS/policy related.
    // -------------------------------------------------------------

    if (
        !updatedRows ||
        updatedRows.length === 0
    ) {
        const error = new Error(
            'System configuration could not be updated. The database returned 0 updated rows.'
        );

        error.code = 'SYSTEM_CONFIG_UPDATE_ZERO_ROWS';

        console.error(
            '[SystemConfig] ZERO ROW UPDATE:',
            {
                id: currentConfig.id,
                payload,
            }
        );

        throw error;
    }

    const updatedConfig =
        updatedRows[0];

    console.log(
        '[SystemConfig] Updated configuration:',
        updatedConfig
    );

    return updatedConfig;
};


module.exports = {
    getSystemConfig,
    updateSystemConfig,
};