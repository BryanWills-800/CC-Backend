const express = require("express");
const path = require("path");
const morgan = require("morgan");
const expressLayouts = require("express-ejs-layouts");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
const contentRoutes = require("./routes/contentRoutes");
const uiRoutes = require("./routes/uiRoutes");

const createApp = () => {
    const app = express();

    app.use(express.json());
    app.use(express.static(path.join(__dirname, "public")));
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(expressLayouts);
    app.use(morgan("dev"));
    app.use("/css", express.static(path.join(__dirname, "public/css")));

    app.set("view engine", "ejs");
    app.set("views", [
        path.join(__dirname, "views", "mainView"),
        path.join(__dirname, "views"),
    ]);

    app.use("/api/auth", authRoutes);
    app.use("/api/content", contentRoutes);
    app.use("/", uiRoutes);

    return app;
};

module.exports = createApp;
