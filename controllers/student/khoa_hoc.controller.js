const supabase   = require('../../config/database');
module.exports.khoa_hoc=async(req, res) => {
    const { data, error } = await supabase
    .schema('public')
    .from('HocPhan')
    .select('*');
  
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  console.log(data);
  res.json(data);
}