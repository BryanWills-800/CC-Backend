const express = require('express');
const cookieParser = require('cookie-parser');

const app = express();
// Use a secure secret key to prevent cookie tampering
const COOKIE_SECRET = 'your_super_secure_secret_key_123!';

app.use(express.json());
app.use(cookieParser(COOKIE_SECRET));

// 1. Define the Role-Permission Matrix
const PERMISSIONS = {
    view_team: ['owner', 'maintainer', 'member', 'viewer'],
    invite_members: ['owner', 'maintainer'],
    change_roles: ['owner'],
    create_project: ['owner', 'maintainer'],
    edit_project: ['owner', 'maintainer'],
    delete_project: ['owner', 'maintainer'],
    create_task: ['owner', 'maintainer', 'member'],
    assign_task: ['owner', 'maintainer'],
    update_assigned_task: ['owner', 'maintainer', 'member'],
    delete_task: ['owner', 'maintainer'],
    view_tasks: ['owner', 'maintainer', 'member', 'viewer'],
    comment: ['owner', 'maintainer', 'member', 'viewer']
};

// 2. Middleware to Authorize Permissions
function requirePermission(permission) {
    return (req, res, next) => {
        // Read the signed cookie to ensure it hasn't been altered by the client
        const userRole = req.signedCookies.role;

        if (!userRole) {
            return res.status(401).json({ error: 'Unauthorized: No session found.' });
        }

        const allowedRoles = PERMISSIONS[permission];

        if (!allowedRoles || !allowedRoles.includes(userRole)) {
            return res.status(403).json({ error: `Forbidden: ${userRole} cannot perform this action.` });
        }

        // Role is valid and authorized
        req.userRole = userRole;
        next();
    };
}

// 3. Authentication Routes (To set the cookie)
app.post('/login', (req, res) => {
    const { role } = req.body; // e.g., "member", "maintainer"
    const validRoles = ['owner', 'maintainer', 'member', 'viewer'];

    if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role provided.' });
    }

    // Set a signed, secure cookie
    res.cookie('role', role, {
        signed: true,       // Cryptographically signs the cookie using the secret
        httpOnly: true,     // Prevents client-side scripts from reading the cookie
        secure: false,      // Set to true in production (requires HTTPS)
        maxAge: 3600000     // 1 hour expiration
    });

    return res.json({ message: `Logged in successfully as ${role}.` });
});

app.post('/logout', (req, res) => {
    res.clearCookie('role');
    return res.json({ message: 'Logged out successfully.' });
});

// 4. Protected Routes Mapped to Your Matrix
app.get('/team', requirePermission('view_team'), (req, res) => {
    res.json({ data: 'Team members list' });
});

app.post('/team/invite', requirePermission('invite_members'), (req, res) => {
    res.json({ message: 'Member invited successfully.' });
});

app.put('/team/role', requirePermission('change_roles'), (req, res) => {
    res.json({ message: 'Role updated successfully.' });
});

app.post('/projects', requirePermission('create_project'), (req, res) => {
    res.json({ message: 'Project created.' });
});

app.delete('/projects/:id', requirePermission('delete_project'), (req, res) => {
    res.json({ message: 'Project deleted.' });
});

app.post('/tasks', requirePermission('create_task'), (req, res) => {
    res.json({ message: 'Task created.' });
});

app.delete('/tasks/:id', requirePermission('delete_task'), (req, res) => {
    res.json({ message: 'Task deleted.' });
});

// Start server
app.listen(3000, () => console.log('Server running on port 3000'));