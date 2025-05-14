import { ImageResponse } from '@vercel/og';
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

const supabaseUrl = 'https://kigcecwfxlonrdxjwsza.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req) {
  const { pathname } = new URL(req.url);
  const modelId = pathname.split('/').pop();

  if (!modelId) {
    return new Response('Missing modelId', { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: model, error } = await supabase
    .from('models')
    .select('*')
    .eq('id', modelId)
    .single();

  if (error || !model) {
    return new ImageResponse(
      <div style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f0e8 0%, #c6d2ff 100%)',
        fontFamily: "'Montserrat', 'Playfair Display', serif",
        color: '#333',
      }}>
        <div>
          <h1>ThreadPay</h1>
          <p>Creator not found</p>
        </div>
      </div>,
      { width: 1200, height: 630 }
    );
  }

  let imageUrl = '';
  if (model.pictures && model.pictures.length > 0) {
    imageUrl = `https://kigcecwfxlonrdxjwsza.supabase.co/storage/v1/object/public/model-images/${model.pictures[0]}`;
  }

  return new ImageResponse(
    <div style={{
      width: '1200px',
      height: '630px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f5f0e8 0%, #c6d2ff 100%)',
      fontFamily: "'Montserrat', 'Playfair Display', serif",
      color: '#333',
      position: 'relative',
    }}>
      {imageUrl && (
        <img
          src={imageUrl}
          alt={model.name}
          style={{
            width: 340,
            height: 440,
            borderRadius: 24,
            objectFit: 'cover',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            border: '6px solid #fff',
            marginRight: 48,
          }}
        />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div style={{
          fontSize: 56,
          fontWeight: 700,
          fontFamily: "'Playfair Display', serif",
          color: '#333',
          lineHeight: 1.1,
          marginBottom: 12,
        }}>
          {model.name}
        </div>
        <div style={{
          fontSize: 32,
          color: '#555',
          maxWidth: 500,
          marginBottom: 24,
        }}>
          {model.bio || 'Creator on ThreadPay'}
        </div>
        <div style={{
          background: '#C6D2FF',
          color: '#111',
          fontWeight: 700,
          fontSize: 36,
          borderRadius: 50,
          padding: '18px 48px',
          boxShadow: '0 4px 16px rgba(198,210,255,0.18)',
          fontFamily: "'Montserrat', sans-serif",
          marginTop: 12,
          display: 'inline-block',
        }}>
          Subscribe Now
        </div>
      </div>
      <div style={{
        position: 'absolute',
        top: 40,
        left: 60,
        fontSize: 48,
        fontWeight: 700,
        color: '#C6D2FF',
        fontFamily: "'Playfair Display', serif",
        textShadow: '0 2px 8px #fff',
      }}>
        ThreadPay
      </div>
      <div style={{
        position: 'absolute',
        bottom: 40,
        right: 60,
        fontSize: 28,
        color: '#C6D2FF',
        fontWeight: 600,
        fontFamily: "'Montserrat', sans-serif",
        opacity: 0.8,
      }}>
        secure creator payments
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
} 