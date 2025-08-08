const User = require("../models/User");
const crypto = require("crypto");
const { sendVerificationEmail, sendPasswordResetEmail, sendPasswordChangeConfirmationEmail } = require("../services/emailService");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");
const xlsx = require("xlsx")
const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const Poppler = require('pdf-poppler');
const vision = require('@google-cloud/vision');


// Registrar usuario
const Empresa = require('../models/empresa'); // Importar el modelo Empresa
const Sena = require('../models/sena'); // Importar el modelo Sena
const Departamento = require('../models/departamento'); // Importar el modelo Departamento 
const Ciudad = require('../models/ciudad'); // Importar el modelo Ciudad
const fotoDefectPerfil = '../Img/userDefect.png'; // Importar la imagen por defecto

//registrar usuario (empresa o aprendiz)
const registerUser = async (req, res) => {
    try {
        const { email, password, accountType, documento, nombres, apellidos, celular, titulo_profesional } = req.body;

        // Validar datos obligatorios
        if (!email || !password || !accountType) {
            return res.status(400).json({ message: 'Los campos email, password y accountType son obligatorios' });
        }

        // Validar el tipo de cuenta
        const validAccountTypes = ['Aprendiz', 'Empresa'];
        if (!validAccountTypes.includes(accountType)) {
            return res.status(400).json({ message: 'El tipo de cuenta no es válido' });
        }

        // Verificar si el usuario ya existe por email
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'El correo ya está registrado' });
        }

        // Generar token de verificación
        const token = crypto.randomBytes(32).toString('hex');

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear nuevo usuario
        const newUser = await User.create({
            email,
            password: hashedPassword,
            accountType,
            documento: documento || null,
            nombres: nombres || null,
            apellidos: apellidos || null,
            celular: celular || null,
            titulo_profesional: titulo_profesional || null,
            verificacion_email: false,
            token,
            foto_perfil: fotoDefectPerfil // <-- FOTO POR DEFECTO
        });

        // Si el tipo de cuenta es Empresa, crear un registro en la tabla Empresa y relacionarlo con el usuario
        if (accountType === 'Empresa') {
            const nuevaEmpresa = await Empresa.create({
                NIT: null,
                email_empresa: null,
                nombre_empresa: null,
                direccion: null,
                estado: 'inactivo',
                categoria: null,
                telefono: null,
                img_empresa: null,
            });

            newUser.empresa_ID = nuevaEmpresa.ID;
            await newUser.save();
        }

        // Enviar correo de verificación
        await sendVerificationEmail(email, token);

        res.status(201).json({ message: 'Usuario registrado. Por favor verifica tu correo.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error al registrar el usuario' });
    }
};

// Verificar correo
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;

        // Validar token
        if (!token) {
            return res.status(400).json({ message: "Token no proporcionado" });
        }
        console.log('Token recibido:', token);
        // Buscar usuario por token
        const user = await User.findOne({ where: { token } });

        if (!user) {
            return res.status(400).json({ message: "Token inválido o expirado" });
        }
        console.log('Token en la base de datos:', user.token);

        // Actualizar estado de verificación
        user.verificacion_email = true;
        user.token = null;
        await user.save();

        res.status(200).json({ message: "Correo verificado con éxito" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al verificar el correo" });
    }
};

// Iniciar sesión
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Todos los campos son obligatorios" });
        }

        const user = await User.findOne({ where: { email } });
        if (!user || !user.verificacion_email) {
            return res.status(403).json({ message: "Credenciales inválidas o correo no verificado." });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Usuario o contraseña incorrectos" });
        }

        // Construir el payload del token
        const payload = {
            id: user.ID,
            email: user.email,
            accountType: user.accountType,
        };
        if (user.accountType === "Empresa") {
            payload.empresa_ID = user.empresa_ID;
        }

        // Access token (10 min) y Refresh token (7 días)
        const accessToken = jwt.sign(
            payload,
            process.env.JWT_SECRET || "secret",
            { expiresIn: "10m" }
        );

        const refreshToken = jwt.sign(
            { id: user.ID },
            process.env.JWT_SECRET || "secret",
            { expiresIn: "7d" }
        );

        // Guardar tokens en cookies
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 15 * 60 * 1000 // 15 minutos
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
        });

        // Agregar empresa_ID si es cuenta tipo Empresa
        let extraData = {};
        if (user.accountType === "Empresa") {
            extraData.empresa_ID = user.empresa_ID;
        }

        res.status(200).json({
            message: "Inicio de sesión exitoso",
            id: user.ID,
            email: user.email,
            accountType: user.accountType,
            ...extraData
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

//refrescar el acces web token
const refreshAccessToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token faltante" });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET || "secret");
        // Buscar usuario para obtener email y accountType
        const user = await User.findByPk(decoded.id);
        if (!user) {
            return res.status(401).json({ message: "Usuario no encontrado" });
        }

        const accessToken = jwt.sign(
            { id: user.ID, email: user.email, accountType: user.accountType },
            process.env.JWT_SECRET || "secret",
            { expiresIn: "15m" }
        );

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 15 * 60 * 1000 // 15 minutos
        });

        res.status(200).json({ message: "Token renovado" });
    } catch (error) {
        console.error("Error al refrescar el token:", error);
        res.status(401).json({ message: "Refresh token inválido o expirado" });
    }
};

