const express = require('express');
const router = express.Router();
const AppController = require('../controllers/AppController');
const UsersController = require('../controllers/UsersController'); // Import UsersController
const AuthController = require('../controllers/AuthController');
const FilesController = require('../controllers/FilesController');

// Define your endpoints
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);
router.post('/users', UsersController.postNew); // Add the new /users POST endpoint
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);
router.get('/users/me', UsersController.getMe);
router.post('/files', FilesController.postUpload);

module.exports = router;
