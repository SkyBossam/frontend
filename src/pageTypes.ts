import type { ComponentType } from 'react';
export interface PageRegistry {
    Welcome?: ComponentType;
    Auth?: ComponentType;
    ChildSetup?: ComponentType;
    AlertSetup?: ComponentType;
    Dashboard?: ComponentType<{
        onAlert: () => void;
    }>;
    Summary?: ComponentType;
    ChildManagement?: ComponentType;
    Routines?: ComponentType;
    CryList?: ComponentType;
    CryFlow?: ComponentType<{
        Page?: ComponentType;
    }>;
    CryDetail?: ComponentType;
    Recommendations?: ComponentType;
    ActionLog?: ComponentType;
    Response?: ComponentType;
    Complete?: ComponentType;
    Monitor?: ComponentType<{
        onAlert: () => void;
    }>;
    AlertModal?: ComponentType<{
        onClose: () => void;
    }>;
    Settings?: ComponentType;
}
