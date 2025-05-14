const supabase = require('../../config/database');

module.exports.index = (req, res) => {
    res.send('Đây là trang chủ của cán bộ quản lý thiết bị');
}

module.exports.devices = async (req, res) => {
    const { deviceName, status, roomId, typeDevice } = req.query;
    
    try {
        console.log("Query parameters:", { deviceName, status, roomId, typeDevice });
        
        // Khởi tạo query builder với foreign table relation
        let queryBuilder = supabase
            .from('ThietBi')
            .select(`
                ma_thiet_bi,
                ma_loai_thiet_bi,
                ma_phong_su_dung,
                trang_thai_thiet_bi,
                ngay_mua,
                gia_tri,
                LoaiThietBi:ma_loai_thiet_bi (
                    ten_loai_thiet_bi
                )
            `);

        // Thêm các điều kiện lọc theo loại thiết bị trước
        if (typeDevice) {
            queryBuilder = queryBuilder.eq('ma_loai_thiet_bi', typeDevice);
        }
            
        // Thêm điều kiện lọc theo phòng
        if (roomId) {
            const cleanRoomId = typeof roomId === 'string' ? roomId.replace(/"/g, '').trim() : roomId;
            console.log(`Đang lọc theo phòng: '${cleanRoomId}'`);
            queryBuilder = queryBuilder.eq('ma_phong_su_dung', cleanRoomId);
        }
        
        // Thêm điều kiện lọc theo trạng thái
        if (status) {
            let statusDb;
            if (status === "active") {
                statusDb = "dang_su_dung";
            } else if (status === "inactive") {
                statusDb = "hong";
            } else {
                statusDb = status;
            }
            console.log(`Đang lọc theo trạng thái: '${status}' => '${statusDb}'`);
            queryBuilder = queryBuilder.eq('trang_thai_thiet_bi', statusDb);
        }

        // Thực hiện truy vấn để lấy dữ liệu
        const { data, error } = await queryBuilder;
        
        if (error) {
            console.error('Lỗi Supabase:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
        
        console.log(`Đã lấy được ${data ? data.length : 0} bản ghi`);
        
        // Lọc theo tên thiết bị ở phía client nếu cần
        let filteredData = data;
        if (deviceName && data) {
            console.log(`Đang lọc theo tên thiết bị: '${deviceName}'`);
            filteredData = data.filter(item => 
                item.LoaiThietBi && 
                item.LoaiThietBi.ten_loai_thiet_bi && 
                item.LoaiThietBi.ten_loai_thiet_bi.toLowerCase().includes(deviceName.toLowerCase())
            );
            console.log(`Sau khi lọc: ${filteredData.length} bản ghi`);
        }
        
        if (!filteredData || filteredData.length === 0) {
            console.log("Không tìm thấy bản ghi nào phù hợp với điều kiện lọc");
        }
        const cleanedData = filteredData.map(item => {
          const { LoaiThietBi, ...rest } = item;
          return rest;
        });
        res.json(
          { 
            statusCode: 200, 
            success: true, 
            data: cleanedData }
          );
    } catch (err) {
        console.error('Lỗi không mong muốn:', err);
        res.status(500).json({ success: false, error: 'Lỗi server nội bộ' });
    }
}
module.exports.edit = async (req, res) => {
  const { id } = req.params;            // :id trong URL
  const updates  = req.body;            // body gửi lên { ten_cot: gia_tri_moi }
    console.log(`id:${id}`);
    console.log('updates:', updates);
  if (!id) {
    return res.status(400).json({ success: false, error: 'Thiếu id thiết bị' });
  }
  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, error: 'Thiếu dữ liệu update' });
  }

  try {
    const { data, error } = await supabase
      .from('ThietBi')
      .update(updates)
      .eq('ma_thiet_bi', id)
      .select();      // trả về bản ghi sau update

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    if (data.length === 0) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy thiết bị' });
    }

    res.json(
    {
      statusCode: 200,
      success: true, 
      updated: data[0] 
    }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server nội bộ' });
  }
};
function generateRandomId(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports.createPost = async (req, res) => {
  // Lấy dữ liệu từ body (không lấy ma_thiet_bi)
  const {
    ma_loai_thiet_bi,
    ma_phong_su_dung,
    ngay_mua, // chuỗi 'YYYY-MM-DD'
    gia_tri   // số, ví dụ 15000000.00
  } = req.body;

  // Tự động sinh ma_thiet_bi 10 kí tự
  const ma_thiet_bi = generateRandomId(10);

  // Kiểm tra dữ liệu bắt buộc
  if (!ma_loai_thiet_bi || !ma_phong_su_dung || !ngay_mua || gia_tri == null) {
    return res.status(400).json({
      success: false,
      error: 'Thiếu trường bắt buộc: ma_loai_thiet_bi, ma_phong_su_dung, ngay_mua, gia_tri'
    });
  }

  try {
    // Insert vào Supabase
    const { data, error } = await supabase
      .from('ThietBi')
      .insert([{
        ma_thiet_bi,       // sử dụng ID tự sinh
        ma_loai_thiet_bi,
        ma_phong_su_dung,
        ngay_mua,
        gia_tri
      }])
      .select(); // để trả về bản ghi vừa tạo

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    // Thành công
    res.status(201).json({
      statusCode: 200,
      success: true,
      created: data[0]
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({ success: false, error: 'Lỗi server nội bộ' });
  }
};
module.exports.rooms = async(req, res) => {
  try {
    const { search, building } = req.query;
    console.log(`Search:${search}`);
    console.log(`Buidling:${building}`);
    
    // 1. Filter rooms by building and search term
    let roomsQuery = supabase
      .from('PhongMay')
      .select('ma_phong_may, ma_toa_nha')
      .order('ma_phong_may');
      
    if (building) {
      roomsQuery = roomsQuery.eq('ma_toa_nha', building);
    }
    
    if (search) {
      roomsQuery = roomsQuery.ilike('ma_phong_may', `%${search}%`);
    }
    
    const { data: rooms, error: roomsErr } = await roomsQuery;
    
    if (roomsErr) {
      return res.status(500).json({ error: roomsErr.message });
    }
    
    // 2. Get device counts for each room separately
    const roomCounts = {};
    
    // Use Promise.all for parallel requests to improve performance
    await Promise.all(rooms.map(async (room) => {
      const { data, error, count } = await supabase
        .from('ThietBi')
        .select('*', { count: 'exact' })
        .eq('ma_phong_su_dung', room.ma_phong_may);
        
      if (!error) {
        roomCounts[room.ma_phong_may] = count;
      }
    }));
    
    // 3. Map counts to rooms
    const result = rooms.map(r => ({
      ma_phong: r.ma_phong_may,
      ma_toa_nha: r.ma_toa_nha,
      so_luong_may_tinh: roomCounts[r.ma_phong_may] || 0
    }));
    
    res.json(
      {
        statusCode: 200,
        success: true,
        data: result
      }
    );
  } catch (error) {
    console.error('Error in rooms endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


