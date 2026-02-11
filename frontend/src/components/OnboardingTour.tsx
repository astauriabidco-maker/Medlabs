/**
 * Interactive Onboarding Tour Component
 *
 * Guides new users through the platform with highlighted UI elements
 * and step-by-step instructions. Automatically shows on first login.
 */
import * as React from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, Rocket } from 'lucide-react';
import { Button } from '@/components/ui-basic';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';

// ============================================
// Types
// ============================================
export interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    targetSelector?: string;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
    icon?: React.ReactNode;
}

interface OnboardingTourProps {
    steps: OnboardingStep[];
    storageKey?: string;
    onComplete?: () => void;
}

const ONBOARDING_KEY_PREFIX = 'medlab_onboarding_';

// ============================================
// Tooltip Component (positioned around target)
// ============================================
function TooltipCard({
    step,
    stepIndex,
    totalSteps,
    onNext,
    onPrev,
    onSkip,
    position,
}: {
    step: OnboardingStep;
    stepIndex: number;
    totalSteps: number;
    onNext: () => void;
    onPrev: () => void;
    onSkip: () => void;
    position: { top: number; left: number; placement: string };
}) {
    const { t } = useTranslation();
    const isLast = stepIndex === totalSteps - 1;

    return (
        <div
            className="fixed z-[10001] w-80 animate-in fade-in slide-in-from-bottom-2 duration-300"
            style={{ top: position.top, left: position.left }}
        >
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                {/* Progress bar */}
                <div className="h-1 bg-gray-100">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                        style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
                    />
                </div>

                <div className="p-5">
                    {/* Step counter */}
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                            {stepIndex + 1} / {totalSteps}
                        </span>
                        <button
                            onClick={onSkip}
                            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            {t('onboarding.skip')}
                        </button>
                    </div>

                    {/* Content */}
                    <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                        {step.icon && <span className="text-blue-500">{step.icon}</span>}
                        {step.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-4">
                        {step.description}
                    </p>

                    {/* Navigation */}
                    <div className="flex items-center justify-between">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onPrev}
                            disabled={stepIndex === 0}
                            className="gap-1"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            {t('onboarding.prev')}
                        </Button>
                        <Button
                            size="sm"
                            onClick={onNext}
                            className="gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        >
                            {isLast ? (
                                <>
                                    <Rocket className="w-4 h-4" />
                                    {t('onboarding.finish')}
                                </>
                            ) : (
                                <>
                                    {t('onboarding.next')}
                                    <ChevronRight className="w-4 h-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================
// Welcome Screen (first step before tour)
// ============================================
function WelcomeScreen({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
    const { t } = useTranslation();
    const { user } = useAuth();

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4 animate-in zoom-in-95 fade-in duration-500">
                <div className="text-center space-y-6">
                    {/* Icon */}
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                        <Sparkles className="w-10 h-10 text-white" />
                    </div>

                    {/* Title */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            {t('onboarding.welcomeTitle')} 👋
                        </h2>
                        <p className="text-gray-500 mt-2">
                            {user?.email && <span className="font-medium text-gray-700">{user.email}</span>}
                        </p>
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 leading-relaxed">
                        {t('onboarding.welcomeDesc')}
                    </p>

                    {/* Actions */}
                    <div className="space-y-3">
                        <Button
                            onClick={onStart}
                            className="w-full gap-2 h-12 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200"
                        >
                            <Rocket className="w-5 h-5" />
                            {t('onboarding.startTour')}
                        </Button>
                        <button
                            onClick={onSkip}
                            className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
                        >
                            {t('onboarding.skipTour')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================
// Main OnboardingTour Component
// ============================================
export function OnboardingTour({ steps, storageKey = 'default', onComplete }: OnboardingTourProps) {
    const key = ONBOARDING_KEY_PREFIX + storageKey;
    const [showWelcome, setShowWelcome] = React.useState(false);
    const [currentStep, setCurrentStep] = React.useState(-1); // -1 = not started
    const [isActive, setIsActive] = React.useState(false);
    const [tooltipPos, setTooltipPos] = React.useState({ top: 0, left: 0, placement: 'bottom' });

    // Check if onboarding has been completed
    React.useEffect(() => {
        const completed = localStorage.getItem(key);
        if (!completed) {
            // Show welcome screen after a brief delay
            const timer = setTimeout(() => setShowWelcome(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [key]);

    // Position tooltip relative to target element
    React.useEffect(() => {
        if (currentStep < 0 || currentStep >= steps.length) return;

        const step = steps[currentStep];

        if (!step.targetSelector || step.position === 'center') {
            setTooltipPos({
                top: window.innerHeight / 2 - 120,
                left: window.innerWidth / 2 - 160,
                placement: 'center',
            });
            return;
        }

        const target = document.querySelector(step.targetSelector);
        if (!target) {
            // Center if target not found
            setTooltipPos({
                top: window.innerHeight / 2 - 120,
                left: window.innerWidth / 2 - 160,
                placement: 'center',
            });
            return;
        }

        const rect = target.getBoundingClientRect();
        const placement = step.position || 'bottom';
        const margin = 16;

        let top = 0, left = 0;

        switch (placement) {
            case 'bottom':
                top = rect.bottom + margin;
                left = rect.left + rect.width / 2 - 160;
                break;
            case 'top':
                top = rect.top - 260;
                left = rect.left + rect.width / 2 - 160;
                break;
            case 'right':
                top = rect.top + rect.height / 2 - 100;
                left = rect.right + margin;
                break;
            case 'left':
                top = rect.top + rect.height / 2 - 100;
                left = rect.left - 340;
                break;
        }

        // Clamp to viewport
        top = Math.max(10, Math.min(top, window.innerHeight - 300));
        left = Math.max(10, Math.min(left, window.innerWidth - 340));

        setTooltipPos({ top, left, placement });

        // Highlight target element
        target.classList.add('onboarding-highlight');
        return () => {
            target.classList.remove('onboarding-highlight');
        };
    }, [currentStep, steps]);

    const startTour = () => {
        setShowWelcome(false);
        setCurrentStep(0);
        setIsActive(true);
    };

    const skipAll = () => {
        setShowWelcome(false);
        setIsActive(false);
        setCurrentStep(-1);
        localStorage.setItem(key, 'completed');
        onComplete?.();
    };

    const goNext = () => {
        if (currentStep >= steps.length - 1) {
            // Tour complete
            setIsActive(false);
            setCurrentStep(-1);
            localStorage.setItem(key, 'completed');
            onComplete?.();
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };

    const goPrev = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    // Welcome screen
    if (showWelcome) {
        return <WelcomeScreen onStart={startTour} onSkip={skipAll} />;
    }

    // Active tour
    if (!isActive || currentStep < 0 || currentStep >= steps.length) {
        return null;
    }

    return (
        <>
            {/* Semi-transparent overlay */}
            <div className="fixed inset-0 z-[9999] bg-black/40 transition-opacity duration-300" />

            {/* Tooltip */}
            <TooltipCard
                step={steps[currentStep]}
                stepIndex={currentStep}
                totalSteps={steps.length}
                onNext={goNext}
                onPrev={goPrev}
                onSkip={skipAll}
                position={tooltipPos}
            />
        </>
    );
}

// ============================================
// Predefined Onboarding Steps per Role
// ============================================
export function useOnboardingSteps() {
    const { t } = useTranslation();
    const { user } = useAuth();

    const labAdminSteps: OnboardingStep[] = [
        {
            id: 'dashboard',
            title: t('onboarding.steps.dashboard.title'),
            description: t('onboarding.steps.dashboard.desc'),
            position: 'center',
        },
        {
            id: 'upload',
            title: t('onboarding.steps.upload.title'),
            description: t('onboarding.steps.upload.desc'),
            targetSelector: 'nav a[href*="upload"]',
            position: 'right',
        },
        {
            id: 'history',
            title: t('onboarding.steps.history.title'),
            description: t('onboarding.steps.history.desc'),
            targetSelector: 'nav a[href*="history"]',
            position: 'right',
        },
        {
            id: 'team',
            title: t('onboarding.steps.team.title'),
            description: t('onboarding.steps.team.desc'),
            targetSelector: 'nav a[href*="team"]',
            position: 'right',
        },
        {
            id: 'settings',
            title: t('onboarding.steps.settings.title'),
            description: t('onboarding.steps.settings.desc'),
            targetSelector: 'nav a[href*="settings"]',
            position: 'right',
        },
        {
            id: 'marketplace',
            title: t('onboarding.steps.marketplace.title'),
            description: t('onboarding.steps.marketplace.desc'),
            targetSelector: 'nav a[href*="marketplace"]',
            position: 'right',
        },
    ];

    const superAdminSteps: OnboardingStep[] = [
        {
            id: 'dashboard',
            title: t('onboarding.steps.dashboard.title'),
            description: t('onboarding.steps.adminDashboard.desc'),
            position: 'center',
        },
        {
            id: 'tenants',
            title: t('onboarding.steps.tenants.title'),
            description: t('onboarding.steps.tenants.desc'),
            targetSelector: 'nav a[href*="tenants"]',
            position: 'right',
        },
        {
            id: 'users',
            title: t('onboarding.steps.users.title'),
            description: t('onboarding.steps.users.desc'),
            targetSelector: 'nav a[href*="users"]',
            position: 'right',
        },
        {
            id: 'licenses',
            title: t('onboarding.steps.licenses.title'),
            description: t('onboarding.steps.licenses.desc'),
            targetSelector: 'nav a[href*="license"]',
            position: 'right',
        },
    ];

    const isPlatformRole = ['SUPER_ADMIN', 'PLATFORM_MANAGER'].includes(user?.role || '');
    return isPlatformRole ? superAdminSteps : labAdminSteps;
}

// ============================================
// Restart Onboarding Button
// ============================================
export function RestartOnboardingButton() {
    const { t } = useTranslation();
    const { user } = useAuth();

    const handleRestart = () => {
        const isPlatformRole = ['SUPER_ADMIN', 'PLATFORM_MANAGER'].includes(user?.role || '');
        const key = ONBOARDING_KEY_PREFIX + (isPlatformRole ? 'admin' : 'lab');
        localStorage.removeItem(key);
        window.location.reload();
    };

    return (
        <Button variant="ghost" size="sm" onClick={handleRestart} className="gap-2 text-muted-foreground">
            <Sparkles className="w-4 h-4" />
            {t('onboarding.restartTour')}
        </Button>
    );
}
