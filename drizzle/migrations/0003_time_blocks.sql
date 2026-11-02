CREATE TABLE public.time_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_date date NOT NULL,
  start_min int NOT NULL,
  duration_min int NOT NULL DEFAULT 20,
  reason text NOT NULL DEFAULT 'Reservado por el taller',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.time_blocks TO authenticated;
GRANT ALL ON public.time_blocks TO service_role;
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read blocks" ON public.time_blocks FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete blocks" ON public.time_blocks FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.slot_taken(_date date, _start int, _end int, _exclude uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.bookings b WHERE b.booking_date = _date AND b.status = 'confirmada'
                 AND (_exclude IS NULL OR b.id <> _exclude) AND b.start_min < _end AND _start < b.start_min + b.duration_min)
      OR EXISTS (SELECT 1 FROM public.time_blocks t WHERE t.block_date = _date
                 AND t.start_min < _end AND _start < t.start_min + t.duration_min);
$$;
REVOKE EXECUTE ON FUNCTION public.slot_taken(date,int,int,uuid) FROM anon, public;

CREATE OR REPLACE FUNCTION public.get_busy(_date date)
RETURNS TABLE(start_min int, duration_min int) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT start_min, duration_min FROM public.bookings WHERE booking_date = _date AND status = 'confirmada'
  UNION ALL
  SELECT start_min, duration_min FROM public.time_blocks WHERE block_date = _date;
$$;

CREATE OR REPLACE FUNCTION public.book_appointment(_service text, _date date, _start int, _name text, _phone text, _notes text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d int; code text; e int;
BEGIN
  SELECT duration_min INTO d FROM public.services WHERE id = _service;
  IF d IS NULL THEN RAISE EXCEPTION 'Arreglo inválido'; END IF;
  IF char_length(trim(coalesce(_name,''))) < 2 OR char_length(_name) > 100 THEN RAISE EXCEPTION 'Nombre inválido'; END IF;
  IF char_length(trim(coalesce(_phone,''))) < 6 OR char_length(_phone) > 30 THEN RAISE EXCEPTION 'Teléfono inválido'; END IF;
  IF _notes IS NOT NULL AND char_length(_notes) > 500 THEN RAISE EXCEPTION 'Notas demasiado largas'; END IF;
  IF _date < current_date OR extract(isodow FROM _date) > 5 THEN RAISE EXCEPTION 'Día no disponible'; END IF;
  e := _start + d;
  IF _start % 20 <> 0 OR NOT ((_start >= 540 AND e <= 780) OR (_start >= 840 AND e <= 1080)) THEN
    RAISE EXCEPTION 'Horario fuera de atención'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(_date::text));
  IF public.slot_taken(_date, _start, e, NULL) THEN RAISE EXCEPTION 'Ese horario ya fue reservado'; END IF;
  INSERT INTO public.bookings(service_id, booking_date, start_min, duration_min, client_name, client_phone, notes)
  VALUES (_service, _date, _start, d, trim(_name), trim(_phone), nullif(trim(_notes),''))
  RETURNING cancel_code INTO code;
  RETURN code;
END $$;

CREATE OR REPLACE FUNCTION public.move_booking(_id uuid, _date date, _start int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d int; e int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  SELECT duration_min INTO d FROM public.bookings WHERE id = _id AND status = 'confirmada';
  IF d IS NULL THEN RAISE EXCEPTION 'Turno no encontrado'; END IF;
  IF _date < current_date OR extract(isodow FROM _date) > 5 THEN RAISE EXCEPTION 'Día no disponible'; END IF;
  e := _start + d;
  IF _start % 20 <> 0 OR NOT ((_start >= 540 AND e <= 780) OR (_start >= 840 AND e <= 1080)) THEN
    RAISE EXCEPTION 'Horario fuera de atención'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(_date::text));
  IF public.slot_taken(_date, _start, e, _id) THEN RAISE EXCEPTION 'Ese horario ya está ocupado'; END IF;
  UPDATE public.bookings SET booking_date = _date, start_min = _start WHERE id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.add_block(_date date, _start int, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Sin permiso'; END IF;
  IF extract(isodow FROM _date) > 5 THEN RAISE EXCEPTION 'Día no disponible'; END IF;
  IF _start % 20 <> 0 OR NOT ((_start >= 540 AND _start < 780) OR (_start >= 840 AND _start < 1080)) THEN
    RAISE EXCEPTION 'Horario fuera de atención'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(_date::text));
  IF public.slot_taken(_date, _start, _start + 20, NULL) THEN RAISE EXCEPTION 'Esa franja ya está ocupada'; END IF;
  INSERT INTO public.time_blocks(block_date, start_min, reason)
  VALUES (_date, _start, coalesce(nullif(trim(left(_reason,100)),''),'Reservado por el taller'));
END $$;
REVOKE EXECUTE ON FUNCTION public.add_block(date,int,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.add_block(date,int,text) TO authenticated;

INSERT INTO public.time_blocks(block_date, start_min, reason)
SELECT g::date, 1020, 'Retiro de telas en la mercería'
FROM generate_series(current_date + 1, current_date + 7, interval '1 day') g
WHERE extract(isodow FROM g) = 3;