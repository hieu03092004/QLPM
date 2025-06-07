const supabase  = require('../../config/database');

module.exports.getFeature = async (req, res) => {
    try {
        const roleName = req.params.roleName;
        console.log("roleName:", roleName);

        // 1. Lấy ma_vai_tro từ bảng VaiTro dựa vào roleName
        const { data: roleData, error: roleError } = await supabase
            .from('VaiTro')
            .select('ma_vai_tro')
            .eq('ten_vai_tro', roleName)
            .single();

        if (roleError) {
            console.error('Lỗi khi truy vấn VaiTro:', roleError);
            return res.status(400).json({
                statusCode: 400,
                success: false,
                message: 'Không tìm thấy vai trò'
            });
        }

        console.log('Role data:', roleData);

        // 2. Lấy danh sách tính năng mà vai trò này có quyền truy cập
        // Giả sử bảng liên kết có tên là 'VaiTro_TinhNang' (thay đổi tên bảng cho phù hợp)
        const { data: features, error: featuresError } = await supabase
            .from('VaiTro_TinhNang') // Thay tên bảng này cho đúng với database của bạn
            .select(`
                TinhNang:ma_tinh_nang (
                    ten_tinh_nang
                )
            `)
            .eq('ma_vai_tro', roleData.ma_vai_tro);

        if (featuresError) {
            console.error('Lỗi khi truy vấn tính năng theo vai trò:', featuresError);
            return res.status(400).json({
                statusCode: 400,
                success: false,
                message: 'Không lấy được danh sách tính năng'
            });
        }

        // 3. Chuyển đổi thành mảng các tên tính năng
        const featureNames = features
            .map(item => item.TinhNang?.ten_tinh_nang)
            .filter(name => name); // Lọc bỏ các giá trị null/undefined
        
        console.log('Features data:', featureNames);

        // 4. Trả về kết quả
        return res.status(200).json({
            statusCode: 200,
            success: true,
            data: featureNames
        });

    } catch (error) {
        console.error('Lỗi server:', error);
        return res.status(500).json({
            statusCode: 500,
            success: false,
            message: 'Lỗi máy chủ nội bộ'
        });
    }
};