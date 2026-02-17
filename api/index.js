// Archivo: api/index.js

// 1. IMPORTS
import express from 'express';
import sql from 'mssql';
import cors from 'cors';
import axios from 'axios';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 2. CONFIGURACIÓN DE BASE DE DATOS
// (Recuerda usar variables de entorno .env en producción para mayor seguridad)
const dbConfig = {
    user: process.env.DB_USER || 'db38181', 
    password: process.env.DB_PASS || 'fG?59+xCYs6!', 
    server: process.env.DB_SERVER || 'db38181.public.databaseasp.net', 
    database: process.env.DB_NAME || 'db38181',
    options: {
        encrypt: true,
        trustServerCertificate: true 
    }
};

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET || '6LfChlEsAAAAAKGv4Qabny2qH5ChIUUPCcg-kaPe'; 

// 3. RUTAS

// --- RUTA 1: CAPTCHA E INSERCIÓN DE PRUEBA ---
app.post('/api/validar-insertar', async (req, res) => {
    const { token } = req.body;

    try {
        // Validación con Google
        const googleUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${token}`;
        
        const googleResponse = await axios.post(googleUrl, null, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });
        
        if (!googleResponse.data.success) {
            return res.json({ success: false, message: 'Eres un robot' });
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

// --- RUTA 2: OBTENER REGISTROS DE PRUEBA ---
app.get('/api/obtener-datos', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        // Traemos 100 para probar el scroll de la tabla
        const result = await pool.request().query('SELECT TOP 100 * FROM TablaPruebas ORDER BY FechaRegistro DESC');
        res.json(result.recordset);
    } catch (err) {
        console.error("Error SQL:", err);
        res.status(500).json({ error: "Error conectando a BD", details: err.message });
    }
});


// --- RUTA 3: GUARDAR FORMULARIO DE CONTACTO (AQUÍ ESTÁ LA CORRECCIÓN) ---
app.post('/api/guardar-contacto', async (req, res) => {
    // Desestructuramos los datos que envía Vue
    const { nombre, correo, telefono, fechaNacimiento, mensaje } = req.body;

    try {
        // 🟢 CORRECCIÓN DE SEGURIDAD: 
        // Si el teléfono viene undefined o es muy largo, lo aseguramos a string y cortamos a 10 chars.
        // Esto evita el error "String or binary data would be truncated" en SQL.
        const telefonoSeguro = telefono ? telefono.toString().slice(0, 10) : '';

        let pool = await sql.connect(dbConfig);

        await pool.request()
            .input('nombre', sql.NVarChar(60), nombre)
            .input('correo', sql.NVarChar(100), correo)
            
            // Usamos la variable segura aquí 
            .input('telefono', sql.VarChar(10), telefonoSeguro) 
            
            .input('fechaNacimiento', sql.Date, fechaNacimiento)
            .input('mensaje', sql.NVarChar(300), mensaje)
            .query(`
                INSERT INTO FormularioContacto (Nombre, Correo, Telefono, FechaNacimiento, Mensaje)
                VALUES (@nombre, @correo, @telefono, @fechaNacimiento, @mensaje)
            `);

        res.json({ success: true, message: '¡Formulario enviado correctamente!' });

    } catch (err) {
        console.error("Error al guardar contacto:", err);
        // Enviamos el mensaje de error para saber qué pasó si falla
        res.status(500).json({ success: false, message: 'Error en el servidor al guardar.', error: err.message });
    }
});

app.get('/api/contactos', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        // Traemos los últimos 50 registros
        const result = await pool.request().query('SELECT TOP 50 * FROM FormularioContacto ORDER BY FechaRegistro DESC');
        res.json(result.recordset);
    } catch (err) {
        console.error("Error al obtener contactos:", err);
        res.status(500).json({ error: "Error de servidor" });
    }
});

// 4. EXPORTACIÓN MODERNA PARA VERCEL
if (process.env.NODE_ENV !== 'production') {
    const PORT = 3000;
    app.listen(PORT, () => {
        console.log(`✅ Servidor LOCAL corriendo en http://localhost:${PORT}`);
    });
}


// --- IMPORTACIONES AL INICIO DEL ARCHIVO ---
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

