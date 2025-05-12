const express = require('express');
const cors = require('cors');

require("dotenv").config();
const route = require("./routes/student/index.routes.js");
const routeAuthentication=require("./routes/home/index.routes.js");
const routeEquipmentManager=require("./routes/equipment_manager/index.routes.js")
const routeLecturer=require("./routes/lecturer/index.routes.js")
const routeAdmin=require("./routes/admin/index.routes.js")
const app = express();

// CORS configuration
app.use(cors({
    origin: 'http://localhost:5173', // Allow your frontend origin
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());
// Middleware để parse URL-encoded body (cho form submissions)
app.use(express.urlencoded({ extended: true }));

const port=process.env.PORT;

// Gọi route như một hàm
route(app);
routeAuthentication(app);
routeEquipmentManager(app);
routeLecturer(app);
routeAdmin(app);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
