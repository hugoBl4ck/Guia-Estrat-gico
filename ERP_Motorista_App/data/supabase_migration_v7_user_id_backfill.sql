-- GIROCERTO ERP - BACKFILL DE OWNERSHIP
-- Etapa 2: associa dados legados ao auth.users pelo email existente.
-- Os veículos não têm email no schema implantado; esta etapa exige exatamente
-- um usuário Auth, condição verificada antes da execução.

UPDATE public.caixas_buckets target
SET user_id = owner.id
FROM auth.users owner
WHERE target.user_id IS NULL
  AND lower(btrim(target.user_email)) = lower(btrim(owner.email));

UPDATE public.despesas target
SET user_id = owner.id
FROM auth.users owner
WHERE target.user_id IS NULL
  AND lower(btrim(target.user_email)) = lower(btrim(owner.email));

UPDATE public.faturamentos target
SET user_id = owner.id
FROM auth.users owner
WHERE target.user_id IS NULL
  AND lower(btrim(target.user_email)) = lower(btrim(owner.email));

UPDATE public.ganhos target
SET user_id = owner.id
FROM auth.users owner
WHERE target.user_id IS NULL
  AND lower(btrim(target.user_email)) = lower(btrim(owner.email));

UPDATE public.motoristas target
SET user_id = owner.id
FROM auth.users owner
WHERE target.user_id IS NULL
  AND lower(btrim(target.user_email)) = lower(btrim(owner.email));

UPDATE public.turnos target
SET user_id = owner.id
FROM auth.users owner
WHERE target.user_id IS NULL
  AND lower(btrim(target.user_email)) = lower(btrim(owner.email));

DO $$
DECLARE
  auth_user_count INTEGER;
BEGIN
  SELECT count(*) INTO auth_user_count FROM auth.users;
  IF auth_user_count <> 1 THEN
    RAISE EXCEPTION 'Backfill de veiculos abortado: esperado exatamente 1 usuario Auth, encontrado %', auth_user_count;
  END IF;
  UPDATE public.veiculos
  SET user_id = (SELECT id FROM auth.users)
  WHERE user_id IS NULL;
END $$;

DO $$
DECLARE
  missing_ownership TEXT;
BEGIN
  SELECT string_agg(table_name, ', ' ORDER BY table_name)
  INTO missing_ownership
  FROM (
    SELECT 'caixas_buckets' AS table_name WHERE EXISTS (SELECT 1 FROM public.caixas_buckets WHERE user_id IS NULL)
    UNION ALL SELECT 'despesas' WHERE EXISTS (SELECT 1 FROM public.despesas WHERE user_id IS NULL)
    UNION ALL SELECT 'faturamentos' WHERE EXISTS (SELECT 1 FROM public.faturamentos WHERE user_id IS NULL)
    UNION ALL SELECT 'ganhos' WHERE EXISTS (SELECT 1 FROM public.ganhos WHERE user_id IS NULL)
    UNION ALL SELECT 'motoristas' WHERE EXISTS (SELECT 1 FROM public.motoristas WHERE user_id IS NULL)
    UNION ALL SELECT 'turnos' WHERE EXISTS (SELECT 1 FROM public.turnos WHERE user_id IS NULL)
    UNION ALL SELECT 'veiculos' WHERE EXISTS (SELECT 1 FROM public.veiculos WHERE user_id IS NULL)
  ) missing;

  IF missing_ownership IS NOT NULL THEN
    RAISE EXCEPTION 'Backfill incompleto; user_id nulo em: %', missing_ownership;
  END IF;
END $$;

ALTER TABLE public.caixas_buckets ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.despesas ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.faturamentos ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.ganhos ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.motoristas ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.turnos ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.veiculos ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.caixas_buckets VALIDATE CONSTRAINT caixas_buckets_user_id_fkey;
ALTER TABLE public.despesas VALIDATE CONSTRAINT despesas_user_id_fkey;
ALTER TABLE public.faturamentos VALIDATE CONSTRAINT faturamentos_user_id_fkey;
ALTER TABLE public.ganhos VALIDATE CONSTRAINT ganhos_user_id_fkey;
ALTER TABLE public.motoristas VALIDATE CONSTRAINT motoristas_user_id_fkey;
ALTER TABLE public.turnos VALIDATE CONSTRAINT turnos_user_id_fkey;
ALTER TABLE public.veiculos VALIDATE CONSTRAINT veiculos_user_id_fkey;