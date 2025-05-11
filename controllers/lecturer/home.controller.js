const supabase = require('../../config/database');
module.exports.index=(req, res) => {
    res.send('Đây là trang chủ của cán bộ giảng dạy');
}
module.exports.course = async (req, res) => {
  try {
    const { accountId } = req.params;
    //console.log(`accountId:${accountId}`);
    console.log(`accountId từ params: "${accountId}"`);
    
    // Đầu tiên, truy vấn thông tin giảng viên
    const { data: lecturerData, error: lecturerError } = await supabase
      .rpc('get_lecturer_by_uuid', { 
        uuid_param: accountId 
      });
    
    console.log('Kết quả truy vấn lecturer:', lecturerData);
    console.log('Lỗi nếu có:', lecturerError);
    
    // Khởi tạo tên giảng viên
    let lecturerName = 'Không xác định';
    if (lecturerError) {
      console.error('Lỗi khi lấy thông tin giảng viên:', lecturerError);
    } else if (lecturerData && lecturerData.length > 0) {
      lecturerName = lecturerData[0].ho_va_ten;
      console.log(`Đã tìm thấy giảng viên: ${lecturerName}`);
    } else {
      console.log(`Không tìm thấy giảng viên với UUID: ${accountId}`);
    }
    
    // Sau đó, truy vấn các lớp học phần
    const { data, error } = await supabase
      .from('LopHocPhan')
      .select(`
        ma_lop_hoc_phan,
        HocPhan (
          ma_hoc_phan,
          ten_hoc_phan
        ),
        NamHoc_HocKy (
          ma_nam_hoc_hoc_ky,
          HocKy (
            ten_hoc_ky
          ),
          NamHoc (
            ma_nam_hoc
          )
        )
      `)
      .eq('ma_tai_khoan_can_bo_giang_day', accountId);
      
    if (error) {
      return res.status(500).json({
        statusCode: 500,
        success: false,
        message: error.message
      });
    }
    
    if (!data || data.length === 0) {
      console.log(`Không tìm thấy lớp học phần nào cho giảng viên với UUID: ${accountId}`);
      // Vẫn trả về kết quả thành công nhưng với mảng rỗng
      return res.status(200).json({
        statusCode: 200,
        success: true,
        data: []
      });
    }
    
    // Chuyển đổi dữ liệu theo định dạng yêu cầu
    const formattedData = data.map(course => ({
      Courseid: course.ma_lop_hoc_phan,
      name: course.HocPhan?.ten_hoc_phan || '',
      academicPeriod: `${course.NamHoc_HocKy?.HocKy?.ten_hoc_ky || ''}, năm học ${course.NamHoc_HocKy?.NamHoc?.ma_nam_hoc || ''}`,
      lecturer: lecturerName // Sử dụng tên giảng viên đã tìm được trước đó
    }));
    
    const result = {
      statusCode: 200,
      success: true,
      data: formattedData
    };
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Lỗi khi truy vấn khóa học:', error);
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: 'Lỗi máy chủ nội bộ'
    });
  }
};
