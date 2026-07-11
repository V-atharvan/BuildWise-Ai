import { redirect } from 'next/navigation'

// Root "/" redirects: authenticated users go to dashboard, others to login
export default function RootPage() {
  redirect('/login')
}
