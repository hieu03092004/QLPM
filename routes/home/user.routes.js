const express = require('express');
const router = express.Router();
const controllerUser = require('../../controllers/user/user.controller');
const verifyToken = require('../../middleware/auth.middleware');

router.get('/', verifyToken, controllerUser.getUser);

module.exports = router;
