const sinhVienRoutes=require("./sinh_vien.routes");
module.exports = (app) => {
    app.use('/sinh-vien', sinhVienRoutes);
};
