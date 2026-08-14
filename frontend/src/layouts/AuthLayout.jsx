// C:\Users\HP\MediTrack\frontend\src\layouts\AuthLayout.jsx

import React from 'react';
import logo from '../assets/logo.jpg';

export const AuthLayout = ({
  children,
  title,
  widthClass = "max-w-[320px]"
}) => {
  return (
    <div
      className="
        min-h-screen
        bg-[#f9f9f9]
        flex
        flex-col
        justify-center
        items-center
        font-['Segoe_UI',_Tahoma,_Geneva,_Verdana,_sans-serif]
        m-0
        px-4
        pt-[calc(1rem+env(safe-area-inset-top))]
        pb-[calc(1rem+env(safe-area-inset-bottom))]
        box-border
      "
    >

      <div
        className={`
          bg-white
          p-[30px]
          sm:p-[40px]
          rounded-[25px]
          border
          border-[#cbd5d1]
          shadow-[0_10px_25px_rgba(0,0,0,0.05)]
          w-full
          ${widthClass}
          text-center
          animate-fade-in-slide
        `}
      >

        <img
          src={logo}
          alt="MediTrack Logo"
          className="w-[180px] h-auto mb-[20px] mx-auto block"
        />

        {title && (
          <h2 className="text-center sm:text-left text-[#4a635d] text-[20px] mb-[20px] font-bold">
            {title}
          </h2>
        )}

        {children}

      </div>
    </div>
  );
};