const loginRoutes=require("./login.routes")
module.exports = (app) => {
    app.use('/dang-nhap', loginRoutes);
};