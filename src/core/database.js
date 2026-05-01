require('dotenv').config();
const path = require('node:path');
const fs = require('node:fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const UPLOAD_DIR = path.join(ROOT_DIR, 'public', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in .env file');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = {
  ROOT_DIR,
  UPLOAD_DIR,
  supabase
};