CREATE DATABASE IF NOT EXISTS control_parqueo
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE control_parqueo;

CREATE TABLE IF NOT EXISTS registro_tickets (
    id_registro INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Fecha de la jornada en que operó el parqueo
    fecha_operacion DATE NOT NULL,
    
    -- Número correlativo del talonario físico (ej. "160458")
    numero_ticket VARCHAR(20) NOT NULL UNIQUE,
    
    -- Tipo de vehículo marcado en el talonario
    tipo_vehiculo ENUM('CARRO', 'MOTO') NOT NULL,
    
    -- Placa guatemalteca (ej. P124KKK, M550BTR)
    placa VARCHAR(10) NOT NULL,
    
    -- Horas extraídas del talonario físico
    hora_entrada TIME NOT NULL,
    hora_salida TIME NOT NULL,
    
    -- Minutos calculados automáticamente (soporta si salió después de medianoche)
    minutos_estacionado INT GENERATED ALWAYS AS (
        CASE 
            WHEN hora_salida >= hora_entrada THEN TIMESTAMPDIFF(MINUTE, hora_entrada, hora_salida)
            ELSE TIMESTAMPDIFF(MINUTE, hora_entrada, ADDTIME(hora_salida, '24:00:00'))
        END
    ) STORED,
    
    -- Cobro total anotado en el ticket en Quetzales enteros
    costo INT NOT NULL,
    
    -- Banderas operativas
    es_ticket_perdido BOOLEAN NOT NULL DEFAULT FALSE,
    aplica_tarifa_noche BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Registro de auditoría de cuándo se digitó en el sistema
    fecha_captura TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Índices de alto rendimiento para el reporte diario en Excel y auditoría
CREATE INDEX idx_tickets_fecha_operacion ON registro_tickets(fecha_operacion);
CREATE INDEX idx_tickets_placa ON registro_tickets(placa);