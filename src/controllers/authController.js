const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

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
        const user = await User.findOne({ $or: [{ name }, { email }] });
        if (user) {
            return res
                .status(409)
                .json({ message: "User already exists" });
        }

        const salt = await bcryptjs.genSalt(10);
        const hash = await bcryptjs.hash(password, salt);

        const newUser = User({
            name: name,
            email: email,
            passwordHash: hash,
        })
        await newUser.save()
        res
            .status(201)
            .redirect("/login");
    } catch (error) {
        if (error.code === 11000) {
            return res
                .status(409)
                .json({ message: "User already exists" });
        }

        res
            .status(500)
            .json({ message: error.message })
    }
}

const login = async (req, res) => {
    try {
        const { name, password } = req.body;
        const user = await User.findOne({ name }).select("+passwordHash");
        if (!user) {
            return res
                .status(404)
                .json({ message: "User not found" });
        }
        const { passwordHash } = user;
        const isPasswordValid = await bcryptjs.compare(password, passwordHash);
        if (!isPasswordValid) {
            return res
                .status(401)
                .json({ message: "Invalid password" });
        }

        const payload = {
            userId: user._id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
        }

        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        )

        user.isActive = true;
        user.lastLoginAt = Date.now();
        await user.save();

        res.cookie("token", token, loginCookieOptions())
            .status(200)
            .redirect("/main");
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const update = async (req, res) => {
    try {
        const { name, email, password, newPassword, avatarUrl } = req.body;
        const { userId } = req.user;

        const user = await User.findById(userId).select("+passwordHash");
        if (!user) {
            return res
                .status(404)
                .json({ message: "User not found" });
        }

        const { passwordHash } = user;
        const isPasswordValid = await bcryptjs.compare(password, passwordHash);
        if (!isPasswordValid) {
            return res
                .status(401)
                .json({ message: "Invalid password" });
        }

        if (name) user.name = name;
        if (email) user.email = email;
        if (avatarUrl) user.avatarUrl = avatarUrl;
        if (newPassword) {
            const salt = await bcryptjs.genSalt(10);
            const hash = await bcryptjs.hash(newPassword, salt);
            user.passwordHash = hash;
        }

        await user.save();

        res
            .status(200)
            .json({ message: "User updated successfully" });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const logout = async (req, res) => {
    try {
        const token = req.cookies && req.cookies.token;

        if (token) {
            try {
                const decodedPayload = jwt.verify(token, process.env.JWT_SECRET);
                const { userId } = decodedPayload;

                await User.findByIdAndUpdate(userId, {
                    isActive: false,
                    lastLogoutAt: Date.now()
                })
            } catch (error) {
                // Clear stale or invalid auth cookies without blocking logout.
            }
        }

        res.clearCookie("token", authCookieOptions());

        res
            .status(200)
            .redirect("/login");
    } catch (error) {
        res
            .status(500)
            .json({ message: error.message });
    }
}

const deleteUser = async (req, res) => {
    try {
        const { password } = req.body;
        const { userId } = req.user;

        const user = await User.findById(userId).select("+passwordHash");
        if (!user) {
            return res
                .status(404)
                .json({ message: "User not found" });
        }

        const isPasswordValid = await bcryptjs.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res
                .status(401)
                .json({ message: "Invalid password" });
        }

        await User.findByIdAndDelete(userId)

        res.clearCookie("token", authCookieOptions());

        res
            .status(200)
            .redirect("/login");
    } catch (error) {
        res
            .status(500)
            .json({ message: error.message });
    }
}

module.exports = { signup, login, update, logout, deleteUser };


