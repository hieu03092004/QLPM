const express = require('express');
const router=express.Router();
const controllerLecturer=require("../../controllers/lecturer/home.controller");
router.get('/',controllerLecturer.index)
router.get('/khoa-hoc/:accountId',controllerLecturer.course);
module.exports=router;