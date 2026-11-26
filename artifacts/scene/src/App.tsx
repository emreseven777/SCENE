import { MotionConfig } from 'framer-motion';
import { ThemeProvider } from 'next-themes';
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import NotFound from '@/pages/not-found';
import { Redirect, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { AuthProvider, useAuth } from '@/lib/auth';
import { StoreProvider, useStore } from '@/lib/store';
import { supabaseConfigured } from '@/lib/supabase';
import { AppShell } from '@/components/app-shell';
import { CompleteIdentity } from '@/pages/complete-identity';
import { isProvince } from '@/lib/provinces';
import { DatingFields } from '@/components/dating-profile';
import { LoginPage, RegisterPage, WelcomePage } from '@/pages/auth';

const loadDiscover = () => import('@/pages/discover');
const Discover = lazy(loadDiscover);
const loadMatches = () => import('@/pages/matches');
const Matches = lazy(loadMatches);
const CreateProfile = lazy(() => import('@/pages/create-profile'));
const loadNotifications = () => import('@/pages/notifications');
const Notifications = lazy(loadNotifications);
const ForgotPassword = lazy(() => import("@/pages/password-recovery").then((module) => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => import("@/pages/password-recovery").then((module) => ({ default: module.ResetPassword })));
const loadMessages = () => import('@/pages/messages');
const Chat = lazy(() => loadMessages().then((module) => ({ default: module.Chat })));
const MessagesIndex = lazy(() => loadMessages().then((module) => ({ default: module.MessagesIndex })));
const CinemaActivities = lazy(() => import('@/pages/cinema-activities'));
const Community = lazy(() => import('@/pages/community'));
const Admin = lazy(() => import('@/pages/admin'));
const loadCinema = () => import('@/pages/cinema');
const Cinema = lazy(loadCinema);
const loadSearchPage = () => import('@/pages/search');
const SearchPage = lazy(loadSearchPage);
const loadProfile = () => import('@/pages/profile');
const Profile = lazy(loadProfile);
const UserPage = lazy(() => import('@/pages/user'));
const Legal = lazy(() => import('@/pages/legal'));


const navigationChunks: Record<string, () => Promise<unknown>> = {
  "/": loadDiscover, "/sinema": loadCinema, "/begeniler": loadMatches,
  "/mesajlar": loadMessages, "/profil": loadProfile, "/arama": loadSearchPage,
  "/bildirimler": loadNotifications,
};

function warmNavigation(href: string) {
  void navigationChunks[href]?.().catch(() => undefined);
}

function FullScreen({ children }: { children: ReactNode }) {
  return <div className="grid min-h-[100dvh] place-items-center px-6 text-center">{children}</div>;
}

function Loading() {
  return (
    <FullScreen>
      <div className="flex flex-col items-center gap-3" data-testid="status-loading">
        <Loader2 className="animate-spin text-primary" />
        <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Yükleniyor</span>
      </div>
    </FullScreen>
  );
}

function SignedInApp() {
  const store = useStore();
  const { signOut } = useAuth();
  const [loc] = useLocation();

  if (!store.ready) return <Loading />;
  if (store.loadError || !store.me) {
    return (
      <FullScreen>
        <div className="max-w-sm" data-testid="status-load-error">
          <div className="scene-title">Bağlantı <span className="text-brand-ink">kesildi.</span></div>
          <p className="mt-3 text-sm text-muted-foreground">{store.loadError ?? 'Profilin bulunamadı.'}</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button onClick={() => void store.refresh()} data-testid="button-retry">Tekrar dene</Button>
            <Button variant="ghost" onClick={() => void signOut()} data-testid="button-error-logout">Çıkış yap</Button>
          </div>
        </div>
      </FullScreen>
    );
  }
  if (store.me.age === null || !isProvince(store.me.city)) return <CompleteIdentity key={store.me.id} person={store.me} />;
  if (!store.me.name.trim() || !store.me.gender || !store.me.looking_for || !store.me.dating_goal) {
    return <main className="scene-page max-w-lg pb-safe"><DatingFields key={store.me.id} person={store.me} requiredOnly /></main>;
  }
  if (!store.me.onboarded && loc !== '/profil/olustur') return <Redirect to="/profil/olustur" />;

  return (
    <AppShell warmNavigation={warmNavigation}>
      <RoutedErrorBoundary>
        <Suspense fallback={<Loading />}>
        <Switch>
          <Route path="/" component={Discover} />
          <Route path="/bildirimler" component={Notifications} />
              <Route path="/sinema" component={Cinema} />
          <Route path="/sinema/topluluk" component={Community} />
          <Route path="/sinema/etkinlikler" component={CinemaActivities} />
              <Route path="/begeniler" component={Matches} />
              <Route path="/eslesmeler" component={Matches} />
          <Route path="/mesajlar" component={MessagesIndex} />
          <Route path="/mesajlar/:id" component={Chat} />
          <Route path="/profil" component={Profile} />
          <Route path="/yonetim" component={Admin} />
          <Route path="/profil/olustur" component={CreateProfile} />
          <Route path="/arama" component={SearchPage} />
          <Route path="/kullanici/:id" component={UserPage} />
          <Route path="/giris"><Redirect to="/" /></Route>
          <Route path="/kayit"><Redirect to="/" /></Route>
          <Route component={NotFound} />
        </Switch>
        </Suspense>
      </RoutedErrorBoundary>
    </AppShell>
  );
}

function Router() {
  const { session, loading } = useAuth();
  const [location] = useLocation();
  if (location === '/kurallar') return <Suspense fallback={<Loading />}><Legal /></Suspense>;
  if (!supabaseConfigured) {
    return (
      <FullScreen>
        <div className="max-w-sm">
          <div className="scene-title">Kurulum <span className="text-brand-ink">eksik.</span></div>
          <p className="mt-3 text-sm text-muted-foreground">Supabase bağlantı bilgileri bulunamadı. Uygulama şu an hiçbir veritabanına bağlı değil.</p>
        </div>
      </FullScreen>
    );
  }
  if (location === '/sifremi-unuttum') return <Suspense fallback={<Loading />}><ForgotPassword /></Suspense>;
  if (location === '/sifre-yenile') return <Suspense fallback={<Loading />}><ResetPassword /></Suspense>;
  if (loading) return <Loading />;
  if (!session) {
    return (
      <Switch>
        <Route path="/giris" component={LoginPage} />
        <Route path="/kayit" component={RegisterPage} />
        <Route path="/" component={WelcomePage} />
        <Route><Redirect to="/" /></Route>
      </Switch>
    );
  }
  return <SignedInApp />;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function SessionStore({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  return <SessionCache key={userId ?? "anonymous"}>{children}</SessionCache>;
}

function SessionCache({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  useEffect(() => () => client.clear(), [client]);
  return <QueryClientProvider client={client}><StoreProvider>{children}</StoreProvider></QueryClientProvider>;
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="scene-theme">
      <MotionConfig reducedMotion="user">
        <TooltipProvider>
          <AuthProvider>
            <SessionStore>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
                <Router />
              </WouterRouter>
              <Toaster />
            </SessionStore>
          </AuthProvider>
        </TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}

export default App;
