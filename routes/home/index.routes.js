const loginRoutes=require("./login.routes")
const userRoutes=require("./user.routes")

module.exports = (app) => {
    app.use('/api/v1/login', loginRoutes);
    app.use('/api/v1/get-user', userRoutes);
};