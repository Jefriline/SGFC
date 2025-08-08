import React, { useState, useEffect } from "react";
import "./MisCursosAdmin.css";
import { Header } from "../../../../Layouts/Header/Header";
import { Footer } from "../../../../Layouts/Footer/Footer";
import { Main } from "../../../../Layouts/Main/Main";
import axiosInstance from "../../../../../config/axiosInstance";
import { useNavigate } from "react-router-dom";

export const MisCursosAdmin = () => {
    const [todosLosCursos, setTodosLosCursos] = useState([]);
    const [cursos, setCursos] = useState([]);
    const [current, setCurrent] = useState(0);
    const [direction, setDirection] = useState("next");
    const [filtroActivo, setFiltroActivo] = useState("Todos");
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

    // Obtener datos del usuario logueado (ajusta según tu auth)
    const user = JSON.parse(localStorage.getItem("user")) || {};
    const empresaId = user.Empresa?.ID || user.empresa_ID; // Ajusta según cómo guardes la empresa

    useEffect(() => {
        const fetchCursos = async () => {
            setLoading(true);
            try {
                // Obtener datos de sesión desde localStorage o sessionStorage
                const userSession =
                    JSON.parse(localStorage.getItem("userSession")) ||
                    JSON.parse(sessionStorage.getItem("userSession")) ||
                    {};

                const accountType = userSession.accountType;
                const empresaId = userSession.Empresa?.ID || userSession.empresa_ID;

                let response;
                if (accountType === "Administrador" || accountType === "Gestor") {
                    response = await axiosInstance.get("/api/courses/cursos");
                    setTodosLosCursos(response.data);
                    setCursos(response.data);
                } else if (accountType === "Empresa" && empresaId) {
                    response = await axiosInstance.get(`/api/courses/empresa/${empresaId}`);
                    setTodosLosCursos(response.data.cursos || []);
                    setCursos(response.data.cursos || []);
                } else {
                    setTodosLosCursos([]);
                    setCursos([]);
                }
                // Guardar el tipo de cuenta en el estado si lo necesitas
                setAccountType(accountType);
            } catch (error) {
                console.error("Error al cargar los cursos:", error);
                setTodosLosCursos([]);
                setCursos([]);
            } finally {
                setLoading(false);
            }
        };

        fetchCursos();
    }, []);

    // Nuevo estado para accountType
    const [accountType, setAccountType] = useState("");

    // Filtros según tipo de cuenta
    const filtros =
        accountType === "Empresa"
            ? ["Todos", "Activos", "Finalizados", "Pendientes", "Cancelados", "En oferta"]
            : [
                "Todos",
                "Activos",
                "En oferta",
                "Finalizados",
                "Oferta abierta",
                "Oferta cerrada",
            ];

    const filtrarCursos = (filtro) => {
        setFiltroActivo(filtro);
        setCurrent(0);

        if (filtro === "Todos") {
            setCursos(todosLosCursos);
        } else if (filtro === "Oferta abierta") {
            setCursos(
                todosLosCursos.filter((curso) =>
                    curso.tipo_oferta?.toLowerCase() === "abierta"
                )
            );
        } else if (filtro === "Activos") {
            setCursos(
                todosLosCursos.filter((curso) =>
                    curso.estado?.toLowerCase() === "activo"
                )
            );
        } else if (filtro === "Finalizados") {
            setCursos(
                todosLosCursos.filter((curso) =>
                    curso.estado?.toLowerCase() === "finalizado"
                )
            );
        } else if (filtro === "Pendientes") {
            setCursos(
                todosLosCursos.filter((curso) =>
                    curso.estado?.toLowerCase() === "pendiente"
                )
            );
        } else if (filtro === "Cancelados") {
            setCursos(
                todosLosCursos.filter((curso) =>
                    curso.estado?.toLowerCase() === "cancelado"
                )
            );
        } else if (filtro === "Oferta cerrada") {
            setCursos(
                todosLosCursos.filter((curso) =>
                    curso.tipo_oferta?.toLowerCase() === "cerrada"
                )
            );
        } else {
            setCursos(
                todosLosCursos.filter((curso) =>
                    curso.estado?.toLowerCase().includes(filtro.toLowerCase())
                )
            );
        }
    };

    const next = () => {
        setDirection("next");
        setCurrent((prev) => (prev + 1) % cursos.length);
    };

    const prev = () => {
        setDirection("prev");
        setCurrent((prev) => (prev - 1 + cursos.length) % cursos.length);
    };

    const getCursoAt = (indexOffset) => {
        const index = (current + indexOffset + cursos.length) % cursos.length;
        return cursos[index];
    };

    const handleVerCurso = () => {
        const cursoCentral = getCursoAt(0);
        if (cursoCentral && (cursoCentral.ID || cursoCentral.id)) {
            navigate(`/Cursos/${cursoCentral.ID || cursoCentral.id}`);
        }
    };

    return (
        <>
            <Header />
            <Main>
                <div className="container_myCourses">
                    <h2>
                        Mis <span className="complementary">Cursos</span>
                    </h2>

                    <div className="cursos-container">
                        <div className="filtros">
                            {filtros.map((filtro, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => filtrarCursos(filtro)}
                                    className={`filtro ${filtroActivo === filtro ? "activo" : ""}`}
                                >
                                    {filtro}
                                </button>
                            ))}
                        </div>

                        <div className="containerMisCoursesResults">
                            {loading ? (
                                <p className="no-results">Cargando cursos...</p>
                            ) : cursos.length === 0 ? (
                                <p className="no-results">No hay cursos disponibles</p>
                            ) : (
                                <>
                                    {cursos.length > 1 && (
                                        <button className="arrow-courses left" onClick={prev}>
                                            ❮
                                        </button>
                                    )}

                                    <div className="carousel-container-courses">
                                        <div
                                            key={current}
                                            className={`carousel-track-courses animate-${direction}`}
                                        >
                                            {[getCursoAt(-1), getCursoAt(0), getCursoAt(1)].map(
                                                (curso, idx) => (
                                                    <div
                                                        key={`${curso?.id || curso?.ID}-${current}`}
                                                        className={`carousel-card-courses ${idx === 1
                                                            ? "card-center-courses animate-card"
                                                            : "card-side-courses"
                                                            }`}
                                                    >
                                                        <div className="imagen-curso">
                                                            <img
                                                                src={
                                                                    curso?.imagen
                                                                        ? `data:image/jpeg;base64,${curso.imagen}`
                                                                        : "/src/assets/Ilustrations/f3.jpg"
                                                                }
                                                                alt={curso?.nombre_curso}
                                                            />
                                                            {idx === 1 && (
                                                                <div className="overlay-course-info">
                                                                    <h3>{curso?.nombre_curso}</h3>
                                                                    <p><strong>Ficha:</strong> {curso?.ficha}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>

                                    {cursos.length > 1 && (
                                        <button className="arrow-courses right" onClick={next}>
                                            ❯
                                        </button>
                                    )}
                                </>
                            )}
                        </div>

                        {cursos.length > 0 && !loading && (
                            <button className="ver-curso" onClick={handleVerCurso}>
                                Ver curso
                            </button>
                        )}
                    </div>

                    <img
                        className="illustration-woman"
                        src="/src/assets/Ilustrations/woman-business.svg"
                        alt="Ilustración de mujer mis cursos admin"
                    />
                    <img
                        className="illustration-man"
                        src="/src/assets/Ilustrations/man-business.svg"
                        alt="Ilustración de hombre mis cursos admin"
                    />
                </div>
            </Main>
            <Footer />
        </>
    );
};