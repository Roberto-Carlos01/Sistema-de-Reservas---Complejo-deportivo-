import { useEffect, useMemo, useState } from "react";
import api from "../../../services/api";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";

interface Reserva {
    id_reserva: number;
    cancha: string;
    disciplina: string | null;
    hora_inicio: string;
    hora_fin: string;
    estado_reserva: string;
    monto: number | null;
    estado_pago: string | null;
}

const HistorialReservasCliente = () => {
    const [reservas, setReservas] = useState<Reserva[]>([]);
    const [cargando, setCargando] = useState<boolean>(true);
    const [error, setError] = useState<string>("");

    // Filtros
    const [canchaFiltro, setCanchaFiltro] = useState<string>("");
    const [disciplinaFiltro, setDisciplinaFiltro] = useState<string>("");
    const [estadoFiltro, setEstadoFiltro] = useState<string>("");
    const [pagoFiltro, setPagoFiltro] = useState<string>("");

    useEffect(() => {
        const obtenerReservas = async () => {
            try {
                setCargando(true);
                setError("");

                const response = await api.get(
                    "/reportes/historial-cliente"
                );

                setReservas(response.data.data);
            } catch (error) {
                console.error(
                    "Error al obtener historial de reservas:",
                    error
                );

                setError(
                    "No se pudo cargar el historial de reservas."
                );
            } finally {
                setCargando(false);
            }
        };

        obtenerReservas();
    }, []);


    const formatearEstado = (estado: string) => {
        return estado.charAt(0).toUpperCase() + estado.slice(1);
    };

    // Opciones únicas para los filtros
    const canchas = useMemo(() => {
        return [...new Set(reservas.map((reserva) => reserva.cancha))].sort();
    }, [reservas]);

    const disciplinas = useMemo(() => {
        return [
            ...new Set(
                reservas
                    .map((reserva) => reserva.disciplina)
                    .filter(Boolean) as string[]
            ),
        ].sort();
    }, [reservas]);

    const estados = useMemo(() => {
        return [...new Set(reservas.map((reserva) => reserva.estado_reserva))]
            .filter(Boolean)
            .sort();
    }, [reservas]);

    const estadosPago = useMemo(() => {
        return [
            ...new Set(
                reservas
                    .map((reserva) => reserva.estado_pago)
                    .filter(Boolean) as string[]
            ),
        ].sort();
    }, [reservas]);

    // Aplicar filtros
    const reservasFiltradas = useMemo(() => {
        return reservas.filter((reserva) => {
            const cumpleCancha =
                !canchaFiltro || reserva.cancha === canchaFiltro;

            const cumpleDisciplina =
                !disciplinaFiltro ||
                reserva.disciplina === disciplinaFiltro;

            const cumpleEstado =
                !estadoFiltro ||
                reserva.estado_reserva === estadoFiltro;

            const cumplePago =
                !pagoFiltro ||
                reserva.estado_pago === pagoFiltro;

            return (
                                cumpleCancha &&
                cumpleDisciplina &&
                cumpleEstado &&
                cumplePago
            );
        });
    }, [
        reservas,
        canchaFiltro,
        disciplinaFiltro,
        estadoFiltro,
        pagoFiltro,
    ]);

    const limpiarFiltros = () => {

        setCanchaFiltro("");
        setDisciplinaFiltro("");
        setEstadoFiltro("");
        setPagoFiltro("");
    };
    const exportarExcel = () => {
    const datos = reservasFiltradas.map((reserva) => ({
        "Cancha": reserva.cancha,
        "Disciplina": reserva.disciplina || "—",
        "Hora inicio": reserva.hora_inicio,
        "Hora fin": reserva.hora_fin,
        "Estado reserva": formatearEstado(reserva.estado_reserva),
        "Monto (Bs.)":
            reserva.monto !== null
                ? Number(reserva.monto).toFixed(2)
                : "Sin pago",
        "Estado pago": reserva.estado_pago
            ? formatearEstado(reserva.estado_pago)
            : "Sin pago",
    }));

    const hoja = XLSX.utils.json_to_sheet(datos);

    const libro = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        libro,
        hoja,
        "Mis Reservas"
    );

    XLSX.writeFile(
        libro,
        "historial-reservas.xlsx"
    );
};

