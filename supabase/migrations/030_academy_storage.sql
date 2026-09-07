-- Storage bucket for chapter materials (PDFs/docs mom uploads), so chapter
-- material stops being a pasted URL and becomes a real upload.
-- Public bucket: files are readable by anyone with the link (same trust level
-- as a Zoom link already emailed/WhatsApp'd to enrolled students) but only the
-- owning user can write/delete under their own folder.

INSERT INTO storage.buckets (id, name, public)
VALUES ('academy-materials', 'academy-materials', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Academy materials are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'academy-materials');

CREATE POLICY "Users upload to their own academy-materials folder"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'academy-materials' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete from their own academy-materials folder"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'academy-materials' AND (storage.foldername(name))[1] = auth.uid()::text);
