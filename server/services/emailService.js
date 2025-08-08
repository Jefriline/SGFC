const nodemailer = require("nodemailer");
const PDFDocument = require('pdfkit');
const Actas = require('../models/Actas'); // Asegúrate de importar el modelo

const moment = require('moment-timezone');
const fechaSolicitud = new Date(Date.now() - (new Date().getTimezoneOffset() * 60000));
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "ejemplo@gmail.com",
    pass: "key",
  },
});

const sendRequestCourseEmail = async (req, res) => {
  try {
    const { nombreCurso, numEmpleados, fechaInicio, fechaFin, curso_ID, empresa_ID, gestor_ID, administrador_ID, instructor_ID } = req.body;
    const empresa = JSON.parse(req.body.empresa || '{}');
    const manager = JSON.parse(req.body.manager || '{}');
    const pdfBuffer = req.file.buffer;

    // Guardar el PDF en el sistema de archivos (puedes cambiar la ruta si lo deseas)
    const fs = require('fs');
    const path = require('path');
    const pdfFileName = `solicitud_curso_${Date.now()}.pdf`;
    const pdfPath = path.join(__dirname, '../uploads/solicitudes', pdfFileName);

    // Asegúrate de que la carpeta exista
    fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
    fs.writeFileSync(pdfPath, pdfBuffer);

    // Registrar la solicitud en la base de datos
    await Actas.create({
      fecha_acta: fechaSolicitud,
      estado_acta: 'pendiente',
      fecha_respuesta: null,
      empresa_ID: empresa_ID || empresa.ID, // Usa el ID recibido o el del objeto empresa
      curso_ID: curso_ID || null,
      gestor_ID: gestor_ID || null,
      administrador_ID: administrador_ID || null,
      instructor_ID: instructor_ID || null,
      tipo_acta: 'Solicitud',
      pdf_acta: pdfFileName
    });

    // Enviar el correo
    let transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER || "eariassena19@gmail.com",
        pass: process.env.EMAIL_PASS || "jzcg vevx ixqj wcgv",
      },
    });

    await transporter.sendMail({
      from: `"SGFC" <${process.env.EMAIL_USER || "eariassena19@gmail.com"}>`,
      to: "eariassena19@gmail.com",
      subject: "Nueva Solicitud de Curso",
      html: `<p>Solicitud de curso: ${nombreCurso}</p>`,
      attachments: [
        {
          filename: 'solicitud_curso.pdf',
          content: pdfBuffer
        }
      ]
    });

    res.status(200).json({
      message: 'Solicitud enviada y registrada correctamente.',
      pdf_acta: pdfFileName // <-- Esto envía el nombre real del PDF al frontend
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al enviar o registrar la solicitud.' });
  }
};