//cerrar sesion 
const logoutUser = (req, res) => {
    res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    });

    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
    });

    res.status(200).json({ message: "Sesión cerrada correctamente" });
};

// Solicitud de restablecimiento de contraseña
const requestPasswordReset = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.log(`Intento de recuperación para un correo no registrado: ${email}`);
            return res.status(404).json({ message: "No se encontró un usuario con ese correo electrónico." });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
        await user.save();

        // 👉 Imprimir el token en consola
        console.log(`Token generado para ${email}: ${resetToken}`);

        const resetLink = `http://localhost:5173/resetPassword?token=${resetToken}`;
        console.log(`Enviando correo de recuperación a: ${email}`);
        await sendPasswordResetEmail(email, resetLink);

        res.status(200).json({ message: "Se ha enviado un enlace de recuperación a tu correo electrónico." });
    } catch (error) {
        console.error("Error al solicitar recuperación de contraseña:", error);
        res.status(500).json({ message: "Error al procesar la solicitud de recuperación de contraseña." });
    }
};

// Cambiar contraseña con token
const resetPassword = async (req, res) => {
    try {
        const { token } = req.query;
        const { newPassword } = req.body;

        if (!token) {
            return res.status(400).json({ message: "Token no proporcionado" });
        }

        const user = await User.findOne({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: { [Op.gt]: Date.now() }
            }
        });

        if (!user) {
            return res.status(400).json({ message: "Token inválido o expirado" });
        }

        // Encriptar la nueva contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        user.password = hashedPassword;
        // Limpiar el token usado
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;

        // Generar un nuevo token de recuperación por si el usuario no hizo el cambio
        const newResetToken = crypto.randomBytes(32).toString("hex");
        user.resetPasswordToken = newResetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hora más

        await user.save();

        // Enlace para volver a cambiar la contraseña
        const resetLink = `http://localhost:5173/resetPassword?token=${newResetToken}`;
        await sendPasswordChangeConfirmationEmail(user.email, resetLink);

        res.status(200).json({ message: "Contraseña restablecida con éxito" });
    } catch (error) {
        console.error("Error al restablecer la contraseña:", error);
        res.status(500).json({ message: "Error al restablecer la contraseña" });
    }
};

//limpiar tokens expirados
const cleanExpiredTokens = async () => {
    try {
        // Limpia los tokens de recuperación de contraseña expirados
        await User.update(
            { resetPasswordToken: null, resetPasswordExpires: null },
            {
                where: {
                    resetPasswordExpires: { [Op.lt]: Date.now() }
                }
            }
        );
        console.log("Tokens de recuperación expirados limpiados correctamente.");
    } catch (error) {
        console.error("Error al limpiar tokens expirados:", error);
    }
};

// Obtener todos los usuarios
const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password', 'token', 'resetPasswordToken', 'resetPasswordExpires'] } // para no enviar datos sensibles
        });

        res.status(200).json(users);
    } catch (error) {
        console.error("Error al obtener los usuarios:", error);
        res.status(500).json({ message: "Error al obtener los usuarios" });
    }
};

const getUserProfile = async (req, res) => {
    try {
        const userId = req.params.id;

        const usuario = await User.findByPk(userId, {
            include: [
                {
                    model: Sena,
                    as: 'Sena',
                    include: [
                        {
                            model: Ciudad,
                            as: 'Ciudad',
                            attributes: ['ID', 'nombre'],
                            include: [
                                {
                                    model: Departamento,
                                    as: 'Departamento',
                                    attributes: ['ID', 'nombre'],
                                },
                            ],
                        },
                    ],
                },
                {
                    model: Empresa,
                    as: "Empresa",
                    include: [
                        {
                            model: Ciudad,
                            as: "Ciudad",
                            include: [
                                {
                                    model: Departamento,
                                    as: "Departamento"
                                }
                            ]
                        }
                    ]
                }
            ],
        });

        if (!usuario) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(usuario);
    } catch (error) {
        console.error('Error al obtener el perfil del usuario:', error);
        res.status(500).json({ error: 'Error al obtener el perfil del usuario' });
    }
};

