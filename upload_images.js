const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Supabase credentials
const supabaseUrl = 'https://kigcecwfxlonrdxjwsza.supabase.co';
// Replace with your actual service role key from Supabase dashboard > Project Settings > API
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'your-service-key-here';
const supabase = createClient(supabaseUrl, supabaseKey);

// Temporary directory for images
const tempDir = path.join(__dirname, 'temp_images');

// Placeholder image URLs - replace with actual URLs if you have them
const placeholderImages = {
  lucy: [
    'https://source.unsplash.com/random/600x800?woman,portrait',
    'https://source.unsplash.com/random/600x800?woman,fashion',
    'https://source.unsplash.com/random/600x800?woman,model'
  ],
  aria: [
    'https://source.unsplash.com/random/600x800?woman,confident',
    'https://source.unsplash.com/random/600x800?woman,powerful',
    'https://source.unsplash.com/random/600x800?woman,strong'
  ],
  sophia: [
    'https://source.unsplash.com/random/600x800?woman,intellectual',
    'https://source.unsplash.com/random/600x800?woman,thoughtful',
    'https://source.unsplash.com/random/600x800?woman,elegant'
  ],
  emma: [
    'https://source.unsplash.com/random/600x800?woman,caring',
    'https://source.unsplash.com/random/600x800?woman,soft',
    'https://source.unsplash.com/random/600x800?woman,warm'
  ],
  zoe: [
    'https://source.unsplash.com/random/600x800?woman,creative',
    'https://source.unsplash.com/random/600x800?woman,quirky',
    'https://source.unsplash.com/random/600x800?woman,artistic'
  ]
};

// Create temp directory if it doesn't exist
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

async function downloadImage(url, filepath) {
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });
  
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);
    
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function uploadToSupabase(filepath, filename) {
  const fileBuffer = fs.readFileSync(filepath);
  
  const { data, error } = await supabase
    .storage
    .from('model-images')
    .upload(filename, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    });
  
  if (error) {
    console.error(`Error uploading ${filename}:`, error);
    return false;
  }
  
  console.log(`Successfully uploaded ${filename}`);
  return true;
}

async function processImages() {
  console.log('Starting to process images...');
  
  for (const [model, urls] of Object.entries(placeholderImages)) {
    console.log(`Processing images for ${model}...`);
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const filename = `${model}${i + 1}.jpg`;
      const filepath = path.join(tempDir, filename);
      
      try {
        console.log(`Downloading ${url} to ${filepath}...`);
        await downloadImage(url, filepath);
        
        console.log(`Uploading ${filename} to Supabase...`);
        await uploadToSupabase(filepath, filename);
      } catch (error) {
        console.error(`Error processing ${filename}:`, error);
      }
    }
  }
  
  console.log('All images processed!');
}

processImages()
  .then(() => console.log('Script completed successfully!'))
  .catch(err => console.error('Script failed:', err)); 