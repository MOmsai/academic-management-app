const express = require('express');
const router = express.Router();
const { getConnection } = require('../db');
const path = require('path');

router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'login.html'), (err) => {
        if (err) {
            console.error('Error sending login.html:', err);
            res.status(500).send('Error loading login page');
        }
    });
});

router.get('/AdminRegister', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'AdminRegister.html'), (err) => {
        if (err) {
            console.error('Error sending AdminRegister.html:', err);
            res.status(500).send('Error loading admin register page');
        }
    });
});

router.get('/hodregister', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'HodRegister.html'), (err) => {
        if (err) {
            console.error('Error sending HodRegister.html:', err);
            res.status(500).send('Error loading HOD register page');
        }
    });
});

router.get('/Student', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'StudentRegisterform.html'), (err) => {
        if (err) {
            console.error('Error sending StudentRegisterform.html:', err);
            res.status(500).send('Error loading student register page');
        }
    });
});

router.get('/StudentDashboard', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'student') {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, '..', 'StudentDashboard.html'), (err) => {
        if (err) {
            console.error('Error sending StudentDashboard.html:', err);
            res.status(500).send('Error loading student dashboard');
        }
    });
});

router.get('/Faculty', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'FacultyRegister.html'), (err) => {
        if (err) {
            console.error('Error sending FacultyRegister.html:', err);
            res.status(500).send('Error loading faculty register page');
        }
    });
});

router.get('/HOD', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'hod') {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, '..', 'HodDashboard.html'), (err) => {
        if (err) {
            console.error('Error sending HodDashboard.html:', err);
            res.status(500).send('Error loading HOD dashboard');
        }
    });
});

router.get('/Admin', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, '..', 'AdminDashboard.html'), (err) => {
        if (err) {
            console.error('Error sending AdminDashboard.html:', err);
            res.status(500).send('Error loading admin dashboard');
        }
    });
});

router.get('/FacultyDashboard', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'faculty') {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, '..', 'FacultyDashboard.html'), (err) => {
        if (err) {
            console.error('Error sending FacultyDashboard.html:', err);
            res.status(500).send('Error loading faculty dashboard');
        }
    });
});

router.post('/log', (req, res) => {
    const { username, password, role } = req.body;
    console.log('Login attempt:', { username, password, role });

    if (!username || !password || !role) {
        console.log('Missing credentials:', { username, password, role });
        return res.status(400).json({ success: false, error: 'Missing username, password, or role' });
    }

    var con = getConnection();
    con.connect(function(err) {
        if (err) {
            console.error('Database connection error:', err);
            return res.status(500).json({ success: false, error: 'Database connection failed' });
        }

        let query, params, dashboard;
        switch (role) {
            case 'admin':
                query = "SELECT * FROM admin WHERE adminid = ? AND password = ?";
                params = [username, password];
                dashboard = "/Admin";
                break;
            case 'hod':
                query = "SELECT * FROM department_hod WHERE hod_id = ? AND hod_password = ?";
                params = [username, password];
                dashboard = "/HOD";
                break;
            case 'faculty':
                query = "SELECT * FROM faculty WHERE faculty_id = ? AND password = ?";
                params = [username, password];
                dashboard = "/FacultyDashboard";
                break;
            case 'student':
                query = "SELECT * FROM students WHERE roll_number = ? AND password = ?";
                params = [username, password];
                dashboard = "/StudentDashboard";
                break;
            default:
                console.log('Invalid role:', role);
                return res.status(400).json({ success: false, error: 'Invalid role' });
        }

        console.log('Executing query:', query, params);
        con.query(query, params, function(err, result) {
            if (err) {
                console.error('Query error:', err);
                con.end();
                return res.status(500).json({ success: false, error: 'Database query failed' });
            }

            console.log('Query result:', result);
            if (result.length > 0) {
                // Set session consistently for all roles
                req.session.user = { id: username, role: role };
                console.log('Session set:', req.session.user);
                res.json({ success: true, redirect: dashboard });
            } else {
                console.log('Login failed: No matching user found');
                res.status(401).json({ success: false, error: 'Invalid username or password, please try again' });
            }
            con.end();
        });
    });5
});
// Handle Admin Registration
router.post('/reg', (req, res) => {
    const { fullName, adminId, email, password } = req.body;

    if (!fullName || !adminId || !email || !password) {
        return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    const con = getConnection();
    con.connect(err => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Database connection failed' });
        }

        const query = "INSERT INTO admin (adminid, fullname, email, password) VALUES (?, ?, ?, ?)";
        const params = [adminId, fullName, email, password];

        con.query(query, params, (err, result) => {
            if (err) {
                return res.status(500).json({ success: false, error: 'Registration failed' });
            }

            res.json({ success: true, message: 'Admin registered successfully' , redirect: '/' });
            con.end();
        });
    });
});

module.exports = router;