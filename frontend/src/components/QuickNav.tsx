import React from 'react';

interface QuickNavProps {
  navigate: (path: string) => void;
}

const navItems = [
  { path: '/templates/weekly', label: 'Fixas', icon: '🗓️' },
  { path: '/templates/monthly', label: 'Rotativas', icon: '🔄' },
  { path: '/agenda', label: 'Agenda', icon: '📅' },
];

export default function QuickNav({ navigate }: QuickNavProps) {
  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    color: '#334155',
    textDecoration: 'none',
  };

  const iconStyle: React.CSSProperties = {
    fontSize: '18px',
  };

  return (
    <section style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
        {navItems.map(item => (
          <button key={item.path} style={buttonStyle} onClick={() => navigate(item.path)}>
            <div style={iconStyle}>{item.icon}</div>
            <div>{item.label}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
