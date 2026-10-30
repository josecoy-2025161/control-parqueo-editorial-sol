import { Request, Response } from 'express';
import { ReporteService } from '../services/reporte.service.js';

export class ReporteController {
    public static async descargarExcel(_req: Request, res: Response): Promise<void> {
        try {
            const { buffer, nombreArchivo } = await ReporteService.generarExcelJornada();

            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="${nombreArchivo}"`
            );
            res.setHeader('Content-Length', buffer.length);

            res.status(200).send(buffer);
        } catch (error: any) {
            res.status(500).json({
                ok: false,
                mensaje: error.message || 'Error al generar el archivo Excel de la jornada.',
            });
        }
    }
}