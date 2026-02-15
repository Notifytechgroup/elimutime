import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function TestLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [logs, setLogs] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `${new Date().toISOString().split('T')[1]} - ${msg}`]);
        console.log(msg);
    };

    const handleLogin = async () => {
        setLoading(true);
        addLog(`Attempting login for ${email}...`);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                addLog(`ERROR: ${error.message}`);
                return;
            }

            addLog('Login successful!');
            addLog(`Session User ID: ${data.session?.user.id}`);
            addLog(`Access Token: ${data.session?.access_token.substring(0, 10)}...`);

        } catch (err: any) {
            addLog(`EXCEPTION: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <Card className="p-6 space-y-4">
                <h1 className="text-2xl font-bold">Minimal Login Test</h1>
                <div className="space-y-2">
                    <Input
                        placeholder="Email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                    <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    <Button onClick={handleLogin} disabled={loading}>
                        {loading ? 'Testing...' : 'Test Login'}
                    </Button>
                </div>

                <div className="bg-black text-green-400 p-4 rounded-md font-mono text-xs overflow-auto h-64">
                    {logs.map((log, i) => (
                        <div key={i}>{log}</div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
