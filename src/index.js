const express = require("express");
const path = require('path');
const dotenv = require('dotenv');
const morgan = require('morgan');
const expressLayouts = require('express-ejs-layouts');
const cookieParser = require('cookie-parser');
const dbConnect = require('./config/dbConnect');
dotenv.config({ path: path.join(__dirname, '../.env') });
const authRoutes = require("./routes/authRoutes");
const contentRoutes = require("./routes/contentRoutes");
const uiRoutes = require("./routes/uiRoutes");
const buttonRoutes = require("./routes/buttonRoutes");
// const { permissions, checkPermissions } = require("./permissions");

// DB Connection
dbConnect()

// App Configuration
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
app.use("/api/auth", authRoutes);
app.use("/api/content", contentRoutes);
app.use("/", uiRoutes);
// app.use("/buttons", buttonRoutes);


// Start the Server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on URL http://localhost:${port}`);
});

