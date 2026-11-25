alter table public.scene_reports
  drop constraint scene_reports_category_check,
  add constraint scene_reports_category_check check (
    category in ('impersonation', 'spam', 'harassment', 'underage', 'other', 'insult', 'inappropriate_photo', 'fraud')
  );
