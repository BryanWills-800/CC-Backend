const path = require("path");
const dotenv = require("dotenv");
const dbConnect = require("./config/dbConnect");
const createApp = require("./app");

dotenv.config({ path: path.join(__dirname, "../.env") });

const port = process.env.PORT || 3000;
const app = createApp();

const startServer = async () => {
    await dbConnect();

    app.listen(port, () => {
        console.log(`Server is running on URL http://localhost:${port}`);
    });
};

startServer();
