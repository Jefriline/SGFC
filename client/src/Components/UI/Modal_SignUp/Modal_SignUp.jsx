import React, { useState, useEffect } from "react";
import "./Modal_SignUp.css";
import ilustration_02 from "../../../assets/Ilustrations/SignUp.svg";
import seePassword from "../../../assets/Icons/seePassword.png";
import hidePassword from "../../../assets/Icons/hidePassword.png";
import axiosInstance from "../../../config/axiosInstance";
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from "react-router-dom";
import { useModal } from "../../../Context/ModalContext"; // 👈 importa el hook del contexto

export const Modal_SignUp = ({ accountType }) => {
  const {
    setShowSignUp,
    setShowSignIn,
    setShowModalSuccesfull,
    setModalSuccesfullContent,
    setShowModalGeneral
  } = useModal(); // 👈 usa el contexto

  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    number: false,
    specialChar: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  }, [accountType]);

  useEffect(() => {
    setPasswordRequirements({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      specialChar: /[@$!%*?&]/.test(password)
    });
  }, [password]);

  const registerUser = async (event) => {
    event.preventDefault();

    if (
      !passwordRequirements.length ||
      !passwordRequirements.uppercase ||
      !passwordRequirements.number ||
      !passwordRequirements.specialChar
    ) {
      alert("La contraseña debe cumplir con todos los requisitos.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Las contraseñas no coinciden");
      setPassword("");
      setConfirmPassword("");
      return;
    }

    try {
      const response = await fetch("http://localhost:3001/api/users/createUser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          accountType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al registrar el usuario");
      }

      setShowSignUp(false);
      setShowModalGeneral(false);
      setShowModalSuccesfull(true);
      setModalSuccesfullContent(
        <>
          <h2>Registro exitoso</h2>
          <p>Hemos enviado un enlace de verificación a tu correo. Haz click en él para activar tu cuenta.</p>
        </>
      );
      setTimeout(() => {
        setShowModalSuccesfull(false);
        navigate('/', { state: { accountType } });
      }, 5000);

    } catch (error) {
      console.error("Error en el registro:", error);
      alert(error.message || "Ocurrió un error al registrar el usuario");
    }
  };


  const closeModalSignUp = () => {
    setShowSignUp(false);
    setShowModalGeneral(true);
  };

  const showModalSignIn = () => {
    setShowSignUp(false);
    setShowModalGeneral(false);
    setShowSignIn(true);
  };

const handleGoogleResponse = async (response) => {
    const idToken = response.credential;

    try {
      const res = await fetch("http://localhost:3001/api/users/auth/googleSignUp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, accountType }), 
      });

      const data = await res.json();

      if (res.ok && data.success) {
        sessionStorage.setItem("userSession", JSON.stringify({
          googleId: data.user.googleId,
          accountType: data.user.accountType,
          email: data.user.email,
        }));

        setShowSignUp(false);
        setShowModalSuccesfull(true);
        setModalSuccesfullContent(
          <>
            <h2>Registro exitoso</h2>
            <p>Hemos enviado un enlace de verificación a tu correo. Haz click en él para activar tu cuenta.</p>
          </>
        );
        setTimeout(() => {
          setShowModalSuccesfull(false);
          navigate('/', { state: { accountType: data.user.accountType } });
        }, 5000);

      } else {
        alert(data.message || 'Error en el registro con Google');
      }
    } catch (error) {
      alert('Error al conectar con el servidor');
    }
  };

  return (
    <>
      <div id="container_signUp" style={{ display: 'flex' }}>
        <div className="modalSignUp">
          <div className="container_form_register">
            <div className="container_triangles_01_register">
              <div className="triangle_01"></div>
              <div className="triangle_02"></div>
              <div className="triangle_03"></div>
            </div>

            <div className="content_createAccount">
              <h2>
                Crear<span className="title2_register"> Cuenta</span>
              </h2>
              <p className="accountType">{accountType}</p>{" "}
              {/* Muestra el tipo de cuenta */}
              <form className="form_register">
                <input
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  type="email"
                  placeholder="Correo electrónico"
                />
                <div className="password-container">
                  <input
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    type={showPassword ? "text" : "password"} // Alternar entre "text" y "password"                  placeholder="Contraseña"
                    placeholder="Contraseña"
                    onFocus={() => setIsPasswordFocused(true)} // Activa el estado al enfocar
                    onBlur={() => setIsPasswordFocused(false)} // Desactiva el estado al desenfocar
                  />
                  <img
                    src={showPassword ? seePassword : hidePassword} // Cambia el icono
                    alt="Toggle Password"
                    className="password-icon"
                    onClick={() => setShowPassword(!showPassword)} // Alterna la visibilidad
                  />
                </div>
                <div className="confirmPassword-container">
                  <input
                    value={confirmPassword}
                    onChange={event => setConfirmPassword(event.target.value)}
                    type={showConfirmPassword ? "text" : "password"} // Alternar entre "text" y "password"                  placeholder="Contraseña"
                    placeholder="Confirmar Contraseña"
                  />
                  <img
                    src={showConfirmPassword ? seePassword : hidePassword} // Cambia el icono
                    alt="Toggle Password"
                    className="password-icon"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)} // Alterna la visibilidad
                  />
                </div>
                {/* Muestra los requisitos solo si el input está activo */}
                {isPasswordFocused && (
                  <ul className="password-requirements">
                    <li
                      className={
                        passwordRequirements.length ? "valid" : "invalid"
                      }
                    >
                      Al menos 8 caracteres
                    </li>
                    <li
                      className={
                        passwordRequirements.uppercase ? "valid" : "invalid"
                      }
                    >
                      Al menos una letra mayúscula
                    </li>
                    <li
                      className={
                        passwordRequirements.number ? "valid" : "invalid"
                      }
                    >
                      Al menos un número
                    </li>
                    <li
                      className={
                        passwordRequirements.specialChar ? "valid" : "invalid"
                      }
                    >
                      Al menos un carácter especial (@$!%*?&)
                    </li>
                  </ul>
                )}

                <button className="button_register" onClick={registerUser}>
                  Registrarse
                </button>
                <p className="otherOption">o</p>
                <div className="google-login-container">
                  <GoogleLogin
                    onSuccess={handleGoogleResponse}
                    onError={() => alert('Error al registrarse con Google')}
                    theme="filled_black"
                    size="large"
                    text="signup_with"
                    shape="rectangular"
                    width="270"
                    locale="es"
                  />
                </div>
              </form>
            </div>

            <div className="container_triangles_02_register">
              <div className="triangle_01"></div>
              <div className="triangle_02"></div>
              <div className="triangle_03"></div>
            </div>
          </div>

          <div className="option_signIn">
            <div className="logo">SGFC</div>
            <h3>Lorem Ipsum es simplemente el texto</h3>
            <p>Lorem Ipsum es simplemente</p>
            <button className="goTo_SignIn" onClick={showModalSignIn}>
              Iniciar sesión
            </button>
            <img src={ilustration_02} alt="" />
          </div>

          <div className="container_return_signUp">
            <h5 onClick={closeModalSignUp} style={{ cursor: "pointer" }}>Volver</h5>
            <button onClick={closeModalSignUp} className="closeModal"></button>
          </div>
        </div>
      </div>
    </>
  );
};