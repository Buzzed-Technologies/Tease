const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to inject environment variables into HTML files
app.use((req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(body) {
    // Only process HTML responses
    if (typeof body === 'string' && this.getHeader('content-type')?.includes('text/html')) {
      // Replace placeholders with environment variables
      body = body.replace(/%SUPABASE_ANON_KEY%/g, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
      
      // Log for debugging
      console.log(`Injected env vars into ${req.path}`);
    }
    
    return originalSend.call(this, body);
  };
  
  next();
});

// Serve static files from public directory
app.use(express.static('public', {
  extensions: ['html'],
  setHeaders: (res, filePath) => {
    if (path.extname(filePath) === '.html') {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

// Handle HTML page requests
app.get('/:page', (req, res) => {
  const page = req.params.page;
  const htmlFile = path.join(__dirname, 'public', `${page}.html`);
  
  // Check if file exists
  if (fs.existsSync(htmlFile)) {
    let htmlContent = fs.readFileSync(htmlFile, 'utf8');
    
    // Replace placeholders with environment variables
    htmlContent = htmlContent.replace(/%SUPABASE_ANON_KEY%/g, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
    
    res.send(htmlContent);
  } else {
    // Fallback to index.html for non-existent pages (SPA behavior)
    res.redirect('/');
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Supabase key available: ${!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`);
}); 