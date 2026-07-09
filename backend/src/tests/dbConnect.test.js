jest.mock("../models/userModel", () => ({
    collection: {
        indexes: jest.fn(),
        dropIndex: jest.fn(),
    },
}));

const User = require("../models/userModel");
const { dropStaleUserIndexes } = require("../config/dbConnect");

describe("database startup cleanup", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("drops only the stale username index when it exists", async () => {
        User.collection.indexes.mockResolvedValue([
            { name: "_id_", key: { _id: 1 } },
            { name: "username_1", key: { username: 1 }, unique: true },
            { name: "email_1", key: { email: 1 }, unique: true },
        ]);
        User.collection.dropIndex.mockResolvedValue(undefined);

        await dropStaleUserIndexes();

        expect(User.collection.dropIndex).toHaveBeenCalledTimes(1);
        expect(User.collection.dropIndex).toHaveBeenCalledWith("username_1");
    });

    test("does not drop any index when the stale username index is absent", async () => {
        User.collection.indexes.mockResolvedValue([
            { name: "_id_", key: { _id: 1 } },
            { name: "email_1", key: { email: 1 }, unique: true },
        ]);

        await dropStaleUserIndexes();

        expect(User.collection.dropIndex).not.toHaveBeenCalled();
    });
});