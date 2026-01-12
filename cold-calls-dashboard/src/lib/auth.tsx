'use client';

/**
 * Authentication Context and Provider
 * 
 * Handles user authentication with Appwrite and manages
 * the team_members collection for user profiles.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ID, AppwriteException, OAuthProvider } from 'appwrite';
import { account, databases, DATABASE_ID, TEAM_MEMBERS_COLLECTION_ID } from './appwrite';
import type { User, TeamMember, AuthState } from '@/types';

interface AuthContextType extends AuthState {
    login: (email: string, password: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>({
        user: null,
        teamMember: null,
        loading: true,
    });

    // Fetch or create team member record
    const fetchOrCreateTeamMember = useCallback(async (user: User): Promise<TeamMember | null> => {
        if (!DATABASE_ID || !TEAM_MEMBERS_COLLECTION_ID) {
            console.warn('Database or collection ID not configured');
            return null;
        }

        try {
            // Try to get existing team member
            const teamMember = await databases.getDocument(
                DATABASE_ID,
                TEAM_MEMBERS_COLLECTION_ID,
                user.$id
            );
            return teamMember as unknown as TeamMember;
        } catch (error) {
            if (error instanceof AppwriteException && error.code === 404) {
                // Create new team member record
                try {
                    const newTeamMember = await databases.createDocument(
                        DATABASE_ID,
                        TEAM_MEMBERS_COLLECTION_ID,
                        user.$id, // Use auth user ID as document ID
                        {
                            email: user.email,
                            name: user.name || user.email.split('@')[0] || 'Unknown User',
                            role: 'member',
                        }
                    );
                    return newTeamMember as unknown as TeamMember;
                } catch (createError) {
                    console.error('Failed to create team member. Check permissions:', createError);
                    return null;
                }
            }
            console.error('Failed to fetch team member:', error);
            return null;
        }
    }, []);

    // Check current session on mount
    const checkSession = useCallback(async () => {
        try {
            const session = await account.get();
            const user: User = {
                $id: session.$id,
                email: session.email,
                name: session.name,
            };

            const teamMember = await fetchOrCreateTeamMember(user);

            setState({
                user,
                teamMember,
                loading: false,
            });
        } catch {
            setState({
                user: null,
                teamMember: null,
                loading: false,
            });
        }
    }, [fetchOrCreateTeamMember]);

    useEffect(() => {
        checkSession();
    }, [checkSession]);

    const login = async (email: string, password: string) => {
        setState(prev => ({ ...prev, loading: true }));

        try {
            await account.createEmailPasswordSession(email, password);
            await checkSession();
        } catch (error) {
            setState(prev => ({ ...prev, loading: false }));
            throw error;
        }
    };

    const loginWithGoogle = async () => {
        try {
            account.createOAuth2Session(
                OAuthProvider.Google,
                window.location.origin + '/', // Success URL (redirect back to home)
                window.location.origin + '/login' // Failure URL (redirect back to login)
            );
        } catch (error) {
            console.error('OAuth initiation failed', error);
            throw error;
        }
    };

    const register = async (email: string, password: string, name: string) => {
        setState(prev => ({ ...prev, loading: true }));

        try {
            // Create the account
            await account.create(ID.unique(), email, password, name);

            // Log in immediately after registration
            await account.createEmailPasswordSession(email, password);
            await checkSession();
        } catch (error) {
            setState(prev => ({ ...prev, loading: false }));
            throw error;
        }
    };

    const logout = async () => {
        try {
            await account.deleteSession('current');
        } finally {
            setState({
                user: null,
                teamMember: null,
                loading: false,
            });
        }
    };

    const refreshUser = async () => {
        await checkSession();
    };

    return (
        <AuthContext.Provider
            value={{
                ...state,
                login,
                loginWithGoogle,
                register,
                logout,
                refreshUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
