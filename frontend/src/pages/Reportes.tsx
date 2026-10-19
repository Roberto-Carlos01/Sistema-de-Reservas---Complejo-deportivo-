import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { defaultRangeDate } from "../utils/formatDate";
import api from "../services/api";
import { DonaMetricas, MetodoPagoMetrica } from "../components/canchas/reportes/ReportesPagosGrafica";
import { MapaOcupacionCanchas } from "../components/canchas/reportes/ReportesHeatMap";
import { ReportesRentabilidad } from "../components/canchas/reportes/ReportesRentabilidad";
import { ReporteUsuarios } from "../components/canchas/reportes/ReporteUsuarios";
import { ReporteCanchas } from "../components/canchas/reportes/ReporteCanchas";
import { useAuth } from "../context/AuthContext";
import DetallesPagosTabla from "../components/canchas/reportes/DetallesPagosTablas";
import HistorialReservasCliente from "../components/canchas/reportes/HistorialReservasCliente";
import HistorialInscripcionesCliente from "../components/canchas/reportes/HistorialInscripcionesCliente";
import ReporteEventosServicios from "../components/canchas/reportes/ReporteEventosServicios";


interface ReportPagos {
  estado: string;
  total: number;
  cantidad: number;
}

const Reportes = () => {
  const { usuario } = useAuth();
  
  const [searchParams] = useSearchParams();
  const esEmpleado = usuario?.rol?.toLowerCase() === "empleado";
const esAdministrador = usuario?.rol?.toLowerCase() === "administrador";
  const [pestanaCliente, setPestanaCliente] = useState<
    "reservas" | "inscripciones"
  >("reservas");

  // Estado para controlar la visibilidad del menú desplegable "Más"
  const [menuMasAbierto, setMenuMasAbierto] = useState(false);

  if (usuario?.rol?.toLowerCase() === "cliente") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            Mi Historial
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Consulta tu historial de reservas e inscripciones.
          </p>
        </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <button
              onClick={() => setPestanaCliente("reservas")}
              className={`px-6 py-3 font-medium rounded-xl transition-all ${
                pestanaCliente === "reservas"
                  ? "bg-[#245743] text-white shadow-sm dark:bg-[#6FA88A] dark:text-gray-900"
                  : "text-gray-600 hover:text-[#245743] hover:bg-[#EAF3EE] dark:text-gray-400 dark:hover:text-[#6FA88A] dark:hover:bg-[#263A31]"
              }`}
            >
              📅 Mis Reservas
            </button>

            <button
              onClick={() => setPestanaCliente("inscripciones")}
              className={`px-6 py-3 font-medium rounded-xl transition-all ${
                pestanaCliente === "inscripciones"
                  ? "bg-[#245743] text-white shadow-sm dark:bg-[#6FA88A] dark:text-gray-900"
                  : "text-gray-600 hover:text-[#245743] hover:bg-[#EAF3EE] dark:text-gray-400 dark:hover:text-[#6FA88A] dark:hover:bg-[#263A31]"
              }`}
            >
              🏆 Mis Inscripciones
            </button>
          </div>
        </div>

        <div>
          {pestanaCliente === "reservas" && <HistorialReservasCliente />}
          {pestanaCliente === "inscripciones" && <HistorialInscripcionesCliente />}
        </div>
      </div>
    );
  }

  const defaultRange = defaultRangeDate();

  const [fechaInicio, setFechaInicio] = useState<string>(defaultRange.fechaInicio);
  const [fechaFin, setFechaFin] = useState<string>(defaultRange.fechaFin);

  const [dataPagos, setDataPagos] = useState<ReportPagos[]>([]);
  const [dataMetricasPagos, setDataMetricasPagos] = useState<MetodoPagoMetrica[]>([]);

  const obtenerDataPagos = async () => {
    try {
      const payload = {
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
      };

      const resultPagos = await api.post("/reportes/pagos", payload);
      const resultMetricaPagos = await api.post("reportes/metricasPagos", payload);

      setDataPagos(resultPagos.data.data);
      setDataMetricasPagos(resultMetricaPagos.data.data);
    } catch (error) {
      console.error("error al tratar de obtener la analitica de pagos", error);
    }
  };

  useEffect(() => {
    if (esAdministrador) {
      obtenerDataPagos();
    }
  }, [fechaInicio, fechaFin, esAdministrador]);

  
  const [tabActive, setTabActive] = useState<
  "ocupacion" | "finanzas" | "rentabilidad" | "usuarios" | "canchas" | "eventos-servicios"
