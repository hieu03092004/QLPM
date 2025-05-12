const supabase = require("../../config/database");

module.exports.getUser = async (req, res) => {
  const userId = req.user.userId; // Lấy từ token đã decode

  try {
    const { data, error } = await supabase
      .from("TaiKhoan")
      .select("ma_so_tai_khoan, email, ho_va_ten, ma_vai_tro, trang_thai")
      .eq("ma_so_tai_khoan", userId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Không tìm thấy người dùng",
      });
    }

    // Format lại key nếu cần đồng bộ với FE:
    const user = {
      id: data.ma_so_tai_khoan,
      email: data.email,
      fullName: data.ho_va_ten,
      roleId: data.ma_vai_tro,
      status: data.trang_thai,
    };

    return res.status(200).json({
      success: true,
      statusCode: 200,
      data: [user],
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Lỗi máy chủ: " + err.message,
    });
  }
};

module.exports.getAllUser = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("TaiKhoan")
      .select("ma_so_tai_khoan, email, ho_va_ten, ma_vai_tro, trang_thai");

    if (error) {
      return res.status(500).json({
        success: false,
        statusCode: 500,
        message: "Lỗi khi lấy danh sách người dùng: " + error.message,
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Không tìm thấy người dùng nào",
      });
    }

    // Format lại data cho đồng bộ với FE
    const formattedUsers = data.map(user => ({
      id: user.ma_so_tai_khoan,
      email: user.email,
      fullName: user.ho_va_ten,
      roleId: user.ma_vai_tro,
      status: user.trang_thai
    }));

    return res.status(200).json({
      success: true,
      statusCode: 200,
      data: formattedUsers
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Lỗi máy chủ: " + err.message,
    });
  }
};
