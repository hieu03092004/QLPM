const { json } = require('express');
const supabase = require('../../config/database');
module.exports.index=(req, res) => {
    res.send('Đây là trang chủ của cán bộ giảng dạy');
}
module.exports.course = async (req, res) => {
  
  try {
    const { accountId} = req.params;
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
    
    const ngayBatDauTheoThu = {};
    const ngayKetThucTheoThu = {};
    
    // Sử dụng tuần đầu tiên từ dữ liệu đã query
    //console.log("Tuan data",maTuanList);
    const firstWeek = maTuanList[0];
    //console.log("FirstWeek",firstWeek);
    // Sử dụng tuần cuối cùng từ dữ liệu đã query
    const lastWeek = maTuanList[maTuanList.length - 1];
    //console.log("lastWeek",lastWeek);
    
    // Tạo đối tượng Date cho ngày bắt đầu tuần đầu tiên
    const startDate = new Date(firstWeek.ngay_bat_dau);
    
    // Xác định ngày trong tuần của ngày bắt đầu (0 = Chủ nhật, 1 = Thứ 2, ...)
    const startDayOfWeek = startDate.getDay();
    
    // Lấy ngày đầu tiên của tuần (Thứ 2)
    const firstMonday = new Date(startDate);
    
    // Tính ngày cho từng thứ trong tuần đầu tiên
    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(firstMonday);
        currentDay.setDate(firstMonday.getDate() + i);
        
        let key;
        if (i === 6) { // Chủ nhật
            key = 'ChuNhat';
        } else {
            key = `Thu_${i + 2}`;
        }
        
        ngayBatDauTheoThu[key] = currentDay.toISOString().split('T')[0];
    }
    
    // Tạo đối tượng Date cho ngày kết thúc tuần cuối cùng
    console.log("Last week",lastWeek);
    const endDate = new Date(lastWeek.ngay_bat_dau);
    
    // Xác định ngày trong tuần của ngày kết thúc
    const endDayOfWeek = endDate.getDay();
    
    // Lấy ngày đầu tiên của tuần cuối (Thứ 2)
    const lastMonday = new Date(endDate);
    
    // Tính ngày cho từng thứ trong tuần cuối
    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(lastMonday);
        currentDay.setDate(lastMonday.getDate() + i);
        
        let key;
        if (i === 6) { // Chủ nhật
            key = 'ChuNhat';
        } else {
            key = `Thu_${i + 2}`;
        }
        
        ngayKetThucTheoThu[key] = currentDay.toISOString().split('T')[0];
    }
    
    // In ra các giá trị để debug
    // console.log('Debug - ngayBatDauTheoThu:', ngayBatDauTheoThu);
    // console.log('Debug - ngayKetThucTheoThu:', ngayKetThucTheoThu);

    // 9. Chuẩn bị dữ liệu kết quả
    const result = {
      statusCode: 200,
      success: true,
      data: []
    };

    // Xây dựng danh sách tuần hiển thị
    const tuanDisplay = maTuanList.map(tuan => `Tuan_${tuan.so_thu_tu}`);
    


    // Tạo map để lưu các ca học theo thứ
    const allSlotsByDay = {};
    
    allCaThu.forEach(caThu => {
      const thuInfo = caThu.ThuTrongTuan;
      const caInfo = caThu.CaHoc;
      
      if (!thuInfo || !caInfo) return;
      
      const tenThu = thuInfo.ten_thu;
      // Map từ tên thứ trong database (như "Thứ Hai") sang mã thứ (như "Thu_2")
      const mappedThu = thuMapping[tenThu];
      
      if (!mappedThu) {
        console.log(`Không tìm thấy mapping cho thứ: ${tenThu}`);
        return;
      }
      
      if (!allSlotsByDay[mappedThu]) allSlotsByDay[mappedThu] = [];
      
      // Format thời gian
      const gioBatDau = caInfo.gio_bat_dau.substr(0, 5);
      const gioKetThuc = caInfo.gio_ket_thuc.substr(0, 5);
      
      allSlotsByDay[mappedThu].push({
        ma_ca_thu: caThu.ma_ca_thu,
        display: `${caInfo.ma_ca_hoc}(${gioBatDau}->${gioKetThuc})`
      });
    });

    // In ra allSlotsByDay để debug
    console.log('Debug - allSlotsByDay keys:', Object.keys(allSlotsByDay));

    // Xây dựng thông tin lịch cho từng phòng
    phongList.forEach(phong => {
      const phongInfo = {
        phong: phong,
        Tuan: [...tuanDisplay],
        ThoiGian: {}
      };
      
      console.log("Phong",phong);
    
      // Lấy danh sách ca đã đăng ký của phòng này (nếu có)
      // Lấy ra array chỉ gồm ma_ca_thu
      const registeredSlots = (dangKyTheoPhong[phong] || []).map(x => x.ma_ca_thu);

      console.log("registeredSlots",registeredSlots);
      
      // Kiểm tra phòng này có đăng ký hay không
      const isPhongDaDangKy = phongDaDangKy.includes(phong);
      
      // Xử lý từng thứ trong tuần
      Object.keys(allSlotsByDay).forEach(mappedThu => {
        const slotsOfDay = allSlotsByDay[mappedThu];
        let availableSlots = [];
        
        if (isPhongDaDangKy) {
          // Phòng đã đăng ký: chỉ hiển thị các ca chưa đăng ký
          availableSlots = slotsOfDay.filter(slot => !registeredSlots.includes(slot.ma_ca_thu));
        } else {
          // Phòng chưa đăng ký: hiển thị tất cả các ca
          availableSlots = [...slotsOfDay];
        }
        
        if (availableSlots.length > 0) {
          // Tạo chuỗi hiển thị các ca
          const caHocDisplay = availableSlots.map(slot => slot.display).join('');
          
          // Thêm thông tin ca học vào ThoiGian
          phongInfo.ThoiGian[mappedThu] = caHocDisplay;
          
          // Lấy tên thứ để hiển thị trong debug
          const displayThu = reverseThuMapping[mappedThu] || mappedThu;
          // console.log("mappedThu", displayThu);
          // console.log("ngayBatDauTheoThu", ngayBatDauTheoThu[mappedThu]);
          // console.log("ngayKetThucTheoThu", ngayKetThucTheoThu[mappedThu]);
          
          // Thêm thông tin ngày bắt đầu và kết thúc
          const ngayBatDauKey = `ngay_bat_dau_${mappedThu}`;
          const ngayKetThucKey = `ngay_ket_thuc_${mappedThu}`;
          
          phongInfo.ThoiGian[ngayBatDauKey] = ngayBatDauTheoThu[mappedThu];
          phongInfo.ThoiGian[ngayKetThucKey] = ngayKetThucTheoThu[mappedThu];
        }
      });
      if (!roomId || phong === roomId) {
        result.data.push(phongInfo);
      }
    });
    let countEmpty = 0;

    // Duyệt qua từng phòng
    result.data.forEach(item => {
      // nếu ThoiGian của phòng này rỗng
      if (Object.keys(item.ThoiGian).length === 0) {
        countEmpty++;
      }
    });

    // Dùng result.data.length để lấy số phòng tổng cộng
    if (countEmpty === result.data.length) {
      return res.status(200).json({
        success: true,
        title: "Không có lịch trống nào để đăng ký"
      });
    } else {
      // Ít nhất có 1 phòng có lịch trống
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