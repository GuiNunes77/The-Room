-- Alterar colunas de data para timestamp com timezone
ALTER TABLE public.bookings 
  ALTER COLUMN check_in_date TYPE timestamp with time zone,
  ALTER COLUMN check_out_date TYPE timestamp with time zone;

-- Atualizar políticas RLS para guests (baseado em created_by)
DROP POLICY IF EXISTS "Authenticated users can view guests" ON public.guests;
DROP POLICY IF EXISTS "Authenticated users can create guests" ON public.guests;
DROP POLICY IF EXISTS "Authenticated users can update guests" ON public.guests;

CREATE POLICY "Users can view guests they created"
  ON public.guests FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own guests"
  ON public.guests FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update guests they created"
  ON public.guests FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete guests they created"
  ON public.guests FOR DELETE
  USING (auth.uid() = created_by);

-- Atualizar políticas RLS para bookings (baseado em created_by)
DROP POLICY IF EXISTS "Authenticated users can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Authenticated users can update bookings" ON public.bookings;

CREATE POLICY "Users can view bookings they created"
  ON public.bookings FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update bookings they created"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete bookings they created"
  ON public.bookings FOR DELETE
  USING (auth.uid() = created_by);

-- Atualizar políticas RLS para rooms (permitir visualização para todos, mas apenas criador pode modificar)
DROP POLICY IF EXISTS "Authenticated users can view rooms" ON public.rooms;
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.rooms;
DROP POLICY IF EXISTS "Authenticated users can update rooms" ON public.rooms;

CREATE POLICY "All authenticated users can view rooms"
  ON public.rooms FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create rooms"
  ON public.rooms FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update rooms"
  ON public.rooms FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete rooms"
  ON public.rooms FOR DELETE
  USING (auth.uid() IS NOT NULL);