const { withDynamicOptions } = require("../actions/actionFormOptions");

const getActionInput = (req) => ({
    ...(req.query || {}),
    ...(req.body || {}),
    userId: req.user && req.user.userId,
    teamId: (req.body && req.body.teamId) || (req.query && req.query.teamId) || (req.user && req.user.teamId),
    auditContext: {
        ipAddress: req.ip,
    },
});

const getSuccessMessage = (form, result) => form.successMessage
    ? form.successMessage(result)
    : result.message;

const renderActionForm = (res, form, options = {}) => res
    .status(options.statusCode || 200)
    .render("actionView/actionForm", {
        action: form.action,
        title: form.title,
        eyebrow: form.eyebrow || "Action workflow",
        description: form.description || "Complete this action through the shared action service layer.",
        submitLabel: form.submitLabel || "Submit",
        notesTitle: form.notesTitle || "Action service notes",
        notes: form.notes || [
            "Request input is collected by the renderer.",
            "Validation, authorization, PostgreSQL writes, and audit logging stay in the service layer.",
        ],
        fields: form.fields,
        values: options.values || {},
        errorMessage: options.errorMessage || null,
        successMessage: options.successMessage || null,
    });

const renderRegisteredAction = async (req, res, actionDefinition) => {
    const values = {
        ...getActionInput(req),
        teamName: req.user && req.user.teamName,
    };
    const form = await withDynamicOptions(actionDefinition.form, values);

    if (req.method !== "POST") {
        return renderActionForm(res, form, { values });
    }

    try {
        const result = await actionDefinition.service(values);

        return renderActionForm(res, form, {
            statusCode: form.successStatusCode || 200,
            successMessage: getSuccessMessage(form, result),
            values,
        });
    } catch (error) {
        return renderActionForm(res, form, {
            statusCode: error.statusCode || 500,
            values,
            errorMessage: error.message,
        });
    }
}

const renderUnknownAction = (res) => res.status(400).send("Unknown action");

module.exports = {
    getActionInput,
    renderActionForm,
    renderRegisteredAction,
    renderUnknownAction,
};
