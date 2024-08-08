import React from 'react';

/**
 * Component name: LogoSVG
 * Description : renders a Geico logo in SVG format that is customizable in size and color
 */

interface LogoSVGProps {
  width?: string;
  height?: string;
}

const LogoSVG = ({ width = '55px', height = '45px' }: LogoSVGProps) => (
  <div
    style={{
      backgroundColor: 'white',
      width: width,
      height: height,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: '10px',
    }}
  >
    <svg id="icon-loader-g" width="100%" height="100%" viewBox="0 0 32 32">
      <path
        fill="#005CCC"
        d="M0 12.345v7.31c0 7.174 4.029 8.867 10.797 8.868h9.087c8.462 0 12.116-0.34 12.116-7.378l-0.002 0.001v-6.974h-16.853v5.078h9.338v0.709c0 2.369-1.961 2.674-3.926 2.674h-8.070c-3.791 0-4.772-0.913-4.772-5.111v-3.046c0-4.196 0.981-5.109 4.772-5.109h8.156c2.403 0 3.791 0.305 3.791 2.742h7.378v-0.78c0-4.772-1.184-7.851-9.713-7.851h-11.302c-6.768 0-10.797 1.693-10.797 8.867z"
      ></path>
    </svg>
  </div>
);

export default LogoSVG;