const exportarPDF = () => {
    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
    });

    doc.setFontSize(18);
    doc.text("Historial de Reservas", 14, 18);

    doc.setFontSize(10);
    doc.text(
        `Total de reservas: ${reservasFiltradas.length}`,
        14,
        26
    );

    let y = 36;

    doc.setFontSize(9);

    // Encabezados
    doc.text("Cancha", 42, y);
    doc.text("Disciplina", 82, y);
    doc.text("Horario", 120, y);
    doc.text("Estado", 160, y);
    doc.text("Pago", 200, y);
    doc.text("Estado pago", 235, y);

    y += 7;

    reservasFiltradas.forEach((reserva) => {
        if (y > 190) {
            doc.addPage();
            y = 20;

            doc.setFontSize(9);

            doc.text("Cancha", 42, y);
            doc.text("Disciplina", 82, y);
            doc.text("Horario", 120, y);
            doc.text("Estado", 160, y);
            doc.text("Pago", 200, y);
            doc.text("Estado pago", 235, y);

            y += 6;
        }

                doc.text(
            reserva.cancha.substring(0, 22),
            42,
            y
        );

        doc.text(
            (reserva.disciplina || "—").substring(0, 18),
            82,
            y
        );

        doc.text(
            `${reserva.hora_inicio} - ${reserva.hora_fin}`,
            120,
            y
        );

        doc.text(
            formatearEstado(reserva.estado_reserva),
            160,
            y
        );

        doc.text(
            reserva.monto !== null
                ? `Bs. ${Number(reserva.monto).toFixed(2)}`
                : "Sin pago",
            200,
            y
        );

        doc.text(
            reserva.estado_pago
                ? formatearEstado(reserva.estado_pago)
                : "Sin pago",
            235,
            y
        );

        y += 6;
    });

    doc.save("historial-reservas.pdf");
};

    if (cargando) {
        return (
            <div className="flex justify-center items-center py-10">
                <p className="text-gray-600 dark:text-gray-300">
                    Cargando historial de reservas...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-100 text-red-700 p-4 rounded-lg">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                    Historial de Reservas
                </h2>

                <p className="text-gray-600 dark:text-gray-300 mt-1">
                    Consulta y filtra tus reservas de canchas.
                </p>
            </div>

            {/* Filtros */}
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg shadow p-5">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                    🔎 Filtrar reservas
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    
                    {/* Cancha */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Cancha
                        </label>

                        <select
                            value={canchaFiltro}
                            onChange={(e) =>
                                setCanchaFiltro(e.target.value)
                            }
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                        >
                            <option value="">Todas las canchas</option>

                            {canchas.map((cancha) => (
                                <option key={cancha} value={cancha}>
                                    {cancha}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Disciplina */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Disciplina
                        </label>

                        <select
                            value={disciplinaFiltro}
                            onChange={(e) =>
                                setDisciplinaFiltro(e.target.value)
                            }
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                        >
                            <option value="">Todas las disciplinas</option>

                            {disciplinas.map((disciplina) => (
                                <option
                                    key={disciplina}
                                    value={disciplina}
                                >
                                    {disciplina}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Estado de reserva */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Estado de reserva
                        </label>

                        <select
                            value={estadoFiltro}
                            onChange={(e) =>
                                setEstadoFiltro(e.target.value)
                            }
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                        >
                            <option value="">Todos los estados</option>

                            {estados.map((estado) => (
                                <option key={estado} value={estado}>
                                    {formatearEstado(estado)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Estado de pago */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Estado de pago
                        </label>

                        <select
                            value={pagoFiltro}
                            onChange={(e) =>
                                setPagoFiltro(e.target.value)
                            }
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                        >
                            <option value="">Todos los pagos</option>

                            {estadosPago.map((estado) => (
                                <option key={estado} value={estado}>
                                    {formatearEstado(estado)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-wrap justify-end gap-3 mt-5">
    <button
        onClick={limpiarFiltros}
        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition"
    >
        ↄ Limpiar filtros
    </button>

    <button
        onClick={exportarPDF}
        disabled={reservasFiltradas.length === 0}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition"
    >
        📄 PDF
    </button>

    <button
        onClick={exportarExcel}
        disabled={reservasFiltradas.length === 0}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition"
    >
        📊 Excel
    </button>
</div>
            </div>

            {/* Resultado */}
            {reservasFiltradas.length === 0 ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg shadow">
                    <p className="text-gray-600 dark:text-gray-300">
                        No se encontraron reservas con los filtros
                        seleccionados.
                    </p>
                </div>
            ) : (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg shadow">
                    <div className="px-5 py-4 border-b dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Mostrando{" "}
                            <strong>
                                {reservasFiltradas.length}
                            </strong>{" "}
                            de{" "}
                            <strong>{reservas.length}</strong>{" "}
                            reservas.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="border-b dark:border-gray-700">
                                    
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                                        Cancha
                                    </th>

                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                                        Disciplina
                                    </th>

                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                                        Horario
                                    </th>

                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                                        Estado
                                    </th>

                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">
                                        Pago
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {reservasFiltradas.map((reserva) => (
                                    <tr
                                        key={reserva.id_reserva}
                                        className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        
                                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-white">
                                            {reserva.cancha}
                                        </td>

                                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                            {reserva.disciplina || "—"}
                                        </td>

                                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                            {reserva.hora_inicio} -{" "}
                                            {reserva.hora_fin}
                                        </td>

                                        <td className="px-4 py-3">
                                            <span className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700">
                                                {formatearEstado(
                                                    reserva.estado_reserva
                                                )}
                                            </span>
                                        </td>

                                        <td className="px-4 py-3">
                                            {reserva.monto !== null ? (
                                                <div>
                                                    <p className="font-medium text-gray-800 dark:text-white">
                                                        Bs.{" "}
                                                        {Number(
                                                            reserva.monto
                                                        ).toFixed(2)}
                                                    </p>

                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        {reserva.estado_pago
                                                            ? formatearEstado(
                                                                  reserva.estado_pago
                                                              )
                                                            : "Sin estado"}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-gray-500 dark:text-gray-400">
                                                    Sin pago
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistorialReservasCliente;
