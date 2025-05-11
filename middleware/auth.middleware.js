const jwt = require('jsonwebtoken');
const SECRET_KEY = 'your_secret_key';

module.exports = function (req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            statusCode: 401,
            message: 'Không có token hoặc định dạng sai',
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded; // Gán thông tin user đã giải mã vào req
        next();
    } catch (err) {
        return res.status(403).json({
            success: false,
            statusCode: 403,
            message: 'Token không hợp lệ hoặc đã hết hạn',
        });
    }
};
