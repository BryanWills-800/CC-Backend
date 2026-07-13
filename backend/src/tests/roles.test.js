const { resolveMainRole } = require("../utils/roles");

describe("role utilities", () => {
    test.each([
        ["admin", "admin"],
        [" Admin ", "admin"],
        ["owner", "admin"],
        ["maintainer", "maintainer"],
        ["member", "member"],
        ["viewer", "viewer"],
        ["", "viewer"],
        [null, "viewer"],
        ["manager", "viewer"],
        ["OWNER", "admin"],
        [" Owner ", "admin"],
        ["ADMIN", "admin"],
        ["MAINTAINER", "maintainer"],
        ["Member", "member"],
        [" VIEWER ", "viewer"],
        [undefined, "viewer"],
        [false, "viewer"],
        [true, "viewer"],
        [0, "viewer"],
        [1, "viewer"],
        [{ role: "admin" }, "viewer"],
        [["admin"], "admin"],
        ["superadmin", "viewer"],
        ["administrator", "viewer"],
        ["maintainers", "viewer"],
        ["members", "viewer"],
        ["viewers", "viewer"],
        [" owner admin ", "viewer"],
        ["admin\n", "admin"],
        ["\tmember\t", "member"],
    ])("resolveMainRole(%p) -> %s", (input, expected) => {
        expect(resolveMainRole(input)).toBe(expected);
    });

    test("resolveMainRole trims and normalizes spacing", () => {
        expect(resolveMainRole(" maintainer ")).toBe("maintainer");
    });
});


