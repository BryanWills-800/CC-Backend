const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { prismaRepositories } = require("../db/prismaRepositories");

const ACCESS_TOKEN_MS = 1 * 60 * 1000;
const REFRESH_TOKEN_MS = 24 * 60 * 60 * 1000;

const authCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
});

const loginCookieOptions = () => ({
    ...authCookieOptions(),
    maxAge: ACCESS_TOKEN_MS,
});

const refreshCookieOptions = () => ({
    ...authCookieOptions(),
    maxAge: REFRESH_TOKEN_MS,
});

const createAuthError = (statusCode, message, code) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    if (code) error.code = code;
    return error;
};

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const buildAuthPayload = (user) => ({
    userId: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
});

const signAccessToken = (payload) => jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1m" });

const signRefreshToken = ({ payload, family }) => jwt.sign({
    ...payload,
    family,
    jti: crypto.randomUUID(),
}, process.env.JWT_SECRET, { expiresIn: "1d" });

const setAuthCookies = ({ res, accessToken, refreshToken }) => res
    .cookie("loginToken", accessToken, loginCookieOptions())
    .cookie("refreshToken", refreshToken, refreshCookieOptions());

const clearAuthCookies = (res) => {
    res.clearCookie("loginToken", authCookieOptions());
    res.clearCookie("roleToken", authCookieOptions());
    res.clearCookie("refreshToken", authCookieOptions());
};

const storeRefreshToken = async ({ userId, refreshToken, family }, deps = prismaRepositories) => deps.RefreshToken.create({
    userId,
    tokenHash: hashToken(refreshToken),
    family,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_MS),
});

const revokePresentedRefreshFamily = async (refreshToken, deps = prismaRepositories) => {
    if (!refreshToken) return;

    const storedToken = await deps.RefreshToken.findByTokenHash(hashToken(refreshToken));
    if (storedToken && storedToken.family) {
        await deps.RefreshToken.revokeFamily(storedToken.family);
    }
};

const rotateRefreshToken = async (presentedRefreshToken, deps = prismaRepositories) => {
    if (!presentedRefreshToken) {
        throw createAuthError(401, "Refresh token required", "REFRESH_TOKEN_REQUIRED");
    }

    try {
        const decodedPayload = jwt.verify(presentedRefreshToken, process.env.JWT_SECRET);
        const tokenHash = hashToken(presentedRefreshToken);
        const storedToken = await deps.RefreshToken.findByTokenHash(tokenHash);

        if (!storedToken) {
            throw createAuthError(401, "Invalid refresh token", "REFRESH_TOKEN_INVALID");
        }

        if (storedToken.revokedAt) {
            await deps.RefreshToken.revokeFamily(storedToken.family);
            throw createAuthError(401, "Refresh token reuse detected", "REFRESH_TOKEN_REUSED");
        }

        if (storedToken.expiresAt && storedToken.expiresAt <= new Date()) {
            await deps.RefreshToken.revokeFamily(storedToken.family);
            throw createAuthError(401, "Expired refresh token", "REFRESH_TOKEN_EXPIRED");
        }

        const user = await deps.User.findById(decodedPayload.userId);
        if (!user) {
            await deps.RefreshToken.revokeFamily(storedToken.family);
            throw createAuthError(401, "Invalid refresh token", "REFRESH_TOKEN_USER_MISSING");
        }

        const payload = buildAuthPayload(user);
        const family = storedToken.family || decodedPayload.family;
        const accessToken = signAccessToken(payload);
        const replacementRefreshToken = signRefreshToken({ payload, family });

        await deps.RefreshToken.rotate({
            currentTokenId: storedToken.id,
            replacementData: {
                userId: user.id,
                tokenHash: hashToken(replacementRefreshToken),
                family,
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_MS),
            },
        });

        return { payload, accessToken, refreshToken: replacementRefreshToken };
    } catch (error) {
        if (error.statusCode) throw error;

        if (error.code === "REFRESH_TOKEN_REPLAY") {
            try {
                const storedToken = await deps.RefreshToken.findByTokenHash(hashToken(presentedRefreshToken));
                if (storedToken && storedToken.family) await deps.RefreshToken.revokeFamily(storedToken.family);
            } catch (lookupError) {
                // Ignore lookup errors while clearing a failed refresh attempt.
                
            }
        }

        throw createAuthError(401, "Invalid or expired refresh token", "REFRESH_TOKEN_VERIFY_FAILED");
    }
};

module.exports = {
    ACCESS_TOKEN_MS,
    REFRESH_TOKEN_MS,
    authCookieOptions,
    buildAuthPayload,
    clearAuthCookies,
    hashToken,
    loginCookieOptions,
    refreshCookieOptions,
    revokePresentedRefreshFamily,
    rotateRefreshToken,
    setAuthCookies,
    signAccessToken,
    signRefreshToken,
    storeRefreshToken,
};