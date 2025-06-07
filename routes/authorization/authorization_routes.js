const express = require('express');
const router=express.Router();
const authorizationController=require("../../Authorization/controllers/index.controller.js")
router.get('/get-feature/:roleName',authorizationController.getFeature);
module.exports = router;