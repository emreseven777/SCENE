import { MotionConfig } from 'framer-motion';
import { ThemeProvider } from 'next-themes';
import { type ReactNode } from 'react';
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
import Discover from '@/pages/discover';
import Matches from '@/pages/matches';
import { Chat, MessagesIndex } from '@/pages/messages';
import Profile from '@/pages/profile';
import CreateProfile from '@/pages/create-profile';
import { CompleteIdentity } from '@/pages/complete-identity';
import { isProvince } from '@/lib/provinces';
import SearchPage from '@/pages/search';
import UserPage from '@/pages/user';
import { LoginPage, RegisterPage, WelcomePage } from '@/pages/auth';

const queryClient = new QueryClient();

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
  if (!store.me.onboarded && loc !== '/profil/olustur') return <Redirect to="/profil/olustur" />;

  return (
    <AppShell>
      <RoutedErrorBoundary>
        <Switch>
          <Route path="/" component={Discover} />
          <Route path="/eslesmeler" component={Matches} />
          <Route path="/mesajlar" component={MessagesIndex} />
          <Route path="/mesajlar/:id" component={Chat} />
          <Route path="/profil" component={Profile} />
          <Route path="/profil/olustur" component={CreateProfile} />
          <Route path="/arama" component={SearchPage} />
          <Route path="/kullanici/:id" component={UserPage} />
          <Route path="/giris"><Redirect to="/" /></Route>
          <Route path="/kayit"><Redirect to="/" /></Route>
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </AppShell>
  );
}

function Router() {
  const { session, loading } = useAuth();
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

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="scene-theme">
      <MotionConfig reducedMotion="user">
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <AuthProvider>
              <StoreProvider>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
                  <Router />
                </WouterRouter>
                <Toaster />
              </StoreProvider>
            </AuthProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}

export default App;
