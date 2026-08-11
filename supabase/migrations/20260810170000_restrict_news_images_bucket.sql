-- supabase/migrations/20260810170000_restrict_news_images_bucket.sql

update storage.buckets
set
  file_size_limit = 5242880, -- 5MB، نفس الحد الموجود بالفرونت (MAX_IMAGE_MB)
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'news-images';