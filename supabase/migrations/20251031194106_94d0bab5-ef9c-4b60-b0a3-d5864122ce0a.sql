-- Update rooms RLS policies to require admin role for modifications
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.rooms;
DROP POLICY IF EXISTS "Authenticated users can update rooms" ON public.rooms;
DROP POLICY IF EXISTS "Authenticated users can delete rooms" ON public.rooms;

-- Keep SELECT open for all authenticated users (needed for bookings)
-- This policy already exists and is correct

-- Restrict INSERT to admins only
CREATE POLICY "Only admins can create rooms"
  ON public.rooms FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Restrict UPDATE to admins only
CREATE POLICY "Only admins can update rooms"
  ON public.rooms FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Restrict DELETE to admins only
CREATE POLICY "Only admins can delete rooms"
  ON public.rooms FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));