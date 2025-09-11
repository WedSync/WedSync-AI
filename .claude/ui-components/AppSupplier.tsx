import * as React from 'react';
import DashboardSupplier from './screens/DashboardSupplier';
import { setBrand, toggleDark } from './lib/brand';
import { ToastProvider } from './components/Toast';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

export default function AppSupplier() {
  React.useEffect(() => { setBrand('wedex'); }, []);
  const [menuOpen, setMenuOpen] = React.useState(false);
  return (
    <ToastProvider>
      <div className="app-shell">
        <Navbar title="Wedex.ai" onToggleTheme={() => toggleDark()} onOpenMenu={() => setMenuOpen(true)} />
        <div className="grid lg:grid-cols-[256px_1fr]">
          <Sidebar items={[{label:'Overview',active:true},{label:'Jobs'},{label:'Enquiries'},{label:'Billing'},{label:'Settings'}]} open={menuOpen} onClose={() => setMenuOpen(false)} />
          <main className="app-main space-y-12">
            <DashboardSupplier />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
