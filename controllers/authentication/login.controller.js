const supabase = require("../../config/database");
const jwt = require("jsonwebtoken");

const SECRET_KEY = "your_secret_key";
const REFRESH_SECRET_KEY = "your_refresh_secret_key";

module.exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: "Email và mật khẩu là bắt buộc",
    });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Đăng nhập thất bại: " + error.message,
      });
    }

    // Set expiration durations
    const accessTokenExpiresIn = 60 * 60; // 1 hour in seconds
    const refreshTokenExpiresIn = 60 * 60 * 24 * 7; // 7 days in seconds

    const accessToken = jwt.sign(
      { userId: data.user.id, email: data.user.email },
      SECRET_KEY,
      { expiresIn: accessTokenExpiresIn }
    );

    const refreshToken = jwt.sign(
      { userId: data.user.id },
      REFRESH_SECRET_KEY,
      { expiresIn: refreshTokenExpiresIn }
    );

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Đăng nhập thành công",
      accessToken: accessToken,
      accessTokenExpiresIn: accessTokenExpiresIn, // giây
      refreshToken: refreshToken,
      refreshTokenExpiresIn: refreshTokenExpiresIn, // giây
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Lỗi máy chủ: " + err.message,
    });
  }
};
