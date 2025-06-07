const authorizationRoutes=require("./authorization_routes")
module.exports = (app) => {
    app.use('/authorization', authorizationRoutes); 
};