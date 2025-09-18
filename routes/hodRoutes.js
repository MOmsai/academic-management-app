const express = require('express');
const router = express.Router();
const { getConnection } = require('../db');

router.get('/hod-details', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'hod') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const hodId = req.session.user.id;
    const con = getConnection();
    con.query("SELECT hod_name, dept_id, dept_name FROM department_hod WHERE hod_id = ?", [hodId], (err, result) => {
        if (err) {
            console.error('Query error in /hod-details:', err);
            con.end();
            return res.status(500).json({ error: 'Query failed' });
        }
        if (result.length > 0) {
            res.json(result[0]);
        } else {
            res.status(404).json({ error: 'HOD not found' });
        }
        con.end();
    });
});

router.get('/subjects', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'hod') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const hodId = req.session.user.id;
    const deptId = req.query.deptId;
    const semester = req.query.semester;
    const course = req.query.course || 'B.Tech'; // Default to B.Tech
    console.log(`Received /subjects request with deptId: ${deptId}, semester: ${semester}, course: ${course}`);

    const con = getConnection();
    let query = `
        SELECT s.subject_id, s.subject_name, s.semester, s.course, s.dept_id, f.faculty_id AS assigned_faculty
        FROM subjects s
        LEFT JOIN faculty_subjects fs ON s.subject_id = fs.subject_id
        LEFT JOIN faculty f ON fs.faculty_id = f.faculty_id
        JOIN department_hod dh ON s.dept_id = dh.dept_id
        WHERE dh.hod_id = ? AND s.course = ?
    `;
    const params = [hodId, course];
    const conditions = [];

    if (deptId) {
        conditions.push("s.dept_id = ?");
        params.push(deptId);
    }
    if (semester) {
        conditions.push("s.semester = ?");
        params.push(semester);
    }

    if (conditions.length > 0) {
        query += " AND " + conditions.join(" AND ");
    }

    console.log(`Query: ${query}, params: ${params}`);
    con.query(query, params, (err, result) => {
        if (err) {
            console.error('Query error in /subjects:', err);
            con.end();
            return res.status(500).json({ error: 'Query failed' });
        }
        console.log(`Subjects Query Result:`, result);
        res.json(result);
        con.end();
    });
});

router.get('/faculty', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'hod') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const hodId = req.session.user.id;
    const deptId = req.query.deptId;
    const con = getConnection();
    let query = `
        SELECT f.faculty_id, f.full_name
        FROM faculty f
        JOIN department_hod dh ON f.dept_id = dh.dept_id
        WHERE dh.hod_id = ?
    `;
    const params = [hodId];

    if (deptId) {
        query += " AND f.dept_id = ?";
        params.push(deptId);
    }

    con.query(query, params, (err, result) => {
        if (err) {
            console.error('Query error in /faculty:', err);
            con.end();
            return res.status(500).json({ error: 'Query failed' });
        }
        res.json(result);
        con.end();
    });
});

router.get('/hod-students', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'hod') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const hodId = req.session.user.id;
    const deptId = req.query.deptId;
    const semester = req.query.semester;
    const course = req.query.course || 'B.Tech'; // Default to B.Tech
    console.log(`Received /hod-students request with deptId: ${deptId}, semester: ${semester}, course: ${course}`);

    const con = getConnection();
    let query = `
        SELECT s.roll_number, s.full_name, s.email, s.semester, s.course, s.dept_id
        FROM students s
        JOIN department_hod dh ON s.dept_id = dh.dept_id
        WHERE dh.hod_id = ? AND s.course = ?
    `;
    const params = [hodId, course];
    const conditions = [];

    if (deptId) {
        conditions.push("s.dept_id = ?");
        params.push(deptId);
    }
    if (semester) {
        conditions.push("s.semester = ?");
        params.push(semester);
    }

    if (conditions.length > 0) {
        query += " AND " + conditions.join(" AND ");
    }

    console.log(`Query: ${query}, params: ${params}`);
    con.query(query, params, (err, result) => {
        if (err) {
            console.error('Query error in /hod-students:', err);
            con.end();
            return res.status(500).json({ error: 'Query failed' });
        }
        console.log(`Students Query Result:`, result);
        res.json(result);
        con.end();
    });
});

