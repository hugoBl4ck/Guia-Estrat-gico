-- GIROCERTO ERP - EXPANSÃO DE OWNERSHIP POR AUTH USER ID
-- Etapa 1: adiciona user_id nullable e FKs sem alterar as policies atuais.

ALTER TABLE public.caixas_buckets ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.faturamentos ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.ganhos ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.motoristas ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.turnos ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS user_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'caixas_buckets_user_id_fkey') THEN
    ALTER TABLE public.caixas_buckets ADD CONSTRAINT caixas_buckets_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'despesas_user_id_fkey') THEN
    ALTER TABLE public.despesas ADD CONSTRAINT despesas_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'faturamentos_user_id_fkey') THEN
    ALTER TABLE public.faturamentos ADD CONSTRAINT faturamentos_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ganhos_user_id_fkey') THEN
    ALTER TABLE public.ganhos ADD CONSTRAINT ganhos_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'motoristas_user_id_fkey') THEN
    ALTER TABLE public.motoristas ADD CONSTRAINT motoristas_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'turnos_user_id_fkey') THEN
    ALTER TABLE public.turnos ADD CONSTRAINT turnos_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'veiculos_user_id_fkey') THEN
    ALTER TABLE public.veiculos ADD CONSTRAINT veiculos_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) NOT VALID;
  END IF;
END $$;