//Consultar lista de aprendices
const getAprendices = async (req, res) => {
    try {
        const aprendices = await User.findAll({
            where: { accountType: 'Aprendiz' },
            attributes: { exclude: ['password', 'token', 'resetPasswordToken', 'resetPasswordExpires'] }, // Excluir datos sensibles
        });

        res.status(200).json(aprendices);
    } catch (error) {
        console.error("Error al obtener la lista de aprendices:", error);
        res.status(500).json({ message: "Error al obtener la lista de aprendices." });
    }
};

//Consultar lista de empresas
const getEmpresas = async (req, res) => {
    try {
        const empresas = await User.findAll({
            where: { accountType: 'Empresa' },
            attributes: { exclude: ['password', 'token', 'resetPasswordToken', 'resetPasswordExpires'] }, // Excluir datos sensibles
            include: [
                {
                    model: Empresa,
                    as: 'Empresa', // Alias definido en la relación
                    attributes: ['ID', 'NIT', 'email_empresa', 'nombre_empresa', 'direccion', 'estado', 'categoria', 'telefono', 'img_empresa'], // Campos que deseas incluir
                },
            ],
        });

        res.status(200).json(empresas);
    } catch (error) {
        console.error("Error al obtener la lista de empresas:", error);
        res.status(500).json({ message: "Error al obtener la lista de empresas." });
    }
};

//obtener empresa(activa) por ID 
const getEmpresaByNIT = async (req, res) => {
    try {
        const { NIT } = req.params;

        const empresa = await Empresa.findOne({
            where: {
                NIT,
                estado: 'Activo'
            }
        });

        if (!empresa) {
            return res.status(404).json({ message: 'Empresa no encontrada o no está activa.' });
        }

        res.status(200).json(empresa);
    } catch (error) {
        console.error('Error al obtener la empresa:', error);
        res.status(500).json({ message: 'Error al obtener la empresa.' });
    }
};

// Obtener empresa por ID
const getEmpresaById = async (req, res) => {
    try {
        const { id } = req.params;
        const empresa = await Empresa.findByPk(id);

        if (!empresa) {
            return res.status(404).json({ message: 'Empresa no encontrada.' });
        }

        res.status(200).json(empresa);
    } catch (error) {
        console.error('Error al obtener la empresa por ID:', error);
        res.status(500).json({ message: 'Error al obtener la empresa.' });
    }
};

// Consultar lista de instructores
const getInstructores = async (req, res) => {
    try {
        const instructores = await User.findAll({
            where: { accountType: 'Instructor' },
            attributes: [
                'ID',
                'email',
                'nombres',
                'apellidos',
                'estado',
                'celular',
                'documento',
                'foto_perfil',
                'titulo_profesional'
            ],
        });

        res.status(200).json(instructores);
    } catch (error) {
        console.error('Error al obtener los instructores:', error);
        res.status(500).json({ message: 'Error al obtener los instructores.' });
    }
};

//Consultar lista de gestores
const getGestores = async (req, res) => {
    try {
        const gestores = await User.findAll({
            where: { accountType: 'Gestor' },
            attributes: ['ID', 'email', 'nombres', 'apellidos', 'estado', 'celular', 'documento', 'foto_perfil'],
        });

        res.status(200).json(gestores);
    } catch (error) {
        console.error('Error al obtener los gestores:', error);
        res.status(500).json({ message: 'Error al obtener los gestores.' });
    }
};

//Actualizar perfil segun tipo cuenta
const updateUserProfile = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            email,
            nombres,
            apellidos,
            celular,
            documento,
            estado,
            titulo_profesional,
            tipoDocumento

        } = req.body;

        // Procesar imagen de perfil si se sube (como base64)
        const foto_perfil = null;
        if (req.files?.foto_perfil?.[0]) {
            foto_perfil = req.files.foto_perfil[0].buffer.toString("base64");
        }


        const token = req.cookies.accessToken;
        if (!token) {
            return res.status(401).json({ message: "No autorizado. Debes iniciar sesión." });
        }

        const loggedInUser = jwt.verify(token, process.env.JWT_SECRET || "secret");
        if (!loggedInUser) {
            return res.status(401).json({ message: "Token inválido o expirado." });
        }

        const user = await User.findByPk(id, {
            include: [{ model: Empresa, as: "Empresa" }],
        });

        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        // Verificación de permisos
        if (loggedInUser.accountType === "Gestor" || loggedInUser.accountType === "Instructor") {
            return res.status(403).json({ message: "No tienes permiso para actualizar perfiles." });
        }

        // ADMINISTRADOR
        if (loggedInUser.accountType === "Administrador") {
            if (["Instructor", "Gestor", "Administrador", "Empresa", "Aprendiz"].includes(user.accountType)) {
                // Validaciones únicas
                if (email && email !== user.email) {
                    const existingEmail = await User.findOne({ where: { email } });
                    if (existingEmail) {
                        return res.status(400).json({ message: "El correo electrónico ya está registrado." });
                    }
                }
                if (documento && documento !== user.documento) {
                    const existingDocumento = await User.findOne({ where: { documento } });
                    if (existingDocumento) {
                        return res.status(400).json({ message: "El documento ya está registrado." });
                    }
                }
                if (celular && celular !== user.celular) {
                    const existingCelular = await User.findOne({ where: { celular } });
                    if (existingCelular) {
                        return res.status(400).json({ message: "El número de celular ya está registrado." });
                    }
                }
                // Asignación directa de campos
                if (email) user.email = email;
                if (nombres) user.nombres = nombres;
                if (apellidos) user.apellidos = apellidos;
                if (celular) user.celular = celular;
                if (documento) user.documento = documento;
                if (estado) user.estado = estado;
                if (titulo_profesional) user.titulo_profesional = titulo_profesional;

                if (foto_perfil) user.foto_perfil = foto_perfil;

                await user.save();
                return res.status(200).json({ message: "Perfil actualizado con éxito." });
            }
        }

        // EMPRESA puede actualizar su propio perfil
        if (loggedInUser.accountType === "Empresa" && user.accountType === "Empresa") {
            if (email) user.email = email;
            if (nombres) user.nombres = nombres;
            if (apellidos) user.apellidos = apellidos;
            if (celular) user.celular = celular;
            if (documento) user.documento = documento;
            if (estado) user.estado = estado;
            if (foto_perfil) user.foto_perfil = foto_perfil;


            // Empresa viene como string JSON en el campo 'empresa'
            if (req.body.empresa && user.Empresa) {
                let empresaData;
                try {
                    empresaData = JSON.parse(req.body.empresa);
                } catch (e) {
                    return res.status(400).json({ message: "Formato de empresa inválido." });
                }

                const {
                    nit,
                    email_empresa,
                    nombre_empresa,
                    direccion,
                    estado,
                    categoria,
                    telefono,
                    img_empresa
                } = empresaData;

                if (nit) user.Empresa.NIT = nit;
                if (email_empresa) user.Empresa.email_empresa = email_empresa;
                if (nombre_empresa) user.Empresa.nombre_empresa = nombre_empresa;
                if (direccion) user.Empresa.direccion = direccion;
                if (estado) user.Empresa.estado = estado;
                if (categoria) user.Empresa.categoria = categoria;
                if (telefono) user.Empresa.telefono = telefono;
                if (img_empresa) user.Empresa.img_empresa = img_empresa;

                await user.Empresa.save();
            }

            if (foto_perfil) user.foto_perfil = foto_perfil;

            await user.save();
            return res.status(200).json({ message: "Perfil de empresa actualizado con éxito." });
        }

        // EMPRESA puede actualizar a sus empleados (Aprendiz)
        if (loggedInUser.accountType === "Empresa" && user.accountType === "Aprendiz") {
            // Validar que el empleado pertenezca a la empresa logueada
            if (user.empresa_ID !== loggedInUser.empresa_ID) {
                return res.status(403).json({ message: "No tienes permiso para actualizar este empleado." });
            }

            // Validaciones únicas
            if (email && email !== user.email) {
                const existingEmail = await User.findOne({ where: { email } });
                if (existingEmail) {
                    return res.status(400).json({ message: "El correo electrónico ya está registrado." });
                }
            }
            if (documento && documento !== user.documento) {
                const existingDocumento = await User.findOne({ where: { documento } });
                if (existingDocumento) {
                    return res.status(400).json({ message: "El documento ya está registrado." });
                }
            }
            if (celular && celular !== user.celular) {
                const existingCelular = await User.findOne({ where: { celular } });
                if (existingCelular) {
                    return res.status(400).json({ message: "El número de celular ya está registrado." });
                }
            }

            // Asignación directa de campos
            if (email) user.email = email;
            if (nombres) user.nombres = nombres;
            if (apellidos) user.apellidos = apellidos;
            if (celular) user.celular = celular;
            if (documento) user.documento = documento;
            if (estado) user.estado = estado;
            if (tipoDocumento) user.tipoDocumento = tipoDocumento;

            if (foto_perfil) user.foto_perfil = foto_perfil;

            await user.save();
            return res.status(200).json({ message: "Perfil de empleado actualizado con éxito." });
        }

        // APRENDIZ puede actualizar su propio perfil
        if (loggedInUser.accountType === "Aprendiz" && user.accountType === "Aprendiz") {
            if (email && email !== user.email) {
                const existingEmail = await User.findOne({ where: { email } });
                if (existingEmail) {
                    return res.status(400).json({ message: "El correo electrónico ya está registrado." });
                }

                // Generar token de verificación
                const verificationToken = crypto.randomBytes(32).toString('hex');
                user.token = verificationToken;
                user.verificacion_email = false;

                // Enviar correo de verificación
                await sendVerificationEmail(email, verificationToken);

                user.email = email;
            }
            if (nombres) user.nombres = nombres;
            if (apellidos) user.apellidos = apellidos;
            if (celular) user.celular = celular;
            if (documento) user.documento = documento;
            if (estado) user.estado = estado;
            if (titulo_profesional) user.titulo_profesional = titulo_profesional;
            if (tipoDocumento) user.tipoDocumento = tipoDocumento;

            if (foto_perfil) user.foto_perfil = foto_perfil;
            await user.save();
            return res.status(200).json({ message: "Perfil de aprendiz actualizado con éxito. Por favor verifica tu nuevo correo." });
        }

        return res.status(403).json({ message: "No tienes permiso para actualizar este perfil." });
    } catch (error) {
        console.error("Error al actualizar el perfil del usuario:", error);
        return res.status(500).json({ message: "Error al actualizar el perfil del usuario." });
    }
};

