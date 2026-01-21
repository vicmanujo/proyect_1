// Archivo: api/index.js
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const axios = require('axios');
const app = express();

// Permitir CORS (para que tu Vue pueda hablar con esto)
app.use(cors());
app.use(express.json());

// 1. CONFIGURACIÓN DE BASE DE DATOS
// IMPORTANTE: Cuando puedas, usa variables de entorno (process.env)
const dbConfig = {
    user: 'db38181',
    password: 'fG?59+xCYs6!', 
    server: 'db38181.public.databaseasp.net', 
    database: 'db38181',
    options: {
        encrypt: true,
        trustServerCertificate: true 
    }
};

const RECAPTCHA_SECRET_KEY = '6LfChlEsAAAAAKGv4Qabny2qH5ChIUUPCcg-kaPe'; 

// 2. TUS RUTAS
app.post('/api/validar-insertar', async (req, res) => {
    const { token } = req.body;

    try {
        const googleUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${token}`;
        const googleResponse = await axios.post(googleUrl);
        
        if (!googleResponse.data.success) {
            return res.json({ success: false, message: 'Eres un robot 🤖' });
        }

        let pool = await sql.connect(dbConfig);
        const textoFijo = "Validación Exitosa desde Vue";
        const fecha = new Date(); 

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

app.get('/api/obtener-datos', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT TOP 10 * FROM TablaPruebas ORDER BY FechaRegistro DESC');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. LA PARTE IMPORTANTE PARA VERCEL
// No usamos app.listen, sino que exportamos la app
module.exports = app;