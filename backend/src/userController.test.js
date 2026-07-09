const { mainController } = require("../controllers/userController");
const { resolveMainRole } = require("../utils/roles");

describe("mainController role selection", () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        process.env = { ...OLD_ENV };
    });

    afterAll(() => {
        process.env = OLD_ENV;
    });

    const createResponse = () => ({
        render: jest.fn(),
    });

    test("uses authenticated JWT role when present", () => {
        process.env.ROLE = "viewer";
        const res = createResponse();

        mainController({ user: { role: "admin" } }, res);

        expect(res.render).toHaveBeenCalledWith("main", { role: "admin" });
    });

    test("uses ROLE env fallback when token has no role", () => {
        process.env.ROLE = "maintainer";
        const res = createResponse();

        mainController({ user: { userId: "user-1" } }, res);

        expect(res.render).toHaveBeenCalledWith("main", { role: "maintainer" });
    });

    test("maps owner role to admin UI buttons", () => {
        process.env.ROLE = "owner";
        const res = createResponse();

        mainController({ user: { userId: "user-1" } }, res);

        expect(res.render).toHaveBeenCalledWith("main", { role: "admin" });
    });

    test("normalizes role casing and spacing", () => {
        expect(resolveMainRole(" Admin ")).toBe("admin");
    });

    test("falls back to viewer when ROLE env is invalid", () => {
        process.env.ROLE = "manager";
        const res = createResponse();

        mainController({ user: { userId: "user-1" } }, res);

        expect(res.render).toHaveBeenCalledWith("main", { role: "viewer" });
    });
});

