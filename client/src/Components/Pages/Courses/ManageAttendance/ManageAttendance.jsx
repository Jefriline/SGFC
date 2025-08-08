import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Main } from '../../../Layouts/Main/Main';
import { Footer } from '../../../Layouts/Footer/Footer';
import axiosInstance from '../../../../config/axiosInstance';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AttendanceManagement } from '../SeeCourse/AttendanceManagement';
import { MonthlyCalendar } from '../../../UI/Modal_Calendar/ViewCalendar/MonthlyCalendar';
import './ManageAttendance.css';

export const ManageAttendance = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [curso, setCurso] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [showAttendanceManagement, setShowAttendanceManagement] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [trainingDays, setTrainingDays] = useState([]);

    useEffect(() => {
        const fetchCurso = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const response = await axiosInstance.get(`/api/courses/cursos/${id}`);
                console.log('Datos del curso recibidos:', response.data);
                setCurso(response.data);

                // Procesar los días de formación
                if (response.data.dias_formacion) {
                    try {
                        const diasFormacion = JSON.parse(response.data.dias_formacion);
                        console.log('Días de formación procesados:', diasFormacion);
                        // Asegurarse de que los días estén en el formato correcto (ej: "Lun-8:00")
                        const diasProcesados = diasFormacion.map(dia => {
                            if (typeof dia === 'string') {
                                // Si ya está en formato "Dia-Hora", dejarlo como está
                                return dia;
                            } else if (dia.dia && dia.hora) {
                                // Si es un objeto con propiedades dia y hora, convertirlo al formato correcto
                                return `${dia.dia}-${dia.hora}`;
                            }
                            return null;
                        }).filter(Boolean); // Eliminar valores nulos

                        console.log('Días de formación procesados:', diasProcesados);
                        setTrainingDays(diasProcesados);
                    } catch (error) {
                        console.error('Error al procesar los días de formación:', error);
                        console.error('Datos recibidos:', response.data.dias_formacion);
                        setTrainingDays([]);
                    }
                } else {
                    console.log('No hay días de formación definidos');
                    setTrainingDays([]);
                }
            } catch (error) {
                console.error("Error al obtener el curso:", error);
                setError("Error al cargar los datos del curso. Por favor, intente nuevamente.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchCurso();
    }, [id]);

    const handleDateSelect = (date) => {
        console.log('Fecha seleccionada:', date);
        if (date) {
            console.log('Actualizando estado con fecha:', date);
            setSelectedDate(date);
            setShowAttendanceManagement(true);
            console.log('Estado actualizado:', {
                selectedDate: date,
                showAttendanceManagement: true
            });
        }
    };

    const handleCloseAttendanceManagement = () => {
        setShowAttendanceManagement(false);
        setSelectedDate('');
    };

    const handleMonthChange = (direction) => {
        setCurrentMonth(prev => {
            const newDate = new Date(prev);
            if (direction === 'prev') {
                newDate.setMonth(prev.getMonth() - 1);
            } else {
                newDate.setMonth(prev.getMonth() + 1);
            }
            return newDate;
        });
    };

    if (isLoading) {
        return (
            <Main>
                <div className="manage-attendance-container">
                    <p>Cargando datos del curso...</p>
                </div>
            </Main>
        );
    }

    if (error) {
        return (
            <Main>
                <div className="manage-attendance-container">
                    <p className="error-message">{error}</p>
                    <button
                        className="back-button"
                        onClick={() => navigate(`/Cursos/${id}`)}
                    >
                        Volver al curso
                    </button>
                </div>
            </Main>
        );
    }

    if (!curso) {
        return (
            <Main>
                <div className="manage-attendance-container">
                    <p>No se encontró información del curso.</p>
                    <button
                        className="back-button"
                        onClick={() => navigate(`/Cursos/${id}`)}
                    >
                        Volver al curso
                    </button>
                </div>
            </Main>
        );
    }

    if (!curso.fecha_inicio || !curso.fecha_fin) {
        return (
            <Main>
                <div className="manage-attendance-container">
                    <p>El curso no tiene fechas definidas.</p>
                    <button
                        className="back-button"
                        onClick={() => navigate(`/Cursos/${id}`)}
                    >
                        Volver al curso
                    </button>
                </div>
            </Main>
        );
    }

    return (
        <>
            <Main>
                <div className="container_main_attendance">
                    <h2>Gestión de <span className="complementary">asistencias</span></h2>
                    <p>Ficha: {curso.ficha}</p>


                    <div className="calendar-main-content">


                        <MonthlyCalendar
                            selectedDate={selectedDate}
                            onDateSelect={handleDateSelect}
                            startDate={curso.fecha_inicio}
                            endDate={curso.fecha_fin}
                            trainingDays={trainingDays}
                        />

                    </div>
                    <div className="illustration-container">
                        <img src="/src/assets/Ilustrations/Raising hand-pana.svg" alt="Ilustración de gestión de asistencia" />
                    </div>

                    <div className="text-container-manageAttendance">
                        Por favor seleccione el día en el que quiere gestionar asistencias del curso
                    </div>

                    <button className="back-button-manageAttendance" onClick={() => navigate(`/Cursos/${id}`)}>
                        Volver
                    </button>
                </div>
            </Main>
            <Footer />

            {selectedDate && showAttendanceManagement && (
                <AttendanceManagement
                    open={showAttendanceManagement}
                    onClose={handleCloseAttendanceManagement}
                    courseId={curso.ID}
                    selectedDate={selectedDate}
                />
            )}
        </>
    );
}; 