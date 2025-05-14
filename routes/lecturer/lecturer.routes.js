const express = require('express');
const router=express.Router();
const controllerLecturer=require("../../controllers/lecturer/home.controller");
router.get('/',controllerLecturer.index)
router.get('/khoa-hoc/:accountId',controllerLecturer.course);
router.get('/dang-ky-lich-thuc-hanh/:course_class_id',controllerLecturer.registerSchedule );
router.post('/dang-ky-lich-thuc-hanh',controllerLecturer.registerSchedulePost );
module.exports=router;
  
// const request=
//     {
//         "ma_lop_hoc_phan": 'LHP_INS327_241_01',
//         "ma_phong": "G8.101",
//         "lich": [
//             {
//                 "ma_tuan":11,
//                 "ma_ca_thu":2,
//                 "ngay_hoc":'2023-10-24'
//             }
//             {
//                 "ma_tuan":12,
//                 "ma_ca_thu":2,
//                 "ngay_hoc":'2023-10-31'
//             }
//             {
//                 "ma_tuan":13,
//                 "ma_ca_thu":2,
//                 "ngay_hoc":'2023-11-07'
//             }
//             {
//                 "ma_tuan":14,
//                 "ma_ca_thu":2,
//                 "ngay_hoc":'2023-11-14'
//             }
//             {
//                 "ma_tuan":15,
//                 "ma_ca_thu":2,
//                 "ngay_hoc":'2023-11-21'
//             },
//             {
//                 "ma_tuan":16,
//                 "ma_ca_thu":2,
//                 "ngay_hoc":'2023-11-28'
//             }
//             {
//                 "ma_tuan":17,
//                 "ma_ca_thu":2,
//                 "ngay_hoc":'2023-12-05'
//             }
//             {
//                 "ma_tuan":18,
//                 "ma_ca_thu":2,
//                 "ngay_hoc":'2023-12-12'
//             }
//         ],
//     };