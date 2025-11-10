import React from 'react';
import Image from 'next/image';

const AppHeader = () => {
  return (
    <header className="py-6 text-center bg-gradient-to-l from-[#007bff] to-[#00c3ff] flex flex-col items-center justify-center gap-4">
      <Image
        src="/logo.png"
        alt="KING STORE Logo"
        width={80}
        height={80}
        className="rounded-full border-2 border-white shadow-lg"
        priority // Helps with loading performance for important images
      />
      <div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-wider drop-shadow-md">
          KING STORE
        </h1>
        <p className="text-lg md:text-xl text-white/90 tracking-widest mt-2 drop-shadow-sm font-medium">
          اشحن - العب - استمتع
        </p>
      </div>
    </header>
  );
};

export default AppHeader;
