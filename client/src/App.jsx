import { Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import React from "react";

// Importación del contexto de los modales
import { useModal } from './Context/ModalContext';

// Importación de páginas
import { Start } from './Components/Pages/Start/Start';
import { Who_we_are } from './Components/Pages/Who_we_are/Who_we_are';
import { EmailVerification } from './Components/Pages/EmailVerification/EmailVerification';
import { ResetPassword } from './Components/Pages/ResetPassword/ResetPassword';
import { CreateCourse } from './Components/Pages/Courses/CreateCourse/CreateCourse';
import { ConsultCourses } from './Components/Pages/Courses/Consult/ConsultCourses';
import { SeeCourse } from './Components/Pages/Courses/SeeCourse/SeeCourse';
import { UpdateCourse } from './Components/Pages/Courses/UpdateCourse/UpdateCourse';
import { MisCursos } from './Components/Pages/Courses/MisCursos/MisCursos';
import { GestionsInstructor } from './Components/Pages/GestionsInstructor/GestionsInstructor';
import { GestionsGestor } from './Components/Pages/GestionsGestor/GestionsGestor';
import { SeeMyProfile } from './Components/Pages/SeeMyProfile/SeeMyProfile';
import { GestionsCompany } from './Components/Pages/GestionsCompany/GestionsCompany';
import { UpdateEmploye } from './Components/Pages/GestionsEmployes/UpdateEmploye/UpdateEmploye';
import { GestionsEmployes } from './Components/Pages/GestionsEmployes/GestionsEmployes';
import { AttendanceRecords } from './Components/Pages/AttendanceRecords/AttendanceRecords';
import { ManageAttendance } from './Components/Pages/Courses/ManageAttendance/ManageAttendance';
import { MisCursosAdmin } from './Components/Pages/Courses/MisCursos/MisCursosAdmin/MisCursosAdmin';
import { RequestCourse } from './Components/Pages/Courses/RequestCourse/RequestCourse';
import { GestionsActas } from './Components/Pages/GestionsActas/GestionsActas';
import { AssignInstructorCourse } from './Components/Pages/Courses/AssignInstructorCourse/AssignInstructorCourse';

// Importación de modales
import { NavBar } from './Components/UI/NavBar/NavBar';
import { Modal_SignIn } from './Components/UI/Modal_SignIn/Modal_SignIn';
import { Modal_General } from './Components/UI/Modal_General/Modal_General';
import { Modal_SignUp } from './Components/UI/Modal_SignUp/Modal_SignUp';
import { Modal_Successful } from './Components/UI/Modal_Successful/Modal_Successful';
import { Modal_Failed } from './Components/UI/Modal_Failed/Modal_Failed';
import { CreateInstructor } from './Components/Pages/GestionsInstructor/CreateInstructor/CreateInstructor';
import { CreateGestor } from './Components/Pages/GestionsGestor/CreateGestor/CreateGestor';
import { CreateEmploye } from './Components/Pages/GestionsEmployes/CreateEmploye/CreateEmploye';
import { UpdateInstructor } from './Components/Pages/GestionsInstructor/UpdateInstructor/UpdateInstructor';
import { NoAutorizado } from './Components/Pages/NoAutorizado/NoAutorizado';

// Importación de estilos
import "./App.css";
import { Header } from './Components/Layouts/Header/Header';

// Crear un componente Layout que envuelva las páginas con Header y Footer
const Layout = ({ children, setShowSignIn, setShowSignUp, setShowModalGeneral }) => {
  return (
    <>
      <Header
        setShowSignIn={setShowSignIn}
        setShowSignUp={setShowSignUp}
        setShowModalGeneral={setShowModalGeneral}
      />
      {children}
    </>
  );
};

function App() {
  const navigate = useNavigate();

  // Estados de los modales desde el contexto global
  const {
    showSignIn,
    setShowSignIn,
    showSignUp,
    setShowSignUp,
    showModalGeneral,
    setShowModalGeneral,
    selectedAccountType,
    setSelectedAccountType,
    showModalCreateEmployee,
    showModalSuccesfull,
    setShowModalSuccesfull,
    modalSuccesfullContent,
    showModalFailed,
    setShowModalFailed,
    modalFailedContent,
    modalGeneralContent,
    showAssignModal,
    setShowAssignModal

  } = useModal();


  useEffect(() => {
    if (window.gapi) {
      window.gapi.load("auth2", () => {
        window.gapi.auth2.init({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        });
      });
    }
  }, []);

  useEffect(() => {
    const userSession = localStorage.getItem('userSession');
    const userInfo = sessionStorage.getItem('userSession');
    const { email } = JSON.parse(userInfo || '{}'); // Manejo seguro si userInfo es null

    if (email?.includes('@example.com')) {
      setShowModalGeneral(true);
    }

    if (userSession && location.pathname !== "/resetPassword") {
      navigate("/", { state: { accountType: selectedAccountType } });
    }
  }, [navigate]);


  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <>
        {/* Renderizado condicional de modales basado en el contexto */}
        {showSignIn && (
          <Modal_SignIn
            showSignIn={showSignIn}
            setShowSignIn={setShowSignIn}
            setShowSignUp={setShowSignUp}
            setShowModalGeneral={setShowModalGeneral}
            setSelectedAccountType={setSelectedAccountType}
          />
        )}

        {showModalGeneral && (
          <Modal_General closeModal={() => setShowModalGeneral(false)}>
            {modalGeneralContent}
          </Modal_General>
        )}

        {showSignUp && selectedAccountType && (
          <Modal_SignUp
            accountType={selectedAccountType}
            setShowSignUp={setShowSignUp}
            setShowSignIn={setShowSignIn}
            setShowModalGeneral={setShowModalGeneral}
          />
        )}

        {showModalSuccesfull && (
          <Modal_Successful closeModal={() => setShowModalSuccesfull(false)}>
            {modalSuccesfullContent}
          </Modal_Successful>
        )}

        {showModalFailed && (
          <Modal_Failed closeModal={() => setShowModalFailed(false)}>
            {modalFailedContent}
          </Modal_Failed>
        )}

        {showModalCreateEmployee && <CreateEmploye />}

        {showAssignModal && <AssignInstructorCourse />}

        <CreateInstructor />
        <CreateGestor />

        <Routes>
          <Route path="/" element={
            <Start
              setShowSignIn={setShowSignIn}
              setShowSignUp={setShowSignUp}
              setShowModalGeneral={setShowModalGeneral}
            />
          } />
          <Route path="/QuienesSomos" element={<Who_we_are />} />

          <Route path="/verificarCorreo" element={<EmailVerification />} />
          <Route path="/resetPassword" element={<ResetPassword />} />
          <Route path="/Cursos/CrearCurso" element={
            <Layout
              setShowSignIn={setShowSignIn}
              setShowSignUp={setShowSignUp}
              setShowModalGeneral={setShowModalGeneral}
            >
              <CreateCourse />
            </Layout>
          } />
          <Route path="/Cursos/BuscarCursos" element={<Layout
            setShowSignIn={setShowSignIn}
            setShowSignUp={setShowSignUp}
            setShowModalGeneral={setShowModalGeneral}
          >
            <ConsultCourses />
          </Layout>
          } />
          <Route path="/Cursos/:id" element={<SeeCourse />} />
          <Route path="/Cursos/MisCursos" element={
            <Layout
              setShowSignIn={setShowSignIn}
              setShowSignUp={setShowSignUp}
              setShowModalGeneral={setShowModalGeneral}
            >
              <MisCursosAdmin />
            </Layout>
          } />

          <Route path="/Cursos/MisCursosAsignados" element={
            <Layout
              setShowSignIn={setShowSignIn}
              setShowSignUp={setShowSignUp}
              setShowModalGeneral={setShowModalGeneral}
            >
              <MisCursos />
            </Layout>
          } />
          <Route path="/Cursos/:id/gestionar-asistencia" element={
            <Layout
              setShowSignIn={setShowSignIn}
              setShowSignUp={setShowSignUp}
              setShowModalGeneral={setShowModalGeneral}
            >
              <ManageAttendance />
            </Layout>
          } />
          <Route
            path="/Cursos/ActualizarCurso/:id"
            element={<UpdateCourse />}
          />
          <Route
            path="/Gestiones/Instructor"
            element={<GestionsInstructor />}
          />
          <Route path="/Gestiones/Gestor" element={<GestionsGestor />} />
          <Route path="/MiPerfil" element={<SeeMyProfile />} />
          <Route path="/Gestiones/Empresas" element={<GestionsCompany />} />
          <Route path="/Gestiones/Actas" element={<GestionsActas />} />

          <Route
            path="/Empleados/MisEmpleados"
            element={<GestionsEmployes />}
          />

          <Route path="/Empleados/CrearEmpleado" element={<CreateEmploye />} />
          <Route
            path="/Empleados/ActualizarEmpleado/:id"
            element={<UpdateEmploye />}
          />
          <Route path="/Asistencias" element={
            <Layout
              setShowSignIn={setShowSignIn}
              setShowSignUp={setShowSignUp}
              setShowModalGeneral={setShowModalGeneral}
            >
              <AttendanceRecords />
            </Layout>
          } />

          <Route path="/no-autorizado" element={<NoAutorizado />} />
          <Route path="/SolicitarCurso/:nombreCurso" element={<RequestCourse />} />        </Routes>
      </>
    </GoogleOAuthProvider>
  );
}

export default App;
