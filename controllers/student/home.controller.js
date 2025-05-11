const supabase   = require('../../config/database');
module.exports.index=(req, res) => {
    res.send('Đây là trang chủ của sinh viên');
}

exports.lichThucHanh = async (req, res) => {
    try {
        const { sinhVienId } = req.params;
        const { ngay } = req.query; // Lấy tham số ngày từ query string
        
        console.log("sinhVienId:", sinhVienId);
        console.log("ngày cần lọc:", ngay);
        
        // Nếu không có ngày, sẽ lấy ngày hiện tại
        const ngayLoc = ngay ? new Date(ngay) : new Date();
        const ngayLocFormatted = ngayLoc.toISOString().split('T')[0]; // Định dạng 'YYYY-MM-DD'
        
        // Truy vấn sử dụng Supabase
        const { data, error } = await supabase
            .rpc('get_lich_thuc_hanh_sinh_vien', {
                p_sinh_vien_id: sinhVienId,
                p_ngay: ngayLocFormatted
            });
        
        if (error) {
            console.error("Lỗi khi truy vấn Supabase:", error);
            return res.status(500).json({
                success: false,
                statusCode: 500,
                message: "Lỗi server khi lấy lịch thực hành",
                error: error.message
            });
        }
        
        // Định dạng lại kết quả theo yêu cầu
        const formattedData = data.map(item => ({
            ten_hoc_phan: item.ten_hoc_phan,
            ten_giang_vien: item.ten_giang_vien,
            Phong: `Phòng ${item.phong_thuc_hanh}`,
            thoi_gian: item.thoi_gian,
            so_luong: item.so_luong_sinh_vien
        }));
        
        return res.status(200).json({
            success: true,
            statusCode: 200,
            data: formattedData
        });
        
    } catch (error) {
        console.error("Lỗi:", error);
        return res.status(500).json({
            success: false,
            statusCode: 500,
            message: "Lỗi server",
            error: error.message
        });
    }
};
const result={
    "success":true,
    "statusCode":200,
    data:[
        {
            "title": "Thuc Hanh Co So Du LIeu",
            "lecturer": "Nguyen Van A",
            "room": "Phong G8.101",
            "Thoi Gian": "08:00-10:00",
            "So Luong":12
        },
        {
            "title": "Thuc Hanh Co So Du LIeuA",
            "lecturer": "Nguyen Van A",
            "room": "Phong G8.101",
            "Thoi Gian": "14:00-15:00",
            "So Luong":12
        },
    ]
}
