// Initialize Supabase client
const supabaseUrl = 'https://kigcecwfxlonrdxjwsza.supabase.co';
const supabaseKey = document.querySelector('meta[name="supabase-anon-key"]')?.getAttribute('content') || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpZ2NlY3dmeGxvbnJkeGp3c3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDk3OTE3MjAsImV4cCI6MjAyNTM2NzcyMH0.kw2nw7VW3QXTzWM7ynmm7Q2k7W4e5JKgf2i-k9K0Sns';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Extract model name from URL path
function getModelFromUrl() {
  // Check if we're in the invite URL pattern
  const path = window.location.pathname;
  const invitePattern = /\/invite\/([a-zA-Z0-9_-]+)/;
  const match = path.match(invitePattern);
  
  if (match && match[1]) {
    return match[1];
  }
  
  // Fallback to query parameter
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('model');
}

// Get model by name
async function getModelByName(modelName) {
  if (!modelName) return null;
  
  try {
    // Convert model name to capitalize first letter for consistency
    modelName = modelName.charAt(0).toUpperCase() + modelName.slice(1).toLowerCase();
    
    const { data, error } = await supabase
      .from('models')
      .select('*')
      .ilike('name', modelName)
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error getting model by name:', error);
    return null;
  }
}

// Update page with model information
function updatePageWithModel(model) {
  if (!model) return;
  
  // Update form's hidden model input
  const modelIdInput = document.getElementById('model-id');
  if (modelIdInput) {
    modelIdInput.value = model.id;
  }
  
  // Update model display name
  const modelNameElements = document.querySelectorAll('.model-name');
  modelNameElements.forEach(element => {
    element.textContent = model.name;
  });
  
  // Update model image
  const modelImageElements = document.querySelectorAll('.model-image');
  if (model.pictures && model.pictures.length > 0) {
    modelImageElements.forEach(element => {
      element.src = `/images/models/${model.pictures[0]}`;
      element.alt = `${model.name} - Creator Profile`;
    });
  }
  
  // Update model bio
  const modelBioElements = document.querySelectorAll('.model-bio');
  modelBioElements.forEach(element => {
    element.textContent = model.bio || 'Join this creator\'s platform for exclusive content and updates.';
  });
  
  // Update page title
  document.title = `Join ${model.name} | ThreadPay Secure Payment Platform`;
}

// Check for default model if none is specified
async function getDefaultModel() {
  try {
    const { data, error } = await supabase
      .from('models')
      .select('*')
      .limit(1)
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error getting default model:', error);
    return null;
  }
}

// Initialize invite page
async function initInvitePage() {
  try {
    // Check if user is already logged in
    const userData = JSON.parse(localStorage.getItem('threadpay_user') || '{}');
    if (userData.id) {
      // If user has subscription, go to dashboard
      if (userData.subscription_status) {
        window.location.href = '/dashboard.html';
        return;
      }
      
      // If user has no subscription, go to subscription page
      window.location.href = '/subscription.html';
      return;
    }
    
    // Get model from URL
    const modelParam = getModelFromUrl();
    let model;
    
    if (modelParam) {
      model = await getModelByName(modelParam);
    }
    
    // If no model found or no model parameter, use default
    if (!model) {
      model = await getDefaultModel();
    }
    
    // Update the page with model information
    if (model) {
      updatePageWithModel(model);
      
      // Show the content
      const loadingElement = document.getElementById('loading-content');
      const mainContent = document.getElementById('main-content');
      
      if (loadingElement) loadingElement.style.display = 'none';
      if (mainContent) mainContent.style.display = 'block';
    } else {
      // Show error if no model could be loaded
      const loadingElement = document.getElementById('loading-content');
      if (loadingElement) {
        loadingElement.innerHTML = `
          <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Sorry, we couldn't find the creator profile you're looking for.</p>
            <a href="/" class="action-button">Go to Homepage</a>
          </div>
        `;
      }
    }
  } catch (error) {
    console.error('Error initializing invite page:', error);
    
    // Show error message
    const loadingElement = document.getElementById('loading-content');
    if (loadingElement) {
      loadingElement.innerHTML = `
        <div class="error-message">
          <i class="fas fa-exclamation-triangle"></i>
          <p>An error occurred while loading. Please try again later.</p>
          <a href="/" class="action-button">Go to Homepage</a>
        </div>
      `;
    }
  }
}

// Export functions for use in other scripts
window.threadPayInvite = {
  getModelFromUrl,
  getModelByName,
  updatePageWithModel,
  initInvitePage
}; 