import { useState, useEffect } from "react";
import { Header } from "../../Layouts/Header/Header";
import { Main } from "../../Layouts/Main/Main";
import "./GestionsCompany.css";
import { Search } from "lucide-react";
import axiosInstance from "../../../config/axiosInstance";
import { Footer } from "../../Layouts/Footer/Footer";
const categoriasDisponibles = [
  "Administracion",
  "Gastronomia",
  "Tecnologia",
  "Construccion",
  "Salud",
  "Diseño",
  "Mecanica",
  "Agricultura",
];

export const GestionsCompany = () => {
  const [empresas, setEmpresas] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState([]);

  useEffect(() => {
    const fetchEmpresas = async () => {
      try {
        const res = await axiosInstance.get("/api/users/empresas");
        setEmpresas(res.data);
      } catch (error) {
        setEmpresas([]);
        console.error("Error al cargar empresas:", error);
      }
    };
    fetchEmpresas();
  }, []);

  // Manejar selección de categorías (multi-selección)
  const handleCategoriaClick = (categoria) => {
    setCategoriasSeleccionadas((prev) =>
      prev.includes(categoria)
        ? prev.filter((cat) => cat !== categoria)
        : [...prev, categoria]
    );
  };

  // Filtrado por nombre/NIT y categorías seleccionadas
  const empresasFiltradas = empresas.filter((empresa) => {
    // Filtro por nombre o NIT
    const nombreONitMatch =
      (empresa.Empresa?.nombre_empresa || "")
        .toLowerCase()
        .includes(filtro.toLowerCase()) ||
      (empresa.Empresa?.NIT || "")
        .toLowerCase()
        .includes(filtro.toLowerCase());

    // Filtro por categorías seleccionadas
    const categoriaEmpresa = empresa.Empresa?.categoria || "";
    const categoriaMatch =
      categoriasSeleccionadas.length === 0 ||
      categoriasSeleccionadas.includes(categoriaEmpresa);

    return nombreONitMatch && categoriaMatch;
  });

  return (
    <div className="pantallaGestionsCompany">
      <Header />
      <Main>
        <section className="sectionPrincipalGestionsCompany">
          <section className="sectionGestionsCompanyHeader">
            <p className="tituloGestionsCompany">
              Empresas <span className="tituloVerde">Registradas</span>
            </p>

            <p className="paragraphGestionsCompany">
              Consulta y gestiona las empresas registradas en el sistema. Visualiza información clave como NIT, nombre, estado y datos de contacto. 
            </p>
          </section>

          <section className="sectionGestionsCompanyBody">
            <section className="filterGestionsCompany">
              <strong className="tituloFiltrar">Filtrar por:</strong>

              <article className="filterOptionsGestionsCompany">
                <div className="filterOptionName">
                  <label className="labelFilterOption1">Nombre o NIT</label>
                  <div className="inputFilterOption1">
                    <input
                      className="inputFilterOptionText"
                      type="text"
                      placeholder="Escriba el nombre o nit de la empresa"
                      value={filtro}
                      onChange={(e) => setFiltro(e.target.value)}
                    />
                  </div>
                </div>
                <div className="courseStatusFilte">
                  <label
                    className="labelFilterOption1"
                    style={{ padding: "0 0 .5rem 0" }}
                  >
                    Estado del Curso
                  </label>
                  <section className="sectionStatusFilter">
                    <p className="statusOption">Finalizados</p>
                    <p className="statusOption">Activos</p>
                    <p className="statusOption">Sin Cursos</p>
                    <p className="statusOption">Solicitudes Pendientes</p>
                    <p className="statusOption">Cancelados</p>
                  </section>
                </div>
                <div className="courseStatusFilte">
                  <label
                    className="labelFilterOption1"
                    style={{ padding: "0 0 .5rem 0" }}
                  >
                    Categoria
                  </label>
                  <section className="sectionStatusFilter">
                    {categoriasDisponibles.map((categoria) => (
                      <p
                        key={categoria}
                        className={`statusOption ${
                          categoriasSeleccionadas.includes(categoria)
                            ? "selected"
                            : ""
                        }`}
                        onClick={() => handleCategoriaClick(categoria)}
                        
                      >
                        {categoria}
                      </p>
                    ))}
                  </section>
                </div>
              </article>
            </section>

            <section className="resultTableGestionsCompany">
              <label className="labelFilterOption12">
                {empresasFiltradas.length} Resultados
              </label>

              <section className="scrollElement">
                {empresas.length === 0 ? (
                  <p className="no-results">No hay empresas registradas</p>
                ) : empresasFiltradas.length === 0 ? (
                  <p className="no-results">No hay empresas que coincidan con los filtros</p>
                ) : (
                  empresasFiltradas.map((empresa, index) => (
                    <div key={index} className="elementoProvisionalTabla">
                      <div className="circuloBlancoIcono"></div>
                      <section className="Contenedor-NombreEmpresa">
                        <p className="NombreEmpresaTitulo">
                          {empresa.Empresa?.nombre_empresa || "Sin nombre"}
                          <span className="NombreEmpresaSubtitulo">
                            {empresa.Empresa?.NIT}
                          </span>
                        </p>
                      </section>
                      <section className="Contenedor-categoria">
                        <span>
                          categoria: {empresa.Empresa?.categoria || "Sin categoría"}
                        </span>
                      </section>
                      <section className="Contenedor-emojis">
                        <span>{"emojis"}</span>
                      </section>
                    </div>
                  ))
                )}
              </section>
            </section>
          </section>
        </section>
      </Main>
      <Footer />
    </div>
  );
};