const { Pool } = require('pg');

// Testar exatamente o que o backend está usando
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testConnection() {
  try {
    console.log('🔍 DATABASE_URL do processo:', process.env.DATABASE_URL);
    
    const empresaId = 'c4b8f87e-18b5-46b3-9b90-24026b558227';
    console.log('🔍 Testando empresa ID:', empresaId);
    
    const result = await pool.query(
      'SELECT * FROM empresas_fiscais WHERE id = $1',
      [empresaId]
    );
    
    console.log('📋 Resultado:', result.rows.length, 'registros');
    if (result.rows.length > 0) {
      console.log('✅ Empresa encontrada:', result.rows[0].razao_social);
    } else {
      console.log('❌ Empresa NÃO encontrada!');
      
      // Listar todas as empresas
      const allResult = await pool.query('SELECT id, razao_social FROM empresas_fiscais LIMIT 3');
      console.log('Empresas no banco:', allResult.rows.length);
      allResult.rows.forEach(emp => {
        console.log('  -', emp.id, ':', emp.razao_social);
      });
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testConnection();
