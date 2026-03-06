import { notFound } from 'next/navigation';
import { getRegistrationById, getEvent } from '@/lib/firestore';
import type { Metadata } from 'next';

type Params = {
  registrationId: string;
};

type PageProps = {
  params: Params;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const registration = await getRegistrationById(params.registrationId);

  if (!registration) {
    return {
      title: 'Certificado não encontrado | Sistema de Eventos',
    };
  }

  const event = await getEvent(registration.eventId);

  return {
    title: `Certificado de ${registration.userName} | ${event?.name ?? 'Sistema de Eventos'}`,
  };
}

export default async function CertificateConfirmationPage({ params }: PageProps) {
  const { registrationId } = params;

  const registration = await getRegistrationById(registrationId);

  if (!registration || !registration.certificateGenerated) {
    notFound();
  }

  const event = await getEvent(registration.eventId);

  if (!event) {
    notFound();
  }

  const eventDateStr = event.date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const startTimeStr = event.startTime.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const endTimeStr = event.endTime.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-blue-100">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-10 text-center text-white">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
              <span className="text-3xl">✔</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">
              Certificado de Participação
            </h1>
            <p className="text-blue-100 text-sm">
              Confirmação pública de participação emitida pelo Sistema de Eventos
            </p>
          </div>

          <div className="px-8 py-8 space-y-6">
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Participante
              </h2>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {registration.userName}
              </p>
            </section>

            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Evento
              </h2>
              <p className="mt-1 text-base font-semibold text-gray-900">{event.name}</p>
              {event.description && (
                <p className="mt-1 text-sm text-gray-600">{event.description}</p>
              )}
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Data
                </h3>
                <p className="mt-1 text-sm text-gray-900">{eventDateStr}</p>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Horário
                </h3>
                <p className="mt-1 text-sm text-gray-900">
                  {startTimeStr} às {endTimeStr}
                </p>
              </div>
              <div className="sm:col-span-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Local
                </h3>
                <p className="mt-1 text-sm text-gray-900">{event.location}</p>
              </div>
            </section>

            <section className="border-t border-gray-100 pt-6">
              <p className="text-xs text-gray-500 leading-relaxed">
                Este registro confirma que <span className="font-semibold">{registration.userName}</span>{' '}
                participou do evento{' '}
                <span className="font-semibold">{event.name}</span> na data indicada acima.
                Esta página é acessível apenas para quem possui o link ou o QR Code
                impresso no certificado.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

