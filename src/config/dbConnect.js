const mongoose = require("mongoose");
const User = require("../models/userModel");

const dropStaleUserIndexes = async () => {
    const indexes = await User.collection.indexes();
    const hasStaleUsernameIndex = indexes.some((index) => index.name === "username_1");

    if (hasStaleUsernameIndex) {
        await User.collection.dropIndex("username_1");
        console.log("Dropped stale users.username_1 index");
    }
}

const dbConnect = async () => {
    try {
        const connect = await mongoose.connect(process.env.CONNECTION_STRING);
        await dropStaleUserIndexes();
        console.log(`Database connected: ${connect.connection.host} - ${connect.connection.name}`);
    } catch (error) {
        console.log(error.message);
        process.exit(1);
    }
}

module.exports = dbConnect;
module.exports.dropStaleUserIndexes = dropStaleUserIndexes;