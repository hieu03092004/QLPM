const express = require('express');
const router=express.Router();
const controllerLogin=require("../../controllers/authentication/login.controller")
router.get('/',controllerLogin.login );
module.exports=router;