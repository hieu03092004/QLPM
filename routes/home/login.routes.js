const express = require('express');
const router = express.Router();
const controllerLogin = require('../../controllers/authentication/login.controller');

router.post('/', controllerLogin.login);

module.exports = router;
