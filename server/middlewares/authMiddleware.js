const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    try {
        const token = req.cookies.accessToken;
        if (!token) {
            return res.status(401).json({ message: "Token no proporcionado" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret"); // Verificar el token
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Token inválido o expirado" });
    }
};


module.exports = { authMiddleware };