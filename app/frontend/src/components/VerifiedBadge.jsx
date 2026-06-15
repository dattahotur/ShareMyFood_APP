import React from 'react';

const VerifiedBadge = ({ size = '16px', style = {} }) => {
  return (
    <div 
      title="Verified Account"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #10b981, #06b6d4)',
        color: 'white',
        boxShadow: '0 2px 4px rgba(16,185,129,0.3)',
        marginLeft: '4px',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style
      }}
    >
      <svg 
        width="70%" 
        height="70%" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="white" 
        strokeWidth="4" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
  );
};

export default VerifiedBadge;
