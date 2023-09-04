const express = require('express');
const router = express.Router();
const UsersController = require('../controllers/UsersController');
const AppController = require('../controllers/AppController')

// Define your existing endpoints
router.get('/status', AppController.getStatus);
router.get('/stats', AppController.getStats);

// Add the new /users POST endpoint
router.post('/users', UsersController.postNew);

module.exports = router;