// --- CONFIGURACIÓN DE CLOUDINARY ---
// (Lo ideal es poner esto en tu .env, pero por ahora pon tus credenciales aquí)
cloudinary.config({ 
  cloud_name: 'dmjc30adm', 
  api_key: '492749368743999', 
  api_secret: 'KoHeRq4JK64leRQuglZBitGuxPg' 
});

// Configuración de Multer (Para manejar archivos en memoria RAM temporalmente)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ... (El resto de tu código de SQL y App) ...

// --- RUTA 5: SUBIR IMAGEN A CLOUDINARY Y GUARDAR EN SQL ---
app.post('/api/subir-imagen', upload.single('imagen'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No enviaste ninguna imagen" });
        }

        // 1. Subir a Cloudinary usando un "Stream" (Flujo de datos)
        const subirACloudinary = () => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "vue_demo_gallery" }, // Carpeta en Cloudinary
                    (error, result) => {
                        if (result) resolve(result);
                        else reject(error);
                    }
                );
                // Enviamos el buffer del archivo al stream
                stream.end(req.file.buffer);
            });
        };

        const resultadoCloudinary = await subirACloudinary();
        const urlImagen = resultadoCloudinary.secure_url; // ¡Aquí está el link https!
        const titulo = req.body.titulo || 'Sin título';

        // 2. Guardar el link en SQL Server
        let pool = await sql.connect(dbConfig);
        await pool.request()
            .input('titulo', sql.NVarChar(100), titulo)
            .input('url', sql.NVarChar(sql.MAX), urlImagen)
            .query('INSERT INTO Galeria (Titulo, ImagenUrl) VALUES (@titulo, @url)');

        res.json({ success: true, message: 'Imagen subida y guardada', url: urlImagen });

    } catch (error) {
        console.error("Error subida:", error);
        res.status(500).json({ success: false, message: 'Error al subir imagen' });
    }
});

// --- RUTA 6: OBTENER IMÁGENES PARA EL CARRUSEL ---
app.get('/api/galeria', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT * FROM Galeria ORDER BY FechaSubida DESC');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- RUTA: ELIMINAR CONTACTO (DELETE) ---
app.delete('/api/eliminar-contacto/:id', async (req, res) => {
    const { id } = req.params;
    try {
        let pool = await sql.connect(dbConfig);
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM FormularioContacto WHERE ID = @id');
        
        res.json({ success: true, message: 'Registro eliminado' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error al eliminar' });
    }
});

// --- RUTA: ACTUALIZAR CONTACTO (PUT) ---


// --- ACTUALIZAR CONTACTO (PUT) - VERSIÓN A PRUEBA DE ERRORES ---
app.put('/api/actualizar-contacto/:id', async (req, res) => {
    const { id } = req.params;
    
    // 🟢 EL TRUCO: Leemos Mayúsculas (Frontend) O Minúsculas (Postman/Test)
    // Así no importa cómo lo mandes, el servidor lo entiende.
    const nombre = req.body.Nombre || req.body.nombre;
    const correo = req.body.Correo || req.body.correo;
    const telefono = req.body.Telefono || req.body.telefono;
    const mensaje = req.body.Mensaje || req.body.mensaje;
    const fechaNacimiento = req.body.FechaNacimiento || req.body.fechaNacimiento;

    console.log("Editando ID:", id, "Datos:", { nombre, correo, telefono, mensaje });

    try {
        let pool = await sql.connect(dbConfig);
        await pool.request()
            .input('id', sql.Int, id)
            .input('nombre', sql.NVarChar(60), nombre)
            .input('correo', sql.NVarChar(100), correo)
            .input('telefono', sql.VarChar(10), telefono)
            .input('mensaje', sql.NVarChar(300), mensaje)
            .input('fechaNacimiento', sql.Date, fechaNacimiento)
            .query(`
                UPDATE FormularioContacto 
                SET Nombre = @nombre, Correo = @correo, Telefono = @telefono, Mensaje = @mensaje, FechaNacimiento = @fechaNacimiento
                WHERE ID = @id
            `);

        res.json({ success: true, message: 'Registro actualizado' });
    } catch (err) {
        console.error("Error al actualizar:", err);
        res.status(500).json({ success: false, message: 'Error al actualizar' });
    }
});
// Exportamos para Vercel
export default app;