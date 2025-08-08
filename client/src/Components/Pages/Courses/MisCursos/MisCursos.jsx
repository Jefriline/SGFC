import React, { useEffect, useState, useRef } from 'react';
import './MisCursos.css';
import { Footer } from '../../../Layouts/Footer/Footer';
import { Main } from '../../../Layouts/Main/Main';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../../config/axiosInstance';
import arrowLeft from '../../../../assets/Icons/arrowLeft.png';
import arrowRight from '../../../../assets/Icons/arrowRight.png';

export const MisCursos = () => {
  const [cursos, setCursos] = useState([]);
  const [filteredCursos, setFilteredCursos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPosition, setCurrentPosition] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);
  const scrollRef = useRef(null);
  const navigate = useNavigate();

  const userSession = JSON.parse(localStorage.getItem('userSession')) ||
    JSON.parse(sessionStorage.getItem('userSession'));

  useEffect(() => {
    const fetchCursos = async () => {
      try {
        let response;

        // Verificar que tenemos un ID válido antes de hacer la petición
        if (!userSession?.ID && !userSession?.id) {
          setErrorMessage("No se pudo obtener el ID del usuario");
          return;
        }

        // Obtener cursos según el tipo de cuenta
        switch (userSession?.accountType) {
          case 'Instructor':
            // Usar el ID que esté disponible (ID o id)
            const instructorId = userSession.ID || userSession.id;
            response = await axiosInstance.get(`/api/courses/cursos-asignados/${instructorId}`);
            // Transformar la respuesta para mantener el mismo formato que los otros endpoints
            const cursosAsignados = response.data.map(asignacion => ({
              ...asignacion.Curso,
              // Asegurar que cada curso tenga un ID único
              ID: asignacion.Curso.ID || asignacion.Curso.id || asignacion.curso_ID
            }));
            setCursos(cursosAsignados);
            setFilteredCursos(cursosAsignados);
            break;
          case 'Administrador':
          case 'Gestor':
            // Para administradores y gestores, mostrar todos los cursos
            response = await axiosInstance.get("/api/courses/cursos");
            // Asegurar que cada curso tenga un ID único
            const todosLosCursos = response.data.map(curso => ({
              ...curso,
              ID: curso.ID || curso.id
            }));
            setCursos(todosLosCursos);
            setFilteredCursos(todosLosCursos);
            break;
          default:
            setErrorMessage("No tienes permisos para ver esta página");
            return;
        }
      } catch (error) {
        console.error("Error al obtener los cursos:", error);
        setErrorMessage("Error al cargar los cursos");
      }
    };

    if (userSession) {
      fetchCursos();
    } else {
      setErrorMessage("Debes iniciar sesión para ver tus cursos");
    }
  }, [userSession]);

  // Función para filtrar cursos por ficha
  const handleSearch = (e) => {
    const searchValue = e.target.value.toLowerCase();
    setSearchTerm(searchValue);

    const filtered = cursos.filter(curso =>
      (curso.ficha || '').toLowerCase().includes(searchValue) ||
      (curso.nombre_curso || '').toLowerCase().includes(searchValue)
    );
    setFilteredCursos(filtered);
  };

  // Función para actualizar el estado del scroll
  const updateScrollState = () => {
    const { current } = scrollRef;
    if (!current) return;

    const trackWidth = current.scrollWidth;
    const containerWidth = current.offsetWidth;
    const scrollLeft = current.scrollLeft;

    setMaxScroll(trackWidth - containerWidth);
    setCurrentPosition(scrollLeft);
  };

  // Función para manejar el scroll del carrusel
  const scroll = (direction) => {
    const { current } = scrollRef;
    if (!current) return;

    const card = current.querySelector('.carousel-card');
    if (!card) return;

    const cardWidth = card.offsetWidth;
    const gap = 24; // 1.5rem en píxeles
    const scrollAmount = (cardWidth + gap) * 3; // Scroll 3 cartas a la vez

    const newPosition = direction === 'left'
      ? Math.max(0, currentPosition - scrollAmount)
      : Math.min(maxScroll, currentPosition + scrollAmount);

    current.scrollTo({
      left: newPosition,
      behavior: 'smooth'
    });
  };

  // Efecto para actualizar el estado del scroll
  useEffect(() => {
    const { current } = scrollRef;
    if (!current) return;

    const handleScroll = () => {
      updateScrollState();
    };

    current.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', updateScrollState);

    // Actualizar estado inicial
    updateScrollState();

    return () => {
      current.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [filteredCursos]);

  // Función para redirigir al usuario al ver un curso
  const handleCardClick = (ID) => {
    if (!ID) {
      console.error("El ID del curso es undefined o null");
      return;
    }
    navigate(`/Cursos/${ID}`);
  };

  if (errorMessage) {
    return (
      <>
        <Main>
          <div className="container_misCursos">
            <h2>Cursos Asignados</h2>
            <p className="error-message">{errorMessage}</p>
          </div>
        </Main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Main>
        <div className="container_misCursos">
          <h2>
            Cursos <span className='complementary'>Asignados</span>
          </h2>
          <p>Busca un curso por su ficha o nombre.</p>

          <div className='options_Search'>
            <input
              type="text"
              placeholder='Buscar por ficha o nombre del curso'
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>

          {errorMessage && <p className="error-message">{errorMessage}</p>}

          <div className="carousel-container-misCursos">
            <div className="carousel-wrapper-misCursos">
              {currentPosition > 0 && (
                <button
                  className="carousel-arrow-misCursos left"
                  onClick={() => scroll('left')}
                >
                  <img src={arrowLeft} alt="Flecha izquierda" />
                </button>
              )}
              <div className="carousel-track-misCursos" ref={scrollRef}>
                {filteredCursos.map((curso) => {
                  // Asegurar que cada curso tenga un ID único
                  const cursoId = curso.ID || curso.id;
                  if (!cursoId) {
                    console.warn('Curso sin ID:', curso);
                    return null;
                  }

                  return (
                    <div
                      className="carousel-card-misCursos"
                      key={`curso-${cursoId}`}
                      onClick={() => handleCardClick(cursoId)}
                    >
                      <img
                        src={`http://localhost:3001${curso.imagen}` || "ruta/imagen/por/defecto.jpg"}
                        alt={curso.nombre_curso || 'Curso sin nombre'}
                      />
                      <div className="card-text-misCursos">
                        <h4>{curso.nombre_curso || 'Sin nombre'}</h4>
                        <p className="ficha-misCursos">Ficha: {curso.ficha || 'No disponible'}</p>
                        <p className="description-misCursos">{curso.descripcion || 'Sin descripción'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {currentPosition < maxScroll && (
                <button
                  className="carousel-arrow-misCursos right"
                  onClick={() => scroll('right')}
                >
                  <img src={arrowRight} alt="Flecha derecha" />
                </button>
              )}
            </div>
          </div>
          <div className="illustration-container-misCursos">
            <img src="/src/assets/Ilustrations/Professor-amico.svg" alt="Ilustración de gestión de asistencia" />
          </div>
        </div>
      </Main>
      <Footer />
    </>
  );
}; 