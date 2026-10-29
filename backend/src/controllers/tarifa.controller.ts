import { Request, Response } from 'express';
import { TarifaValidator } from '../utils/tarifa-validator.util.js';
import { TarifaService } from '../services/tarifa.service.js';

export class TarifaController {
    public static calcular(req: Request, res: Response): void {
        try {
            const dto = TarifaValidator.validateCalcularTarifa(req.body);
            const resultado = TarifaService.procesarCalculo(dto);

            res.status(200).json({
                ok: true,
                data: resultado,
            });
        } catch (error: any) {
            res.status(400).json({
                ok: false,
                mensaje: error.message || 'Error al procesar el cálculo de tarifas.',
            });
        }
    }
}