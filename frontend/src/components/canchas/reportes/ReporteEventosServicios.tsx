import api from "../../../services/api";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { ResponsivePie } from "@nivo/pie";
import React, { useEffect, useState } from "react";

interface EventoServicioItem {
  id_evento: number;
  nombre_evento: string;
  tipo_evento: string;
  fecha_evento: string;
  hora_inicio: string;
  hora_fin: string;
  canchas: string;
  servicios: string;
  cupo_maximo: number;
  estado: string;
}

interface ServicioIngreso {
  id: string;
  label: string;
  value: number;
}

interface Props {
  fechaInicio?: string;
  fechaFin?: string;
}

export const ReporteEventosServicios: React.FC<Props> = ({ fechaInicio, fechaFin }) => {
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  const [todosEventos, setTodosEventos] = useState<EventoServicioItem[]>([]);
  const [ingresosServicios, setIngresosServicios] = useState<ServicioIngreso[]>([]);
  const [cargando, setCargando] = useState(false);

const obtenerReporteData = async () => {
    try {
      setCargando(true);

      // Si las fechas vienen vacías, usamos un rango amplio por defecto
      const fInicio = fechaInicio || "2025-01-01";
      const fFin = fechaFin || "2026-12-31";

      const response = await api.post("/reportes/eventos-servicios", {
        fechaInicio: fInicio,
        fechaFin: fFin
      });      
      
      // 1. Imprimimos en consola para ver la estructura real (puedes borrarlo después)
      console.log("Respuesta cruda del backend (Eventos):", response.data);

      // 2. CORRECCIÓN: Leemos de response.data.data (como en pagos) o response.data
      const payload = response.data?.data || response.data;
      
      // 3. Extraemos de forma segura sin importar si viene como Array directo o como Objeto
      let dataEventos = [];
      let dataServicios = [];

      if (Array.isArray(payload)) {
        dataEventos = payload; 
      } else if (payload && typeof payload === 'object') {
        dataEventos = Array.isArray(payload.eventos) ? payload.eventos : [];
        dataServicios = Array.isArray(payload.ingresosServicios) ? payload.ingresosServicios : [];
      }

      setTodosEventos(dataEventos);
      setIngresosServicios(dataServicios);
    } catch (error: any) {
      console.error(
        "ERROR REPORTE EVENTOS/SERVICIOS:",
        error.response?.status,
        error.response?.data
      );
    } finally {
      setCargando(false);
    }
  };
  // Reejecutar cada vez que las props de fecha cambien desde Reportes.tsx
  useEffect(() => {
    obtenerReporteData();
  }, [fechaInicio, fechaFin]);
  // Lista única de tipos de eventos para el select
  const tiposDisponibles = Array.from(
    new Set(todosEventos.map((e) => e.tipo_evento).filter(Boolean))
  );

  // Filtrado local
  const eventosFiltrados = todosEventos.filter((evento) => {
    const cumpleEstado =
      filtroEstado === "todos" ||
      evento.estado?.toLowerCase() === filtroEstado.toLowerCase();

    const cumpleTipo =
      filtroTipo === "todos" ||
      evento.tipo_evento?.toLowerCase() === filtroTipo.toLowerCase();

    const cumpleBusqueda =
      !busqueda ||
      evento.nombre_evento?.toLowerCase().includes(busqueda.toLowerCase()) ||
      evento.servicios?.toLowerCase().includes(busqueda.toLowerCase()) ||
      evento.canchas?.toLowerCase().includes(busqueda.toLowerCase());

    return cumpleEstado && cumpleTipo && cumpleBusqueda;
  });

  // KPIs calculados
  const totalEventos = eventosFiltrados.length;
  const programados = eventosFiltrados.filter(e => e.estado?.toLowerCase() === 'programado').length;
  const finalizados = eventosFiltrados.filter(e => e.estado?.toLowerCase() === 'finalizado').length;
  const cancelados = eventosFiltrados.filter(e => e.estado?.toLowerCase() === 'cancelado').length;
  const totalIngresos = ingresosServicios.reduce((acc, curr) => acc + curr.value, 0);

  // Exportar Excel
  const exportarExcel = () => {
    const datosExcel = eventosFiltrados.map((item) => ({
      ID: item.id_evento,
      Evento: item.nombre_evento,
      Tipo: item.tipo_evento || "General",
      Fecha: item.fecha_evento,
      Horario: `${item.hora_inicio} - ${item.hora_fin}`,
      Canchas: item.canchas || "N/A",
      Servicios: item.servicios || "Ninguno",
      Capacidad: item.cupo_maximo ? `${item.cupo_maximo} pers.` : "N/A",
      Estado: item.estado,
    }));

    const hoja = XLSX.utils.json_to_sheet(datosExcel);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Eventos y Servicios");
    XLSX.writeFile(libro, "reporte-eventos-servicios.xlsx");
  };

  // Exportar PDF por Canvas (igual a ReporteCanchas)
  const exportarPDF = async () => {
    const elemento = document.getElementById("reporte-eventos-pdf");
    if (!elemento) return;

    const canvas = await html2canvas(elemento, { scale: 2 });
    const imagen = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const ancho = 190;
    const alto = (canvas.height * ancho) / canvas.width;

    pdf.text("Reporte de Eventos y Servicios", 10, 10);
    pdf.addImage(imagen, "PNG", 10, 15, ancho, alto);
    pdf.save("reporte-eventos-servicios.pdf");
  };

  return (
    <div
      className="space-y-6 bg-claro-fondo dark:bg-oscuro-fondo p-6 rounded-2xl text-claro-texto dark:text-oscuro-texto"
      id="reporte-eventos-pdf"
    >
      <h2 className="text-2xl font-bold text-claro-texto dark:text-oscuro-texto">
        Reporte de Eventos y Servicios
      </h2>

      {/* Tarjetas de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-claro-tarjeta dark:bg-oscuro-tarjeta p-4 rounded-2xl border border-claro-borde dark:border-oscuro-borde shadow-sm">
          <p className="text-xs font-medium text-claro-texto2 dark:text-oscuro-texto2">Total de eventos</p>
          <h3 className="text-2xl font-bold text-claro-texto dark:text-oscuro-texto mt-1">{totalEventos}</h3>
        </div>
        <div className="bg-claro-tarjeta dark:bg-oscuro-tarjeta p-4 rounded-2xl border border-claro-borde dark:border-oscuro-borde shadow-sm">
          <p className="text-xs font-medium text-claro-texto2 dark:text-oscuro-texto2">Programados</p>
          <h3 className="text-2xl font-bold text-[#245743] dark:text-[#DCEFE5] mt-1">{programados}</h3>
        </div>
        <div className="bg-claro-tarjeta dark:bg-oscuro-tarjeta p-4 rounded-2xl border border-claro-borde dark:border-oscuro-borde shadow-sm">
          <p className="text-xs font-medium text-claro-texto2 dark:text-oscuro-texto2">Finalizados</p>
          <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{finalizados}</h3>
        </div>
        <div className="bg-claro-tarjeta dark:bg-oscuro-tarjeta p-4 rounded-2xl border border-claro-borde dark:border-oscuro-borde shadow-sm">
          <p className="text-xs font-medium text-claro-texto2 dark:text-oscuro-texto2">Cancelados</p>
          <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{cancelados}</h3>
        </div>
      </div>

      {/* Sección de Filtros */}
      <div className="bg-claro-tarjeta dark:bg-oscuro-tarjeta p-5 rounded-2xl border border-claro-borde dark:border-oscuro-borde shadow-sm transition-colors">
        <h2 className="text-lg font-bold text-claro-texto dark:text-oscuro-texto mb-4">
          Filtros
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-claro-texto2 dark:text-oscuro-texto2 mb-1">
              Estado
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-claro-borde dark:border-oscuro-borde bg-claro-tarjeta dark:bg-oscuro-tarjeta text-claro-texto dark:text-oscuro-texto focus:outline-none focus:ring-2 focus:ring-[#2E6B52]"
            >
              <option value="todos">Todos los estados</option>
              <option value="programado">Programado</option>
              <option value="finalizado">Finalizado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-claro-texto2 dark:text-oscuro-texto2 mb-1">
              Tipo de Evento
            </label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-claro-borde dark:border-oscuro-borde bg-claro-tarjeta dark:bg-oscuro-tarjeta text-claro-texto dark:text-oscuro-texto focus:outline-none focus:ring-2 focus:ring-[#2E6B52]"
            >
              <option value="todos">Todos los tipos</option>
              {tiposDisponibles.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-claro-texto2 dark:text-oscuro-texto2 mb-1">
              Buscar
            </label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, servicios o cancha..."
              className="w-full px-3 py-2 rounded-lg border border-claro-borde dark:border-oscuro-borde bg-claro-tarjeta dark:bg-oscuro-tarjeta text-claro-texto dark:text-oscuro-texto placeholder-claro-texto2 focus:outline-none focus:ring-2 focus:ring-[#2E6B52]"
            />
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={obtenerReporteData}
            disabled={cargando}
            className="px-5 py-2 rounded-lg bg-[#245743] text-white font-medium hover:bg-[#1D4635] transition shadow-sm disabled:opacity-60"
          >
            {cargando ? "Actualizando..." : "Aplicar filtros"}
          </button>
        </div>
      </div>

      {/* Gráfica de Ingresos por Servicios */}
      <div className="bg-claro-tarjeta dark:bg-oscuro-tarjeta p-5 rounded-2xl border border-claro-borde dark:border-oscuro-borde shadow-sm transition-colors">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h3 className="text-base font-bold text-claro-texto dark:text-oscuro-texto">
              Ingresos por Servicios
            </h3>
            <p className="text-xs font-medium text-claro-texto2 dark:text-oscuro-texto2">
              Monto recaudado por tipo de servicio contratado
            </p>
          </div>
          <div className="bg-[#E4F0EA] dark:bg-[#173F30] px-3 py-1.5 rounded-xl">
            <span className="text-xs text-[#245743] dark:text-[#DCEFE5] font-bold">
              Total: Bs. {totalIngresos.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="h-72 w-full max-w-lg mx-auto relative">
          {ingresosServicios.length > 0 ? (
            <ResponsivePie
              data={ingresosServicios}
              colors={["#245743", "#D97706", "#2563EB", "#DC2626", "#4B5563"]}
              margin={{ top: 30, right: 90, bottom: 30, left: 90 }}
              innerRadius={0.65}
              padAngle={2}
              cornerRadius={5}
              activeOuterRadiusOffset={6}
              borderWidth={1}
              borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
              enableArcLinkLabels={true}
              arcLinkLabel={(d) => `${d.id}`}
              arcLabelsSkipAngle={10}
              arcLabelsTextColor="#ffffff"
              valueFormat={(value) => `${value} Bs.`}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-claro-texto2 dark:text-oscuro-texto2 font-medium">
                Sin registros de ingresos por servicios
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Botones de Exportación */}
      <div className="flex gap-3">
        <button
          onClick={exportarExcel}
          disabled={eventosFiltrados.length === 0}
          className="px-4 py-2 rounded-lg bg-[#2E6B52] text-white font-medium hover:bg-[#245743] transition shadow-sm disabled:opacity-50"
        >
          Exportar Excel
        </button>

        <button
          onClick={exportarPDF}
          disabled={eventosFiltrados.length === 0}
          className="px-4 py-2 rounded-lg bg-[#173F30] text-white font-medium hover:bg-[#102C21] transition shadow-sm disabled:opacity-50"
        >
          Exportar PDF
        </button>
      </div>

      {/* Tabla de Resultados */}
      <div className="bg-claro-tarjeta dark:bg-oscuro-tarjeta p-5 rounded-2xl border border-claro-borde dark:border-oscuro-borde shadow-sm transition-colors">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold text-claro-texto dark:text-oscuro-texto">
              Lista de Eventos
            </h2>
            <p className="text-sm text-claro-texto2 dark:text-oscuro-texto2">
              Total: {eventosFiltrados.length} eventos encontrados
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-claro-borde dark:border-oscuro-borde">
                <th className="text-left py-3 px-3 text-claro-texto2 dark:text-oscuro-texto2 font-semibold">Evento</th>
                <th className="text-left py-3 px-3 text-claro-texto2 dark:text-oscuro-texto2 font-semibold">Tipo</th>
                <th className="text-left py-3 px-3 text-claro-texto2 dark:text-oscuro-texto2 font-semibold">Fecha</th>
                <th className="text-left py-3 px-3 text-claro-texto2 dark:text-oscuro-texto2 font-semibold">Horario</th>
                <th className="text-left py-3 px-3 text-claro-texto2 dark:text-oscuro-texto2 font-semibold">Canchas</th>
                <th className="text-left py-3 px-3 text-claro-texto2 dark:text-oscuro-texto2 font-semibold">Servicios</th>
                <th className="text-left py-3 px-3 text-claro-texto2 dark:text-oscuro-texto2 font-semibold">Cupo</th>
                <th className="text-left py-3 px-3 text-claro-texto2 dark:text-oscuro-texto2 font-semibold">Estado</th>
              </tr>
            </thead>

            <tbody>
              {eventosFiltrados.length > 0 ? (
                eventosFiltrados.map((item) => (
                  <tr
                    key={item.id_evento}
                    className="border-b border-claro-borde dark:border-oscuro-borde hover:bg-claro-fondo dark:hover:bg-oscuro-fondo/50 transition-colors"
                  >
                    <td className="py-3 px-3 text-claro-texto dark:text-oscuro-texto font-semibold">
                      {item.nombre_evento}
                    </td>
                    <td className="py-3 px-3 text-claro-texto2 dark:text-oscuro-texto2 capitalize">
                      {item.tipo_evento || "—"}
                    </td>
                    <td className="py-3 px-3 text-claro-texto2 dark:text-oscuro-texto2">
                      {item.fecha_evento}
                    </td>
                    <td className="py-3 px-3 text-claro-texto2 dark:text-oscuro-texto2">
                      {item.hora_inicio} - {item.hora_fin}
                    </td>
                    <td className="py-3 px-3 text-claro-texto2 dark:text-oscuro-texto2">
                      {item.canchas || "—"}
                    </td>
                    <td className="py-3 px-3 text-claro-texto2 dark:text-oscuro-texto2">
                      {item.servicios || "—"}
                    </td>
                    <td className="py-3 px-3 text-claro-texto2 dark:text-oscuro-texto2">
                      {item.cupo_maximo ? `${item.cupo_maximo} pers.` : "—"}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={
                          item.estado?.toLowerCase() === "programado"
                            ? "inline-flex px-2.5 py-1 rounded-full bg-[#E4F0EA] dark:bg-[#173F30] text-[#245743] dark:text-[#DCEFE5] font-medium"
                            : item.estado?.toLowerCase() === "finalizado"
                            ? "inline-flex px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-medium"
                            : "inline-flex px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 font-medium"
                        }
                      >
                        {item.estado}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-claro-texto2 dark:text-oscuro-texto2">
                    No se encontraron eventos con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReporteEventosServicios;