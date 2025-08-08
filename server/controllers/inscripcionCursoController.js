

const InscripcionCurso = require("../models/InscripcionCurso");
const Curso = require("../models/curso");
const Usuario = require("../models/User");

const crearOActualizarInscripcion = async (req, res) => {
  const { curso_ID, aprendiz_ID, nuevoEstado } = req.body;
  //const usuario = req.user;

  try {
    // Validación básica
    if (!curso_ID || !aprendiz_ID || !nuevoEstado) {
      return res.status(400).json({
        mensaje: 'Los campos curso_ID, aprendiz_ID y nuevoEstado son obligatorios',
      });
    }

    // Validar rol del usuario autenticado
    // if (!usuario || usuario.accountType !== 'Empresa'||'Administrador') {
    //   return res.status(403).json({
    //     mensaje: 'No tienes permisos para realizar esta acción',
    //   });
    // }

    // Validar existencia del aprendiz
    const aprendiz = await Usuario.findByPk(aprendiz_ID);
    if (!aprendiz || aprendiz.accountType !== 'Aprendiz') {
      return res.status(404).json({
        mensaje: 'Aprendiz no encontrado o no válido',
      });
    }

    // Validar existencia del curso
    const curso = await Curso.findByPk(curso_ID);
    if (!curso) {
      return res.status(404).json({
        mensaje: 'Curso no encontrado',
      });
    }

    // Validar estado permitido
    const estadosValidos = ['activo', 'rechazado', 'pendiente'];
    if (!estadosValidos.includes(nuevoEstado)) {
      return res.status(400).json({ mensaje: 'Estado no válido' });
    }

    // Buscar inscripción existente
    let inscripcion = await InscripcionCurso.findOne({
      where: { curso_ID, aprendiz_ID },
    });

    if (inscripcion) {
      inscripcion.estado_inscripcion = nuevoEstado;
      await inscripcion.save();

      return res.status(200).json({
        mensaje: 'Estado de inscripción actualizado correctamente',
        inscripcion,
      });
    }

    // Crear inscripción nueva
    inscripcion = await InscripcionCurso.create({
      curso_ID,
      aprendiz_ID,
      estado_inscripcion: nuevoEstado,
      fecha_inscripcion: new Date(),
    });

    return res.status(201).json({
      mensaje: 'Inscripción creada correctamente',
      inscripcion,
    });
  } catch (error) {
    console.error('Error al crear o actualizar inscripción:', error);
    return res.status(500).json({
      mensaje: 'Error interno del servidor',
    });
  }
};

module.exports = {
  crearOActualizarInscripcion,
};
