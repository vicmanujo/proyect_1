import express from 'express';
import sql from 'mssql';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// =================================================================
// ⚙️ 1. CONFIGURACIONES GLOBALES (DB, Cloudinary, Mailer, Multer)
// =================================================================

// Configuración de Base de Datos
const dbConfig = {
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD, 
    server: process.env.DB_SERVER, 
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true 
    }
};

// Configuración de Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configuración de Multer (Para procesar imágenes en Memoria RAM)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Configuración de Nodemailer (Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// =================================================================
// 🛡️ MIDDLEWARE DE SEGURIDAD (CUIDA QUE NO ENTREN POR POSTMAN)
// =================================================================
const verificarToken = (req, res, next) => {
    // 1. Buscamos el token en la cabecera (Header) de la petición
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // El formato es "Bearer <token>"

    // 2. Si no hay token, lo bateamos
    if (!token) {
        return res.status(401).json({ success: false, message: 'Acceso Denegado. No hay token de autenticación.' });
    }

    // 3. Si hay token, verificamos que sea válido y no haya caducado
    jwt.verify(token, process.env.JWT_SECRET, (err, usuarioDecodificado) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'El token ha expirado o es inválido. Inicia sesión de nuevo.' });
        }
        
        // 4. Si el token es bueno, guardamos los datos del usuario en la petición y lo dejamos pasar
        req.usuario = usuarioDecodificado; 
        next();
    });
};

// =================================================================
// 🔐 2. AUTENTICACIÓN Y SEGURIDAD (CON ZERO TRUST)
// =================================================================

