import { AuthProvider } from '../contexts/AuthContext';
import Head from 'next/head';
import '../public/styles/styles.css';

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Tease | AI Adult Companion Service</title>
      </Head>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp; 