// Función para enviar el correo de verificación
const sendVerificationEmail = (email, token) => {
  const enlaceVerificacion = `http://localhost:5173/verificarCorreo?token=${token}`;
  const mailOptions = {
    from: "eariassena19@gmail.com",
    to: email,
    subject: "Verificación de correo electrónico",
    html: `
<table width="100%" bgcolor="#f4f4f4" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; margin:0; padding:0;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:37.5rem; background:#fff; margin:1.25rem auto; border-radius:.5rem; box-shadow:0 0 .625rem rgba(0,0,0,0.1);">
        <tr>
          <td style="padding:1.875rem;">
            <!-- Header -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-bottom:1.25rem; border-bottom:.0625rem solid #eee;">
                  <img src="https://i.imgur.com/2pzIurJ.png" alt="Logo de Fábrica de Software CCT" style="width:5rem; height:auto; margin-bottom:.9375rem; display:block;">
                  <h1 style="color:#00843D; margin:0; font-size:1.5rem; font-family:Arial,sans-serif;">Verificación de Correo Electrónico</h1>
                </td>
              </tr>
            </table>
            <!-- Content -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:1.25rem 0; line-height:1.6; color:#1A1A1A; font-size:1rem;">
                  <p style="margin-bottom:.9375rem;">Gracias por registrarte. Para completar el proceso y activar tu cuenta, por favor haz clic en el siguiente enlace para verificar tu correo electrónico:</p>
                  <div style="text-align:center; padding:1.25rem 0;">
                    <a href="${enlaceVerificacion}" 
                      style="display:inline-block; background-color:#F7941E; color:#fff !important; padding:.75rem 1.5625rem; border-radius:.3125rem; text-decoration:none; font-weight:bold; font-family:Arial,sans-serif; font-size:1rem;">
                      Verificar correo
                    </a>
                  </div>
                  <p style="margin-bottom:.9375rem;">Si no te registraste en nuestros servicios, por favor ignora este correo.</p>
                  <p style="margin-bottom:0;">Saludos cordiales,<br>El equipo de Fábrica de Software CCT</p>
                </td>
              </tr>
            </table>
            <!-- Footer -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-top:1.25rem; border-top:.0625rem solid #eee; font-size:.75rem; color:#777;">
                  <p style="margin:0;">Copyright © 2025 Fábrica de Software CCT - Regional Quindío</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.log("Error al enviar el correo:", err);
    } else {
      console.log("Correo enviado:", info.response);
    }
  });
};

// Función para enviar el correo de recuperación de contraseña
const sendPasswordResetEmail = (email, resetLink) => {
  const mailOptions = {
    from: "eariassena19@gmail.com",
    to: email,
    subject: "Recuperación de contraseña",
    html: `
<table width="100%" bgcolor="#f4f4f4" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; margin:0; padding:0;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:37.5rem; background:#fff; margin:1.25rem auto; border-radius:.5rem; box-shadow:0 0 .625rem rgba(0,0,0,0.1);">
        <tr>
          <td style="padding:1.875rem;">
            <!-- Header -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-bottom:1.25rem; border-bottom:.0625rem solid #eee;">
                  <img src="https://i.imgur.com/2pzIurJ.png" alt="Logo de Fábrica de Software CCT" style="width:5rem; height:auto; margin-bottom:.9375rem; display:block;">
                  <h1 style="color:#00843D; margin:0; font-size:1.5rem; font-family:Arial,sans-serif;">Restablecimiento de Contraseña</h1>
                </td>
              </tr>
            </table>
            <!-- Content -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:1.25rem 0; line-height:1.6; color:#1A1A1A; font-size:1rem;">
                  <p style="margin-bottom:.9375rem;">Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
                  <p style="margin-bottom:.9375rem;">Por favor, haz clic en el siguiente enlace para restablecer tu contraseña:</p>
                  <div style="text-align:center; padding:1.25rem 0;">
                    <a href="${resetLink}" 
                      style="display:inline-block; background-color:#F7941E; color:#fff !important; padding:.75rem 1.5625rem; border-radius:.3125rem; text-decoration:none; font-weight:bold; font-family:Arial,sans-serif; font-size:1rem;">
                      Restablecer contraseña
                    </a>
                  </div>
                  <p style="margin-bottom:.9375rem;">Este enlace es válido por un tiempo limitado. Si no solicitaste un restablecimiento de contraseña, por favor ignora este correo.</p>
                  <p style="margin-bottom:.9375rem;">Si tienes problemas para acceder a tu cuenta, por favor contacta a nuestro soporte.</p>
                  <p style="margin-bottom:0;">Saludos cordiales,<br>El equipo de Fábrica de Software CCT</p>
                </td>
              </tr>
            </table>
            <!-- Footer -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-top:1.25rem; border-top:.0625rem solid #eee; font-size:.75rem; color:#777;">
                  <p style="margin:0;">Copyright © 2025 Fábrica de Software CCT - Regional Quindío</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Error al enviar el correo:", err);
        reject(err);
      } else {
        console.log("Correo enviado:", info.response);
        resolve(info);
      }
    });
  });
};

// Función para notificar la actualización del curso
const sendCursoUpdatedNotification = (email, curso) => {
  const mailOptions = {
    from: "eariassena19@gmail.com",
    to: email,
    subject: `El curso "${curso.nombre_curso}" ha sido actualizado`,
    html: `
            <p>Hola,</p>
            <p>Te informamos que el curso <strong>${curso.nombre_curso}</strong> ha sido actualizado.</p>
            <p><strong>Descripción:</strong> ${curso.descripcion}</p>
            <p><strong>Fecha de inicio:</strong> ${curso.fecha_inicio}</p>
            <p><strong>Fecha de fin:</strong> ${curso.fecha_fin}</p>
            <p><strong>Lugar:</strong> ${curso.lugar_formacion}</p>
            <p>Saludos,<br/>SGFC</p>
        `,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.log("Error al enviar notificación de actualización:", err);
    } else {
      console.log("📨 Notificación enviada:", info.response);
    }
  });
};

