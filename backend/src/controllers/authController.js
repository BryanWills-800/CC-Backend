const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { prismaRepositories } = require("../db/prismaRepositories");
const {
    clearAuthCookies,
    buildAuthPayload,
    loginCookieOptions,
    refreshCookieOptions,
    revokePresentedRefreshFamily,
    rotateRefreshToken,
    setAuthCookies,
    signAccessToken,
    signRefreshToken,
    storeRefreshToken,
} = require("../utils/authTokens");
const { hashPassword, comparePassword } = require("../utils/password");

const User = prismaRepositories.User;

const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const user = await User.findByNameOrEmail({ name, email });
        if (user) {
            return res.status(409).json({ message: "User already exists" });
        }

        await User.create({
            name,
            email,
            passwordHash: await hashPassword(password),
        });

        return res.status(201).redirect("/login");
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({ message: "User already exists" });
        }

        return res.status(500).json({ message: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { name, password } = req.body;
        const user = await User.findByName(name);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isPasswordValid = await comparePassword(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid password" });
        }

        const payload = buildAuthPayload(user);
        const family = crypto.randomUUID();
        const accessToken = signAccessToken(payload);
        const refreshToken = signRefreshToken({ payload, family });

        await storeRefreshToken({ userId: user.id, refreshToken, family });
        await User.update(user.id, {
            isActive: true,
            lastLoginAt: new Date(),
        });

        return res
            .cookie("loginToken", accessToken, loginCookieOptions())
            .cookie("refreshToken", refreshToken, refreshCookieOptions())
            .status(200)
            .redirect("/team-select");
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const refresh = async (req, res) => {
    const presentedRefreshToken = req.cookies && req.cookies.refreshToken;

    try {
        const session = await rotateRefreshToken(presentedRefreshToken);

        return setAuthCookies({
            res,
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
        })
            .status(200)
            .json({ message: "Token refreshed" });
    } catch (error) {
        clearAuthCookies(res);
        return res.status(error.statusCode || 401).json({ message: error.message || "Invalid or expired refresh token" });
    }
};

const update = async (req, res) => {
    try {
        const { name, email, password, newPassword, avatarUrl } = req.body;
        const { userId } = req.user;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isPasswordValid = await comparePassword(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid password" });
        }

        const updates = {};
        if (name) updates.name = name;
        if (email) updates.email = email;
        if (avatarUrl) updates.avatarUrl = avatarUrl;
        if (newPassword) updates.passwordHash = await hashPassword(newPassword);

        await User.update(userId, updates);

        return res.status(200).json({ message: "User updated successfully" });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const logout = async (req, res) => {
    try {
        const loginToken = req.cookies && req.cookies.loginToken;
        const refreshToken = req.cookies && req.cookies.refreshToken;

        if (refreshToken) {
            await revokePresentedRefreshFamily(refreshToken);
        }

        if (loginToken) {
            try {
                const decodedPayload = jwt.verify(loginToken, process.env.JWT_SECRET);
                await User.update(decodedPayload.userId, {
                    isActive: false,
                    lastLogoutAt: new Date(),
                });
            } catch (error) {
                console.log("Error while logging out:", error);
            }
        }

        clearAuthCookies(res);
        return res.status(200).redirect("/login");
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { password } = req.body;
        const { userId } = req.user;
        const refreshToken = req.cookies && req.cookies.refreshToken;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isPasswordValid = await comparePassword(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid password" });
        }

        if (refreshToken) {
            await revokePresentedRefreshFamily(refreshToken);
        }

        await User.delete(userId);

        clearAuthCookies(res);
        return res.status(200).redirect("/login");
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = { signup, login, refresh, update, logout, deleteUser };