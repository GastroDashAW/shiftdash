
-- Attach the handle_new_user trigger to auth.users
-- This ensures new signups automatically get a profile and role
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
