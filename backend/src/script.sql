CREATE DATABASE IF NOT EXISTS control_parqueo_sol
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE control_parqueo_sol;

-- =============================================================================
-- TABLA 1: REGISTRO DE TICKETS DEL DÍA (Operativa - Se limpia tras el cierre)
-- =============================================================================
CREATE TABLE IF NOT EXISTS registro_tickets (
    id_registro INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Fecha de la jornada en que operó el parqueo (físico)
    fecha_operacion DATE NOT NULL,
    
    -- Número correlativo del talonario físico (ej. "160458")
    numero_ticket VARCHAR(20) NOT NULL UNIQUE,
    
    -- Tipo de vehículo marcado en el talonario
    tipo_vehiculo ENUM('CARRO', 'MOTO') NOT NULL,
    
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
    
    -- Cobro total calculado en Quetzales enteros
    costo INT NOT NULL,
    
    -- Banderas de casos especiales
    es_ticket_perdido BOOLEAN NOT NULL DEFAULT FALSE,
    aplica_tarifa_noche BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Auditoría de edición de horario (NULL al crear, obligatorio al editar)
    motivo_edicion TEXT NULL,
    
    -- Registro de auditoría de cuándo se digitó en el sistema (digital)
    fecha_captura TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Índices para optimizar la consulta del día y exportación a Excel
CREATE INDEX idx_tickets_fecha_operacion ON registro_tickets(fecha_operacion);
CREATE INDEX idx_tickets_numero ON registro_tickets(numero_ticket);


-- =============================================================================
-- TABLA 2: AUDITORÍA DE TICKETS ELIMINADOS
-- =============================================================================
CREATE TABLE IF NOT EXISTS auditoria_borrados (
    id_borrado INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Referencia al ID que tenía en la tabla principal antes de su remoción
    id_registro_original INT NOT NULL,
    
    -- Datos del ticket físico que fue anulado
    fecha_operacion DATE NOT NULL,
    numero_ticket VARCHAR(20) NOT NULL,
    tipo_vehiculo ENUM('CARRO', 'MOTO') NOT NULL,
    hora_entrada TIME NOT NULL,
    hora_salida TIME NOT NULL,
    minutos_estacionado INT NOT NULL,
    costo INT NOT NULL,
    es_ticket_perdido BOOLEAN NOT NULL DEFAULT FALSE,
    aplica_tarifa_noche BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Justificación obligatoria de la eliminación
    motivo_eliminacion TEXT NOT NULL,
    
    -- Fechas de trazabilidad
    fecha_captura_original TIMESTAMP NOT NULL,
    fecha_eliminacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_borrados_fecha_operacion ON auditoria_borrados(fecha_operacion);

-- =============================================================================
-- TABLA 3: HISTÓRICO PERMANENTE DE TICKETS REGISTRADOS (Copia de respaldo)
-- =============================================================================
CREATE TABLE IF NOT EXISTS auditoria_tickets_registrados (
    id_historico INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Referencia al ID que tuvo en la tabla diaria
    id_registro_original INT NOT NULL,
    
    fecha_operacion DATE NOT NULL,
    numero_ticket VARCHAR(20) NOT NULL,
    tipo_vehiculo ENUM('CARRO', 'MOTO') NOT NULL,
    hora_entrada TIME NOT NULL,
    hora_salida TIME NOT NULL,
    minutos_estacionado INT NOT NULL,
    costo INT NOT NULL,
    es_ticket_perdido BOOLEAN NOT NULL DEFAULT FALSE,
    aplica_tarifa_noche BOOLEAN NOT NULL DEFAULT FALSE,
    motivo_edicion TEXT NULL,
    
    -- Trazabilidad temporal completa
    fecha_captura TIMESTAMP NOT NULL,
    fecha_cierre_sistema TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_historico_fecha_operacion ON auditoria_tickets_registrados(fecha_operacion);
CREATE INDEX idx_historico_numero ON auditoria_tickets_registrados(numero_ticket);

-- =============================================================================
-- TABLA 4: CONFIGURACIÓN GLOBAL (Fase de Jornada y Versión)
-- =============================================================================
CREATE TABLE IF NOT EXISTS configuracion_jornada (
    id INT PRIMARY KEY,
    fase ENUM('REGISTRO', 'AUDITORIA') NOT NULL DEFAULT 'REGISTRO',
    version INT NOT NULL DEFAULT 1
) ENGINE=InnoDB;

-- Insertar el registro único de configuración inicial
INSERT IGNORE INTO configuracion_jornada (id, fase, version) VALUES (1, 'REGISTRO', 1);