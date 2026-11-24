import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { StoreProvider } from '@/lib/store';
import { AppShell } from '@/components/app-shell';
import Discover from '@/pages/discover';
import Matches from '@/pages/matches';
import { Chat, MessagesIndex } from '@/pages/messages';
import Profile from '@/pages/profile';
import CreateProfile from '@/pages/create-profile';
import SearchPage from '@/pages/search';
import UserPage from '@/pages/user';

const queryClient = new QueryClient();

function Router() {
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
          <Route component={NotFound} />
        </Switch>
      </RoutedErrorBoundary>
    </AppShell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <StoreProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </StoreProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
