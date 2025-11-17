import { currentUser } from '@clerk/nextjs'
import { redirect } from 'next/navigation'

export default async function Home() {
  const user = await currentUser()

  if (!user) {
    // Redirigir a la página de selección de tipo de usuario
    redirect('/auth/select')
  } else {
    // Si ya está autenticado, redirigir al dashboard
    redirect('/dashboard')
  }
}
