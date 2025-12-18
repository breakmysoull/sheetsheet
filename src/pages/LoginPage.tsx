import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
      toast({ title: 'Login efetuado com sucesso' })
      navigate('/home')
    } catch (e: any) {
      let msg = e.message || 'Verifique suas credenciais'
      if (msg.includes('Email not confirmed')) {
        msg = 'E-mail não confirmado. Verifique sua caixa de entrada ou contate o suporte.'
      } else if (msg.includes('Invalid login credentials')) {
        msg = 'E-mail ou senha incorretos.'
      }
      toast({ title: 'Erro no login', description: msg, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">Cozzi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Input 
                placeholder="Email" 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && submit()}
              />
              <Input 
                placeholder="Senha" 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && submit()}
              />
            </div>
            <Button onClick={submit} disabled={loading} className="w-full">
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-4">
              Para criar uma conta, entre em contato com a administração.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default LoginPage
