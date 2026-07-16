const { getActionDefinition } = require("../actions/actionRegistry");
const { renderRegisteredAction, renderUnknownAction } = require("../renderers/actionFormRenderer");

const actionController = async (req, res) => {
    const action = (req.body && req.body.action) || (req.query && req.query.action);
    const actionDefinition = getActionDefinition(action);

    if (!actionDefinition) return renderUnknownAction(res);

    return renderRegisteredAction(req, res, actionDefinition);
}

module.exports = { actionController };
