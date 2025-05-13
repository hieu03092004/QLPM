const supabase = require('../../config/database');

module.exports.khoa_hoc = async (req, res) => {
    try {
        const { sinhVienId } = req.params;
        console.log("sinhVienId:", sinhVienId);

        // Truy vấn với chỉ rõ mối quan hệ FK bằng !<relationship_name>
        const { data: lopHocPhanData, error: lopHocPhanError } = await supabase
            .from('LopHocPhan_SinhVien')
            .select(`
                ma_lop_hoc_phan,
                LopHocPhan (
                    ma_lop_hoc_phan,
                    ma_hoc_phan,
                    HocPhan (
                        ten_hoc_phan
                    ),
                    ma_tai_khoan_can_bo_giang_day,
                    TaiKhoan!FK_LopHocPhan_TaiKhoan (
                        ho_va_ten
                    ),
                    ma_nam_hoc_hoc_ky,
                    NamHoc_HocKy (
                        ma_nam_hoc,
                        ma_hoc_ky
                    )
                )
            `)
            .eq('sinh_vien_id', sinhVienId);

        if (lopHocPhanError) {
            console.error("Lỗi khi truy vấn LopHocPhan_SinhVien:", lopHocPhanError);
            return res.status(500).json({ error: "Lỗi khi lấy thông tin khóa học" });
        }

        // Xử lý dữ liệu trả về
        const data = {
            statusCode: 200,
            success: true,
            data: lopHocPhanData.map(item => {
                const lop = item.LopHocPhan;
                const hocPhan = lop.HocPhan?.ten_hoc_phan || "Không rõ";
                const giangVien = lop.TaiKhoan?.ho_va_ten || "Chưa cập nhật";

                const namHocHocKy = lop.NamHoc_HocKy;
                console.log("namHocHocKy",namHocHocKy);
                let hocKyText = "Học kỳ không xác định";
                switch (namHocHocKy?.ma_hoc_ky) {
                    case 1:
                        hocKyText = "Học kỳ 1";
                        break;
                    case 2:
                        hocKyText = "Học kỳ 2";
                        break;
                    case 3:
                        hocKyText = "Học kỳ hè";
                        break;
                }

                const academicVersion = `${namHocHocKy.ma_nam_hoc} ${hocKyText}`;

                return {
                    courseId: item.ma_lop_hoc_phan,
                    name: hocPhan,
                    academicVersion,
                    lecturer: giangVien
                };
            })
        };

        console.log("Response data:\n", JSON.stringify(data, null, 2));
        return res.status(200).json(data);

    } catch (error) {
        console.error("Lỗi bất ngờ:", error);
        return res.status(500).json({ 
            statusCode: 500,
            success: false,
            error: "Đã xảy ra lỗi khi xử lý yêu cầu" 
        });
    }
};



module.exports.nhomThucHanh = async (req, res) => {
  try {
    const { ma_lop_hoc_phan } = req.params
    console.log('ma_lop_hoc_phan:', ma_lop_hoc_phan)

    const { data, error } = await supabase
      .from('NhomThucHanh')
      .select(`
        ma_nhom_thuc_hanh,
        phong_thuc_hanh,
        LopHocPhan!FK_NhomTH_LopHocPhan (
          HocPhan!FK_LopHocPhan_HocPhan (
            ten_hoc_phan
          )
        )
      `)
      .eq('ma_lop_hoc_phan', ma_lop_hoc_phan)

    if (error) {
      console.error('Error fetching NhomThucHanh:', error)
      return res.status(500).json({
        statusCode: 500,
        success: false,
        error: 'Lỗi khi lấy danh sách nhóm thực hành'
      })
    }

    const result = data.map(item => ({
      ma_nhom_thuc_hanh: item.ma_nhom_thuc_hanh,
      ten_hoc_phan: item.LopHocPhan.HocPhan.ten_hoc_phan,
      phong: item.phong_thuc_hanh
    }))

    console.log('nhomThucHanh result:', result)
    return res.status(200).json({
      statusCode: 201,
      success: true,
      data: result
    })

  } catch (err) {
    console.error('Unexpected error in nhomThucHanh:', err)
    return res.status(500).json({
      statusCode: 500,
      success: false,
      error: 'Đã xảy ra lỗi khi xử lý yêu cầu'
    })
  }
}


