CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

ALTER POLICY "staff read" ON public.voice_sessions USING (public.is_staff(auth.uid()));
ALTER POLICY "staff read messages" ON public.dispute_messages USING (public.is_staff(auth.uid()));
ALTER POLICY "staff read" ON public.disputes USING (public.is_staff(auth.uid()));
ALTER POLICY "staff read" ON public.dispute_events USING (public.is_staff(auth.uid()));
ALTER POLICY "staff read" ON public.tool_executions USING (public.is_staff(auth.uid()));
ALTER POLICY "staff read" ON public.customers USING (public.is_staff(auth.uid()));
ALTER POLICY "staff read" ON public.cards USING (public.is_staff(auth.uid()));
ALTER POLICY "staff read" ON public.transactions USING (public.is_staff(auth.uid()));
ALTER POLICY "staff read" ON public.workflows USING (public.is_staff(auth.uid()));
ALTER POLICY "staff read versions" ON public.agent_versions USING (public.is_staff(auth.uid()));
ALTER POLICY "staff read" ON public.security_events USING (public.is_staff(auth.uid()));
ALTER POLICY "staff read" ON public.audit_logs USING (public.is_staff(auth.uid()));
ALTER POLICY "staff read ledger" ON public.ledger_entries USING (public.is_staff(auth.uid()));
ALTER POLICY "staff read" ON public.agents USING (public.is_staff(auth.uid()));
ALTER POLICY "staff read" ON public.tools USING (public.is_staff(auth.uid()));