// Crear Instructor
const createInstructor = async (req, res) => {
    try {
        console.log("Cuerpo de la solicitud:", req.body);
        console.log("Archivo recibido:", req.file);

        const { nombres, apellidos, titulo_profesional, celular, email, documento, estado } = req.body;

        // Procesar imagen de perfil si se sube
        let foto_perfil = null;
        if (req.file) {
            // Guardar la imagen en base64 directamente en la base de datos
            foto_perfil = req.file.buffer.toString('base64');
        }

        // Validar datos obligatorios
        if (!nombres || !apellidos || !titulo_profesional || !celular || !email || !documento || !estado) {
            return res.status(400).json({ message: "Todos los campos son obligatorios." });
        }

        // Verificar si el correo ya está registrado
        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail) {
            return res.status(400).json({ message: "El correo ya está registrado." });
        }

        // Verificar si el documento ya está registrado
        const existingDocumento = await User.findOne({ where: { documento } });
        if (existingDocumento) {
            return res.status(400).json({ message: "El documento ya está registrado." });
        }

        // Generar token de verificación
        const token = crypto.randomBytes(32).toString("hex");

        // Encriptar la contraseña
        const hashedPassword = await bcrypt.hash("defaultPassword123", 10);

        // Crear el instructor
        const newInstructor = await User.create({
            nombres,
            apellidos,
            titulo_profesional,
            celular,
            email,
            documento,
            estado,
            foto_perfil,
            sena_ID: 1, //ID Sena 
            accountType: "Instructor", // Tipo de cuenta
            password: hashedPassword, // Contraseña encriptada
            verificacion_email: false, // Estado de verificación
            token, // Token de verificación
        });

        // Enviar correo de verificación
        await sendVerificationEmail(email, token);

        res.status(201).json({
            message: "Instructor creado con éxito. Por favor verifica tu correo.",
            instructor: newInstructor
        });
    } catch (error) {
        console.error("Error al crear el instructor:", error);
        res.status(500).json({ message: "Error al crear el instructor." });
    }
};

