import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { MapPin, ArrowLeft, ChevronLeft, ChevronRight, X, ExternalLink, Loader2, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { getPublicPropertyByAgency, PropertyDto } from '@/lib/properties-api';
import { getPublicScreeningByAgency, PublicScreeningDto } from '@/lib/screening-api';
import { Property } from '@/lib/types';
import LeadForm from '@/components/property/LeadForm';
import heroVillaImg from '@/assets/hero-villa.jpg';

function toLeadProperty(dto: PropertyDto): Property {
  return {
    ...dto,
    agencySlug: dto.agencySlug,
    description: dto.description ?? '',
    price: dto.rentalPrice,
    availableSlots: [],
    criteria: {
      minIncome: dto.criteria.minIncome,
      maxPeople: dto.criteria.maxPeople,
      petsAllowed: dto.criteria.petsAllowed,
      advanceMonths: dto.criteria.advanceMonths,
      depositMonths: dto.criteria.depositMonths,
      guarantorRequired: dto.criteria.guarantorRequired,
      advanceWithoutGuarantor: dto.criteria.advanceWithoutGuarantor ?? undefined,
      depositWithoutGuarantor: dto.criteria.depositWithoutGuarantor ?? undefined,
    },
  };
}

const PropertyPage = () => {
  const { agencySlug, propertySlug } = useParams<{ agencySlug: string; propertySlug: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['public', 'properties', 'common']);
  const [property, setProperty] = useState<PropertyDto | null>(null);
  const [screeningConfig, setScreeningConfig] = useState<PublicScreeningDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!agencySlug || !propertySlug) return;
    setLoading(true);
    setNotFound(false);
    Promise.all([getPublicPropertyByAgency(agencySlug, propertySlug), getPublicScreeningByAgency(agencySlug, propertySlug)])
      .then(([prop, screening]) => { setProperty(prop); setScreeningConfig(screening); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [agencySlug, propertySlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold mb-2">{t('public:property.notFound')}</h1>
          <Link to="/" className="text-accent hover:underline text-sm">{t('public:property.backToHome')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b bg-card/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{t('public:property.back')}</span>
          </button>
          <div className="flex items-center gap-1">
            <span className="font-display text-lg font-700 tracking-tight">vyllad</span>
            <span className="text-accent text-lg">.</span>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-5xl">
        <div className="grid lg:grid-cols-[1fr,360px] gap-10">
          {/* Left column */}
          <div>
            {/* Image gallery */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`relative rounded-2xl overflow-hidden bg-muted mb-8 ${property.images && property.images.length > 0 ? 'aspect-[4/3]' : 'aspect-[16/5]'}`}
            >
              {property.images && property.images.length > 0 ? (
                <>
                  <img
                    src={property.images[currentImage]}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                  {property.images.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImage(i => i === 0 ? property.images!.length - 1 : i - 1)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors shadow-sm"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCurrentImage(i => i === property.images!.length - 1 ? 0 : i + 1)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors shadow-sm"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {property.images.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentImage(i)}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentImage ? 'w-4 bg-card' : 'bg-card/50'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <img src={heroVillaImg} alt={t('properties:detail.illustrative')} className="w-full h-full object-cover object-[center_40%]" />
                  <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <span className="font-display text-4xl md:text-5xl font-700 tracking-tight text-white/70 leading-none">vyllad</span>
                      <span className="font-display text-4xl md:text-5xl font-700 tracking-tight text-accent/80 leading-none">.</span>
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-4">
                    <span className="text-white/40 text-[10px] font-medium tracking-[0.18em] uppercase">{t('properties:detail.illustrative')}</span>
                  </div>
                </>
              )}

              {/* Reference badge */}
              {property.referenceId && (
                <div className="absolute top-3 left-3 bg-card/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-mono font-semibold">
                  {property.referenceId}
                </div>
              )}
            </motion.div>

            {/* Property info */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="flex items-start gap-3 mb-2">
                <h1 className="font-display text-2xl md:text-3xl font-700 tracking-tight flex-1">{property.title}</h1>
                {property.announcementLink && (
                  <a
                    href={property.announcementLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/50 text-xs font-medium transition-all group"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">{t('public:property.viewListing')}</span>
                  </a>
                )}
              </div>

              {(property.location || property.availableFrom) && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-muted-foreground mb-6">
                  {property.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-sm">{property.location}</span>
                    </div>
                  )}
                  {property.availableFrom && (
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-sm">{t('public:property.availableFrom')} {format(new Date(property.availableFrom), "d 'de' MMMM 'de' yyyy", { locale: pt })}</span>
                    </div>
                  )}
                </div>
              )}


              {/* Amenities */}
              {(property.hasGarage || property.hasElevator) && (
                <div className="flex flex-wrap gap-2 mb-8 pb-8 border-b">
                  {property.hasGarage && (
                    <span className="px-3 py-1.5 bg-muted rounded-full text-xs font-medium">🅿️ {t('public:property.garage')}</span>
                  )}
                  {property.hasElevator && (
                    <span className="px-3 py-1.5 bg-muted rounded-full text-xs font-medium">🛗 {t('public:property.elevator')}</span>
                  )}
                </div>
              )}

              {/* Description */}
              {property.description && (
                <div className="mb-8 pb-8 border-b">
                  <h3 className="font-display text-base font-600 mb-3">{t('public:property.description')}</h3>
                  <p className="text-muted-foreground text-sm leading-[1.7]">{property.description}</p>
                </div>
              )}

              {/* Critérios */}
              {(() => {
                const items: { label: string; value: React.ReactNode }[] = [];
                if (property.criteria.minIncome > 0)
                  items.push({ label: t('public:property.criteria.minIncome'), value: `€${property.criteria.minIncome.toLocaleString('pt-PT')}` });
                if (property.criteria.maxPeople > 0)
                  items.push({ label: t('public:property.criteria.maxPeople'), value: property.criteria.maxPeople });
                items.push({ label: t('public:property.criteria.pets'), value: property.criteria.petsAllowed ? t('public:property.criteria.petsAllowed') : t('public:property.criteria.petsNotAllowed') });
                if (property.criteria.petsAllowed && property.criteria.allowedPetTypes && property.criteria.allowedPetTypes.length > 0)
                  items.push({ label: t('public:property.criteria.petTypes'), value: property.criteria.allowedPetTypes.join(', ') });
                items.push({ label: t('public:property.criteria.guarantor'), value: property.criteria.guarantorRequired ? t('public:property.criteria.guarantorRequired') : t('public:property.criteria.guarantorNotRequired') });
                if (property.criteria.advanceMonths > 0)
                  items.push({ label: t('public:property.criteria.advance'), value: t('public:property.criteria.months', { count: property.criteria.advanceMonths }) });
                if (property.criteria.depositMonths > 0)
                  items.push({ label: t('public:property.criteria.deposit'), value: t('public:property.criteria.months', { count: property.criteria.depositMonths }) });
                if (property.criteria.advanceWithoutGuarantor)
                  items.push({ label: t('public:property.criteria.advanceNoGuarantor'), value: t('public:property.criteria.months', { count: property.criteria.advanceWithoutGuarantor }) });
                if (property.criteria.depositWithoutGuarantor)
                  items.push({ label: t('public:property.criteria.depositNoGuarantor'), value: t('public:property.criteria.months', { count: property.criteria.depositWithoutGuarantor }) });
                if (property.criteria.minContractMonths)
                  items.push({ label: t('public:property.criteria.minContract'), value: t('public:property.criteria.months', { count: property.criteria.minContractMonths }) });
                if (property.criteria.smokingAllowed !== null && property.criteria.smokingAllowed !== undefined)
                  items.push({ label: t('public:property.criteria.smoking'), value: property.criteria.smokingAllowed ? t('public:property.criteria.smokingAllowed') : t('public:property.criteria.smokingNotAllowed') });
                if (items.length === 0) return null;
                return (
                  <div className="p-6 rounded-2xl bg-card border mb-4">
                    <h3 className="text-xs font-semibold mb-4 uppercase tracking-[0.15em] text-muted-foreground">{t('public:property.conditionsTitle')}</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {items.map((item) => (
                        <div key={item.label}>
                          <span className="text-muted-foreground text-xs">{item.label}</span>
                          <div className="font-semibold mt-0.5">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>

          {/* Right column - CTA card */}
          <div>
            <div className="lg:sticky lg:top-20">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl border bg-card p-6"
              >
                {property.rentalPrice ? (
                  <div className="mb-6">
                    <div className="font-display text-3xl font-700 tracking-tight">
                      €{property.rentalPrice.toLocaleString('pt-PT')}
                      <span className="text-base font-400 text-muted-foreground ml-1">{t('public:property.perMonth')}</span>
                    </div>
                  </div>
                ) : null}

                <AnimatePresence mode="wait">
                  {!showForm ? (
                    <motion.div key="cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Button
                        onClick={() => setShowForm(true)}
                        className="w-full h-12 text-sm font-semibold rounded-xl"
                      >
                        {t('public:property.apply')}
                      </Button>
                      <p className="text-[11px] text-muted-foreground text-center mt-3">
                        {t('public:property.applyHint')}
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t('public:property.applicationTitle')}</p>
                        <button onClick={() => setShowForm(false)} className="p-1 hover:bg-muted rounded-lg transition-colors">
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                      <LeadForm property={toLeadProperty(property)} screeningConfig={screeningConfig} onClose={() => setShowForm(false)} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyPage;
