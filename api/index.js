// Archivo: api/index.js

// 1. IMPORTS
import express from 'express';
import sql from 'mssql';
import cors from 'cors';
import axios from 'axios';
import bcrypt from 'bcryptjs';

import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

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


app.post('/api/registro', async (req, res) => {
    const { correo, password } = req.body;

    try {
        let pool = await sql.connect(dbConfig);
        
        // 1. Verificar si el correo ya existe
        const existe = await pool.request()
            .input('correo', sql.NVarChar(100), correo)
            .query('SELECT ID FROM Usuarios WHERE Correo = @correo');
            
        if (existe.recordset.length > 0) {
            return res.status(400).json({ success: false, message: 'El correo ya está registrado' });
        }

        // 2. Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // 3. Guardar en la base de datos
        await pool.request()
            .input('correo', sql.NVarChar(100), correo)
            .input('passwordHash', sql.NVarChar(255), passwordHash)
            .query('INSERT INTO Usuarios (Correo, PasswordHash) VALUES (@correo, @passwordHash)');

        res.json({ success: true, message: 'Usuario registrado con éxito' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});





// ==========================================
// 1. RUTA: REGISTRO PASO 1 (Enviar Código)
// ==========================================
app.post('/api/registro-paso1', async (req, res) => {
    const { correo, password } = req.body;

    try {
        let pool = await sql.connect(dbConfig);
        
        // Revisar si ya existe
        const existe = await pool.request()
            .input('correo', sql.NVarChar(100), correo)
            .query('SELECT ID, Verificado FROM Usuarios WHERE Correo = @correo');
            
        if (existe.recordset.length > 0) {
            if (existe.recordset[0].Verificado) {
                return res.status(400).json({ success: false, message: 'El correo ya está registrado y verificado.' });
            } else {
                // Si existe pero no está verificado, le borramos el registro viejo para que empiece de nuevo
                await pool.request()
                    .input('correo', sql.NVarChar(100), correo)
                    .query('DELETE FROM Usuarios WHERE Correo = @correo');
            }
        }

        // Encriptar password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Generar código de 6 dígitos
        const codigoVerificacion = Math.floor(100000 + Math.random() * 900000).toString();

        // Guardar usuario como NO VERIFICADO (Verificado = 0)
        await pool.request()
            .input('correo', sql.NVarChar(100), correo)
            .input('passwordHash', sql.NVarChar(255), passwordHash)
            .input('codigo', sql.NVarChar(10), codigoVerificacion)
            .query(`
                INSERT INTO Usuarios (Correo, PasswordHash, Verificado, CodigoVerificacion) 
                VALUES (@correo, @passwordHash, 0, @codigo)
            `);

        // Enviar el correo usando tu transporter de Gmail
        const mailOptions = {
            from: '"Sistema Vue" <josevictormanuel619@gmail.com>', // Pon tu correo
            to: correo,
            subject: 'Tu código de verificación',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                    <h2>¡Verifica tu cuenta!</h2>
                    <p>Tu código de seguridad de 6 dígitos es:</p>
                    <h1 style="color: #42b883; font-size: 40px; letter-spacing: 5px;">${codigoVerificacion}</h1>
                    <p>Ingresa este código en la pantalla de registro.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);

        res.json({ success: true, message: 'Código enviado a tu correo' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error al enviar el código' });
    }
});

// ==========================================
// 2. RUTA: REGISTRO PASO 2 (Validar Código)
// ==========================================
app.post('/api/registro-paso2', async (req, res) => {
    const { correo, codigo } = req.body;

    try {
        let pool = await sql.connect(dbConfig);
        const resultado = await pool.request()
            .input('correo', sql.NVarChar(100), correo)
            .query('SELECT ID, CodigoVerificacion FROM Usuarios WHERE Correo = @correo');

        const usuario = resultado.recordset[0];

        if (!usuario) {
            return res.status(400).json({ success: false, message: 'Usuario no encontrado' });
        }

        if (usuario.CodigoVerificacion !== codigo) {
            return res.status(400).json({ success: false, message: 'El código es incorrecto' });
        }

        // Si el código es correcto, marcamos como verificado y borramos el código de seguridad
        await pool.request()
            .input('id', sql.Int, usuario.ID)
            .query('UPDATE Usuarios SET Verificado = 1, CodigoVerificacion = NULL WHERE ID = @id');

        res.json({ success: true, message: '¡Cuenta verificada exitosamente!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});

// ==========================================
// 3. RUTA: LOGIN (Actualizada por seguridad)
// ==========================================
app.post('/api/login', async (req, res) => {
    const { correo, password } = req.body;

    try {
        let pool = await sql.connect(dbConfig);
        const resultado = await pool.request()
            .input('correo', sql.NVarChar(100), correo)
            .query('SELECT ID, Correo, PasswordHash, Verificado FROM Usuarios WHERE Correo = @correo');
            
        const usuario = resultado.recordset[0];

        if (!usuario) return res.status(400).json({ success: false, message: 'Correo o contraseña incorrectos' });

        // 🟢 NUEVO: Bloquear si no ha verificado su correo
        if (!usuario.Verificado) {
            return res.status(403).json({ success: false, message: 'Tu cuenta aún no está verificada. Revisa tu correo.' });
        }

        const esCorrecta = await bcrypt.compare(password, usuario.PasswordHash);
        if (!esCorrecta) return res.status(400).json({ success: false, message: 'Correo o contraseña incorrectos' });

        const SECRET_KEY = process.env.JWT_SECRET || 'qmfk znsx frhc gzjt';
        const token = jwt.sign({ id: usuario.ID, correo: usuario.Correo }, SECRET_KEY, { expiresIn: '2h' });

        res.json({ success: true, message: '¡Bienvenido!', token, usuario: { id: usuario.ID, correo: usuario.Correo } });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});












// --- CONFIGURACIÓN DE NODEMAILER (GMAIL) ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'josevictormanuel619@gmail.com', // ⚠️ Pon tu correo aquí
        pass: 'qmfk znsx frhc gzjt' // ⚠️ No es tu contraseña normal (Te explico abajo)
    }
});




// ==========================================
// 4. RUTAS: RECUPERAR CONTRASEÑA
// ==========================================

// A. SOLICITAR CÓDIGO (Enviar Correo)
app.post('/api/olvide-password', async (req, res) => {
    const { correo } = req.body;

    try {
        let pool = await sql.connect(dbConfig);
        const resultado = await pool.request()
            .input('correo', sql.NVarChar(100), correo)
            .query('SELECT ID FROM Usuarios WHERE Correo = @correo');

        if (resultado.recordset.length === 0) {
            // No decimos "no existe" por seguridad contra hackers, fingimos que todo salió bien
            return res.json({ success: true, message: 'Si el correo existe, recibirás un código.' });
        }

        const usuario = resultado.recordset[0];
        const codigoReset = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Expiración: 15 minutos
        const expiracion = new Date();
        expiracion.setMinutes(expiracion.getMinutes() + 15);

        await pool.request()
            .input('id', sql.Int, usuario.ID)
            .input('codigo', sql.NVarChar(255), codigoReset)
            .input('exp', sql.DateTime, expiracion)
            .query('UPDATE Usuarios SET ResetToken = @codigo, ResetTokenExp = @exp WHERE ID = @id');

        const mailOptions = {
            from: '"Soporte Sistema" <josss@gmail.com>',
            to: correo,
            subject: 'Recuperación de Contraseña',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                    <h2>Recuperación de cuenta</h2>
                    <p>Tu código para restablecer la contraseña es:</p>
                    <h1 style="color: #42b883; font-size: 40px; letter-spacing: 5px;">${codigoReset}</h1>
                    <p>Este código <b>expirará en 15 minutos</b>.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'Código enviado a tu correo' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error al procesar la solicitud' });
    }
});

// B. ACTUALIZAR CONTRASEÑA (Validar Código + Guardar)
app.post('/api/reset-password', async (req, res) => {
    const { correo, codigo, nuevaPassword } = req.body;

    try {
        let pool = await sql.connect(dbConfig);
        const resultado = await pool.request()
            .input('correo', sql.NVarChar(100), correo)
            .query('SELECT ID, ResetToken, ResetTokenExp FROM Usuarios WHERE Correo = @correo');

        const usuario = resultado.recordset[0];

        // Validaciones de seguridad
        if (!usuario || usuario.ResetToken !== codigo) {
            return res.status(400).json({ success: false, message: 'El código es incorrecto o inválido.' });
        }

        const ahora = new Date();
        if (ahora > new Date(usuario.ResetTokenExp)) {
            return res.status(400).json({ success: false, message: 'El código ha expirado. Solicita uno nuevo.' });
        }

        // Encriptar la nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(nuevaPassword, salt);

        // Actualizar contraseña y borrar el código temporal por seguridad
        await pool.request()
            .input('id', sql.Int, usuario.ID)
            .input('passwordHash', sql.NVarChar(255), passwordHash)
            .query('UPDATE Usuarios SET PasswordHash = @passwordHash, ResetToken = NULL, ResetTokenExp = NULL WHERE ID = @id');

        res.json({ success: true, message: '¡Contraseña actualizada con éxito!' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
});






// Exportamos para Vercel
export default app;