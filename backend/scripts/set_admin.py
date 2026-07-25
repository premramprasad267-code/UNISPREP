import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

email = input("Enter the email of the user to make admin: ")

try:
    # This requires the service role key to bypass RLS, or an RLS policy that allows this.
    # Alternatively, you can just do this in the Supabase Dashboard.
    res = supabase.table('users').update({'is_admin': True}).eq('email', email).execute()
    if res.data:
        print(f"Successfully made {email} an admin!")
    else:
        print(f"User {email} not found or update failed. (Make sure 'is_admin' column exists)")
except Exception as e:
    print(f"Error: {e}")
    print("If the error is about a missing column, please run this SQL in your Supabase Dashboard SQL Editor:")
    print("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;")
