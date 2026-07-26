-- Let owners remove their own saved spots from the "Your spots" space.
-- (Inserts still go only through the submit-places Edge Function.)
create policy "community_spots: delete own"
  on public.community_spots for delete
  using (submitted_by = auth.uid());
