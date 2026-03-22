
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            const isDevBypass = localStorage.getItem('dev_bypass') === 'true';
            if (isDevBypass && !session) {
                const devRole = localStorage.getItem('dev_role') || 'Admin';
                setSession(null);
                setUser({
                    id: 'dev-user',
                    email: 'dev@example.com',
                    user_metadata: { 
                        role: devRole, 
                        name: `Dev ${devRole}`,
                        full_name: `Dev ${devRole}` 
                    }
                } as any);
            } else {
                setSession(session);
                setUser(session?.user ?? null);
            }
            setLoading(false);
        };

        checkSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            const isDevBypass = localStorage.getItem('dev_bypass') === 'true';
            
            if (isDevBypass && !session) {
                const devRole = localStorage.getItem('dev_role') || 'Admin';
                setSession(null);
                setUser({
                    id: 'dev-user',
                    email: 'dev@example.com',
                    user_metadata: { role: devRole, full_name: `Dev ${devRole}` }
                } as any);
            } else {
                setSession(session);
                setUser(session?.user ?? null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const value = {
        session,
        user,
        loading,
        signOut
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