// Función para enviar el correo de confirmación de cambio de contraseña
const sendPasswordChangeConfirmationEmail = (email, resetLink) => {
  const mailOptions = {
    from: "eariassena19@gmail.com",
    to: email,
    subject: "Confirmación de cambio de contraseña",
    html: `
<table width="100%" bgcolor="#f4f4f4" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; margin:0; padding:0;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:37.5rem; background:#fff; margin:1.25rem auto; border-radius:.5rem; box-shadow:0 0 .625rem rgba(0,0,0,0.1);">
        <tr>
          <td style="padding:1.875rem;">
            <!-- Header -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-bottom:1.25rem; border-bottom:.0625rem solid #eee;">
                  <img src="https://i.imgur.com/2pzIurJ.png" alt="Logo de Fábrica de Software CCT" style="width:5rem; height:auto; margin-bottom:.9375rem; display:block;">
                  <h1 style="color:#00843D; margin:0; font-size:1.5rem; font-family:Arial,sans-serif;">Confirmación de cambio de contraseña</h1>
                </td>
              </tr>
            </table>
            <!-- Content -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:1.25rem 0; line-height:1.6; color:#1A1A1A; font-size:1rem;">
                  <p style="margin-bottom:.9375rem;">Queremos confirmar que tu contraseña ha sido cambiada exitosamente.</p>
                  <p style="margin-bottom:.9375rem;">Si <strong>no realizaste este cambio</strong>, por favor <a href="mailto:soporte@tudominio.com" style="color: #F7941E;">contacta a nuestro soporte</a> de inmediato para asegurar la seguridad de tu cuenta.</p>
                  <p style="margin-bottom:.9375rem;">También puedes volver a cambiar tu contraseña haciendo clic en el siguiente enlace:</p>
                  <div style="text-align:center; padding:1.25rem 0;">
                    <a href="${resetLink}" 
                      style="display:inline-block; background-color:#F7941E; color:#fff !important; padding:.75rem 1.5625rem; border-radius:.3125rem; text-decoration:none; font-weight:bold; font-family:Arial,sans-serif; font-size:1rem;">
                      Cambiar contraseña nuevamente
                    </a>
                  </div>
                  <p style="margin-bottom:.9375rem;">Gracias por confiar en nuestros servicios.</p>
                </td>
              </tr>
            </table>
            <!-- Footer -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-top:1.25rem; border-top:.0625rem solid #eee; font-size:.75rem; color:#777;">
                  <p style="margin:0;">Copyright © 2025 Fábrica de Software CCT - Regional Quindío</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Error al enviar el correo:", err);
        reject(err);
      } else {
        console.log("Correo enviado:", info.response);
        resolve(info);
      }
    });
  });
};

//Funcion para enviar correo de notificacion de curso creado
const sendCourseCreatedEmail = (emails, nombre_curso, courseLink) => {

  const mailOptions = {
    from: 'eariassena19@gmail.com',
    to: emails,
    subject: "Nuevo curso en linea",
    html: ` <h2>El nuevo curso: ${nombre_curso} ha creado</h2>
            <p>Haz clic en el siguiente enlace para mas informacion del curso: </p>
               <a href="${courseLink}">Nuevo curso</a>`,
  }
  console.log(emails, nombre_curso, courseLink)
  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Error al enviar el correo:", err);
        reject(err);
      } else {
        console.log("Correo enviado:", info.response);
        resolve(info);
        console.log('se ejecuto la funcion')
      }
    })
  })
}

// Enviar correo al instructor notificando su asignación
const sendInstructorAssignedEmail = (email, curso) => {
  const mailOptions = {
    from: 'eariassena19@gmail.com',
    to: email,
    subject: `Has sido asignado al curso: ${curso.nombre_curso}`,
    html: `
      <h2>¡Hola instructor!</h2>
      <p>Has sido asignado al curso: <strong>${curso.nombre_curso}</strong>.</p>
      <p>Fecha de inicio: ${curso.fecha_inicio}</p>
    
      <p>Por favor, revisa tu panel para más información.</p>
    `,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Error al enviar el correo al instructor:", err);
        reject(err);
      } else {
        console.log("Correo enviado al instructor:", info.response);
        resolve(info);
      }
    });
  });
};

// Enviar correo al aprendiz notificando su instructor asignado
const sendStudentsInstructorAssignedEmail = (emails, curso, nombreInstructor) => {
  const mailOptions = {
    from: 'eariassena19@gmail.com',
    to: emails, // puede ser un string o un array de emails
    subject: `Tu curso ${curso.nombre_curso} ya tiene instructor asignado`,
    html: `
      <h2>¡Buenas noticias!</h2>
      <p>El curso <strong>${curso.nombre_curso}</strong> al que estás inscrito ya tiene un instructor asignado.</p>
      <p><strong>Instructor:</strong> ${nombreInstructor}</p>
      <p>Prepárate para iniciar el aprendizaje. Revisa los detalles en la plataforma.</p>
    `,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Error al enviar el correo a los aprendices:", err);
        reject(err);
      } else {
        console.log("Correo enviado a los aprendices:", info.response);
        resolve(info);
      }
    });
  });
};

// Exportar ambas funciones

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangeConfirmationEmail,
  sendCourseCreatedEmail,
  sendCursoUpdatedNotification,
  sendStudentsInstructorAssignedEmail,
  sendInstructorAssignedEmail,
  sendRequestCourseEmail
};

