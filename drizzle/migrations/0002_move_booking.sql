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
  IF EXISTS (SELECT 1 FROM public.bookings b WHERE b.id <> _id AND b.booking_date = _date AND b.status = 'confirmada'
             AND b.start_min < e AND _start < b.start_min + b.duration_min) THEN
    RAISE EXCEPTION 'Ese horario ya está ocupado'; END IF;
  UPDATE public.bookings SET booking_date = _date, start_min = _start WHERE id = _id;
END $$;
REVOKE EXECUTE ON FUNCTION public.move_booking(uuid,date,int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.move_booking(uuid,date,int) TO authenticated;