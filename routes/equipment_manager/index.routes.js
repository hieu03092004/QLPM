const equipmentManagerRoutes=require("./equipment_manager.routes")
module.exports = (app) => {
    app.use('/can-bo-quan-ly-thiet-bi', equipmentManagerRoutes);
    
};