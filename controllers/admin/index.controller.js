const supabase  = require('../../config/database');
module.exports.index=(req, res) => {
    res.send('Đây là trang chủ của admin');
}
module.exports.accounts = async (req, res) => {
  try {
    // query TaiKhoan kèm thông tin role từ bảng VaiTro
    const { data, error } = await supabase
      .from('TaiKhoan')
      .select(`
        ho_va_ten,
        email,
        trang_thai,
        VaiTro (
          ten_vai_tro
        )
      `);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        statusCode: 500,
        message: error.message
      });
    }

    // map lại thành cấu trúc mong muốn
    const formatted = data.map(row => ({
      ten: row.ho_va_ten,
      email: row.email,
      trang_thai: row.trang_thai,
      vai_tro: row.VaiTro.ten_vai_tro
    }));

    return res.status(200).json({
      success: true,
      statusCode: 200,
      data: formatted
    });

  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: 'Lỗi server'
    });
  }
};
const result={
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "ten": "NguyenVanA",
      "email": "vana@gmai.com",
      "trang_thai": "active",
      "vai_tro": "Teacher",
    },
    {
      "ten": "NguyenVanB",
      "email": "vanb@gmai.com",
      "trang_thai": "active",
      "vai_tro": "Student",
    }
  ]
}

