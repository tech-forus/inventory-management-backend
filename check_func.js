
const pool = require('./src/models/database');

async function check() {
    try {
        const res = await pool.query("SELECT routine_definition FROM information_schema.routines WHERE routine_name = 'get_company_initials'");
        console.log(res.rows[0].routine_definition);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
check();
