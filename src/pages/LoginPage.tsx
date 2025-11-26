import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'

const LoginPage: React.FC = () => {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [mode, setMode] = React.useState<'login' | 'signup'>('login')

  const submit = async () => {
    try {
      setLoading(true)
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
      }
      toast({ title: 'Login efetuado' })
      navigate('/')
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
          <CardTitle>{mode === 'login' ? 'Entrar' : 'Criar conta'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <Input placeholder="Senha" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <Button onClick={submit} disabled={loading} className="w-full">{loading ? (mode === 'login' ? 'Entrando...' : 'Criando...') : (mode === 'login' ? 'Entrar' : 'Criar conta')}</Button>
          <Button variant="outline" disabled={loading} onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="w-full">{mode === 'login' ? 'Criar conta' : 'Voltar ao login'}</Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginPage
