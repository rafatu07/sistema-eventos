'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { EventForm } from '@/components/EventForm';

export default function NovoEventoPage() {
  return (
    <ProtectedRoute requireAdmin={true}>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <EventForm />
        </div>
      </div>
    </ProtectedRoute>
  );
}

