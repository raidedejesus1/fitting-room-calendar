CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL,
  appointment_date date NOT NULL,
  appointment_time text NOT NULL,
  client_name text NOT NULL CHECK (char_length(client_name) BETWEEN 2 AND 100),
  client_phone text NOT NULL CHECK (char_length(client_phone) BETWEEN 6 AND 30),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_date, appointment_time)
);
GRANT INSERT ON public.appointments TO anon, authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can book" ON public.appointments FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.get_taken_slots(_date date)
RETURNS SETOF text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT appointment_time FROM public.appointments WHERE appointment_date = _date;
$$;
GRANT EXECUTE ON FUNCTION public.get_taken_slots(date) TO anon, authenticated;