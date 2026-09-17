import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon } from './Icon';

export function ProtectedRoute({ children }: { children: ReactNode }) {
    const { status } = useAuth();

    if (status === 'checking') {
        return (
            <div className="screen-center">
                <Icon name="spinner" className="spin" />
            </div>
        );
    }

    if (status === 'guest') {
        return <Navigate to="/sign-in" replace />;
    }

    return <>{children}</>;
}
