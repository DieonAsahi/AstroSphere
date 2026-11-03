import { Outlet } from 'react-router-dom';

export function AppLayout() {
  return (
    <main className="relative h-full w-full">
      <Outlet />
    </main>
  );
}
