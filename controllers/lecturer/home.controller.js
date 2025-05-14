const { json } = require('express');
const supabase = require('../../config/database');
module.exports.index=(req, res) => {
    res.send('Đây là trang chủ của cán bộ giảng dạy');
}
module.exports.course = async (req, res) => {
  try {
    const { accountId } = req.params;
    // Lấy thêm từ query hoặc body:
   const { ma_nam_hoc, ma_hoc_ky } = req.query; // hoặc req.body nếu post
    console.log("ma_nam_hoc",ma_nam_hoc)
    console.log("ma_hoc_ky",ma_hoc_ky)
    // Lấy thông tin giảng viên
    const { data: lecturerData, error: lecturerError } = await supabase
      .rpc('get_lecturer_by_uuid', { uuid_param: accountId });

    let lecturerName = 'Không xác định';
    if (lecturerData && lecturerData.length > 0) {
      lecturerName = lecturerData[0].ho_va_ten;
    }

    // Truy vấn các lớp học phần
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
            ma_hoc_ky,
            ten_hoc_ky
          ),
          NamHoc (
            ma_nam_hoc
          )
        )
      `)
      .eq('ma_tai_khoan_can_bo_giang_day', accountId);
    for(let i=0;i<data.length;i++)
        console.log("Data[i]",data[i])
    if (error) {
      return res.status(500).json({ 
        statusCode: 500,
        success: false,
        message: error.message
      });
    }

    // Lọc thêm theo năm học và học kỳ nếu có truyền vào
    let filteredData = data;
    
    if (ma_nam_hoc) {
      filteredData = filteredData.filter(course =>
        course.NamHoc_HocKy?.NamHoc?.ma_nam_hoc === ma_nam_hoc
      );
    }
    if (ma_hoc_ky) {
      filteredData = filteredData.filter(course =>
        course.NamHoc_HocKy?.HocKy?.ma_hoc_ky === Number(ma_hoc_ky)
      );
    }
    console.log("filteredData",filteredData)

    if (!filteredData || filteredData.length === 0) {
      return res.status(200).json({
        statusCode: 200,
        success: true,
        data: []
      });
    }

    // Định dạng dữ liệu trả về
    const formattedData = filteredData.map(course => ({
      Courseid: course.ma_lop_hoc_phan,
      name: course.HocPhan?.ten_hoc_phan || '',
      academicPeriod: `${course.NamHoc_HocKy?.HocKy?.ten_hoc_ky || ''}, năm học ${course.NamHoc_HocKy?.NamHoc?.ma_nam_hoc || ''}`,
      lecturer: lecturerName
    }));

    res.status(200).json({
      statusCode: 200,
      success: true,
      data: formattedData
    });
  } catch (error) {
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: 'Lỗi máy chủ nội bộ'
    });
  }
};
module.exports.registerSchedule = async (req, res) => {
  try {
    const {type,roomId}=req.query
    const { course_class_id } = req.params;
    console.log("type:",type);
    // 1. Lấy thông tin lớp học phần
    const { data: lopHocPhanData, error: lopHocPhanError } = await supabase
      .from('LopHocPhan')
      .select(`
        ma_lop_hoc_phan,
        ma_nam_hoc_hoc_ky,
        HocPhan!inner(
          so_tuan_thuc_hanh
        )
      `)
      .eq('ma_lop_hoc_phan', course_class_id)
      .single();

    if (lopHocPhanError) {
      console.error('Lỗi khi truy vấn lớp học phần:', lopHocPhanError);
      return res.status(400).json({
        statusCode: 400,
        success: false,
        message: 'Không tìm thấy lớp học phần hoặc có lỗi khi join bảng'
      });
    }

    const maNamHocHocKy = lopHocPhanData.ma_nam_hoc_hoc_ky;
    const soTuanThucHanh = lopHocPhanData.HocPhan.so_tuan_thuc_hanh;
    console.log('ma_nam_hoc_hoc_ky =', maNamHocHocKy);
    console.log('so_tuan_thuc_hanh =', soTuanThucHanh);

    // 2. Lấy tuần thực hành và thông tin ngày bắt đầu, kết thúc
    const { data: tuanData, error: tuanError } = await supabase
        .from('TuanHoc')
        .select('ma_tuan, so_thu_tu, ngay_bat_dau, ngay_ket_thuc')
        .eq('ma_nam_hoc_hoc_ky', maNamHocHocKy)
        .order('so_thu_tu', { ascending: true });

    if (tuanError) {
      console.error('Lỗi khi truy vấn TuanHoc:', tuanError);
      return res.status(400).json({
        statusCode: 400,
        success: false,
        message: 'Không lấy được danh sách tuần thực hành'
      });
    }
    let maTuanList ;
    if(type=="chan"){
      maTuanList = tuanData
    .filter(tuan => tuan.so_thu_tu % 2 === 0)
    .slice(0, soTuanThucHanh);
    }
    else{
       maTuanList = tuanData
      .filter(tuan => tuan.so_thu_tu % 2 === 1)
      .slice(0, soTuanThucHanh);
    }
    console.log("maTuanList",maTuanList);
     

    //console.log('Danh sách ma_tuan =', maTuanList);

    // 3. Lấy danh sách phòng từ bảng PhongThucHanh hoặc từ danh sách nhóm
    const { data: phongData, error: phongError } = await supabase
      .from('PhongMay')  // Hoặc tên bảng tương ứng chứa danh sách phòng
      .select('ma_phong_may');

    if (phongError) {
      console.error('Lỗi khi truy vấn danh sách phòng:', phongError);
      return res.status(400).json({
        statusCode: 400,
        success: false,
        message: 'Không lấy được danh sách phòng thực hành'
      });
    }

    const phongList = phongData.map(p => p.ma_phong_may);
    //console.log('Danh sách phòng =', phongList);

    // 4. Lấy tất cả các ca học - thứ trong tuần
    const { data: allCaThu, error: allCaThuError } = await supabase
      .from('CaHoc_ThuTrongTuan')
      .select(`
        ma_ca_thu,
        ma_ca,
        ma_thu,
        CaHoc:ma_ca(
          ma_ca_hoc,
          gio_bat_dau,
          gio_ket_thuc
        ),
        ThuTrongTuan:ma_thu(
          ma_thu,
          ten_thu
        )
      `);

    if (allCaThuError) {
      console.error('Lỗi khi truy vấn ca học - thứ:', allCaThuError);
      return res.status(400).json({
        statusCode: 400,
        success: false,
        message: 'Không lấy được danh sách ca học - thứ'
      });
    }

    // 5. Lấy các ca đã đăng ký
    // Lấy các phiếu đăng ký cho các phòng
    const { data: phieuData, error: phieuError } = await supabase
      .from('PhieuDangKy')
      .select(`
        ma_phieu,
        ma_nhom_thuc_hanh,
        NhomThucHanh!inner(
          phong_thuc_hanh
        )
      `)
      .in('NhomThucHanh.phong_thuc_hanh', phongList);

    if (phieuError) {
      console.error('Lỗi khi truy vấn phiếu đăng ký:', phieuError);
      return res.status(400).json({
        statusCode: 400,
        success: false,
        message: 'Không lấy được danh sách phiếu đăng ký'
      });
    }

    // Lập mapping phiếu -> phòng
    const phieuToPhong = {};
    phieuData.forEach(item => {
      phieuToPhong[item.ma_phieu] = item.NhomThucHanh.phong_thuc_hanh;
    });

    // Lấy chi tiết đăng ký
    const phieuList = phieuData.map(item => item.ma_phieu);
    const { data: chiTietData, error: chiTietError } = await supabase
      .from('ChiTietDangKy')
      .select(`
        ma_phieu,
        ma_tuan,
        ma_ca_thu
      `)
      .in('ma_phieu', phieuList)

    if (chiTietError) {
      console.error('Lỗi khi truy vấn chi tiết đăng ký:', chiTietError);
      return res.status(400).json({
        statusCode: 400,
        success: false,
        message: 'Không lấy được chi tiết đăng ký'
      });
    }

    // 6. Tạo map phòng -> ca_thu đã đăng ký
    const tuanNeeded = new Set(maTuanList.map(t => t.ma_tuan));

    const dangKyTheoPhong = {};
    chiTietData.forEach(({ ma_phieu, ma_tuan, ma_ca_thu }) => {
      // chỉ quan tâm nếu tuần này có trong maTuanList
      if (!tuanNeeded.has(ma_tuan)) return;

      const phong = phieuToPhong[ma_phieu];
      if (!phong) return;

      if (!dangKyTheoPhong[phong]) dangKyTheoPhong[phong] = [];
      dangKyTheoPhong[phong].push({ ma_tuan, ma_ca_thu });
    });
    console.log('Ca đã đăng ký theo phòng =', dangKyTheoPhong);
    
    // Lấy danh sách phòng đã đăng ký
    const phongDaDangKy = Object.keys(dangKyTheoPhong);
    console.log('Phòng đã đăng ký =', phongDaDangKy);

    // 7. Tạo mapping giữa tên thứ và mã thứ
    // Phát hiện từ log rằng các giá trị thứ trong database có dạng "Thứ Hai", "Thứ Ba", etc.
    const thuMapping = {
      'Thứ Hai': 'Thu_2',
      'Thứ Ba': 'Thu_3',
      'Thứ Tư': 'Thu_4',
      'Thứ Năm': 'Thu_5',
      'Thứ Sáu': 'Thu_6',
      'Thứ Bảy': 'Thu_7',
      'Chủ Nhật': 'ChuNhat'
    };
    
    // Tạo mapping ngược lại
    const reverseThuMapping = {
      'Thu_2': 'Thứ Hai',
      'Thu_3': 'Thứ Ba',
      'Thu_4': 'Thứ Tư',
      'Thu_5': 'Thứ Năm',
      'Thu_6': 'Thứ Sáu',
      'Thu_7': 'Thứ Bảy',
      'ChuNhat': 'Chủ Nhật'
    };

    // 8. Tạo mapping giữa thứ và ngày bắt đầu/kết thúc theo tuần
    // Sử dụng ngày bắt đầu và kết thúc từ dữ liệu tuần học
    // thay vì cố gắng tính toán ngày của tuần
    

// 9. Chuẩn bị dữ liệu kết quả
const result = {
  statusCode: 200,
  success: true,
  data: []
};

// Lấy mảng tuần chỉ gồm số_thu_tu (ví dụ: [2, 4, 6, 8, 10])
const tuanDisplay = maTuanList.map(tuan => tuan.so_thu_tu);

// Build map ca_thu => thông tin ca, thứ, giờ bắt đầu/kết thúc
const caThuMap = {};
allCaThu.forEach(caThu => {
  const thuInfo = caThu.ThuTrongTuan;
  const caInfo = caThu.CaHoc;
  if (!thuInfo || !caInfo) return;
  caThuMap[caThu.ma_ca_thu] = {
    thu: caThu.ma_thu, // dạng "Thu_2" v.v.
    thuDisplay: thuInfo.ten_thu, // "Thứ Hai", dùng nếu muốn
    ca: caInfo.ma_ca_hoc,
    thoi_gian_bat_dau: caInfo.gio_bat_dau.substr(0, 5),
    thoi_gian_ket_thuc: caInfo.gio_ket_thuc.substr(0, 5)
  };
});

// Đổi mapping để lấy ngày bắt đầu/kết thúc cho từng thứ
// Lấy ngày bắt đầu từ tuần đầu, ngày kết thúc từ tuần cuối với từng thứ
  const ngayBatDauTheoThu = {};
  const ngayKetThucTheoThu = {};
  const firstWeek = maTuanList[0], lastWeek = maTuanList[maTuanList.length - 1];
  function getDateOfWeek(startDateStr, thuIndex) {
  // startDateStr: "yyyy-mm-dd"
  // thuIndex: 2 (Mon) ... 8 (Sun)
  const d = new Date(startDateStr); // ngày đầu tuần (thường là thứ 2)

  d.setDate(d.getDate() + thuIndex-2);
  return d.toISOString().split('T')[0];
``}
  for (let i = 2; i <= 8; i++) {
    // 2...7 là Mon...Sat, 8 là Sun
    let key=i;
    if(key==8)
        key='CN'
    
    ngayBatDauTheoThu[key] = getDateOfWeek(firstWeek.ngay_bat_dau, i);
    ngayKetThucTheoThu[key] = getDateOfWeek(lastWeek.ngay_bat_dau, i);
    console.log("ngayBatDauTheoThu[key]",ngayBatDauTheoThu[key]);
    console.log("ngayKetThucTheoThu[key]",ngayKetThucTheoThu[key]);
  }

// Xây dựng thông tin lịch cho từng phòng
  phongList.forEach(phong => {
    // Danh sách ca đã đăng ký phòng này (nếu có)
    const registeredSlots = (dangKyTheoPhong[phong] || []).map(x => x.ma_ca_thu);

    // Phòng này có đăng ký?
    const isPhongDaDangKy = phongDaDangKy.includes(phong);

    // Lấy tất cả ma_ca_thu (slot) khả dụng cho phòng này
    const availableCaThu = [];
    // Duyệt allCaThu để build từng slot còn trống
    allCaThu.forEach(caThu => {
      const thuInfo = caThu.ThuTrongTuan;
      const caInfo = caThu.CaHoc;
      if (!thuInfo || !caInfo) return;
      let mappedThu = caThu.ma_thu;
      if(mappedThu==1)
          mappedThu='CN';
      if (isPhongDaDangKy && registeredSlots.includes(caThu.ma_ca_thu)) {
        return; // slot này đã đăng ký, bỏ qua
      }
      availableCaThu.push({
        ma_ca_thu: caThu.ma_ca_thu,
        thu: mappedThu,
        ca: caInfo.ma_ca_hoc,
        thoi_gian_bat_dau: caInfo.gio_bat_dau.substr(0, 5),
        thoi_gian_ket_thuc: caInfo.gio_ket_thuc.substr(0, 5)
      });
    });

    // Build lịch cho từng thứ (theo format mong muốn)
    const lichHoc = [];
    for (const slot of availableCaThu) {
      console.log("slot.thu",slot.thu)
      lichHoc.push({
        thu: slot.thu, // dạng "Thu_2", "ChuNhat", ... có thể convert sang số nếu cần
        ca: slot.ca,
        thoi_gian_bat_dau: slot.thoi_gian_bat_dau,
        thoi_gian_ket_thuc: slot.thoi_gian_ket_thuc,
        ngay_bat_dau: ngayBatDauTheoThu[slot.thu],
        ngay_ket_thuc: ngayKetThucTheoThu[slot.thu]
      });
    }

    // Nếu truyền roomId thì chỉ lấy phòng này
    if (!roomId || phong === roomId) {
      result.data.push({
        phong: phong,
        Tuan: [...tuanDisplay],
        lichHoc
      });
    }
  });

// Kiểm tra nếu tất cả phòng đều không còn slot trống
let countEmpty = 0;
result.data.forEach(item => {
  if (!item.lichHoc || item.lichHoc.length === 0) countEmpty++;
});
if (countEmpty === result.data.length) {
  return res.status(200).json({
    success: true,
    title: "Không có lịch trống nào để đăng ký"
  });
} else {
  return res.json(result);
}
    
  } catch (error) {
    console.error('Error in registerSchedule:', error);
    res.status(500).json({
      statusCode: 500,
      success: false,
      message: 'Lỗi máy chủ nội bộ'
    });
  }
};
module.exports.registerSchedulePost = async (req, res) => {
  try {
    const { ma_lop_hoc_phan, ma_phong, lich } = req.body

    // 1. Tự generate mã nhóm thực hành
    const ma_nhom_thuc_hanh = `NTH_${ma_lop_hoc_phan}_${Date.now()}`

    // 2. Insert vào bảng NhomThucHanh
    const { error: errNhom } = await supabase
      .from('NhomThucHanh')
      .insert({
        ma_nhom_thuc_hanh,
        ma_lop_hoc_phan,
        phong_thuc_hanh: ma_phong
      })
    
    if (errNhom) {
      console.error('Error inserting into NhomThucHanh:', errNhom)
      return res.status(500).json({ error: 'Không thể tạo nhóm thực hành' })
    }
    console.log('Created NhomThucHanh:', ma_nhom_thuc_hanh)

    // 3. Insert vào bảng phieuDangKy với ngày đăng ký đúng định dạng
    const now = new Date()
    console.log("now",now);
    
    // Thử cách này - sử dụng trực tiếp đối tượng Date thay vì chuỗi ISO
    const { data: phieuData, error: errPhieu } = await supabase
      .from('PhieuDangKy')
      .insert({
        ma_nhom_thuc_hanh,
        ngay_dk:  now // Sử dụng trực tiếp đối tượng Date
      })
      .select('ma_phieu')
      .single()
    
    if (errPhieu) {
      console.error('Error inserting into phieuDangKy:', errPhieu)
      return res.status(500).json({ error: 'Không thể tạo phiếu đăng ký' })
    }
    
    console.log('Created phieuDangKy:', phieuData)

    // 4. Insert vào bảng chiTietDangKy
    const chiTietRecords = lich.map(item => ({
      ma_phieu: phieuData.ma_phieu,
      ma_tuan: item.ma_tuan,
      ma_ca_thu: item.ma_ca_thu,
      ngay_hoc: item.ngay_hoc
    }))
    
    const { error: errChiTiet } = await supabase
      .from('ChiTietDangKy')
      .insert(chiTietRecords)
    
    if (errChiTiet) {
      console.error('Error inserting into chiTietDangKy:', errChiTiet)
      return res.status(500).json({ error: 'Không thể lưu chi tiết đăng ký' })
    }
    console.log('Created chiTietDangKy records:', chiTietRecords.length)

    // 5. Trả về thành công
    return res.status(201).json({
      statusCode: 201,
      success: true,
      data: {
        ma_nhom_thuc_hanh,
        ma_phieu: phieuData.ma_phieu,
        inserted: chiTietRecords.length
      }
    })
  } catch (error) {
    console.error('Unexpected error in registerSchedulePost:', error)
    return res.status(500).json({
      statusCode: 500,
      success: false,
      error: 'Đã xảy ra lỗi khi xử lý yêu cầu'
    })
  }
}
// {
//     "statusCode": 200,
//     "success": true,
//     "data": [
//         {
//             "phong": "G8.101",
//             "Tuan": [
//                 "Tuan_2",
//                 "Tuan_4",
//                 "Tuan_6",
//                 "Tuan_8",
//                 "Tuan_10"
//             ],
//             "ThoiGian": {
//                 "Thu_3": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_3": "2023-08-23",
//                 "ngay_ket_thuc_Thu_3": "2023-10-18",
//                 "Thu_4": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_4": "2023-08-24",
//                 "ngay_ket_thuc_Thu_4": "2023-10-19",
//                 "Thu_5": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_5": "2023-08-25",
//                 "ngay_ket_thuc_Thu_5": "2023-10-20",
//                 "Thu_6": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_6": "2023-08-26",
//                 "ngay_ket_thuc_Thu_6": "2023-10-21",
//                 "Thu_7": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_7": "2023-08-27",
//                 "ngay_ket_thuc_Thu_7": "2023-10-22",
//                 "ChuNhat": "S13(07:00->09:50)",
//                 "ngay_bat_dau_ChuNhat": "2023-08-28",
//                 "ngay_ket_thuc_ChuNhat": "2023-10-23"
//             }
//         },
//         {
//             "phong": "G8.102",
//             "Tuan": [
//                 "Tuan_2",
//                 "Tuan_4",
//                 "Tuan_6",
//                 "Tuan_8",
//                 "Tuan_10"
//             ],
//             "ThoiGian": {
//                 "Thu_2": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_2": "2023-08-22",
//                 "ngay_ket_thuc_Thu_2": "2023-10-17",
//                 "Thu_3": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_3": "2023-08-23",
//                 "ngay_ket_thuc_Thu_3": "2023-10-18",
//                 "Thu_4": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_4": "2023-08-24",
//                 "ngay_ket_thuc_Thu_4": "2023-10-19",
//                 "Thu_5": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_5": "2023-08-25",
//                 "ngay_ket_thuc_Thu_5": "2023-10-20",
//                 "Thu_6": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_6": "2023-08-26",
//                 "ngay_ket_thuc_Thu_6": "2023-10-21",
//                 "Thu_7": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_7": "2023-08-27",
//                 "ngay_ket_thuc_Thu_7": "2023-10-22",
//                 "ChuNhat": "S13(07:00->09:50)",
//                 "ngay_bat_dau_ChuNhat": "2023-08-28",
//                 "ngay_ket_thuc_ChuNhat": "2023-10-23"
//             }
//         },
//         {
//             "phong": "G8.103",
//             "Tuan": [
//                 "Tuan_2",
//                 "Tuan_4",
//                 "Tuan_6",
//                 "Tuan_8",
//                 "Tuan_10"
//             ],
//             "ThoiGian": {
//                 "Thu_2": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_2": "2023-08-22",
//                 "ngay_ket_thuc_Thu_2": "2023-10-17",
//                 "Thu_3": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_3": "2023-08-23",
//                 "ngay_ket_thuc_Thu_3": "2023-10-18",
//                 "Thu_4": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_4": "2023-08-24",
//                 "ngay_ket_thuc_Thu_4": "2023-10-19",
//                 "Thu_5": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_5": "2023-08-25",
//                 "ngay_ket_thuc_Thu_5": "2023-10-20",
//                 "Thu_6": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_6": "2023-08-26",
//                 "ngay_ket_thuc_Thu_6": "2023-10-21",
//                 "Thu_7": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_7": "2023-08-27",
//                 "ngay_ket_thuc_Thu_7": "2023-10-22",
//                 "ChuNhat": "S13(07:00->09:50)",
//                 "ngay_bat_dau_ChuNhat": "2023-08-28",
//                 "ngay_ket_thuc_ChuNhat": "2023-10-23"
//             }
//         },
//         {
//             "phong": "G8.104",
//             "Tuan": [
//                 "Tuan_2",
//                 "Tuan_4",
//                 "Tuan_6",
//                 "Tuan_8",
//                 "Tuan_10"
//             ],
//             "ThoiGian": {
//                 "Thu_2": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_2": "2023-08-22",
//                 "ngay_ket_thuc_Thu_2": "2023-10-17",
//                 "Thu_3": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_3": "2023-08-23",
//                 "ngay_ket_thuc_Thu_3": "2023-10-18",
//                 "Thu_4": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_4": "2023-08-24",
//                 "ngay_ket_thuc_Thu_4": "2023-10-19",
//                 "Thu_5": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_5": "2023-08-25",
//                 "ngay_ket_thuc_Thu_5": "2023-10-20",
//                 "Thu_6": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_6": "2023-08-26",
//                 "ngay_ket_thuc_Thu_6": "2023-10-21",
//                 "Thu_7": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_7": "2023-08-27",
//                 "ngay_ket_thuc_Thu_7": "2023-10-22",
//                 "ChuNhat": "S13(07:00->09:50)",
//                 "ngay_bat_dau_ChuNhat": "2023-08-28",
//                 "ngay_ket_thuc_ChuNhat": "2023-10-23"
//             }
//         },
//         {
//             "phong": "G8.201",
//             "Tuan": [
//                 "Tuan_2",
//                 "Tuan_4",
//                 "Tuan_6",
//                 "Tuan_8",
//                 "Tuan_10"
//             ],
//             "ThoiGian": {
//                 "Thu_2": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_2": "2023-08-22",
//                 "ngay_ket_thuc_Thu_2": "2023-10-17",
//                 "Thu_3": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_3": "2023-08-23",
//                 "ngay_ket_thuc_Thu_3": "2023-10-18",
//                 "Thu_4": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_4": "2023-08-24",
//                 "ngay_ket_thuc_Thu_4": "2023-10-19",
//                 "Thu_5": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_5": "2023-08-25",
//                 "ngay_ket_thuc_Thu_5": "2023-10-20",
//                 "Thu_6": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_6": "2023-08-26",
//                 "ngay_ket_thuc_Thu_6": "2023-10-21",
//                 "Thu_7": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_7": "2023-08-27",
//                 "ngay_ket_thuc_Thu_7": "2023-10-22",
//                 "ChuNhat": "S13(07:00->09:50)",
//                 "ngay_bat_dau_ChuNhat": "2023-08-28",
//                 "ngay_ket_thuc_ChuNhat": "2023-10-23"
//             }
//         },
//         {
//             "phong": "G8.202",
//             "Tuan": [
//                 "Tuan_2",
//                 "Tuan_4",
//                 "Tuan_6",
//                 "Tuan_8",
//                 "Tuan_10"
//             ],
//             "ThoiGian": {
//                 "Thu_2": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_2": "2023-08-22",
//                 "ngay_ket_thuc_Thu_2": "2023-10-17",
//                 "Thu_3": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_3": "2023-08-23",
//                 "ngay_ket_thuc_Thu_3": "2023-10-18",
//                 "Thu_4": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_4": "2023-08-24",
//                 "ngay_ket_thuc_Thu_4": "2023-10-19",
//                 "Thu_5": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_5": "2023-08-25",
//                 "ngay_ket_thuc_Thu_5": "2023-10-20",
//                 "Thu_6": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_6": "2023-08-26",
//                 "ngay_ket_thuc_Thu_6": "2023-10-21",
//                 "Thu_7": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_7": "2023-08-27",
//                 "ngay_ket_thuc_Thu_7": "2023-10-22",
//                 "ChuNhat": "S13(07:00->09:50)",
//                 "ngay_bat_dau_ChuNhat": "2023-08-28",
//                 "ngay_ket_thuc_ChuNhat": "2023-10-23"
//             }
//         },
//         {
//             "phong": "G8.203",
//             "Tuan": [
//                 "Tuan_2",
//                 "Tuan_4",
//                 "Tuan_6",
//                 "Tuan_8",
//                 "Tuan_10"
//             ],
//             "ThoiGian": {
//                 "Thu_2": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_2": "2023-08-22",
//                 "ngay_ket_thuc_Thu_2": "2023-10-17",
//                 "Thu_3": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_3": "2023-08-23",
//                 "ngay_ket_thuc_Thu_3": "2023-10-18",
//                 "Thu_4": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_4": "2023-08-24",
//                 "ngay_ket_thuc_Thu_4": "2023-10-19",
//                 "Thu_5": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_5": "2023-08-25",
//                 "ngay_ket_thuc_Thu_5": "2023-10-20",
//                 "Thu_6": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_6": "2023-08-26",
//                 "ngay_ket_thuc_Thu_6": "2023-10-21",
//                 "Thu_7": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_7": "2023-08-27",
//                 "ngay_ket_thuc_Thu_7": "2023-10-22",
//                 "ChuNhat": "S13(07:00->09:50)",
//                 "ngay_bat_dau_ChuNhat": "2023-08-28",
//                 "ngay_ket_thuc_ChuNhat": "2023-10-23"
//             }
//         },
//         {
//             "phong": "NDN.201",
//             "Tuan": [
//                 "Tuan_2",
//                 "Tuan_4",
//                 "Tuan_6",
//                 "Tuan_8",
//                 "Tuan_10"
//             ],
//             "ThoiGian": {
//                 "Thu_2": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_2": "2023-08-22",
//                 "ngay_ket_thuc_Thu_2": "2023-10-17",
//                 "Thu_3": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_3": "2023-08-23",
//                 "ngay_ket_thuc_Thu_3": "2023-10-18",
//                 "Thu_4": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_4": "2023-08-24",
//                 "ngay_ket_thuc_Thu_4": "2023-10-19",
//                 "Thu_5": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_5": "2023-08-25",
//                 "ngay_ket_thuc_Thu_5": "2023-10-20",
//                 "Thu_6": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_6": "2023-08-26",
//                 "ngay_ket_thuc_Thu_6": "2023-10-21",
//                 "Thu_7": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_7": "2023-08-27",
//                 "ngay_ket_thuc_Thu_7": "2023-10-22",
//                 "ChuNhat": "S13(07:00->09:50)",
//                 "ngay_bat_dau_ChuNhat": "2023-08-28",
//                 "ngay_ket_thuc_ChuNhat": "2023-10-23"
//             }
//         },
//         {
//             "phong": "NDN.202",
//             "Tuan": [
//                 "Tuan_2",
//                 "Tuan_4",
//                 "Tuan_6",
//                 "Tuan_8",
//                 "Tuan_10"
//             ],
//             "ThoiGian": {
//                 "Thu_2": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_2": "2023-08-22",
//                 "ngay_ket_thuc_Thu_2": "2023-10-17",
//                 "Thu_3": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_3": "2023-08-23",
//                 "ngay_ket_thuc_Thu_3": "2023-10-18",
//                 "Thu_4": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_4": "2023-08-24",
//                 "ngay_ket_thuc_Thu_4": "2023-10-19",
//                 "Thu_5": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_5": "2023-08-25",
//                 "ngay_ket_thuc_Thu_5": "2023-10-20",
//                 "Thu_6": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_6": "2023-08-26",
//                 "ngay_ket_thuc_Thu_6": "2023-10-21",
//                 "Thu_7": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_7": "2023-08-27",
//                 "ngay_ket_thuc_Thu_7": "2023-10-22",
//                 "ChuNhat": "S13(07:00->09:50)",
//                 "ngay_bat_dau_ChuNhat": "2023-08-28",
//                 "ngay_ket_thuc_ChuNhat": "2023-10-23"
//             }
//         },
//         {
//             "phong": "NDN.203",
//             "Tuan": [
//                 "Tuan_2",
//                 "Tuan_4",
//                 "Tuan_6",
//                 "Tuan_8",
//                 "Tuan_10"
//             ],
//             "ThoiGian": {
//                 "Thu_2": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_2": "2023-08-22",
//                 "ngay_ket_thuc_Thu_2": "2023-10-17",
//                 "Thu_3": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_3": "2023-08-23",
//                 "ngay_ket_thuc_Thu_3": "2023-10-18",
//                 "Thu_4": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_4": "2023-08-24",
//                 "ngay_ket_thuc_Thu_4": "2023-10-19",
//                 "Thu_5": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_5": "2023-08-25",
//                 "ngay_ket_thuc_Thu_5": "2023-10-20",
//                 "Thu_6": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_6": "2023-08-26",
//                 "ngay_ket_thuc_Thu_6": "2023-10-21",
//                 "Thu_7": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_7": "2023-08-27",
//                 "ngay_ket_thuc_Thu_7": "2023-10-22",
//                 "ChuNhat": "S13(07:00->09:50)",
//                 "ngay_bat_dau_ChuNhat": "2023-08-28",
//                 "ngay_ket_thuc_ChuNhat": "2023-10-23"
//             }
//         },
//         {
//             "phong": "NDN.204",
//             "Tuan": [
//                 "Tuan_2",
//                 "Tuan_4",
//                 "Tuan_6",
//                 "Tuan_8",
//                 "Tuan_10"
//             ],
//             "ThoiGian": {
//                 "Thu_2": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_2": "2023-08-22",
//                 "ngay_ket_thuc_Thu_2": "2023-10-17",
//                 "Thu_3": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_3": "2023-08-23",
//                 "ngay_ket_thuc_Thu_3": "2023-10-18",
//                 "Thu_4": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_4": "2023-08-24",
//                 "ngay_ket_thuc_Thu_4": "2023-10-19",
//                 "Thu_5": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_5": "2023-08-25",
//                 "ngay_ket_thuc_Thu_5": "2023-10-20",
//                 "Thu_6": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_6": "2023-08-26",
//                 "ngay_ket_thuc_Thu_6": "2023-10-21",
//                 "Thu_7": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_7": "2023-08-27",
//                 "ngay_ket_thuc_Thu_7": "2023-10-22",
//                 "ChuNhat": "S13(07:00->09:50)",
//                 "ngay_bat_dau_ChuNhat": "2023-08-28",
//                 "ngay_ket_thuc_ChuNhat": "2023-10-23"
//             }
//         },
//         {
//             "phong": "NDN.205",
//             "Tuan": [
//                 "Tuan_2",
//                 "Tuan_4",
//                 "Tuan_6",
//                 "Tuan_8",
//                 "Tuan_10"
//             ],
//             "ThoiGian": {
//                 "Thu_2": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_2": "2023-08-22",
//                 "ngay_ket_thuc_Thu_2": "2023-10-17",
//                 "Thu_3": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_3": "2023-08-23",
//                 "ngay_ket_thuc_Thu_3": "2023-10-18",
//                 "Thu_4": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_4": "2023-08-24",
//                 "ngay_ket_thuc_Thu_4": "2023-10-19",
//                 "Thu_5": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_5": "2023-08-25",
//                 "ngay_ket_thuc_Thu_5": "2023-10-20",
//                 "Thu_6": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_6": "2023-08-26",
//                 "ngay_ket_thuc_Thu_6": "2023-10-21",
//                 "Thu_7": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_7": "2023-08-27",
//                 "ngay_ket_thuc_Thu_7": "2023-10-22",
//                 "ChuNhat": "S13(07:00->09:50)",
//                 "ngay_bat_dau_ChuNhat": "2023-08-28",
//                 "ngay_ket_thuc_ChuNhat": "2023-10-23"
//             }
//         },
//         {
//             "phong": "KOICA",
//             "Tuan": [
//                 "Tuan_2",
//                 "Tuan_4",
//                 "Tuan_6",
//                 "Tuan_8",
//                 "Tuan_10"
//             ],
//             "ThoiGian": {
//                 "Thu_2": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_2": "2023-08-22",
//                 "ngay_ket_thuc_Thu_2": "2023-10-17",
//                 "Thu_3": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_3": "2023-08-23",
//                 "ngay_ket_thuc_Thu_3": "2023-10-18",
//                 "Thu_4": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_4": "2023-08-24",
//                 "ngay_ket_thuc_Thu_4": "2023-10-19",
//                 "Thu_5": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_5": "2023-08-25",
//                 "ngay_ket_thuc_Thu_5": "2023-10-20",
//                 "Thu_6": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_6": "2023-08-26",
//                 "ngay_ket_thuc_Thu_6": "2023-10-21",
//                 "Thu_7": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_7": "2023-08-27",
//                 "ngay_ket_thuc_Thu_7": "2023-10-22",
//                 "ChuNhat": "S13(07:00->09:50)",
//                 "ngay_bat_dau_ChuNhat": "2023-08-28",
//                 "ngay_ket_thuc_ChuNhat": "2023-10-23"
//             }
//         },
//         {
//             "phong": "G8P001",
//             "Tuan": [
//                 "Tuan_2",
//                 "Tuan_4",
//                 "Tuan_6",
//                 "Tuan_8",
//                 "Tuan_10"
//             ],
//             "ThoiGian": {
//                 "Thu_2": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_2": "2023-08-22",
//                 "ngay_ket_thuc_Thu_2": "2023-10-17",
//                 "Thu_3": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_3": "2023-08-23",
//                 "ngay_ket_thuc_Thu_3": "2023-10-18",
//                 "Thu_4": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_4": "2023-08-24",
//                 "ngay_ket_thuc_Thu_4": "2023-10-19",
//                 "Thu_5": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_5": "2023-08-25",
//                 "ngay_ket_thuc_Thu_5": "2023-10-20",
//                 "Thu_6": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_6": "2023-08-26",
//                 "ngay_ket_thuc_Thu_6": "2023-10-21",
//                 "Thu_7": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_7": "2023-08-27",
//                 "ngay_ket_thuc_Thu_7": "2023-10-22",
//                 "ChuNhat": "S13(07:00->09:50)",
//                 "ngay_bat_dau_ChuNhat": "2023-08-28",
//                 "ngay_ket_thuc_ChuNhat": "2023-10-23"
//             }
//         },
//         {
//             "phong": "G7P002",
//             "Tuan": [
//                 "Tuan_2",
//                 "Tuan_4",
//                 "Tuan_6",
//                 "Tuan_8",
//                 "Tuan_10"
//             ],
//             "ThoiGian": {
//                 "Thu_2": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_2": "2023-08-22",
//                 "ngay_ket_thuc_Thu_2": "2023-10-17",
//                 "Thu_3": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_3": "2023-08-23",
//                 "ngay_ket_thuc_Thu_3": "2023-10-18",
//                 "Thu_4": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_4": "2023-08-24",
//                 "ngay_ket_thuc_Thu_4": "2023-10-19",
//                 "Thu_5": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_5": "2023-08-25",
//                 "ngay_ket_thuc_Thu_5": "2023-10-20",
//                 "Thu_6": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_6": "2023-08-26",
//                 "ngay_ket_thuc_Thu_6": "2023-10-21",
//                 "Thu_7": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_7": "2023-08-27",
//                 "ngay_ket_thuc_Thu_7": "2023-10-22",
//                 "ChuNhat": "S13(07:00->09:50)",
//                 "ngay_bat_dau_ChuNhat": "2023-08-28",
//                 "ngay_ket_thuc_ChuNhat": "2023-10-23"
//             }
//         },
//         {
//             "phong": "G6P003",
//             "Tuan": [
//                 "Tuan_2",
//                 "Tuan_4",
//                 "Tuan_6",
//                 "Tuan_8",
//                 "Tuan_10"
//             ],
//             "ThoiGian": {
//                 "Thu_2": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_2": "2023-08-22",
//                 "ngay_ket_thuc_Thu_2": "2023-10-17",
//                 "Thu_3": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_3": "2023-08-23",
//                 "ngay_ket_thuc_Thu_3": "2023-10-18",
//                 "Thu_4": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_4": "2023-08-24",
//                 "ngay_ket_thuc_Thu_4": "2023-10-19",
//                 "Thu_5": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_5": "2023-08-25",
//                 "ngay_ket_thuc_Thu_5": "2023-10-20",
//                 "Thu_6": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_6": "2023-08-26",
//                 "ngay_ket_thuc_Thu_6": "2023-10-21",
//                 "Thu_7": "S13(07:00->09:50)",
//                 "ngay_bat_dau_Thu_7": "2023-08-27",
//                 "ngay_ket_thuc_Thu_7": "2023-10-22",
//                 "ChuNhat": "S13(07:00->09:50)",
//                 "ngay_bat_dau_ChuNhat": "2023-08-28",
//                 "ngay_ket_thuc_ChuNhat": "2023-10-23"
//             }
//         }
//     ]
// }