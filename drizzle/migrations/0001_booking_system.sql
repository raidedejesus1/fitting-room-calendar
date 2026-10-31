COMMENT ON TABLE public.appointments IS 'DEPRECATED: replaced by bookings';
DROP POLICY IF EXISTS "Anyone can book" ON public.appointments;
REVOKE ALL ON public.appointments FROM anon, authenticated;

CREATE TABLE public.services (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  duration_min int NOT NULL,
  sort int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.services TO anon, authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public services" ON public.services FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.services VALUES
 ('simple','Arreglo simple','Bastillas, botones, pequeños zurcidos.',20,1),
 ('ajuste','Ajuste de prenda completa','Entallar, achicar o agrandar un vestido, traje o saco.',40,2),
 ('medida','Confección a medida','Primera prueba de una prenda hecha para vos.',60,3);

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id text NOT NULL REFERENCES public.services(id),
  booking_date date NOT NULL,
  start_min int NOT NULL,
  duration_min int NOT NULL,
  client_name text NOT NULL,
  client_phone text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'confirmada',
  cancel_code text NOT NULL DEFAULT upper(substr(md5(random()::text),1,6)),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE TYPE public.app_role AS ENUM ('admin');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Admin read bookings" ON public.bookings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin update bookings" ON public.bookings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- First registered user becomes the workshop admin
CREATE OR REPLACE FUNCTION public.handle_first_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_first_admin AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_first_admin();

CREATE OR REPLACE FUNCTION public.get_busy(_date date)
RETURNS TABLE(start_min int, duration_min int) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT start_min, duration_min FROM public.bookings WHERE booking_date = _date AND status = 'confirmada';
$$;
GRANT EXECUTE ON FUNCTION public.get_busy(date) TO anon, authenticated;

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
  IF EXISTS (SELECT 1 FROM public.bookings b WHERE b.booking_date = _date AND b.status = 'confirmada'
             AND b.start_min < e AND _start < b.start_min + b.duration_min) THEN
    RAISE EXCEPTION 'Ese horario ya fue reservado'; END IF;
  INSERT INTO public.bookings(service_id, booking_date, start_min, duration_min, client_name, client_phone, notes)
  VALUES (_service, _date, _start, d, trim(_name), trim(_phone), nullif(trim(_notes),''))
  RETURNING cancel_code INTO code;
  RETURN code;
END $$;
GRANT EXECUTE ON FUNCTION public.book_appointment(text,date,int,text,text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.cancel_booking(_code text, _phone text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  UPDATE public.bookings SET status = 'cancelada'
  WHERE cancel_code = upper(trim(_code)) AND regexp_replace(client_phone,'\D','','g') = regexp_replace(_phone,'\D','','g')
    AND status = 'confirmada' AND booking_date >= current_date;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END $$;
GRANT EXECUTE ON FUNCTION public.cancel_booking(text,text) TO anon, authenticated;

-- Sample bookings on upcoming weekdays
INSERT INTO public.bookings(service_id, booking_date, start_min, duration_min, client_name, client_phone, notes, cancel_code)
SELECT s.svc, d.day, s.st, sv.duration_min, s.nm, s.ph, s.nt, s.cc
FROM (SELECT g::date AS day, row_number() OVER (ORDER BY g) AS rn
      FROM generate_series(current_date + 1, current_date + 14, interval '1 day') g
      WHERE extract(isodow FROM g) <= 5) d
JOIN (VALUES
 (1,'ajuste',560,'Lucía Fernández','11 5523-8841','Vestido de fiesta para casamiento, entallar cintura','LUC001'),
 (1,'simple',660,'Martín Gómez','11 4489-1202','Bastilla de pantalón de vestir','MAR002'),
 (1,'medida',840,'Carolina Ruiz','11 6021-7733','Primera prueba vestido de novia','CAR003'),
 (2,'simple',540,'Rosa Medina','11 5188-4410','Cambiar botones de tapado','ROS004'),
 (2,'ajuste',900,'Valentina Paz','11 3345-9087','Achicar traje sastre','VAL005'),
 (3,'medida',600,'Sofía Álvarez','11 4720-6615','Vestido de egresada, primera prueba','SOF006'),
 (3,'simple',960,'Jorge Benítez','11 5902-3348','Ruedo de jean','JOR007'),
 (4,'ajuste',700,'Ana Torres','11 6633-2290','Ajustar vestido de madrina','ANA008')
) AS s(rn,svc,st,nm,ph,nt,cc) ON s.rn = d.rn
JOIN public.services sv ON sv.id = s.svc;