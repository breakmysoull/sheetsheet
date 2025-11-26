import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'

const LoginPage: React.FC = () => {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const submit = async () => {
    try {
      setLoading(true)
      await signIn(email, password)
      toast({ title: 'Login efetuado' })
      navigate('/home')
    } catch (e: any) {
      toast({ title: 'Erro no login', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <Input placeholder="Senha" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <Button onClick={submit} disabled={loading} className="w-full">{loading ? 'Entrando...' : 'Entrar'}</Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginPage
