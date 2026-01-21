// Archivo: api/index.js

// 1. CAMBIAMOS LOS REQUIRE POR IMPORT
import express from 'express';
import sql from 'mssql';
import cors from 'cors';
import axios from 'axios';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 2. CONFIGURACIÓN DE BASE DE DATOS
const dbConfig = {
    user: 'db38181', // Lo ideal es usar process.env.DB_USER
    password: 'fG?59+xCYs6!', 
    server: 'db38181.public.databaseasp.net', 
    database: 'db38181',
    options: {
        encrypt: true,
        trustServerCertificate: true 
    }
};

const RECAPTCHA_SECRET_KEY = '6LfChlEsAAAAAKGv4Qabny2qH5ChIUUPCcg-kaPe'; 

// 3. RUTAS
app.post('/api/validar-insertar', async (req, res) => {
    const { token } = req.body;

    try {
        // Validación con Google
        const googleUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${token}`;
        
        // Axios funciona un poco diferente con imports a veces, pero esto suele ser estándar
        const googleResponse = await axios.post(googleUrl, null, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });
        
        if (!googleResponse.data.success) {
            return res.json({ success: false, message: 'Eres un robot 🤖' });
        }

        // Conexión a SQL
        let pool = await sql.connect(dbConfig);
        
        const textoFijo = "Validación Exitosa desde Vercel";
        const fecha = new Date(); 

        await pool.request()
            .input('texto', sql.NVarChar, textoFijo)
            .input('fecha', sql.DateTime, fecha)
            .query('INSERT INTO TablaPruebas (TextoPrueba, FechaRegistro) VALUES (@texto, @fecha)');

        res.json({ success: true, message: 'Datos guardados correctamente' });

    } catch (err) {
        console.error("Error Backend:", err);
        res.status(500).json({ success: false, error: err.message, details: err });
    }
});

app.get('/api/obtener-datos', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT TOP 10 * FROM TablaPruebas ORDER BY FechaRegistro DESC');
        res.json(result.recordset);
    } catch (err) {
        console.error("Error SQL:", err);
        res.status(500).json({ error: "Error conectando a BD", details: err.message });
    }
});

// 4. EXPORTACIÓN MODERNA PARA VERCEL
export default app;