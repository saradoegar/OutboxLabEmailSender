import type { AppProps } from 'next/app';
import { GoogleOAuthProvider } from '@react-oauth/google';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    '644429249211-dbfs7ul318qnniaft4p46nq4d5c1svon.apps.googleusercontent.com';

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <Component {...pageProps} />
    </GoogleOAuthProvider>
  );
}
