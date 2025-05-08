import supabase from './supabase';
import bcrypt from 'bcryptjs';

/**
 * Register a new user
 * @param {string} name - User's name
 * @param {string} phone - User's phone number
 * @param {string} password - User's password
 * @param {string} persona - Selected persona
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function registerUser(name, phone, password, persona) {
  try {
    // Check if phone number already exists
    const { data: existingUser } = await supabase
      .from('sex_mode')
      .select('phone')
      .eq('phone', phone)
      .single();

    if (existingUser) {
      return { success: false, error: 'Phone number already registered' };
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert new user
    const { data, error } = await supabase
      .from('sex_mode')
      .insert([
        { 
          phone, 
          name, 
          password_hash: passwordHash, 
          persona,
          is_subscribed: false,
          created_at: new Date(),
        }
      ])
      .select();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: error.message || 'Failed to register user' };
  }
}

/**
 * Login a user
 * @param {string} phone - User's phone number
 * @param {string} password - User's password
 * @returns {Promise<{success: boolean, user?: any, error?: string}>}
 */
export async function loginUser(phone, password) {
  try {
    const { data: user, error } = await supabase
      .from('sex_mode')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error || !user) {
      return { success: false, error: 'Invalid login credentials' };
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return { success: false, error: 'Invalid login credentials' };
    }

    // Update last login date
    await supabase
      .from('sex_mode')
      .update({ last_login_date: new Date() })
      .eq('phone', phone);

    // Return user data without password hash
    const { password_hash, ...safeUserData } = user;
    
    return { success: true, user: safeUserData };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message || 'Failed to login' };
  }
}

/**
 * Get the current user profile
 * @param {string} phone - User's phone number
 * @returns {Promise<{success: boolean, user?: any, error?: string}>}
 */
export async function getUserProfile(phone) {
  try {
    const { data: user, error } = await supabase
      .from('sex_mode')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error) throw error;

    // Remove sensitive data
    const { password_hash, ...safeUserData } = user;
    
    return { success: true, user: safeUserData };
  } catch (error) {
    console.error('Get profile error:', error);
    return { success: false, error: error.message || 'Failed to get user profile' };
  }
}

/**
 * Update user profile
 * @param {string} phone - User's phone number
 * @param {object} updates - Fields to update
 * @returns {Promise<{success: boolean, user?: any, error?: string}>}
 */
export async function updateUserProfile(phone, updates) {
  try {
    // Don't allow updating phone number or password through this function
    const { phone: _, password, password_hash, ...safeUpdates } = updates;

    const { data, error } = await supabase
      .from('sex_mode')
      .update(safeUpdates)
      .eq('phone', phone)
      .select();

    if (error) throw error;

    return { success: true, user: data[0] };
  } catch (error) {
    console.error('Update profile error:', error);
    return { success: false, error: error.message || 'Failed to update profile' };
  }
}

/**
 * Change user password
 * @param {string} phone - User's phone number
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function changePassword(phone, currentPassword, newPassword) {
  try {
    // Verify current user and password
    const loginResult = await loginUser(phone, currentPassword);
    
    if (!loginResult.success) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    const { error } = await supabase
      .from('sex_mode')
      .update({ password_hash: passwordHash })
      .eq('phone', phone);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Change password error:', error);
    return { success: false, error: error.message || 'Failed to change password' };
  }
} 