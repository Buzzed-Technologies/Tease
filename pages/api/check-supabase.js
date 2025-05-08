import supabase from '../../lib/supabase';

export default async function handler(req, res) {
  try {
    console.log('Checking Supabase connectivity');
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not defined');
    console.log('Supabase Anon Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    // Check if we can connect to Supabase
    const { data, error } = await supabase
      .from('sex_mode')
      .select('count')
      .limit(1);
      
    if (error) {
      console.error('Error connecting to Supabase:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to connect to Supabase',
        error: error.message,
        details: error
      });
    }
    
    // Get list of tables to verify the table exists
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_tables');
      
    if (tablesError) {
      console.error('Error getting tables:', tablesError);
    }
    
    return res.status(200).json({
      success: true,
      message: 'Successfully connected to Supabase',
      data,
      tables: tables || 'Could not retrieve table list',
      envVars: {
        supabaseUrlDefined: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKeyDefined: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    });
  } catch (error) {
    console.error('Check Supabase error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking Supabase connectivity',
      error: error.message
    });
  }
} 