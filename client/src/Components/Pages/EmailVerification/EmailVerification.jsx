import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axiosInstance from "../../../config/axiosInstance";
import { useModal } from "../../../Context/ModalContext";
import "./EmailVerification.css";

export const EmailVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVerified, setIsVerified] = useState(false);
  const [message, setMessage] = useState("");

  // Importa los métodos del contexto de modales
  const {
    setShowModalSuccesfull,
    setModalSuccesfullContent,
    setShowModalFailed,
    setModalFailedContent,
  } = useModal();

useEffect(() => {
  const verifyEmail = async () => {
    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get("token");
    console.log("Token recibido en EmailVerification:", token);

    if (!token) {
      showError("No se proporcionó un token de verificación.");
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/users/verificarCorreo?token=${token}`);
      console.log("Respuesta cruda del backend:", response);

      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error("Error al parsear JSON:", jsonError);
        showError("Respuesta inválida del servidor.");
        return;
      }

      console.log("Datos del backend:", data);

      if (!response.ok) {
        throw new Error(data.message || "Error en la verificación.");
      }

      setIsVerified(true);
      setMessage(data.message);
      setModalSuccesfullContent(<h2>{data.message}</h2>);
      setShowModalSuccesfull(true);

      setTimeout(() => {
        setShowModalSuccesfull(false);
        navigate("/", { state: { showSuccessModal: true } });
      }, 5000);
    } catch (error) {
      console.error("Error en la verificación:", error);
      showError(error.message || "Error al verificar el correo.");
    }
  };

  const showError = (msg) => {
    setIsVerified(false);
    setMessage(msg);
    setModalFailedContent(
      <>
        <h2>Error al verificar el correo</h2>
        <p>{msg}</p>
      </>
    );
    setShowModalFailed(true);

    setTimeout(() => {
      setShowModalFailed(false);
      navigate("/");
    }, 5000);
  };

  verifyEmail();
}, [location, navigate, setShowModalSuccesfull, setModalSuccesfullContent, setShowModalFailed, setModalFailedContent]);
  return (
    <div className="container_emailVerification">
      {/* Los modales se renderizan globalmente en App.jsx */}
    </div>
  );
};