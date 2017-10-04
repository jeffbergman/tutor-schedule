const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const noteController = require('../controllers/noteController');
const { catchErrors } = require('../handlers/errorHandlers');

router.get('/', catchErrors(studentController.getStudents));
router.get('/students', catchErrors(studentController.getStudents));
router.get('/students/page/:page', catchErrors(studentController.getStudents));
router.get('/add', authController.isLoggedIn, studentController.addStudent);

router.post('/add', 
	authController.isLoggedIn,
	studentController.upload,
	catchErrors(studentController.resize),
	catchErrors(studentController.createStudent)
);

router.post('/add/:id', 
	authController.isLoggedIn,
	studentController.upload,
	catchErrors(studentController.resize),
	catchErrors(studentController.updateStudent)
);

router.get('/students/:id/edit', authController.isLoggedIn, catchErrors(studentController.editStudent));
router.get('/students/:slug', catchErrors(studentController.getStudentBySlug));

router.get('/tags', catchErrors(studentController.getStudentsByTag));
router.get('/tags/:tag', catchErrors(studentController.getStudentsByTag));

router.get('/login', userController.loginForm);
router.post('/login', authController.login);

router.get('/register', userController.registerForm);

router.post('/register', 
	userController.validateRegister,
	userController.register,
	authController.login
);

router.get('/logout', authController.logout); 
router.get('/account', authController.isLoggedIn, userController.account);
router.post('/account', catchErrors(userController.updateAccount));
router.post('/account/forgot', catchErrors(authController.forgot));
router.get('/account/reset/:token', catchErrors(authController.reset));
router.post('/account/reset/:token', 
	authController.confirmedPasswords, 
	catchErrors(authController.update)
);

router.post('/notes/:id', authController.isLoggedIn, catchErrors(noteController.addNote));

router.get('/schedule', authController.isLoggedIn, catchErrors(studentController.getSchedule));
router.get('/api/schedule', authController.isLoggedIn, catchErrors(studentController.getScheduleAPI));

/** API **/
router.get('/api/search', catchErrors(studentController.searchStudents));


module.exports = router;