// Crear Gestor
const createGestor = async (req, res) => {
    try {
        console.log("Cuerpo de la solicitud:", req.body);
        console.log("Archivo recibido:", req.file);

        const { nombres, apellidos, celular, email, documento, estado } = req.body;

        // Procesar imagen de perfil si se sube
        let foto_perfil = null;
        if (req.file) {
            // Guardar la imagen en base64 directamente en la base de datos
            foto_perfil = req.file.buffer.toString('base64');
        }

        // Validar datos obligatorios
        if (!nombres || !apellidos || !celular || !email || !documento || !estado) {
            return res.status(400).json({ message: "Todos los campos son obligatorios." });
        }

        // Verificar si el correo ya está registrado
        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail) {
            return res.status(400).json({ message: "El correo ya está registrado." });
        }

        // Verificar si el documento ya está registrado
        const existingDocumento = await User.findOne({ where: { documento } });
        if (existingDocumento) {
            return res.status(400).json({ message: "El documento ya está registrado." });
        }

        // Generar token de verificación
        const token = crypto.randomBytes(32).toString("hex");

        // Encriptar la contraseña
        const hashedPassword = await bcrypt.hash("defaultPassword123", 10);

        // Crear el gestor
        const newGestor = await User.create({
            nombres,
            apellidos,
            celular,
            email,
            documento,
            estado,
            foto_perfil,
            sena_ID: 1, // Asignar la sede por defecto
            accountType: "Gestor", // Tipo de cuenta
            password: hashedPassword, // Contraseña encriptada
            verificacion_email: false, // Estado de verificación
            sena_ID: 1,
            token, // Token de verificación
        });

        // Enviar correo de verificación
        await sendVerificationEmail(email, token);

        res.status(201).json({ message: "Gestor creado con éxito. Por favor verifica tu correo.", gestor: newGestor });
    } catch (error) {
        console.error("Error al crear el gestor:", error);
        res.status(500).json({ message: "Error al crear el gestor." });
    }
};

// Consultar Empleados por Empresa
const getAprendicesByEmpresa = async (req, res) => {
    try {
        // Verifica el token y obtiene el usuario logueado
        const token = req.cookies.accessToken
        if (!token) {
            return res.status(401).json({ message: "No autorizado. Debes iniciar sesión." });
        }

        const loggedInUser = jwt.verify(token, process.env.JWT_SECRET || "secret");
        if (!loggedInUser || loggedInUser.accountType !== "Empresa") {
            return res.status(403).json({ message: "Solo las empresas pueden acceder a esta información." });
        }

        // Busca la empresa asociada al usuario logueado
        const empresaUser = await User.findByPk(loggedInUser.id, {
            include: [{ model: Empresa, as: "Empresa" }]
        });

        if (!empresaUser || !empresaUser.empresa_ID) {
            return res.status(404).json({ message: "Empresa no encontrada o no asociada." });
        }

        // Busca los aprendices relacionados con la empresa
        const aprendices = await User.findAll({
            where: {
                accountType: "Aprendiz",
                empresa_ID: empresaUser.empresa_ID
            },
            attributes: { exclude: ['password', 'token', 'resetPasswordToken', 'resetPasswordExpires'] }
        });

        res.status(200).json(aprendices);
    } catch (error) {
        console.error("Error al obtener los aprendices de la empresa:", error);
        res.status(500).json({ message: "Error al obtener los aprendices de la empresa." });
    }
};

