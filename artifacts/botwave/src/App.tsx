import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ThemeProvider from "@/components/ui/ThemeProvider";
import HomePage from "@/pages/HomePage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/features" component={HomePage} />
      <Route path="/pricing" component={HomePage} />
      <Route path="/commands" component={HomePage} />
      <Route path="/docs" component={HomePage} />
      <Route path="/how-to" component={HomePage} />
      <Route path="/compare" component={HomePage} />
      <Route path="/use-cases" component={HomePage} />
      <Route path="/blog" component={HomePage} />
      <Route path="/faq" component={HomePage} />
      <Route path="/fix" component={HomePage} />
      <Route path="/guest-posts" component={HomePage} />
      <Route path="/telegram-bot-nigeria" component={HomePage} />
      <Route path="/telegram-userbot-commands" component={HomePage} />
      <Route path="/whatsapp-bot-nigeria" component={HomePage} />
      <Route path="/whatsapp-bot-south-africa" component={HomePage} />
      <Route path="/whatsapp-bot-india" component={HomePage} />
      <Route path="/login" component={HomePage} />
      <Route path="/signup" component={HomePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <div id="gtx-wrapper" className="gtx-collapsed">
          <div id="google_translate_element" />
        </div>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
