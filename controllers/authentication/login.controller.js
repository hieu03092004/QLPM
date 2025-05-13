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
    // Đăng nhập với Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: "Đăng nhập thất bại: " + authError.message,
      });
    }

    // Lấy thông tin chi tiết user từ bảng TaiKhoan
    const { data: userData, error: userError } = await supabase
      .from("TaiKhoan")
      .select("ma_so_tai_khoan, email, ho_va_ten, ma_vai_tro, trang_thai")
      .eq("email", email)
      .single();

    if (userError || !userData) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Không tìm thấy thông tin người dùng",
      });
    }

    // Format user data
    const user = {
      id: userData.ma_so_tai_khoan,
      email: userData.email,
      fullName: userData.ho_va_ten,
      roleId: userData.ma_vai_tro,
      status: userData.trang_thai,
    };

    // Set expiration durations
    const accessTokenExpiresIn = 60 * 60; // 1 hour in seconds
    const refreshTokenExpiresIn = 60 * 60 * 24 * 7; // 7 days in seconds

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      SECRET_KEY,
      { expiresIn: accessTokenExpiresIn }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      REFRESH_SECRET_KEY,
      { expiresIn: refreshTokenExpiresIn }
    );

    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "Đăng nhập thành công",
      accessToken: accessToken,
      accessTokenExpiresIn: accessTokenExpiresIn,
      refreshToken: refreshToken,
      refreshTokenExpiresIn: refreshTokenExpiresIn,
      data: user,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Lỗi máy chủ: " + err.message,
    });
  }
};
