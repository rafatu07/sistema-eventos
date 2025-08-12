'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X, Calendar, Users, LogOut, User } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <nav className="bg-white shadow-lg border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-blue-600" />
              <span className="font-bold text-xl text-gray-900">
                Gestão de Eventos
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/dashboard"
              className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Dashboard
            </Link>
            
            {user.isAdmin && (
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <Users className="inline h-4 w-4 mr-1" />
                Admin
              </Link>
            )}

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Olá, {user.displayName || user.email}
              </span>
              
              {user.isAdmin && (
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                  Admin
                </span>
              )}

              <Link
                href="/perfil"
                className="text-gray-700 hover:text-blue-600 p-2 rounded-md transition-colors"
                title="Meu Perfil"
              >
                <User className="h-5 w-5" />
              </Link>

              <button
                onClick={handleSignOut}
                className="text-gray-700 hover:text-red-600 p-2 rounded-md transition-colors"
                title="Sair"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-700 hover:text-blue-600 p-2 rounded-md"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
            <Link
              href="/dashboard"
              className="text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </Link>

            {user.isAdmin && (
              <Link
                href="/dashboard"
                className="text-gray-700 hover:text-blue-600 block px-3 py-2 rounded-md text-base font-medium"
                onClick={() => setIsOpen(false)}
              >
                <Users className="inline h-4 w-4 mr-2" />
                Admin
              </Link>
            )}

            <div className="border-t pt-4 mt-4">
              <div className="px-3 py-2">
                <p className="text-sm text-gray-700">
                  {user.displayName || user.email}
                </p>
                {user.isAdmin && (
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded mt-1 inline-block">
                    Admin
                  </span>
                )}
              </div>
              
              <Link
                href="/perfil"
                className="text-gray-700 hover:text-blue-600 block w-full text-left px-3 py-2 rounded-md text-base font-medium"
                onClick={() => setIsOpen(false)}
              >
                <User className="inline h-4 w-4 mr-2" />
                Meu Perfil
              </Link>
              
              <button
                onClick={handleSignOut}
                className="text-red-600 hover:text-red-700 block w-full text-left px-3 py-2 rounded-md text-base font-medium"
              >
                <LogOut className="inline h-4 w-4 mr-2" />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

