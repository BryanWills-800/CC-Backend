const jwt = require("jsonwebtoken");
const { prismaRepositories } = require("../repositories/prismaRepositories");
const { hashPassword, comparePassword } = require("../utils/password");

const User = prismaRepositories.User;

const authCookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
});

const loginCookieOptions = () => ({
    ...authCookieOptions(),
    maxAge: 3600000,
});

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

        const payload = {
            userId: user.id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
        };

        const loginToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });

        await User.update(user.id, {
            isActive: true,
            lastLoginAt: new Date(),
        });

        return res.cookie("loginToken", loginToken, loginCookieOptions())
            .status(200)
            .redirect("/team-select");
    } catch (error) {
        return res.status(500).json({ message: error.message });
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

        if (loginToken) {
            try {
                const decodedPayload = jwt.verify(loginToken, process.env.JWT_SECRET);
                await User.update(decodedPayload.userId, {
                    isActive: false,
                    lastLogoutAt: new Date(),
                });
            } catch (error) {
                // Clear stale or invalid auth cookies without blocking logout.
            }
        }

        res.clearCookie("loginToken", authCookieOptions());
        res.clearCookie("roleToken", authCookieOptions());

        return res.status(200).redirect("/login");
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { password } = req.body;
        const { userId } = req.user;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isPasswordValid = await comparePassword(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid password" });
        }

        await User.delete(userId);

        res.clearCookie("loginToken", authCookieOptions());
        res.clearCookie("roleToken", authCookieOptions());

        return res.status(200).redirect("/login");
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

module.exports = { signup, login, update, logout, deleteUser };
