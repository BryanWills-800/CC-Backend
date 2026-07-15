const express = require("express");
const path = require('path');
const dotenv = require('dotenv');
const morgan = require('morgan');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const { prismaConnect } = require('./db/prismaConnect');
dotenv.config({ path: path.join(__dirname, '../.env') });
const authRoutes = require("./routes/authRoutes");
const contentRoutes = require("./routes/contentRoutes");
const restApiRoutes = require("./routes/restApiRoutes");
const { health } = require("./controllers/restApiController");
const uiRoutes = require("./routes/uiRoutes");
// const { permissions, checkPermissions } = require("./permissions");

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(expressLayouts);
app.use(morgan("dev"));
app.use('/css', express.static(path.join(__dirname, 'public/css')));

// View Engine
app.set("view engine", "ejs");
app.set("views", [
    path.join(__dirname, "views", "mainView"),
    path.join(__dirname, "views"),
]);

// Routes
app.get("/health", health);
app.use("/v1/api/auth", authRoutes);
app.use("/v1/api/content", contentRoutes);
app.use("/v1/api", restApiRoutes);
app.use("/", uiRoutes);


// Start the Server
const port = process.env.PORT || 3000;
const startServer = async () => {
    await prismaConnect();

    app.listen(port, () => {
        console.log(`Server is running on URL http://localhost:${port}`);
    });
}

startServer();




