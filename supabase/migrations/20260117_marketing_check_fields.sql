-- Migration: Adicionar campos de check e responsável na tabela marketing_items
-- Data: 2026-01-17

-- Adicionar novos campos
ALTER TABLE marketing_items 
  ADD COLUMN IF NOT EXISTS responsavel TEXT,
  ADD COLUMN IF NOT EXISTS horario_real_postagem TIME,
  ADD COLUMN IF NOT EXISTS check_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS horarios_postagem TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Comentários para documentação
COMMENT ON COLUMN marketing_items.responsavel IS 'Nome da pessoa responsável pela produção/postagem';
COMMENT ON COLUMN marketing_items.horario_real_postagem IS 'Horário real em que foi postado/programado';
COMMENT ON COLUMN marketing_items.check_timestamp IS 'Data e hora em que foi marcado como realizado';
COMMENT ON COLUMN marketing_items.horarios_postagem IS 'Array com os horários planejados de postagem (ex: ["09:00", "18:00"])';
