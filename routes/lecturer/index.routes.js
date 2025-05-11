const lecturerRoutes=require("./lecturer.routes");
module.exports = (app) => {
    app.use('/can-bo-giang-day', lecturerRoutes);
};