router.post('/add-student', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'hod') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const hodId = req.session.user.id;
    const { rollNumber, fullName, email, password, deptId, semester, course = 'B.Tech' } = req.body;
    console.log('Received /add-student request with data:', req.body);

    if (!rollNumber || !fullName || !email || !password || !deptId || !semester || !course) {
        console.log('Missing required fields:', { rollNumber, fullName, email, password, deptId, semester, course });
        return res.status(400).json({ error: `Missing required fields: ${JSON.stringify({ rollNumber, fullName, email, password, deptId, semester, course })}` });
    }

    const con = getConnection();
    con.query("SELECT dept_id FROM department_hod WHERE hod_id = ?", [hodId], (err, result) => {
        if (err) {
            console.error('Query error in /add-student:', err);
            con.end();
            return res.status(500).json({ error: 'Database query failed' });
        }

        if (!result.length) {
            con.end();
            return res.status(404).json({ error: 'HOD not found' });
        }

        const hodDeptId = result[0].dept_id;
        if (hodDeptId !== deptId) {
            con.end();
            return res.status(403).json({ error: 'Unauthorized department' });
        }

        con.query("INSERT INTO students (roll_number, full_name, email, password, dept_id, semester, course) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [rollNumber, fullName, email, password, deptId, semester, course], (err) => {
                if (err) {
                    console.error('Insert student error in /add-student:', err);
                    con.end();
                    return res.status(500).json({ error: 'Failed to add student' });
                }
                res.sendStatus(200);
                con.end();
            });
    });
});

router.put('/update-student', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'hod') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const hodId = req.session.user.id;
    const { rollNumber, fullName, email, password, deptId, semester, course = 'B.Tech' } = req.body;
    console.log('Received /update-student request with data:', req.body);

    if (!rollNumber || !fullName || !email || !deptId || !semester || !course) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const con = getConnection();
    con.query("SELECT dept_id FROM department_hod WHERE hod_id = ?", [hodId], (err, result) => {
        if (err) {
            console.error('Query error in /update-student:', err);
            con.end();
            return res.status(500).json({ error: 'Database query failed' });
        }

        if (!result.length) {
            con.end();
            return res.status(404).json({ error: 'HOD not found' });
        }

        const hodDeptId = result[0].dept_id;
        if (hodDeptId !== deptId) {
            con.end();
            return res.status(403).json({ error: 'Unauthorized department' });
        }

        const updateFields = [fullName, email, semester, course, rollNumber, deptId];
        let query = "UPDATE students SET full_name = ?, email = ?, semester = ?, course = ? WHERE roll_number = ? AND dept_id = ?";
        if (password) {
            query = "UPDATE students SET full_name = ?, email = ?, password = ?, semester = ?, course = ? WHERE roll_number = ? AND dept_id = ?";
            updateFields.splice(2, 0, password);
        }

        con.query(query, updateFields, (err, result) => {
            if (err) {
                console.error('Update student error in /update-student:', err);
                con.end();
                return res.status(500).json({ error: 'Failed to update student' });
            }
            if (result.affectedRows === 0) {
                con.end();
                return res.status(404).json({ error: 'Student not found' });
            }
            res.sendStatus(200);
            con.end();
        });
    });
});

router.delete('/delete-student', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'hod') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const hodId = req.session.user.id;
    const rollNumber = req.query.roll_number;
    const con = getConnection();
    con.query("DELETE FROM students WHERE roll_number = ? AND dept_id IN (SELECT dept_id FROM department_hod WHERE hod_id = ?)", 
        [rollNumber, hodId], (err, result) => {
            if (err) {
                console.error('Query error in /delete-student:', err);
                con.end();
                return res.status(500).json({ error: 'Query failed' });
            }
            if (result.affectedRows === 0) {
                con.end();
                return res.status(403).json({ error: 'Unauthorized student' });
            }
            res.sendStatus(200);
            con.end();
        });
});

