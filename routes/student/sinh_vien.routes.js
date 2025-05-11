const express = require('express');
const router=express.Router();
const controllerHome=require("../../controllers/student/home.controller");
const controllerKhoaHoc=require("../../controllers/student/khoa_hoc.controller");
router.get('/',controllerHome.index)
router.get('/khoa-hoc',controllerKhoaHoc.khoa_hoc);
router.get('/lich-thuc-hanh/:sinhVienId',controllerHome.lichThucHanh);
module.exports=router;