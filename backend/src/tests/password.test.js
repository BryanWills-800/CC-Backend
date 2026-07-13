jest.mock("bcryptjs", () => ({
    compare: jest.fn(),
    genSalt: jest.fn(),
    hash: jest.fn(),
}));

const bcrypt = require("bcryptjs");
const { comparePassword, hashPassword } = require("../utils/password");

describe("password utility", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("hashPassword salts and hashes with bcrypt", async () => {
        bcrypt.genSalt.mockResolvedValue("salt-10");
        bcrypt.hash.mockResolvedValue("hashed-value");

        await expect(hashPassword("secret")).resolves.toBe("hashed-value");

        expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
        expect(bcrypt.hash).toHaveBeenCalledWith("secret", "salt-10");
    });

    test("comparePassword delegates to bcrypt compare", async () => {
        bcrypt.compare.mockResolvedValue(true);

        await expect(comparePassword("secret", "hash")).resolves.toBe(true);

        expect(bcrypt.compare).toHaveBeenCalledWith("secret", "hash");
    });

    test("comparePassword returns false for mismatched passwords", async () => {
        bcrypt.compare.mockResolvedValue(false);

        await expect(comparePassword("wrong", "hash")).resolves.toBe(false);
    });

    test("comparePassword handles empty password input", async () => {
        bcrypt.compare.mockResolvedValue(false);

        await expect(comparePassword("", "hash")).resolves.toBe(false);
    });
});