router.get('/hod-marks', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'hod') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const hodId = req.session.user.id;
    const deptId = req.query.deptId;
    const semester = req.query.semester;
    const course = req.query.course || 'B.Tech'; // Default to B.Tech
    const subjectId = req.query.subjectId;
    console.log(`Received /hod-marks request with deptId: ${deptId}, semester: ${semester}, course: ${course}, subjectId: ${subjectId}`);

    const con = getConnection();
    let query = `
        SELECT s.roll_number, s.full_name, sub.subject_id, sub.subject_name, sub.semester, sub.course, m.assessment_type, m.mark
        FROM students s
        JOIN subjects sub ON s.dept_id = sub.dept_id AND s.semester = sub.semester AND s.course = sub.course
        JOIN department_hod dh ON s.dept_id = dh.dept_id
        LEFT JOIN marks m ON m.roll_number = s.roll_number AND m.subject_id = sub.subject_id
        WHERE dh.hod_id = ? AND s.course = ?
    `;
    const params = [hodId, course];
    const conditions = [];

    if (deptId) {
        conditions.push("s.dept_id = ?");
        params.push(deptId);
    }
    if (semester) {
        conditions.push("sub.semester = ?");
        params.push(semester);
    }
    if (subjectId) {
        conditions.push("sub.subject_id = ?");
        params.push(subjectId);
    }

    if (conditions.length > 0) {
        query += " AND " + conditions.join(" AND ");
    }

    console.log(`Query: ${query}, params: ${params}`);
    con.query(query, params, (err, result) => {
        if (err) {
            console.error('Query error in /hod-marks:', err);
            con.end();
            return res.status(500).json({ error: 'Query failed' });
        }
        console.log(`Marks Query Result:`, result);
        if (result.length === 0) {
            console.log('No marks found. Breaking down query components:');
            // Debug: Check students
            con.query(
                "SELECT * FROM students s JOIN department_hod dh ON s.dept_id = dh.dept_id WHERE dh.hod_id = ? AND s.course = ? AND s.dept_id = ? AND s.semester = ?",
                [hodId, course, deptId, semester],
                (err, students) => {
                    console.log('Matching students:', students);
                    // Debug: Check subjects
                    con.query(
                        "SELECT * FROM subjects WHERE dept_id = ? AND semester = ? AND course = ? AND subject_id = ?",
                        [deptId, semester, course, subjectId],
                        (err, subjects) => {
                            console.log('Matching subjects:', subjects);
                            // Debug: Check marks
                            con.query(
                                "SELECT * FROM marks WHERE subject_id = ?",
                                [subjectId],
                                (err, marks) => {
                                    console.log('Matching marks:', marks);
                                    res.json(result);
                                    con.end();
                                }
                            );
                        }
                    );
                }
            );
        } else {
            res.json(result);
            con.end();
        }
    });
});

router.post('/add-subject', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'hod') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const hodId = req.session.user.id;
    const { subjectId, subjectName, deptId, semester, course = 'B.Tech', facultyId } = req.body;
    console.log('Received /add-subject request with data:', req.body);

    if (!subjectId || !subjectName || !deptId || !semester || !course) {
        console.log('Missing required fields:', { subjectId, subjectName, deptId, semester, course });
        return res.status(400).json({ error: `Missing required fields: ${JSON.stringify({ subjectId, subjectName, deptId, semester, course })}` });
    }

    const con = getConnection();
    con.query("SELECT dept_id FROM department_hod WHERE hod_id = ?", [hodId], (err, result) => {
        if (err) {
            console.error('Query error in /add-subject:', err);
            con.end();
            return res.status(500).json({ error: 'Database query failed' });
        }

        if (!result.length) {
            con.end();
            return res.status(404).json({ error: 'HOD not found' });
        }

        const hodDeptId = result[0].dept_id;
        if (hodDeptId !== deptId) {
            con.end();
            return res.status(403).json({ error: 'Unauthorized department' });
        }

        con.beginTransaction((err) => {
            if (err) {
                console.error('Transaction error in /add-subject:', err);
                con.end();
                return res.status(500).json({ error: 'Transaction failed' });
            }

            con.query("INSERT INTO subjects (subject_id, subject_name, dept_id, semester, course) VALUES (?, ?, ?, ?, ?)",
                [subjectId, subjectName, deptId, semester, course], (err) => {
                    if (err) {
                        console.error('Insert subjects error in /add-subject:', err);
                        con.rollback(() => con.end());
                        return res.status(500).json({ error: 'Failed to add subject' });
                    }

                    if (facultyId) {
                        con.query("INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES (?, ?)",
                            [facultyId, subjectId], (err) => {
                                if (err) {
                                    console.error('Insert faculty_subjects error in /add-subject:', err);
                                    con.rollback(() => con.end());
                                    return res.status(500).json({ error: 'Failed to assign faculty' });
                                }
                                con.commit((err) => {
                                    if (err) {
                                        console.error('Commit error in /add-subject:', err);
                                        con.rollback(() => con.end());
                                        return res.status(500).json({ error: 'Commit failed' });
                                    }
                                    res.sendStatus(200);
                                    con.end();
                                });
                            });
                    } else {
                        con.commit((err) => {
                            if (err) {
                                console.error('Commit error in /add-subject:', err);
                                con.rollback(() => con.end());
                                return res.status(500).json({ error: 'Commit failed' });
                            }
                            res.sendStatus(200);
                            con.end();
                        });
                    }
                });
        });
    });
});

