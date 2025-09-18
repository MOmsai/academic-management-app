const express = require('express');
const router = express.Router();
const { getConnection } = require('../db');

// Student Details API
router.get('/student-details', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'student') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const rollNumber = req.session.user.id;
    const con = getConnection();
    con.connect((err) => {
        if (err) {
            console.error('Database connection error:', err);
            return res.status(500).json({ error: 'Database connection failed' });
        }
        con.query(`
            SELECT s.full_name, s.roll_number, d.dept_name
            FROM students s
            JOIN department_hod d ON s.dept_id = d.dept_id
            WHERE s.roll_number = ?`, [rollNumber], (err, result) => {
            if (err) {
                console.error('Query error:', err);
                con.end();
                return res.status(500).json({ error: 'Query failed' });
            }
            if (result.length === 0) {
                con.end();
                return res.status(404).json({ error: 'Student not found' });
            }
            res.json(result[0]);
            con.end();
        });
    });
});

// Student Marks API
router.get('/student-marks', (req, res) => {
    if (!req.session.user || req.session.user.role !== 'student') {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const rollNumber = req.session.user.id;
    const queryRollNumber = req.query.roll_number;
    if (!queryRollNumber || queryRollNumber !== rollNumber) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const con = getConnection();
    con.connect((err) => {
        if (err) {
            console.error('Database connection error:', err);
            return res.status(500).json({ error: 'Database connection failed' });
        }
        con.query(`
            SELECT s.subject_id, s.subject_name,
                   MAX(CASE WHEN m.assessment_type = 'Assessment 1' THEN m.mark END) as assessment1,
                   MAX(CASE WHEN m.assessment_type = 'Assessment 2' THEN m.mark END) as assessment2,
                   MAX(CASE WHEN m.assessment_type = 'Assignment' THEN m.mark END) as assignment
            FROM subjects s
            LEFT JOIN marks m ON s.subject_id = m.subject_id AND m.roll_number = ?
            WHERE s.dept_id = (SELECT dept_id FROM students WHERE roll_number = ?)
            AND s.course = (SELECT course FROM students WHERE roll_number = ?)
            AND s.semester = (SELECT semester FROM students WHERE roll_number = ?)
            GROUP BY s.subject_id, s.subject_name`, [rollNumber, rollNumber, rollNumber, rollNumber], (err, result) => {
            if (err) {
                console.error('Query error:', err);
                con.end();
                return res.status(500).json({ error: 'Query failed' });
            }
            res.json(result);
            con.end();
        });
    });
});

module.exports = router;