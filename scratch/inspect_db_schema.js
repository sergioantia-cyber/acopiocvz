const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length === 2) {
    envVars[parts[0].trim()] = parts[1].trim();
  }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseAnonKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

async function run() {
  const restUrl = `${supabaseUrl}/rest/v1/`;
  try {
    const res = await fetch(restUrl, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    const schema = await res.json();
    console.log('Error Response:', schema);
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
