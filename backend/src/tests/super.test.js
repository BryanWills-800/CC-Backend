const fs = require("fs/promises");
const path = require("path");

const testsDir = __dirname;
const expectedTestFiles = [
    "actionController.test.js",
    "actionMessageServices.test.js",
    "auth.test.js",
    "createProject.test.js",
    "dbConnect.test.js",
    "teamMaker.test.js",
    "userController.test.js",
];

const getDiscoveredTestFiles = async () => {
    const files = await fs.readdir(testsDir);

    return files
        .filter((file) => file.endsWith(".test.js") && file !== path.basename(__filename))
        .sort();
};

describe("super test suite inventory", () => {
    test.concurrent.each(expectedTestFiles)("discovers %s", async (testFile) => {
        const discoveredTestFiles = await getDiscoveredTestFiles();

        expect(discoveredTestFiles).toContain(testFile);
    });

    test.concurrent("Jest discovers all focused test files together", async () => {
        const discoveredTestFiles = await getDiscoveredTestFiles();

        expect(discoveredTestFiles).toEqual([...expectedTestFiles].sort());
    });
});
