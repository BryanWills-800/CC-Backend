const { sendError } = require("../utils/apiResponses");

const createValidationError = (message) => {
    const error = new Error(message);
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    return error;
};

const validateRequiredParams = (...params) => (req, res, next) => {
    const missingParam = params.find((param) => !req.params[param]);
    if (missingParam) return sendError(res, createValidationError(`${missingParam} is required`));
    return next();
};

const validateRequiredBody = (...fields) => (req, res, next) => {
    const missingField = fields.find((field) => {
        const value = req.body && req.body[field];
        return value === undefined || value === null || value === "";
    });

    if (missingField) return sendError(res, createValidationError(`${missingField} is required`));
    return next();
};

const validateEnumQuery = (field, allowedValues) => (req, res, next) => {
    const value = req.query && req.query[field];
    if (value && !allowedValues.includes(value)) {
        return sendError(res, createValidationError(`${field} is invalid`));
    }

    return next();
};

const validateEnumBody = (field, allowedValues) => (req, res, next) => {
    const value = req.body && req.body[field];
    if (value && !allowedValues.includes(value)) {
        return sendError(res, createValidationError(`${field} is invalid`));
    }

    return next();
};

const validatePagination = (req, res, next) => {
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const limit = req.query.limit === undefined ? 20 : Number(req.query.limit);

    if (!Number.isInteger(page) || page < 1) {
        return sendError(res, createValidationError("page must be a positive integer"));
    }

    if (!Number.isInteger(limit) || limit < 1) {
        return sendError(res, createValidationError("limit must be a positive integer"));
    }

    req.pagination = {
        page,
        limit: Math.min(limit, 100),
    };

    return next();
};

module.exports = {
    createValidationError,
    validateEnumBody,
    validateEnumQuery,
    validatePagination,
    validateRequiredBody,
    validateRequiredParams,
};