>(() => {
  const tab = searchParams.get("tab");

  // El empleado solamente puede entrar a estos dos reportes
  if (esEmpleado) {
    if (tab === "canchas" || tab === "eventos-servicios") {
      return tab;
    }

    return "canchas";
  }

  // Administrador
  if (
    tab === "ocupacion" ||
    tab === "finanzas" ||
    tab === "rentabilidad" ||
    tab === "usuarios" ||
    tab === "canchas" ||
    tab === "eventos-servicios"
  ) {
    return tab;
  }

  return "usuarios";
});
  
  
  
  
  // Saber si la pestaña activa pertenece al menú "Más"
  const esTabSecundario = ["ocupacion", "finanzas", "rentabilidad"].includes(tabActive);

  return (
    <div className="space-y-6">
      <div className="bg-claro-tarjeta dark:bg-oscuro-tarjeta p-5 rounded-2xl border border-claro-borde dark:border-oscuro-borde shadow-sm transition-colors mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-claro-texto2 dark:text-oscuro-texto2">
              Rango de fechas
            </p>

            <h3 className="text-xl font-bold text-claro-texto dark:text-oscuro-texto mt-1">
              Filtrar reportes
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="bg-transparent text-claro-texto dark:text-oscuro-texto text-sm px-3 py-2 rounded-xl border border-claro-borde dark:border-oscuro-borde focus:outline-none cursor-pointer"
            />

            <span className="hidden sm:inline text-claro-texto2 dark:text-oscuro-texto2 text-sm font-medium">
              a
            </span>

            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="bg-transparent text-claro-texto dark:text-oscuro-texto text-sm px-3 py-2 rounded-xl border border-claro-borde dark:border-oscuro-borde focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="bg-claro-tarjeta dark:bg-oscuro-tarjeta p-2 rounded-2xl border border-claro-borde dark:border-oscuro-borde shadow-sm transition-colors">
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Reportes de Usuarios */}
          {esAdministrador && (
          <button
            onClick={() => setTabActive("usuarios")}
            className={`flex-1 sm:flex-initial text-sm font-medium px-5 py-2.5 rounded-xl transition-all ${
              tabActive === "usuarios"
                ? "bg-[#245743] text-white shadow-sm"
                : "text-claro-texto2 dark:text-oscuro-texto2 hover:text-[#245743] dark:hover:text-[#DCEFE5] hover:bg-[#EAF3EE] dark:hover:bg-[#173F30]"
            }`}
          >
            Reportes de usuarios
          </button>
          )}

          {/* 2. Reportes de Canchas */}
          <button
            onClick={() => setTabActive("canchas")}
            className={`flex-1 sm:flex-initial text-sm font-medium px-5 py-2.5 rounded-xl transition-all ${
              tabActive === "canchas"
                ? "bg-[#245743] text-white shadow-sm"
                : "text-claro-texto2 dark:text-oscuro-texto2 hover:text-[#245743] dark:hover:text-[#DCEFE5] hover:bg-[#EAF3EE] dark:hover:bg-[#173F30]"
            }`}
          >
            Reportes de canchas
          </button>
          {/* Reportes de Eventos y Servicios */}
          <button
            onClick={() => setTabActive("eventos-servicios")}
            className={`flex-1 sm:flex-initial text-sm font-medium px-5 py-2.5 rounded-xl transition-all ${
              tabActive === "eventos-servicios"
                ? "bg-[#245743] text-white shadow-sm"
                : "text-claro-texto2 dark:text-oscuro-texto2 hover:text-[#245743] dark:hover:text-[#DCEFE5] hover:bg-[#EAF3EE] dark:hover:bg-[#173F30]"
            }`}
          >
            Reporte de eventos y servicios
          </button>

          {/* 3. Menú Desplegable "Más" */}
        {esAdministrador && (
          <div className="relative flex-1 sm:flex-initial">
            <button
              onClick={() => setMenuMasAbierto(!menuMasAbierto)}
              className={`w-full sm:w-auto text-sm font-medium px-5 py-2.5 rounded-xl transition-all flex items-center justify-between gap-2 ${
                esTabSecundario
                  ? "bg-[#245743] text-white shadow-sm"
                  : "text-claro-texto2 dark:text-oscuro-texto2 hover:text-[#245743] dark:hover:text-[#DCEFE5] hover:bg-[#EAF3EE] dark:hover:bg-[#173F30]"
              }`}
            >
              <span>
                {tabActive === "ocupacion"
                  ? "Reporte ocupacional"
                  : tabActive === "finanzas"
                  ? "Reporte de finanzas"
                  : tabActive === "rentabilidad"
                  ? "Rentabilidad"
                  : "Más"}
              </span>
              <svg
                className={`w-4 h-4 transition-transform ${
                  menuMasAbierto ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {menuMasAbierto && (
              <div
                className="absolute right-0 mt-2 w-52 bg-claro-tarjeta dark:bg-oscuro-tarjeta border border-claro-borde dark:border-oscuro-borde rounded-xl shadow-lg z-20 py-1"
                onMouseLeave={() => setMenuMasAbierto(false)}
              >
                <button
                  onClick={() => {
                    setTabActive("ocupacion");
                    setMenuMasAbierto(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    tabActive === "ocupacion"
                      ? "bg-[#EAF3EE] dark:bg-[#173F30] text-[#245743] dark:text-[#DCEFE5] font-semibold"
                      : "text-claro-texto dark:text-oscuro-texto hover:bg-claro-fondo dark:hover:bg-oscuro-fondo"
                  }`}
                >
                  Reporte ocupacional
                </button>

                <button
                  onClick={() => {
                    setTabActive("finanzas");
                    setMenuMasAbierto(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    tabActive === "finanzas"
                      ? "bg-[#EAF3EE] dark:bg-[#173F30] text-[#245743] dark:text-[#DCEFE5] font-semibold"
                      : "text-claro-texto dark:text-oscuro-texto hover:bg-claro-fondo dark:hover:bg-oscuro-fondo"
                  }`}
                >
                  Reporte de finanzas
                </button>

                <button
                  onClick={() => {
                    setTabActive("rentabilidad");
                    setMenuMasAbierto(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    tabActive === "rentabilidad"
                      ? "bg-[#EAF3EE] dark:bg-[#173F30] text-[#245743] dark:text-[#DCEFE5] font-semibold"
                      : "text-claro-texto dark:text-oscuro-texto hover:bg-claro-fondo dark:hover:bg-oscuro-fondo"
                  }`}
                >
                  Rentabilidad
                </button>
              </div>  
            )}
          </div>
          )}
        </div>
      </div>

      {tabActive === "usuarios" && <ReporteUsuarios />}

      {tabActive === "canchas" && <ReporteCanchas />}
      {tabActive === "eventos-servicios" && (
        <ReporteEventosServicios fechaInicio={fechaInicio} fechaFin={fechaFin} />
      )}

      {tabActive === "ocupacion" && (
        <MapaOcupacionCanchas fechaInicio={fechaInicio} fechaFin={fechaFin} />
      )}

      {tabActive === "finanzas" &&
        (dataPagos && dataPagos.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {dataPagos.map((item) => (
                <div
                  key={item.estado}
                  className="bg-claro-tarjeta dark:bg-oscuro-tarjeta p-5 rounded-2xl border border-claro-borde dark:border-oscuro-borde shadow-sm transition-colors"
                >
                  <p className="text-sm font-medium text-claro-texto2 dark:text-oscuro-texto2">
                    {item.estado}
                  </p>

                  <p className="text-sm font-medium text-claro-texto2 dark:text-oscuro-texto2">
                    Cantidad: {item.cantidad}
                  </p>

                  <h3 className="text-3xl font-bold text-claro-texto dark:text-oscuro-texto mt-2">
                    {item.total} Bs.
                  </h3>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DonaMetricas
                data={dataMetricasPagos}
                metrica="cantidad"
                titulo="Volumen de Transacciones"
                subtitulo="Distribución según la frecuencia de uso de cada método"
              />

              <DonaMetricas
                data={dataMetricasPagos}
                metrica="monto"
                titulo="Ingresos Totales (Bs.)"
                subtitulo="Distribución del dinero recaudado por método de pago"
              />
            </div>

            <DetallesPagosTabla fechaInicio={fechaInicio} fechaFin={fechaFin} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-claro-tarjeta dark:bg-oscuro-tarjeta rounded-2xl border border-claro-borde dark:border-oscuro-borde">
            <div className="w-12 h-12 mb-3 rounded-full bg-claro-borde/30 dark:bg-oscuro-borde/30 flex items-center justify-center text-claro-texto2 dark:text-oscuro-texto2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 14l2-2 4 4m4-7a9 9 0 11-18 0"
                />
              </svg>
            </div>

            <h4 className="text-lg font-semibold text-claro-texto dark:text-oscuro-texto">
              No hay datos disponibles
            </h4>

            <p className="text-sm text-claro-texto2 dark:text-oscuro-texto2 mt-1">
              No se encontraron registros de pagos o finanzas para el rango de fechas seleccionado.
            </p>
          </div>
        ))}

      {tabActive === "rentabilidad" && (
        <ReportesRentabilidad fechaInicio={fechaInicio} fechaFin={fechaFin} />
      )}
    </div>
  );
};

export default Reportes;