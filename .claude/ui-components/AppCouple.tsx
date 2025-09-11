import * as React from 'react';
import DashboardCouple from './screens/DashboardCouple';
import { setBrand, toggleDark } from './lib/brand';
import { ToastProvider } from './components/Toast';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

export default function AppCouple() {
  React.useEffect(() => { setBrand('wedme'); /* setBrand('wedme','mint'|'sky') */ }, []);
  const [menuOpen, setMenuOpen] = React.useState(false);
  return (
    <ToastProvider>
      <div className="app-shell">
        <Navbar title="WedMe.app" onToggleTheme={() => toggleDark()} onOpenMenu={() => setMenuOpen(true)} />
        <div className="grid lg:grid-cols-[256px_1fr]">
          <Sidebar items={[{label:'Home',active:true},{label:'Suppliers'},{label:'Timeline'},{label:'Files'},{label:'Settings'}]} open={menuOpen} onClose={() => setMenuOpen(false)} />
          <main className="app-main space-y-12">
            <DashboardCouple />
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
