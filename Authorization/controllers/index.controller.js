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

        // 2. Lấy ma_tinh_nang từ bảng trung gian dựa vào ma_vai_tro
        const { data: roleFeatures, error: roleFeaturesError } = await supabase
            .from('VaiTro_TinhNang') // Thay tên bảng này cho đúng
            .select('ma_tinh_nang')
            .eq('ma_vai_tro', roleData.ma_vai_tro);

        if (roleFeaturesError) {
            console.error('Lỗi khi truy vấn VaiTro_TinhNang:', roleFeaturesError);
            return res.status(400).json({
                statusCode: 400,
                success: false,
                message: 'Không lấy được quyền của vai trò'
            });
        }

        // 3. Lấy danh sách ma_tinh_nang
        const featureIds = roleFeatures.map(item => item.ma_tinh_nang);
        console.log('Feature IDs:', featureIds);

        if (featureIds.length === 0) {
            return res.status(200).json({
                statusCode: 200,
                success: true,
                data: {}
            });
        }

        // 4. Lấy thông tin tính năng từ bảng TinhNang
        const { data: features, error: featuresError } = await supabase
            .from('TinhNang')
            .select('ma_tinh_nang, ten_tinh_nang')
            .in('ma_tinh_nang', featureIds);

        if (featuresError) {
            console.error('Lỗi khi truy vấn TinhNang:', featuresError);
            return res.status(400).json({
                statusCode: 400,
                success: false,
                message: 'Không lấy được danh sách tính năng'
            });
        }

        // 5. Chuyển đổi thành object map với key là ma_tinh_nang và value là ten_tinh_nang
        const featureMap = {};
        features.forEach(feature => {
            featureMap[feature.ma_tinh_nang] = feature.ten_tinh_nang;
        });

        console.log('Features map:', featureMap);

        // 6. Trả về kết quả
        return res.status(200).json({
            statusCode: 200,
            success: true,
            data: featureMap
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