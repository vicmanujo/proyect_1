// server.js
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors());
app.use(express.json());

// 1. CONFIGURACIÓN DE BASE DE DATOS
const dbConfig = {
    user: 'db38181',
    password: 'fG?59+xCYs6!', // <--- ¡PON TU CONTRASEÑA REAL AQUÍ!
    server: 'db38181.public.databaseasp.net', 
    database: 'db38181',
    options: {
        encrypt: true,
        trustServerCertificate: true 
    }
};

// Clave SECRETA de Google (La que NO se comparte)
const RECAPTCHA_SECRET_KEY = '6LfChlEsAAAAAKGv4Qabny2qH5ChIUUPCcg-kaPe'; 

// 2. ENDPOINT: Validar Captcha e Insertar
app.post('/api/validar-insertar', async (req, res) => {
    const { token } = req.body;

    try {
        // A. Preguntar a Google si el captcha es real
        const googleUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${token}`;
        const googleResponse = await axios.post(googleUrl);
        
        if (!googleResponse.data.success) {
            return res.json({ success: false, message: 'Eres un robot 🤖' });
        }

        // B. Si es humano, conectamos a SQL Server e insertamos
        let pool = await sql.connect(dbConfig);
        
        // Insertamos los datos predeterminados
        const textoFijo = "Validación Exitosa desde Vue";
        const fecha = new Date(); // Fecha actual

        // NOTA: Ajusta el nombre de tu tabla. En la imagen no se ve el nombre, asumo 'TablaPruebas'
        // Si tu tabla se llama distinto, cambia 'TablaPruebas' por el nombre real.
        await pool.request()
            .input('texto', sql.NVarChar, textoFijo)
            .input('fecha', sql.DateTime, fecha)
            .query('INSERT INTO TablaPruebas (TextoPrueba, FechaRegistro) VALUES (@texto, @fecha)');

        res.json({ success: true, message: 'Datos guardados correctamente' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. ENDPOINT: Obtener registros para la tabla
app.get('/api/obtener-datos', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        // Seleccionamos los últimos 10 registros
        const result = await pool.request().query('SELECT TOP 10 * FROM TablaPruebas ORDER BY FechaRegistro DESC');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3000;
// app.listen(PORT, () => {
//     console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
module.exports = app;