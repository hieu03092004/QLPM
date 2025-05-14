const supabase = require('../../config/database');
module.exports.khoa_hoc = async (req, res) => {
    try {
        const { sinhVienId } = req.params;
        // Lấy thông tin từ query parameters
        const { ma_hoc_ky, ma_nam_hoc } = req.query;
        
        console.log("sinhVienId:", sinhVienId);
        console.log("Filter parameters:", { ma_hoc_ky, ma_nam_hoc });

        // Truy vấn với chỉ rõ mối quan hệ FK bằng !<relationship_name>
        let query = supabase
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

        const { data: lopHocPhanData, error: lopHocPhanError } = await query;

        if (lopHocPhanError) {
            console.error("Lỗi khi truy vấn LopHocPhan_SinhVien:", lopHocPhanError);
            return res.status(500).json({ error: "Lỗi khi lấy thông tin khóa học" });
        }

        // Lọc dữ liệu theo ma_hoc_ky và ma_nam_hoc nếu được cung cấp
        let filteredData = lopHocPhanData;
        
        if (ma_hoc_ky || ma_nam_hoc) {
            filteredData = lopHocPhanData.filter(item => {
                const namHocHocKy = item.LopHocPhan.NamHoc_HocKy;
                
                // Kiểm tra ma_hoc_ky nếu được cung cấp
                if (ma_hoc_ky && namHocHocKy.ma_hoc_ky !== parseInt(ma_hoc_ky)) {
                    return false;
                }
                
                // Kiểm tra ma_nam_hoc nếu được cung cấp
                if (ma_nam_hoc && namHocHocKy.ma_nam_hoc !== ma_nam_hoc) {
                    return false;
                }
                
                return true;
            });
        }

        console.log("Filtered data count:", filteredData.length);

        // Xử lý dữ liệu trả về
        const data = {
            statusCode: 200,
            success: true,
            data: filteredData.map(item => {
                const lop = item.LopHocPhan;
                const hocPhan = lop.HocPhan?.ten_hoc_phan || "Không rõ";
                const giangVien = lop.TaiKhoan?.ho_va_ten || "Chưa cập nhật";

                const namHocHocKy = lop.NamHoc_HocKy;
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
                    ma_lop_hoc_phan: item.ma_lop_hoc_phan,
                    ten_hoc_phan: hocPhan,
                    nam_hoc_hoc_ky: academicVersion,
                    ten_giang_vien: giangVien
                };
            })
        };

        console.log("Response data count:", data.data.length);
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
module.exports.chiTietNhomThucHanh = async (req, res) => {
  try {
    const { ma_nhom_thuc_hanh } = req.params;
    if (!ma_nhom_thuc_hanh) {
      return res.status(400).json({
        statusCode: 400,
        success: false,
        error: 'Mã nhóm thực hành không được để trống'
      });
    }

    // 1. Lấy tất cả phiếu đăng ký của nhóm này
    const { data: phieuDangKy, error: phieuDangKyError } = await supabase
      .from('PhieuDangKy')
      .select('ma_phieu')
      .eq('ma_nhom_thuc_hanh', ma_nhom_thuc_hanh);

    if (phieuDangKyError || !phieuDangKy || phieuDangKy.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        success: false,
        error: 'Không tìm thấy phiếu đăng ký cho nhóm thực hành này'
      });
    }

    const maPhieuArr = phieuDangKy.map(p => p.ma_phieu);

    // 2. Lấy tất cả chi tiết đăng ký theo các phiếu này
    const { data: chiTietDangKy, error: chiTietDangKyError } = await supabase
      .from('ChiTietDangKy')
      .select('ma_tuan, ma_ca_thu, ngay_hoc')
      .in('ma_phieu', maPhieuArr);

    if (chiTietDangKyError || !chiTietDangKy || chiTietDangKy.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        success: false,
        error: 'Không tìm thấy chi tiết đăng ký cho nhóm thực hành này'
      });
    }

    // 3. Lấy danh sách ma_ca_thu duy nhất
    const uniqueMaCaThu = [
      ...new Set(chiTietDangKy.map(item => item.ma_ca_thu))
    ];

    // 4. Lấy thông tin ca/thứ từ bảng CaHoc_ThuTrongTuan
    const { data: listCaThu, error: caThuError } = await supabase
      .from('CaHoc_ThuTrongTuan')
      .select('ma_ca_thu, ma_ca, ma_thu')
      .in('ma_ca_thu', uniqueMaCaThu);
    console.log("listCaThu",listCaThu)
    if (caThuError || !listCaThu || listCaThu.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        success: false,
        error: 'Không tìm thấy thông tin ca/thứ cho nhóm thực hành này'
      });
    }
    const  ma_ca=listCaThu[0].ma_ca
    const { data: CaHoc, error: caHocError } = await supabase
      .from('CaHoc')
      .select('gio_bat_dau,gio_ket_thuc')
      .eq('ma_ca_hoc',ma_ca);
    console.log("CaHoc",CaHoc)
    // Map ma_ca_thu => { thu, ca }
    const caThuMap = {};
    listCaThu.forEach(item => {
      caThuMap[item.ma_ca_thu] = {
        thu: item.ma_thu,
        ca: item.ma_ca
      };
    });

    // 5. Gom tuần, ngày bắt đầu/kết thúc, chỉ lấy lichHoc đầu tiên
    const Tuan = [];
    const ngayArr = [];
    let lichHoc = null;

    chiTietDangKy.forEach(item => {
      if (!Tuan.includes(item.ma_tuan)) Tuan.push(item.ma_tuan);
      ngayArr.push(item.ngay_hoc);

      // Trả về lichHoc chỉ với ca_thu đầu tiên
      if (!lichHoc && caThuMap[item.ma_ca_thu]) {
        lichHoc = {
          thu: caThuMap[item.ma_ca_thu].thu,
          ca: caThuMap[item.ma_ca_thu].ca,
          thoi_gian_bat_dau: CaHoc[0].gio_bat_dau.substr(0, 5), // Không có thông tin này trong 2 bảng
          thoi_gian_ket_thuc: CaHoc[0].gio_ket_thuc.substr(0, 5), // Không có thông tin này trong 2 bảng
          ngay_bat_dau: item.ngay_hoc,
          ngay_ket_thuc: item.ngay_hoc
        }
      }
    });

    // Sắp xếp tuần
    Tuan.sort((a, b) => a - b);

    // Ngày bắt đầu là nhỏ nhất, ngày kết thúc là lớn nhất
    const ngay_bat_dau = ngayArr.sort((a, b) => new Date(a) - new Date(b))[0];
    const ngay_ket_thuc = ngayArr.sort((a, b) => new Date(b) - new Date(a))[0];

    // Bổ sung lại ngày bắt đầu/kết thúc cho lichHoc
    if (lichHoc) {
      lichHoc.ngay_bat_dau = ngay_bat_dau;
      lichHoc.ngay_ket_thuc = ngay_ket_thuc;
    }

    return res.status(200).json({
      statusCode: 200,
      success: true,
      data: [
        {
          phong: null, // Không có thông tin phòng trong 2 bảng này
          Tuan,
          lichHoc
        }
      ]
    });

  } catch (err) {
    console.error('Lỗi không mong đợi:', err);
    return res.status(500).json({
      statusCode: 500,
      success: false,
      error: 'Đã xảy ra lỗi khi xử lý yêu cầu'
    });
  }
}



