const adminRoutes=require("./admin_routes")
module.exports = (app) => {
    app.use('/admin', adminRoutes); 
};