const express = require('express');
const router=express.Router();
const adminController=require("../../controllers/admin/index.controller")
router.get('/',adminController.index);
router.get('/tai-khoan',adminController.accounts);
module.exports = router;