// Crear múltiples usuarios desde un archivo Excel
const createMasiveUsers = async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ message: 'No se ha subido ningún archivo.' });
        }

        const Archivo = req.file.buffer;
        console.log(req.file.buffer)
        // Leer el archivo con xlsx
        const workbook = xlsx.read(Archivo, { type: 'buffer' });

        // Obtener la primera hoja
        const nombrePrimeraHoja = workbook.SheetNames[0];
        const hoja = workbook.Sheets[nombrePrimeraHoja];

        if (!hoja) {
            return res.status(400).json({ message: 'El archivo no contiene hojas válidas.' });
        }

        // Obtener el rango de celdas
        const rango = xlsx.utils.decode_range(hoja['!ref']);

        // Verificar si la celda C2 existe
        const celdaTitulo = hoja['C2'];
        if (!celdaTitulo) {
            return res.status(400).json({ message: 'La celda C2 no contiene un título válido.' });
        }

        // Extraer los valores de la columna C desde la fila 3 hacia abajo
        const valoresColumna = [];
        for (let fila = 2; fila <= rango.e.r; fila++) { // Comienza desde la fila 2 (índice 1 en base 0)
            const celda = hoja[`C${fila + 1}`]; // Celdas C3, C4, etc.
            if (celda) {
                valoresColumna.push(celda.v);
            }
        }

        if (valoresColumna.length === 0) {
            return res.status(400).json({ message: 'El archivo no contiene datos en la columna C.' });
        }

        // Verificar si hay usuarios duplicados en el archivo
        const duplicados = valoresColumna.filter((item, index) => valoresColumna.indexOf(item) !== index);
        if (duplicados.length > 0) {
            // Excepción: permitir duplicados si son valores vacíos ("")
            const duplicadosFiltrados = duplicados.filter(item => item !== "");

            if (duplicadosFiltrados.length > 0) {
                return res.status(400).json({
                    message: "El archivo contiene usuarios duplicados no permitidos.",
                    duplicados: duplicadosFiltrados
                });
            }
        }

        // Verificar si hay usuarios repetidos en la base de datos antes de crear
        const emails = valoresColumna.map(identificacion => `${identificacion}@example.com`);
        const existingUsers = await User.findAll({ where: { email: emails } });

        if (existingUsers.length > 0) {
            const repetidos = existingUsers.map(user => user.email);
            return res.status(409).json({
                message: "Existen usuarios repetidos en la base de datos.",
                repetidos
            });
        }

        // Crear usuarios con los datos extraídos
        for (const identificacion of valoresColumna) {
            if (!identificacion || identificacion === '') {
                console.warn(`Número de identificación inválido: ${identificacion}`);
                continue; // Saltar si el Número de Identificación no es válido
            }

            const email = `${identificacion}@example.com`;
            const password = `${identificacion.toString()}example`;

            // Crear el usuario
            const hashedPassword = await bcrypt.hash(password, 10);
            await User.create({
                email,
                password: hashedPassword,
                accountType: 'Aprendiz', // Tipo de cuenta por defecto
                cedula: identificacion,
                verificacion_email: true,
            });
        }

        return res.json({
            message: "Usuarios creados exitosamente.",
        });
    } catch (error) {
        console.error("Error al procesar el archivo:", error);
        return res.status(500).json({ error: 'Error al procesar el archivo' });
    }
}

// Consultar empleados (aprendices) por empresa_ID
const getEmpleadosByEmpresaId = async (req, res) => {
    try {
        const { empresaId } = req.params;

        if (!empresaId) {
            return res.status(400).json({ message: "El ID de la empresa es obligatorio." });
        }

        // Buscar aprendices que tengan el empresa_ID igual al proporcionado
        const empleados = await User.findAll({
            where: {
                accountType: "Aprendiz",
                empresa_ID: empresaId
            },
            attributes: { exclude: ['password', 'token', 'resetPasswordToken', 'resetPasswordExpires'] }
        });

        res.status(200).json({ success: true, empleados });
    } catch (error) {
        console.error("Error al obtener los empleados de la empresa:", error);
        res.status(500).json({ message: "Error al obtener los empleados de la empresa." });
    }
};

// Crear empleado (Aprendiz) asociado a una empresa
const createEmpleado = async (req, res) => {
    try {
        const { nombres, apellidos, email, documento, celular, estado, titulo_profesional, password } = req.body;
        const { empresaId } = req.params;

        // Validar datos obligatorios
        if (!nombres || !apellidos || !email || !documento || !celular || !estado || !empresaId) {
            return res.status(400).json({ message: "Todos los campos son obligatorios." });
        }

        // Verificar si el correo ya está registrado
        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail) {
            return res.status(400).json({ message: "El correo ya está registrado." });
        }

        // Verificar si el documento ya está registrado
        const existingDocumento = await User.findOne({ where: { documento } });
        if (existingDocumento) {
            return res.status(400).json({ message: "El documento ya está registrado." });
        }

        // Verificar que la empresa exista
        const empresa = await Empresa.findByPk(empresaId);
        if (!empresa) {
            return res.status(404).json({ message: "Empresa no encontrada." });
        }

        // Procesar imagen de perfil si se sube
        let foto_perfil = null;
        if (req.file) {
            foto_perfil = req.file.buffer.toString('base64');
        }

        // Generar token de verificación
        const token = crypto.randomBytes(32).toString("hex");

        // Encriptar la contraseña (si no se envía, usar una por defecto)
        const hashedPassword = await bcrypt.hash(password || "defaultPassword123", 10);

        // Crear el empleado (Aprendiz)
        const newEmpleado = await User.create({
            nombres,
            apellidos,
            email,
            documento,
            celular,
            estado,
            titulo_profesional: titulo_profesional || null,
            foto_perfil,
            accountType: "Aprendiz",
            empresa_ID: empresaId,
            password: hashedPassword,
            verificacion_email: false,
            token,
        });

        // Enviar correo de verificación
        await sendVerificationEmail(email, token);

        res.status(201).json({ message: "Empleado creado con éxito. Por favor verifica tu correo.", empleado: newEmpleado });
    } catch (error) {
        console.error("Error al crear el empleado:", error);
        res.status(500).json({ message: "Error al crear el empleado." });
    }
};

