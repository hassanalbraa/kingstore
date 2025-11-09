import React from 'react';

const AppHeader = () => {
  return (
    <header className="py-6 text-center bg-gradient-to-l from-[#007bff] to-[#00c3ff]">
      <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-wider drop-shadow-md">
        KING STORE
      </h1>
      <p className="text-lg md:text-xl text-white/90 tracking-widest mt-2 drop-shadow-sm font-medium">
        اشحن - العب - استمتع
      </p>
    </header>
  );
};

export default AppHeader;
