import { ImageResponse } from '@vercel/og';
import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

const supabaseUrl = 'https://kigcecwfxlonrdxjwsza.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req) {
  const { searchParams, pathname } = new URL(req.url);
  let modelId = searchParams.get('modelId');
  if (!modelId) {
    const match = pathname.match(/social-card\/([^/]+)/);
    if (match) modelId = match[1];
  }
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
    // Show a fallback card for unknown models
    return new ImageResponse(
      <div style={{
        width: '1200px', height: '630px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f0e8 0%, #c6d2ff 100%)', fontFamily: "'Montserrat', 'Playfair Display', serif"
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 60, fontWeight: 700, color: '#C6D2FF', marginBottom: 40 }}>ThreadPay</div>
          <div style={{ fontSize: 48, color: '#333', marginBottom: 20 }}>Model Not Found</div>
          <div style={{ fontSize: 32, color: '#555' }}>This invite link is invalid or expired.</div>
        </div>
      </div>,
      { width: 1200, height: 630 }
    );
  }

  let imageUrl = '';
  if (model.pictures && Array.isArray(model.pictures) && model.pictures.length > 0) {
    imageUrl = `https://kigcecwfxlonrdxjwsza.supabase.co/storage/v1/object/public/model-images/${model.pictures[0]}`;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f5f0e8 0%, #c6d2ff 100%)',
          fontFamily: "'Montserrat', 'Playfair Display', serif",
          color: '#333',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 40,
            left: 60,
            fontSize: 48,
            fontWeight: 700,
            color: '#C6D2FF',
            fontFamily: "'Playfair Display', serif",
            textShadow: '0 2px 8px #fff',
          }}
        >
          ThreadPay
        </div>
        <div
          style={{
            marginTop: 80,
            display: 'flex',
            alignItems: 'center',
            gap: 48,
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={model.name}
              style={{
                width: 320,
                height: 420,
                borderRadius: 24,
                objectFit: 'cover',
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                border: '6px solid #fff',
              }}
            />
          ) : (
            <div
              style={{
                width: 320,
                height: 420,
                borderRadius: 24,
                background: '#ccc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 48,
                fontWeight: 700,
              }}
            >
              No Image
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div
              style={{
                fontSize: 56,
                fontWeight: 700,
                fontFamily: "'Playfair Display', serif",
                color: '#333',
                lineHeight: 1.1,
                marginBottom: 12,
              }}
            >
              {model.name}
            </div>
            <div
              style={{
                fontSize: 32,
                color: '#555',
                maxWidth: 500,
                marginBottom: 24,
              }}
            >
              {model.bio || 'Creator on ThreadPay'}
            </div>
            <div
              style={{
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
              }}
            >
              Subscribe Now
            </div>
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            right: 60,
            fontSize: 28,
            color: '#C6D2FF',
            fontWeight: 600,
            fontFamily: "'Montserrat', sans-serif",
            opacity: 0.8,
          }}
        >
          secure creator payments
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
} 