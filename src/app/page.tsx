import { redirect } from 'next/navigation';

/** Entry point — sends visitors into the admin shell dashboard. */
export default function Home() {
  redirect('/dashboard');
}
