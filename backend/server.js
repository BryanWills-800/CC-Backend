const express = require("express");
const Joi = require("joi");
const fs = require("fs");

const app = express();
app.use(express.json());

// ---------------------
// Data
// ---------------------

const USERS_FILE = "./users.json";
const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));

function saveUsers() {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 4));
}

// ---------------------
// Validation
// ---------------------

const userSchema = Joi.object({
    name: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(5).max(30).required(),
    role: Joi.string()
        .valid("admin", "maintainer", "member", "viewer")
        .default("viewer")
});

function validateUser(user) {
    return userSchema.validate(user);
}

// ---------------------
// Middleware
// ---------------------

app.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
});

// ---------------------
// Helpers
// ---------------------

function getUser(id) {
    return users.find(user => user.id === Number(id));
}

function getUserIndex(id) {
    return users.findIndex(user => user.id === Number(id));
}

// ---------------------
// Routes
// ---------------------

app.get("/", (req, res) => {
    res.send("Hello World!");
});

// GET /users
app.get("/users", (req, res) => {
    let result = [...users];

    // Filtering
    const filterFields = ["name", "email", "role"];

    for (const field of filterFields) {
        if (req.query[field]) {
            result = result.filter(user =>
                String(user[field])
                    .toLowerCase()
                    .includes(req.query[field].toLowerCase())
            );
        }
    }

    // Sorting
    if (req.query.sortBy) {
        const key = req.query.sortBy;

        if (result.length && key in result[0]) {
            result.sort((a, b) => {
                if (typeof a[key] === "number") {
                    return a[key] - b[key];
                }

                return String(a[key]).localeCompare(String(b[key]));
            });
        }
    }

    // Reverse
    if (req.query.reversed === "true") {
        result.reverse();
    }

    res.json(result);
});

// GET /users/:id
app.get("/users/:id", (req, res) => {
    const user = getUser(req.params.id);

    if (!user) {
        return res.status(404).send("User not found");
    }

    // Example:
    // /users/1?field=name

    if (req.query.field) {
        const field = req.query.field;

        if (!(field in user)) {
            return res.status(400).send("Invalid field");
        }

        return res.send(String(user[field]));
    }

    res.json(user);
});

// POST /users
app.post("/users", (req, res) => {
    const { error } = validateUser(req.body);

    if (error) {
        return res.status(400).send(error.details[0].message);
    }

    const newUser = {
        id: users.length
            ? users[users.length - 1].id + 1
            : 1,
        ...req.body
    };

    users.push(newUser);
    saveUsers();

    res.status(201).json(newUser);
});

// PUT /users/:id
app.put("/users/:id", (req, res) => {
    const { error } = validateUser(req.body);

    if (error) {
        return res.status(400).send(error.details[0].message);
    }

    const index = getUserIndex(req.params.id);

    if (index === -1) {
        return res.status(404).send("User not found");
    }

    users[index] = {
        id: users[index].id,
        ...req.body
    };

    saveUsers();

    res.json(users[index]);
});

// DELETE /users/:id
app.delete("/users/:id", (req, res) => {
    const index = getUserIndex(req.params.id);

    if (index === -1) {
        return res.status(404).send("User not found");
    }

    const deletedUser = users.splice(index, 1)[0];

    saveUsers();

    res.json(deletedUser);
});

// ---------------------
// Server
// ---------------------

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});