app.post('/api/login', async (req, res) => {
    const { cuenta, password, captchaToken } = req.body;

    try {
        if (!captchaToken) return res.status(400).json({ success: false, message: 'Por favor, completa el Captcha' });
        
        const captchaVerifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`;
        const captchaRes = await fetch(captchaVerifyUrl, { method: 'POST' });
        const captchaData = await captchaRes.json();
        
        if (!captchaData.success) {
            return res.status(400).json({ success: false, message: 'Validación de Captcha fallida. Intenta de nuevo.' });
        }

        let pool = await sql.connect(dbConfig);
        
        // 🟢 MEGA CONSULTA: Revisamos al usuario y calculamos los minutos de castigo en tiempo real
        const result = await pool.request()
            .input('cuenta', sql.VarChar, cuenta)
            .query(`
                SELECT *, 
                DATEDIFF(MINUTE, GETDATE(), fechaSuspension) AS minutosRestantes 
                FROM Usuario 
                WHERE strCorreo = @cuenta OR strNombreUsuario = @cuenta
            `);

        if (result.recordset.length === 0) {
            return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }

        const usuario = result.recordset[0];

        // 🚨 1. VALIDACIÓN DE SUSPENSIÓN (CASTIGO DE 15 MINUTOS)
        if (usuario.minutosRestantes > 0) {
            return res.status(403).json({ 
                success: false, 
                message: `🚨 Violación de seguridad detectada. Cuenta suspendida. Intenta de nuevo en ${usuario.minutosRestantes} minuto(s).` 
            });
        }

        // 🚨 2. VALIDACIÓN DE USUARIO INACTIVO
        if (!usuario.bitActivo) {
            return res.status(403).json({ success: false, message: 'Tu cuenta está inactiva o bloqueada.' });
        }

        // 3. VALIDACIÓN DE CONTRASEÑA
        const passwordValida = await bcrypt.compare(password, usuario.strPwd);
        if (!passwordValida) {
            return res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }

        // 4. SI LLEGA AQUÍ, TODO ESTÁ PERFECTO. LIMPIAMOS EL CASTIGO POR SI ACASO Y DAMOS EL TOKEN.
        if (usuario.fechaSuspension !== null) {
            await pool.request()
                .input('id', sql.Int, usuario.id)
                .query('UPDATE Usuario SET fechaSuspension = NULL WHERE id = @id');
        }

        const tokenPayload = {
            id: usuario.id,
            idPerfil: usuario.idPerfil,
            nombre: usuario.strNombreUsuario
        };
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '2h' });

        res.json({ 
            success: true, 
            token, 
            usuario: { 
                id: usuario.id,
                nombre: usuario.strNombreUsuario, 
                fotoUrl: usuario.strUrlImagen, 
                idPerfil: usuario.idPerfil 
            } 
        });

    } catch (err) {
        console.error("Error en login:", err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// =================================================================
// 🚨 BOTÓN DE PÁNICO: SUSPENDER CUENTA POR 15 MINUTOS
// =================================================================
app.post('/api/suspender-cuenta', async (req, res) => {
    const { idUsuario } = req.body;
    
    if (!idUsuario) {
        return res.status(400).json({ success: false, message: 'Falta el ID del usuario' });
    }

    try {
        let pool = await sql.connect(dbConfig);
        
        // Sumamos exactamente 15 minutos a la hora actual del servidor SQL
        await pool.request()
            .input('id', sql.Int, idUsuario)
            .query('UPDATE Usuario SET fechaSuspension = DATEADD(MINUTE, 15, GETDATE()) WHERE id = @id');
            
        res.json({ success: true, message: 'Cuenta suspendida por 15 minutos.' });
    } catch (error) {
        console.error('Error al suspender cuenta:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// =================================================================
// 👤 3. MI PERFIL (Datos, Foto, Contraseña, Verificación)
// =================================================================

// Obtener datos del perfil
app.get('/api/mi-perfil/:id', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT strCorreo, strNumeroCelular, Verificado, strUrlImagen FROM Usuario WHERE id = @id');

        if (result.recordset.length > 0) {
            res.json({ success: true, perfil: result.recordset[0] });
        } else {
            res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
    } catch (err) {
        console.error("Error al obtener perfil:", err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Guardar cambios del perfil (Texto)
// =================================================================
// 🟢 GUARDAR PERFIL UNIFICADO (Texto + Foto a Cloudinary)
// =================================================================
app.put('/api/mi-perfil/:id', upload.single('foto'), async (req, res) => {
    const { nombre, correo, celular } = req.body;
    let fotoUrlFinal = null;

    try {
        // 1. Si el usuario mandó una foto nueva, la subimos a Cloudinary primero
        if (req.file) {
            const b64 = Buffer.from(req.file.buffer).toString("base64");
            let dataURI = "data:" + req.file.mimetype + ";base64," + b64;

            const resultCloudinary = await cloudinary.uploader.upload(dataURI, {
                folder: 'corp_system_perfiles',
                public_id: `perfil_usr_${req.params.id}`
            });

            fotoUrlFinal = resultCloudinary.secure_url;
        }

        // 2. Preparamos la consulta SQL Base
        let updateQuery = `
            UPDATE Usuario 
            SET strNombreUsuario = @nombre, 
                strCorreo = @correo, 
                strNumeroCelular = @celular 
        `;

        // 3. Si hubo foto, le agregamos ese pedacito a la consulta SQL
        if (fotoUrlFinal) {
            updateQuery += `, strUrlImagen = @foto `;
        }
        
        updateQuery += ` WHERE id = @id`;

        // 4. Ejecutamos la consulta
        let pool = await sql.connect(dbConfig);
        const request = pool.request()
            .input('id', sql.Int, req.params.id)
            .input('nombre', sql.NVarChar, nombre)
            .input('correo', sql.VarChar, correo)
            .input('celular', sql.VarChar, celular);

        if (fotoUrlFinal) {
            request.input('foto', sql.VarChar, fotoUrlFinal);
        }

        await request.query(updateQuery);

        // Devolvemos éxito y, si hubo foto nueva, mandamos la URL para que Vue la actualice
        res.json({ 
            success: true, 
            message: 'Tus datos se guardaron correctamente.',
            fotoUrl: fotoUrlFinal 
        });

    } catch (err) {
        console.error("Error al actualizar perfil unificado:", err);
        if (err.message && err.message.includes('UNIQUE')) {
            return res.status(500).json({ success: false, message: 'El correo ya está en uso por otra cuenta.' });
        }
        res.status(500).json({ success: false, message: 'Error interno al guardar los datos.' });
    }
});

// Cambiar Contraseña
app.put('/api/cambiar-password/:id', async (req, res) => {
    const { pwdActual, pwdNueva } = req.body;
    try {
        let pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT strPwd FROM Usuario WHERE id = @id');

        const usuario = result.recordset[0];
        if (!usuario) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

        const passwordValida = await bcrypt.compare(pwdActual, usuario.strPwd);
        if (!passwordValida) return res.status(400).json({ success: false, message: 'La contraseña actual es incorrecta.' });

        const salt = await bcrypt.genSalt(10);
        const hashNuevo = await bcrypt.hash(pwdNueva, salt);

        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('pwd', sql.NVarChar, hashNuevo)
            .query('UPDATE Usuario SET strPwd = @pwd WHERE id = @id');

        res.json({ success: true, message: '¡Contraseña actualizada con éxito!' });
    } catch (err) {
        console.error("Error al cambiar contraseña:", err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Solicitar Código (OTP al Correo)
app.post('/api/solicitar-codigo', async (req, res) => {
    const { idUsuario } = req.body;
    const codigoOTP = Math.floor(100000 + Math.random() * 900000).toString();

    try {
        let pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, idUsuario)
            .query('SELECT strNombreUsuario, strCorreo FROM Usuario WHERE id = @id');
            
        const usuario = result.recordset[0];
        if (!usuario) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

        await pool.request()
            .input('id', sql.Int, idUsuario)
            .input('codigo', sql.VarChar, codigoOTP)
            .query('UPDATE Usuario SET CodigoVerificacion = @codigo WHERE id = @id');

        const mailOptions = {
            from: `"Seguridad Corp System" <${process.env.EMAIL_USER}>`,
            to: usuario.strCorreo,
            subject: 'Tu código de verificación de seguridad',
            html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                    <h2>Hola ${usuario.strNombreUsuario},</h2>
                    <p>Se ha solicitado verificar tu cuenta. Tu código de acceso es:</p>
                    <h1 style="color: #1867C0; font-size: 40px; letter-spacing: 5px; background: #f4f4f4; padding: 10px; border-radius: 8px; display: inline-block;">${codigoOTP}</h1>
                    <p style="color: #888; font-size: 12px; margin-top: 20px;">Si no solicitaste este código, ignora este correo.</p>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        return res.json({ success: true, message: 'Código enviado a tu correo exitosamente.' });
    } catch (err) {
        console.error("Error al enviar código:", err);
        res.status(500).json({ success: false, message: 'Error interno enviando el correo' });
    }
});

// 🟢 RUTAS AGREGADA: Verificar Código (OTP)
app.post('/api/verificar-codigo', async (req, res) => {
    const { idUsuario, codigo } = req.body;
    try {
        let pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('id', sql.Int, idUsuario)
            .query('SELECT CodigoVerificacion FROM Usuario WHERE id = @id');

        const dbCodigo = result.recordset[0]?.CodigoVerificacion;

        if (dbCodigo === codigo) {
            await pool.request()
                .input('id', sql.Int, idUsuario)
                .query('UPDATE Usuario SET Verificado = 1, CodigoVerificacion = NULL WHERE id = @id');
            res.json({ success: true, message: '¡Cuenta verificada con éxito!' });
        } else {
            res.status(400).json({ success: false, message: 'Código incorrecto o expirado.' });
        }
    } catch (err) {
        console.error("Error al verificar código:", err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});


// =================================================================
// 📁 4. MÓDULOS DEL SISTEMA Y CATÁLOGOS (CRUDs)
// =================================================================

// Menú Dinámico
// =================================================================
// MENÚ DINÁMICO INTELIGENTE (CON PERMISOS DE BOTONES INCLUIDOS)
// =================================================================
app.get('/api/menu-dinamico', async (req, res) => {
    const { idPerfil } = req.query;

    if (!idPerfil) {
        return res.status(400).json({ success: false, message: 'Falta el perfil del usuario' });
    }

    try {
        await sql.connect(dbConfig);
        const request = new sql.Request();
        
        // 🟢 MEGA CONSULTA: Ahora también traemos los bits de permisos
        const result = await request
            .input('idPerfil', sql.Int, idPerfil)
            .query(`
                SELECT 
                    mp.id AS idMenu,
                    mp.strNombreMenu,
                    mp.strRutaUrl AS rutaMenu,
                    mod.id AS idModulo,
                    mod.strNombreModulo,
                    mod.strRutaUrl AS rutaModulo,
                    pp.bitAgregar,     -- 🟢 Traemos si puede Crear
                    pp.bitEditar,      -- 🟢 Traemos si puede Editar
                    pp.bitEliminar,    -- 🟢 Traemos si puede Borrar
                    pp.bitDetalle      -- 🟢 Traemos si puede ver Detalle
                FROM MenuPrincipal mp
                INNER JOIN Modulo mod ON mp.id = mod.idMenuPrincipal
                INNER JOIN PermisosPerfil pp ON mod.id = pp.idModulo
                WHERE pp.idPerfil = @idPerfil 
                  AND pp.bitConsulta = 1
                ORDER BY mp.strNombreMenu, mod.strNombreModulo
            `);

        const menuAgrupado = [];
        
        result.recordset.forEach(row => {
            let menu = menuAgrupado.find(m => m.id === row.idMenu);
            if (!menu) {
                menu = { 
                    id: row.idMenu, 
                    titulo: row.strNombreMenu, 
                    icono: 'mdi-folder',
                    submodulos: [] 
                };
                menuAgrupado.push(menu);
            }
            // 🟢 Inyectamos los permisos de cada submódulo en el JSON
            menu.submodulos.push({ 
                id: row.idModulo, 
                strNombreModulo: row.strNombreModulo, 
                strRutaUrl: row.rutaModulo,
                permisos: {
                    agregar: row.bitAgregar,
                    editar: row.bitEditar,
                    eliminar: row.bitEliminar,
                    detalle: row.bitDetalle
                }
            });
        });

        res.json({ success: true, menu: menuAgrupado });
    } catch (err) {
        console.error("Error al obtener menú dinámico:", err);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// CRUD Menú Principal
app.get('/api/menu', async (req, res) => { /* ... */ 
    try { let pool = await sql.connect(dbConfig); const result = await pool.request().query('SELECT id, strNombreMenu, strRutaUrl FROM MenuPrincipal ORDER BY id DESC'); res.json(result.recordset); } catch (err) { res.status(500).json({ success: false, message: 'Error DB' }); }
});
app.post('/api/menu', async (req, res) => { /* ... */ 
    const { strNombreMenu, strRutaUrl } = req.body; try { let pool = await sql.connect(dbConfig); await pool.request().input('nombre', sql.NVarChar(50), strNombreMenu).input('ruta', sql.VarChar(255), strRutaUrl).query('INSERT INTO MenuPrincipal (strNombreMenu, strRutaUrl) VALUES (@nombre, @ruta)'); res.json({ success: true, message: 'Creado' }); } catch (err) { res.status(500).json({ success: false, message: 'Error' }); }
});
app.put('/api/menu/:id', async (req, res) => { /* ... */ 
    const { id } = req.params; const { strNombreMenu, strRutaUrl } = req.body; try { let pool = await sql.connect(dbConfig); await pool.request().input('id', sql.Int, id).input('nombre', sql.NVarChar(50), strNombreMenu).input('ruta', sql.VarChar(255), strRutaUrl).query('UPDATE MenuPrincipal SET strNombreMenu = @nombre, strRutaUrl = @ruta WHERE id = @id'); res.json({ success: true, message: 'Actualizado' }); } catch (err) { res.status(500).json({ success: false, message: 'Error' }); }
});
app.delete('/api/menu/:id',verificarToken, async (req, res) => { /* ... */ 
    const { id } = req.params; try { let pool = await sql.connect(dbConfig); await pool.request().input('id', sql.Int, id).query('DELETE FROM MenuPrincipal WHERE id = @id'); res.json({ success: true, message: 'Eliminado' }); } catch (err) { res.status(500).json({ success: false, message: 'Error' }); }
});

// CRUD Módulo
app.get('/api/modulo', async (req, res) => { /* ... */ 
    try { let pool = await sql.connect(dbConfig); const result = await pool.request().query('SELECT id, idMenuPrincipal, strNombreModulo, strRutaUrl FROM Modulo ORDER BY id DESC'); res.json(result.recordset); } catch (err) { res.status(500).json({ success: false, message: 'Error DB' }); }
});
app.post('/api/modulo', async (req, res) => { /* ... */ 
    const { idMenuPrincipal, strNombreModulo, strRutaUrl } = req.body; try { let pool = await sql.connect(dbConfig); await pool.request().input('idMenu', sql.Int, idMenuPrincipal).input('nombre', sql.NVarChar(50), strNombreModulo).input('ruta', sql.VarChar(255), strRutaUrl).query('INSERT INTO Modulo (idMenuPrincipal, strNombreModulo, strRutaUrl) VALUES (@idMenu, @nombre, @ruta)'); res.json({ success: true, message: 'Creado' }); } catch (err) { res.status(500).json({ success: false, message: 'Error' }); }
});
app.put('/api/modulo/:id', async (req, res) => { /* ... */ 
    const { id } = req.params; const { idMenuPrincipal, strNombreModulo, strRutaUrl } = req.body; try { let pool = await sql.connect(dbConfig); await pool.request().input('id', sql.Int, id).input('idMenu', sql.Int, idMenuPrincipal).input('nombre', sql.NVarChar(50), strNombreModulo).input('ruta', sql.VarChar(255), strRutaUrl).query('UPDATE Modulo SET idMenuPrincipal = @idMenu, strNombreModulo = @nombre, strRutaUrl = @ruta WHERE id = @id'); res.json({ success: true, message: 'Actualizado' }); } catch (err) { res.status(500).json({ success: false, message: 'Error' }); }
});
app.delete('/api/modulo/:id', verificarToken, async (req, res) => { /* ... */ 
    const { id } = req.params; try { let pool = await sql.connect(dbConfig); await pool.request().input('id', sql.Int, id).query('DELETE FROM Modulo WHERE id = @id'); res.json({ success: true, message: 'Eliminado' }); } catch (err) { res.status(500).json({ success: false, message: 'Error' }); }
});

// CRUD Perfil
app.get('/api/perfil', async (req, res) => { /* ... */ 
    try { let pool = await sql.connect(dbConfig); const result = await pool.request().query('SELECT id, strNombrePerfil, bitAdministrador, fechaCreacion FROM Perfil ORDER BY id DESC'); res.json(result.recordset); } catch (err) { res.status(500).json({ success: false, message: 'Error' }); }
});
app.post('/api/perfil', async (req, res) => { /* ... */ 
    const { strNombrePerfil, bitAdministrador } = req.body; try { let pool = await sql.connect(dbConfig); await pool.request().input('nombre', sql.NVarChar(50), strNombrePerfil).input('isAdmin', sql.Bit, bitAdministrador ? 1 : 0).query('INSERT INTO Perfil (strNombrePerfil, bitAdministrador) VALUES (@nombre, @isAdmin)'); res.json({ success: true, message: 'Creado' }); } catch (err) { res.status(500).json({ success: false, message: 'Error' }); }
});
app.put('/api/perfil/:id', async (req, res) => { /* ... */ 
    const { id } = req.params; const { strNombrePerfil, bitAdministrador } = req.body; try { let pool = await sql.connect(dbConfig); await pool.request().input('id', sql.Int, id).input('nombre', sql.NVarChar(50), strNombrePerfil).input('isAdmin', sql.Bit, bitAdministrador ? 1 : 0).query('UPDATE Perfil SET strNombrePerfil = @nombre, bitAdministrador = @isAdmin WHERE id = @id'); res.json({ success: true, message: 'Actualizado' }); } catch (err) { res.status(500).json({ success: false, message: 'Error' }); }
});
app.delete('/api/perfil/:id', verificarToken, async (req, res) => { /* ... */ 
    const { id } = req.params; try { let pool = await sql.connect(dbConfig); await pool.request().input('id', sql.Int, id).query('DELETE FROM Perfil WHERE id = @id'); res.json({ success: true, message: 'Eliminado' }); } catch (err) { res.status(500).json({ success: false, message: 'Error' }); }
});

// Permisos
app.get('/api/permisos/:idPerfil', async (req, res) => {
    const { idPerfil } = req.params;
    try {
        let pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('idPerfil', sql.Int, idPerfil)
            .query('SELECT idModulo, bitAgregar, bitEditar, bitConsulta, bitEliminar, bitDetalle FROM PermisosPerfil WHERE idPerfil = @idPerfil');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error BD' });
    }
});
app.post('/api/permisos', async (req, res) => {
    const { idPerfil, matrizPermisos } = req.body;
    try {
        let pool = await sql.connect(dbConfig);
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        try {
            await transaction.request().input('idPerfil', sql.Int, idPerfil).query('DELETE FROM PermisosPerfil WHERE idPerfil = @idPerfil');
            for (const permiso of matrizPermisos) {
                await transaction.request()
                    .input('idModulo', sql.Int, permiso.idModulo).input('idPerfil', sql.Int, idPerfil)
                    .input('add', sql.Bit, permiso.bitAgregar ? 1 : 0).input('edit', sql.Bit, permiso.bitEditar ? 1 : 0)
                    .input('read', sql.Bit, permiso.bitConsulta ? 1 : 0).input('del', sql.Bit, permiso.bitEliminar ? 1 : 0).input('det', sql.Bit, permiso.bitDetalle ? 1 : 0)
                    .query('INSERT INTO PermisosPerfil (idModulo, idPerfil, bitAgregar, bitEditar, bitConsulta, bitEliminar, bitDetalle) VALUES (@idModulo, @idPerfil, @add, @edit, @read, @del, @det)');
            }
            await transaction.commit();
            res.json({ success: true, message: 'Permisos asignados' });
        } catch (err) {
            await transaction.rollback(); throw err;
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error permisos' });
    }
});

// CRUD Usuarios (Con Cloudinary)
app.get('/api/usuario', async (req, res) => {
    try {
        let pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT id, strNombreUsuario, idPerfil, bitActivo, strCorreo, strNumeroCelular, strUrlImagen, Verificado, fechaCreacion FROM Usuario ORDER BY id DESC');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ success: false, message: 'Error' }); }
});
app.post('/api/usuario', upload.single('foto'), async (req, res) => {
    const { strNombreUsuario, idPerfil, strCorreo, strNumeroCelular, bitActivo, strPwd } = req.body;
    let fotoUrlFinal = null;
    try {
        if (req.file) {
            const resultCloud = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream({ folder: "corp_users" }, (err, res) => res ? resolve(res) : reject(err));
                stream.end(req.file.buffer);
            });
            fotoUrlFinal = resultCloud.secure_url;
        }
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(strPwd, salt);
        let pool = await sql.connect(dbConfig);
        await pool.request()
            .input('nombre', sql.NVarChar(100), strNombreUsuario).input('perfil', sql.Int, idPerfil).input('correo', sql.VarChar(100), strCorreo).input('celular', sql.VarChar(10), strNumeroCelular).input('pwd', sql.VarChar(255), passwordHash).input('activo', sql.Bit, bitActivo === 'true' ? 1 : 0).input('foto', sql.VarChar(255), fotoUrlFinal)
            .query('INSERT INTO Usuario (strNombreUsuario, idPerfil, strCorreo, strNumeroCelular, strPwd, bitActivo, strUrlImagen) VALUES (@nombre, @perfil, @correo, @celular, @pwd, @activo, @foto)');
        res.json({ success: true, message: 'Creado' });
    } catch (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).json({ success: false, message: 'Ese correo ya está registrado.' });
        res.status(500).json({ success: false, message: 'Error' });
    }
});
app.put('/api/usuario/:id', upload.single('foto'), async (req, res) => {
    const { id } = req.params;
    const { strNombreUsuario, idPerfil, strCorreo, strNumeroCelular, bitActivo, strPwd } = req.body;
    try {
        let pool = await sql.connect(dbConfig);
        let updateQuery = 'UPDATE Usuario SET strNombreUsuario = @nombre, idPerfil = @perfil, strCorreo = @correo, strNumeroCelular = @celular, bitActivo = @activo';
        let fotoUrlFinal = null;
        if (req.file) {
            const resultCloud = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream({ folder: "corp_users" }, (err, res) => res ? resolve(res) : reject(err));
                stream.end(req.file.buffer);
            });
            fotoUrlFinal = resultCloud.secure_url;
            updateQuery += `, strUrlImagen = @foto `;
        }
        if (strPwd && strPwd.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(strPwd, salt);
            req.body.hashedPwd = passwordHash;
            updateQuery += `, strPwd = @pwd `;
        }
        updateQuery += ` WHERE id = @id`;
        const request = pool.request()
            .input('id', sql.Int, id).input('nombre', sql.NVarChar(100), strNombreUsuario).input('perfil', sql.Int, idPerfil).input('correo', sql.VarChar(100), strCorreo).input('celular', sql.VarChar(10), strNumeroCelular).input('activo', sql.Bit, bitActivo === 'true' ? 1 : 0);
        if (fotoUrlFinal) request.input('foto', sql.VarChar(255), fotoUrlFinal);
        if (strPwd && strPwd.trim() !== '') request.input('pwd', sql.VarChar(255), req.body.hashedPwd);
        await request.query(updateQuery);
        res.json({ success: true, message: 'Actualizado' });
    } catch (err) { res.status(500).json({ success: false, message: 'Error' }); }
});
app.delete('/api/usuario/:id',verificarToken, async (req, res) => {
    try { let pool = await sql.connect(dbConfig); await pool.request().input('id', sql.Int, req.params.id).query('DELETE FROM Usuario WHERE id = @id'); res.json({ success: true, message: 'Eliminado' }); } catch (err) { res.status(500).json({ success: false, message: 'Error' }); }
});

// ==========================================
// 🚀 5. INICIALIZACIÓN (VERCEL / LOCAL)
// ==========================================

if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`✅ API corriendo localmente en http://localhost:${PORT}`);
    });
}

export default app;