router.put('/update-subject', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'hod') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const hodId = req.session.user.id;
    const { subjectId, subjectName, deptId, semester, course = 'B.Tech', facultyId } = req.body;
    console.log('Received /update-subject request with data:', req.body);

    if (!subjectId || !subjectName || !deptId || !semester || !course) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const con = getConnection();
    con.query("SELECT dept_id FROM department_hod WHERE hod_id = ?", [hodId], (err, result) => {
        if (err) {
            console.error('Query error in /update-subject:', err);
            con.end();
            return res.status(500).json({ error: 'Database query failed' });
        }

        if (!result.length) {
            con.end();
            return res.status(404).json({ error: 'HOD not found' });
        }

        const hodDeptId = result[0].dept_id;
        if (hodDeptId !== deptId) {
            con.end();
            return res.status(403).json({ error: 'Unauthorized department' });
        }

        con.beginTransaction((err) => {
            if (err) {
                console.error('Transaction error in /update-subject:', err);
                con.end();
                return res.status(500).json({ error: 'Transaction failed' });
            }

            con.query("UPDATE subjects SET subject_name = ?, semester = ?, course = ? WHERE subject_id = ? AND dept_id = ?",
                [subjectName, semester, course, subjectId, deptId], (err, result) => {
                    if (err) {
                        console.error('Update subjects error in /update-subject:', err);
                        con.rollback(() => con.end());
                        return res.status(500).json({ error: 'Failed to update subject' });
                    }
                    if (result.affectedRows === 0) {
                        con.rollback(() => con.end());
                        return res.status(404).json({ error: 'Subject not found' });
                    }

                    // Update faculty assignment
                    con.query("DELETE FROM faculty_subjects WHERE subject_id = ?", [subjectId], (err) => {
                        if (err) {
                            console.error('Delete faculty_subjects error in /update-subject:', err);
                            con.rollback(() => con.end());
                            return res.status(500).json({ error: 'Failed to update faculty assignment' });
                        }

                        if (facultyId) {
                            con.query("INSERT INTO faculty_subjects (faculty_id, subject_id) VALUES (?, ?)",
                                [facultyId, subjectId], (err) => {
                                    if (err) {
                                        console.error('Insert faculty_subjects error in /update-subject:', err);
                                        con.rollback(() => con.end());
                                        return res.status(500).json({ error: 'Failed to assign faculty' });
                                    }
                                    con.commit((err) => {
                                        if (err) {
                                            console.error('Commit error in /update-subject:', err);
                                            con.rollback(() => con.end());
                                            return res.status(500).json({ error: 'Commit failed' });
                                        }
                                        res.sendStatus(200);
                                        con.end();
                                    });
                                });
                        } else {
                            con.commit((err) => {
                                if (err) {
                                    console.error('Commit error in /update-subject:', err);
                                    con.rollback(() => con.end());
                                    return res.status(500).json({ error: 'Commit failed' });
                                }
                                res.sendStatus(200);
                                con.end();
                            });
                        }
                    });
                });
        });
    });
});

router.delete('/delete-subject', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'hod') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const hodId = req.session.user.id;
    const subjectId = req.query.subject_id;
    const con = getConnection();
    con.query("DELETE FROM subjects WHERE subject_id = ? AND dept_id IN (SELECT dept_id FROM department_hod WHERE hod_id = ?)", 
        [subjectId, hodId], (err, result) => {
            if (err) {
                console.error('Query error in /delete-subject:', err);
                con.end();
                return res.status(500).json({ error: 'Query failed' });
            }
            if (result.affectedRows === 0) {
                con.end();
                return res.status(403).json({ error: 'Unauthorized subject' });
            }
            res.sendStatus(200);
            con.end();
        });
});

router.get('/faculty-assignments', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'hod') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const hodId = req.session.user.id;
    const deptId = req.query.deptId;
    const con = getConnection();
    let query = `
        SELECT fs.faculty_id, fs.subject_id, s.subject_name, s.dept_id, s.semester, s.course
        FROM faculty_subjects fs
        JOIN subjects s ON fs.subject_id = s.subject_id
        JOIN department_hod dh ON s.dept_id = dh.dept_id
        WHERE dh.hod_id = ?
    `;
    const params = [hodId];

    if (deptId) {
        query += " AND s.dept_id = ?";
        params.push(deptId);
    }

    con.query(query, params, (err, result) => {
        if (err) {
            console.error('Query error in /faculty-assignments:', err);
            con.end();
            return res.status(500).json({ error: 'Query failed' });
        }
        res.json(result);
        con.end();
    });
});

router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error in /logout:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.sendStatus(200);
    });
});

module.exports = router;