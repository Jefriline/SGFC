const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage(); // Guarda como buffer

const fileFilter = (req, file, cb) => {
    console.log("Tipo MIME recibido:", file.mimetype); // 🔍

    if (file.fieldname === 'foto_perfil' || file.fieldname === 'imagen') {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Solo se aceptan imágenes (jpeg, jpg, png).'));
        }
    } else if (file.fieldname === 'document_pdf' || file.fieldname === 'pdf') { // <-- Permitir 'pdf'
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se acepta PDF para document_pdf o pdf.'));
        }
    } else if (file.fieldname === 'archivo_xlsx') {
        const validMimetype = [
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        if (validMimetype.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos .xlsx'), false);
        }
    } else {
        cb(new Error('Campo de archivo no permitido.'));
    }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
