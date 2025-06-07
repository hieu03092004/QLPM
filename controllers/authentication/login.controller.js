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
    // Lấy thông tin user từ bảng TaiKhoan
    const { data: userInfo, error: userInfoError } = await supabase
      .from("TaiKhoan")
      .select(`
        ho_va_ten,
        ma_vai_tro,
        VaiTro!inner(
          ten_vai_tro
        )
      `)
      .eq("email", email)
      .single();

    if (userInfoError) {
      console.error("Lỗi khi lấy thông tin user:", userInfoError);
      return res.status(500).json({
        statusCode: 500,
        success: false,
        message: "Lỗi khi lấy thông tin user"
      });
    }

    if (!userInfo) {
      return res.status(404).json({
        statusCode: 404,
        success: false,
        message: "Không tìm thấy thông tin user"
      });
    }

    console.log("userInfo", userInfo);

    // Đăng nhập với Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error("Lỗi xác thực:", authError);
      return res.status(401).json({
        statusCode: 401,
        success: false,
        message: "Email hoặc mật khẩu không đúng",
      });
    }

    // Lấy thông tin user từ auth
    const { data: userData, error: userDataError } = await supabase
      .from("TaiKhoan")
      .select("*")
      .eq("email", email)
      .single();

    if (userDataError) {
      console.error("Lỗi khi lấy thông tin user:", userDataError);
      return res.status(500).json({
        statusCode: 500,
        success: false,
        message: "Lỗi khi lấy thông tin user",
      });
    }

    // Cập nhật ho_va_ten và ma_vai_tro trong bảng TaiKhoan
    const { error: updateError } = await supabase
      .from("TaiKhoan")
      .update({ 
        ho_va_ten: userInfo.ho_va_ten,
        ma_vai_tro: userInfo.ma_vai_tro 
      })
      .eq("ma_so_tai_khoan", userData.ma_so_tai_khoan);

    if (updateError) {
      console.error("Lỗi khi cập nhật thông tin:", updateError);
      return res.status(500).json({
        statusCode: 500,
        success: false,
        message: "Lỗi khi cập nhật thông tin user"
      });
    }

    const user = {
      id: userData.ma_so_tai_khoan,
      email: userData.email,
      fullName: userInfo.ho_va_ten,
      roleName: userInfo.VaiTro.ten_vai_tro,
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
