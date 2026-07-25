import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Test string vs int
res_str = supabase.table('resources').select('*').eq('subject_id', '1').execute()
print("STR QUERY:", res_str.data)

res_int = supabase.table('resources').select('*').eq('subject_id', 1).execute()
print("INT QUERY:", res_int.data)
