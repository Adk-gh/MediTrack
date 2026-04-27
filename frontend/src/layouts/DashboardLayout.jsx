// frontend/src/layouts/DashboardLayout.jsx
import React from 'react';
import { DesktopHeader, DesktopNav } from '../components/Headers.jsx';


export const DashboardLayout = ({ children, onOpenQR }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f4f7f6] to-[#eef2f0] font-['Inter',_sans-serif]">
      <DesktopHeader onOpenQR={onOpenQR} />
      <DesktopNav />
      <main className="flex-1 w-full p-0 m-0">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;