-- GIROCERTO ERP - POLICIES EXPLICITAS POR AUTH UID
-- Etapa 3: remove policies legadas e aplica SELECT/INSERT/UPDATE/DELETE.

REVOKE ALL ON public.caixas_buckets, public.despesas, public.faturamentos,
  public.ganhos, public.motoristas, public.turnos, public.veiculos FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.caixas_buckets, public.despesas,
  public.faturamentos, public.ganhos, public.motoristas, public.turnos, public.veiculos TO authenticated;

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('caixas_buckets', 'despesas', 'faturamentos', 'ganhos', 'motoristas', 'turnos', 'veiculos')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  END LOOP;
END $$;

CREATE POLICY caixas_buckets_select_own ON public.caixas_buckets FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY caixas_buckets_insert_own ON public.caixas_buckets FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY caixas_buckets_update_own ON public.caixas_buckets FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY caixas_buckets_delete_own ON public.caixas_buckets FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY despesas_select_own ON public.despesas FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY despesas_insert_own ON public.despesas FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY despesas_update_own ON public.despesas FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY despesas_delete_own ON public.despesas FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY faturamentos_select_own ON public.faturamentos FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY faturamentos_insert_own ON public.faturamentos FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY faturamentos_update_own ON public.faturamentos FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY faturamentos_delete_own ON public.faturamentos FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY ganhos_select_own ON public.ganhos FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY ganhos_insert_own ON public.ganhos FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY ganhos_update_own ON public.ganhos FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY ganhos_delete_own ON public.ganhos FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY motoristas_select_own ON public.motoristas FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY motoristas_insert_own ON public.motoristas FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY motoristas_update_own ON public.motoristas FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY motoristas_delete_own ON public.motoristas FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY turnos_select_own ON public.turnos FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY turnos_insert_own ON public.turnos FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY turnos_update_own ON public.turnos FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY turnos_delete_own ON public.turnos FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

CREATE POLICY veiculos_select_own ON public.veiculos FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
CREATE POLICY veiculos_insert_own ON public.veiculos FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY veiculos_update_own ON public.veiculos FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY veiculos_delete_own ON public.veiculos FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);