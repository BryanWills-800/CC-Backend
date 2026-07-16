const { actionRegistry, actionRequiresTeamRole } = require("../actions/actionRegistry");

describe("action registry", () => {
    test("every action has matching form metadata, service, and auth policy", () => {
        Object.entries(actionRegistry).forEach(([actionName, definition]) => {
            expect(definition.form.action).toBe(actionName);
            expect(typeof definition.service).toBe("function");
            expect(typeof definition.requiresTeamRole).toBe("boolean");
        });
    });

    test("createTeam is the only action that skips selected-team role authorization", () => {
        expect(actionRequiresTeamRole("createTeam")).toBe(false);

        Object.keys(actionRegistry)
            .filter((actionName) => actionName !== "createTeam")
            .forEach((actionName) => {
                expect(actionRequiresTeamRole(actionName)).toBe(true);
            });
    });

    test("unknown actions do not require role authorization before controller rejection", () => {
        expect(actionRequiresTeamRole("unknownAction")).toBe(false);
        expect(actionRequiresTeamRole()).toBe(false);
    });
});
