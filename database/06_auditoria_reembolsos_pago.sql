CREATE TABLE IF NOT EXISTS pago_auditoria (
    id_auditoria SERIAL PRIMARY KEY,
    id_pago INTEGER NOT NULL REFERENCES pago(id_pago) ON DELETE CASCADE,
    id_usuario INTEGER REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    accion VARCHAR(30) NOT NULL,
    estado_anterior VARCHAR(30),
    estado_nuevo VARCHAR(30),
    monto NUMERIC(10,2),
    motivo TEXT,
    creado_en TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pago_auditoria_pago_fecha_idx
    ON pago_auditoria (id_pago, creado_en DESC);

CREATE TABLE IF NOT EXISTS pago_reembolso (
    id_reembolso SERIAL PRIMARY KEY,
    id_pago INTEGER NOT NULL REFERENCES pago(id_pago) ON DELETE RESTRICT,
    id_usuario INTEGER REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    monto NUMERIC(10,2) NOT NULL CHECK (monto > 0),
    motivo TEXT NOT NULL,
    referencia_externa VARCHAR(100),
    creado_en TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pago_reembolso_pago_fecha_idx
    ON pago_reembolso (id_pago, creado_en DESC);

INSERT INTO pago_auditoria (id_pago, accion, estado_anterior, estado_nuevo, creado_en)
SELECT p.id_pago, 'migracion_inicial', NULL, p.estado, p.fecha_pago
FROM pago p
WHERE NOT EXISTS (
    SELECT 1 FROM pago_auditoria a
    WHERE a.id_pago = p.id_pago AND a.accion = 'migracion_inicial'
);