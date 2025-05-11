const express = require('express');
const router=express.Router();
const controllerEquipmentManager=require("../../controllers/equipment_manager/index.controller")
router.get('/',controllerEquipmentManager.index);
router.get('/thiet-bi',controllerEquipmentManager.devices);
router.patch('/thiet-bi/edit/:id',controllerEquipmentManager.edit);
router.post(
  "/thiet-bi/add/",
  controllerEquipmentManager.createPost
);
router.get('/phong',controllerEquipmentManager.rooms);
module.exports=router;