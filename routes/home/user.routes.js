const express = require('express');
const router = express.Router();
const controllerUser = require('../../controllers/user/user.controller');
const verifyToken = require('../../middleware/auth.middleware');

// Route lấy thông tin user đang đăng nhập
router.get('/', verifyToken, controllerUser.getUser);

// Route lấy tất cả users
router.get('/all', verifyToken, controllerUser.getAllUser);

module.exports = router;