//validacion de tipo de documento y numero de documento por pdf del documento cargado
const detectarTextoOCR = async (imagePath) => {
    const client = new vision.ImageAnnotatorClient();
    const imageBuffer = fs.readFileSync(imagePath);
    const [result] = await client.textDetection({ image: { content: imageBuffer } });
    return result.fullTextAnnotation?.text || '';
};

const subirDocumentoIdentidad = async (req, res) => {
    try {
        const userId = req.params.id;
        const pdfFile = req.file;

        if (!pdfFile) return res.status(400).json({ message: 'No se ha enviado ningún archivo.' });

        // Guardar PDF
        const pdfFileName = `documento_${Date.now()}.pdf`;
        const pdfPath = path.join(__dirname, '../uploads/documentos', pdfFileName);
        fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
        fs.writeFileSync(pdfPath, pdfFile.buffer);

        // Convertir primera página del PDF a imagen
        const tempDir = path.join(__dirname, '../uploads/temp');
        fs.mkdirSync(tempDir, { recursive: true });

        const options = {
            format: 'png',
            out_dir: tempDir,
            out_prefix: 'page',
            page: 1,
        };
        await Poppler.convert(pdfPath, options);
        const imagePath = path.join(tempDir, 'page-1.png');

        // Realizar OCR con Google Vision
        const rawText = await detectarTextoOCR(imagePath);
        const lowerText = rawText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        // Detectar tipo de documento
        let tipoDetectado = 'pendiente';
        if (/cedula\s+de\s+ciudadania/.test(lowerText)) tipoDetectado = 'CedulaCiudadania';
        else if (/tarjeta\s+de\s+identidad/.test(lowerText)) tipoDetectado = 'TarjetaIdentidad';
        else if (/permiso\s+por\s+proteccion\s+temporal/.test(lowerText) || /\bppt\b/.test(lowerText)) tipoDetectado = 'PPT';
        else if (/cedula\s+de\s+extranjeria/.test(lowerText) || /extranjero/.test(lowerText)) tipoDetectado = 'CedulaExtranjeria';

        // Detectar número de documento después de palabras clave
        let documento = null;
        const lines = rawText.split(/\r?\n/);
        const keywords = ['número', 'numero', 'nuip', 'n°', 'no', '#'];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            for (const key of keywords) {
                if (line.includes(key)) {
                    const words = lines[i].split(/\s+/);
                    const index = words.findIndex(w => w.toLowerCase().includes(key));
                    if (index !== -1) {
                        for (let j = index + 1; j < words.length; j++) {
                            const clean = words[j].replace(/\./g, ''); // eliminar puntos
                            const numMatch = clean.match(/^\d{6,12}$/);
                            if (numMatch) {
                                documento = numMatch[0];
                                break;
                            }
                        }
                    }
                }
                if (documento) break;
            }
            if (documento) break;
        }

        // Actualizar el usuario
        await User.update(
            {
                pdf_documento: pdfFileName,
                tipoDocumento: tipoDetectado,
                documento: documento || null,
            },
            { where: { ID: userId } }
        );

        res.status(200).json({
            message: 'Documento procesado con OCR',
            tipoDetectado,
            documento: documento || 'No detectado'
        });

    } catch (error) {
        console.error('Error al procesar documento:', error);
        res.status(500).json({ message: 'Error al procesar el documento con OCR.' });
    }
};



module.exports = { subirDocumentoIdentidad, getEmpresaById, createEmpleado, getEmpleadosByEmpresaId, refreshAccessToken, getAprendicesByEmpresa, registerUser, verifyEmail, loginUser, requestPasswordReset, resetPassword, getAllUsers, getUserProfile, getAprendices, getEmpresas, getInstructores, getGestores, updateUserProfile, createInstructor, createGestor, logoutUser, cleanExpiredTokens, createMasiveUsers, getEmpresaByNIT };
