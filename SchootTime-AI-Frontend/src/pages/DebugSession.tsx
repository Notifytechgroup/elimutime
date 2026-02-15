import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DebugSession() {
    const [data, setData] = useState<any>({});
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        const result: any = {};

        try {
            // 1. Get User
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            result.user = user || "No User";
            result.userError = userError;

            if (user) {
                // 2. Get User Roles
                const { data: roles, error: rolesError } = await supabase
                    .from('user_roles')
                    .select('*')
                    .eq('user_id', user.id);
                result.userRoles = roles;
                result.rolesError = rolesError;

                // 3. Get Profiles
                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id);
                result.profiles = profiles;
                result.profilesError = profilesError;

                // 4. Check Schools (if we found a school_id)
                const roleData = roles as any[];
                if (roleData && roleData[0]?.school_id) {
                    const { data: school, error: schoolError } = await supabase
                        .from('schools')
                        .select('*')
                        .eq('id', roleData[0].school_id);
                    result.schoolFromRole = school;
                    result.schoolError = schoolError;
                }
            }
        } catch (e: any) {
            result.exception = e.message;
        } finally {
            setData(result);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-4">
            <h1 className="text-3xl font-bold">Session Debugger</h1>
            <Button onClick={fetchData} disabled={loading}>{loading ? 'Refreshing...' : 'Refresh Data'}</Button>

            <div className="grid grid-cols-1 gap-4">
                <Card className="p-4 bg-slate-50 dark:bg-slate-900 font-mono text-sm overflow-auto">
                    <h3 className="font-bold text-lg mb-2 text-blue-600">User Auth</h3>
                    <pre>{JSON.stringify({ user: data.user, error: data.userError }, null, 2)}</pre>
                </Card>

                <Card className="p-4 bg-slate-50 dark:bg-slate-900 font-mono text-sm overflow-auto">
                    <h3 className="font-bold text-lg mb-2 text-green-600">User Roles Table (Should contain School ID)</h3>
                    <pre>{JSON.stringify({ roles: data.userRoles, error: data.rolesError }, null, 2)}</pre>
                    {data.userRoles?.length === 0 && (
                        <div className="text-red-500 font-bold mt-2">
                            CRITICAL: No Role found for this user! This is why "School ID is missing".
                        </div>
                    )}
                </Card>

                <Card className="p-4 bg-slate-50 dark:bg-slate-900 font-mono text-sm overflow-auto">
                    <h3 className="font-bold text-lg mb-2 text-purple-600">Profiles Table</h3>
                    <pre>{JSON.stringify({ profiles: data.profiles, error: data.profilesError }, null, 2)}</pre>
                </Card>
            </div>
        </div>
    );
}
