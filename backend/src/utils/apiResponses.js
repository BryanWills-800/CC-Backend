const ERROR_CODES = {
    400: "VALIDATION_ERROR",
    401: "AUTH_REQUIRED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    503: "DATABASE_UNAVAILABLE",
};

const sendSuccess = (res, { statusCode = 200, message = "Success", data = undefined, pagination }) => {
    const body = { message, ...(data !== undefined ? { data } : {}) };
    if (pagination) body.pagination = pagination;
    return res.status(statusCode).json(body);
};

const sendNoContent = (res) => res.status(204).send();

const sendError = (res, error) => {
    const statusCode = error.statusCode || 500;
    const code = error.code || ERROR_CODES[statusCode] || "INTERNAL_ERROR";
    const message = error.message || "Something went wrong";

    return res.status(statusCode).json({ code, message });
};

module.exports = {
    ERROR_CODES,
    sendError,
    sendNoContent,
    sendSuccess,
};
