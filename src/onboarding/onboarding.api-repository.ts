// ─── Onboarding API Repository ────────────────────────────────────────────────
// Calls POST /api/onboarding/complete on the real backend.

import { apiFetch } from '@/lib/api-client';
import i18n from '@/lib/i18n';
import type { IOnboardingRepository } from './onboarding.repository';
import type { OnboardingState, OnboardingSubmission } from './onboarding.types';

interface OnboardingCompleteResponse {
  agency: { id: string; name: string; slug: string };
  membership: { id: string; role: string };
  subscription: { status: string; trialEndsAt?: string | null };
  stripeCheckoutUrl: string | null;
}

class OnboardingApiRepository implements IOnboardingRepository {
  async getStatus(): Promise<OnboardingState> {
    // Status is derived from the auth session (memberships array).
    // Return a default "not started" state — the hook drives the wizard.
    return {
      step: 'plan',
      selectedPlanId: null,
      agency: { name: '', county: '', district: '' },
      completed: false,
    };
  }

  async complete(submission: OnboardingSubmission): Promise<{ redirectedToStripe: boolean }> {
    const response = await apiFetch<OnboardingCompleteResponse>(
      '/onboarding/complete',
      {
        method: 'POST',
        body: JSON.stringify({
          planId: submission.backendPlanId ?? submission.planId,
          agencyName: submission.agency.name,
          county: submission.agency.county || undefined,
          district: submission.agency.district || undefined,
          country: submission.country || submission.agency.country || undefined,
          countryCode: submission.countryCode || submission.agency.countryCode || undefined,
          billingMarket: submission.billingMarket,
          billingCurrency: submission.billingCurrency,
          locale: i18n.language,
        }),
      },
    );

    // If Stripe checkout is needed, redirect the browser
    if (response.stripeCheckoutUrl) {
      window.location.href = response.stripeCheckoutUrl;
      return { redirectedToStripe: true, agencyId: response.agency.id };
    }

    return { redirectedToStripe: false, agencyId: response.agency.id };
  }
}

export const onboardingApiRepository: IOnboardingRepository = new OnboardingApiRepository();
