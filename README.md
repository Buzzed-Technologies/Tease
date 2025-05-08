# Tease - AI Adult Companion Service

A Next.js application for an AI adult companion service with user accounts, persona selection, and Stripe subscription integration.

## Features

- User account creation and management
- Multiple AI persona selection
- Subscription management via Stripe
- Supabase database integration
- Responsive design

## Tech Stack

- **Frontend**: Next.js, React
- **Backend**: Next.js API routes
- **Database**: Supabase
- **Payments**: Stripe
- **Authentication**: Custom auth with Supabase
- **Styling**: CSS-in-JS with styled-jsx

## Setup

### Prerequisites

- Node.js 14+ and npm
- Supabase account
- Stripe account

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Stripe configuration
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PRICE_ID=your-stripe-subscription-price-id
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key

# App configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Installation

1. Clone the repository
2. Install dependencies
   ```
   npm install
   ```
3. Run the development server
   ```
   npm run dev
   ```

## Database Setup

The application uses Supabase for the database. Make sure you have the following tables:

### sex_mode Table
- phone (primary key)
- name
- password_hash
- persona
- is_subscribed
- stripe_customer_id
- stripe_subscription_id
- subscription_status
- subscription_end_date
- last_login_date
- created_at
- style
- age
- horny_level

## Stripe Setup

1. Create a Stripe account
2. Set up a subscription product and price
3. Get your API keys from the Stripe dashboard
4. Set up a webhook endpoint that points to `/api/webhooks/stripe` in your application

## Deployment

This application is configured for deployment on Vercel.

1. Push your code to a GitHub repository
2. Connect the repository to Vercel
3. Configure the environment variables in the Vercel dashboard
4. Deploy

## License

This project is licensed under the MIT License. 