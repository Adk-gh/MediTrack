// C:\Users\HP\MediTrack\controllers\systemConfig.controller.js

const systemConfigService = require('../services/systemConfig.service');

/**
 * GET /api/system-config
 * Returns the application's system configuration.
 */
const getSystemConfig = async (req, res) => {
    try {
        const config = await systemConfigService.getSystemConfig();

        return res.status(200).json({
            success: true,
            data: config,
        });
    } catch (error) {
        console.error(
            '[SystemConfig Controller] Error:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Failed to fetch system configuration.',
        });
    }
};

/**
 * PUT /api/system-config
 * Updates the application's system configuration.
 */
const updateSystemConfig = async (req, res) => {
    try {
        const configData = req.body;

        if (
            !configData ||
            Object.keys(configData).length === 0
        ) {
            return res.status(400).json({
                success: false,
                message: 'No configuration data provided.',
            });
        }

        /*
         * Validate password_rules when it is being updated.
         */
        if (configData.password_rules !== undefined) {
            const rules = configData.password_rules;

            if (
                !rules ||
                typeof rules !== 'object' ||
                Array.isArray(rules)
            ) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid password rules configuration.',
                });
            }

            const {
                minLength,
                requireUppercase,
                requireLowercase,
                requireNumber,
                requireSpecialCharacter,
            } = rules;

            const parsedMinLength = Number(minLength);

            if (
                !Number.isInteger(parsedMinLength) ||
                parsedMinLength < 4 ||
                parsedMinLength > 128
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Password minimum length must be between 4 and 128.',
                });
            }

            const booleanFields = [
                'requireUppercase',
                'requireLowercase',
                'requireNumber',
                'requireSpecialCharacter',
            ];

            for (const field of booleanFields) {
                if (typeof rules[field] !== 'boolean') {
                    return res.status(400).json({
                        success: false,
                        message:
                            `${field} must be true or false.`,
                    });
                }
            }

            // Normalize the object before saving.
            configData.password_rules = {
                minLength: parsedMinLength,
                requireUppercase,
                requireLowercase,
                requireNumber,
                requireSpecialCharacter,
            };
        }

        const updatedConfig =
            await systemConfigService.updateSystemConfig(
                configData
            );

        return res.status(200).json({
            success: true,
            data: updatedConfig,
            message:
                'System configuration updated successfully.',
        });
    } catch (error) {
        console.error(
            '[SystemConfig Controller] Error updating config:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Failed to update system configuration.',
        });
    }
};

module.exports = {
    getSystemConfig,
    updateSystemConfig,
};